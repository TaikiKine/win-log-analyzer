import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Context } from "hono";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import cron from "node-cron";

import { fetchWindowsLogs, formatLogsForPrompt } from "./fetch-logs.js";
import { analyzeLogs } from "./analyze.js";
import { saveReport, listReports, getReportById, listSchedules, createSchedule, setScheduleEnabled, deleteSchedule } from "./repository.js";
import { initScheduler, startSchedule, stopSchedule } from "./scheduler.js";
import { computeDiff } from "./diff.js";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ApiResponse,
  LogLevel,
  ReportSummary,
  StoredReport,
  ScheduleRecord,
  CreateScheduleRequest,
  DiffReport,
} from "./types.js";

// .env 読み込み
function loadEnv(path: string): void {
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env が無ければスキップ
  }
}

loadEnv(resolve(process.cwd(), ".env"));

// ---- ヘルパー ----

/** パスパラメータを安全に number に変換する。不正なら null を返す */
function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** エラーレスポンスを返す */
function fail(c: Context, message: string, status: 400 | 404 | 500 = 400) {
  return c.json<ApiResponse<never>>({ ok: false, error: message }, status);
}

const app = new Hono();

// CORS:
//   dev  → Vite dev server (localhost:5173)
//   prod → Electron が file:// でロードするため Origin ヘッダーが文字列 "null" になる
//   ※ "null" は localhost バインドのみのサーバーで安全。外部公開時は削除すること
app.use(
  "/*",
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000", "null"],
  }),
);

// ヘルスチェック
app.get("/api/health", (c) => {
  return c.json<ApiResponse<{ status: string }>>({
    ok: true,
    data: { status: "running" },
  });
});

// ログ取得 + 分析
app.post("/api/analyze", async (c) => {
  try {
    const body = await c.req.json<AnalyzeRequest>().catch(() => ({} as AnalyzeRequest));
    const logName = body.logName ?? "System";
    const maxEvents = Math.min(body.maxEvents ?? 50, 200);
    const level = body.level as LogLevel | undefined;

    console.log(`📡 ログ取得中... (${logName}, 最大${maxEvents}件)`);

    const events = fetchWindowsLogs({ logName, maxEvents, level });
    console.log(`  → ${events.length} 件取得`);

    const logsText = formatLogsForPrompt(events);

    console.log("🤖 Claude API で分析中...");
    const report = await analyzeLogs(logsText);

    const fetchedAt = new Date().toISOString();
    const stored = saveReport({
      logName: logName,
      level: level,
      maxEvents: maxEvents,
      eventCount: events.length,
      report,
      fetchedAt,
    });

    const response: AnalyzeResponse = {
      report,
      eventCount: events.length,
      fetchedAt,
      reportId: stored.id,
    };

    return c.json<ApiResponse<AnalyzeResponse>>({
      ok: true,
      data: response,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    console.error("分析エラー:", message);
    return c.json<ApiResponse<never>>({ ok: false, error: message }, 500);
  }
});

// 履歴一覧
app.get("/api/reports", (c) => {
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const reports = listReports(limit);
  return c.json<ApiResponse<ReportSummary[]>>({ ok: true, data: reports });
});

// 差分比較（:id より前に定義する必要がある）
app.get("/api/reports/diff/:id1/:id2", (c) => {
  const id1 = parseId(c.req.param("id1"));
  const id2 = parseId(c.req.param("id2"));

  if (id1 === null || id2 === null) return fail(c, "invalid id");
  if (id1 === id2) return fail(c, "同じレポートは比較できません");

  const r1 = getReportById(id1);
  const r2 = getReportById(id2);

  if (!r1 || !r2) return fail(c, "not found", 404);

  // id1 を旧、id2 を新として扱う（fetchedAt で自動判定）
  const [older, newer] =
    r1.fetchedAt <= r2.fetchedAt ? [r1, r2] : [r2, r1];

  const diff = computeDiff(older, newer, older.report, newer.report);
  return c.json<ApiResponse<DiffReport>>({ ok: true, data: diff });
});

// 履歴詳細
app.get("/api/reports/:id", (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) return fail(c, "invalid id");
  const report = getReportById(id);
  if (!report) return fail(c, "not found", 404);
  return c.json<ApiResponse<StoredReport>>({ ok: true, data: report });
});

// スケジュール一覧
app.get("/api/schedules", (c) => {
  const schedules = listSchedules();
  return c.json<ApiResponse<ScheduleRecord[]>>({ ok: true, data: schedules });
});

// スケジュール作成
app.post("/api/schedules", async (c) => {
  try {
    const body = await c.req.json<CreateScheduleRequest>();
    const { cronExpr } = body;

    if (!cronExpr) {
      return c.json<ApiResponse<never>>(
        { ok: false, error: "cronExpr は必須です" },
        400,
      );
    }
    if (!cron.validate(cronExpr)) {
      return c.json<ApiResponse<never>>(
        { ok: false, error: "cron 式が不正です" },
        400,
      );
    }

    const schedule = createSchedule({
      logName: body.logName ?? "System",
      level: body.level,
      maxEvents: Math.min(body.maxEvents ?? 50, 200),
      cronExpr,
    });
    startSchedule(schedule);

    return c.json<ApiResponse<ScheduleRecord>>({ ok: true, data: schedule }, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    return c.json<ApiResponse<never>>({ ok: false, error: message }, 500);
  }
});

// スケジュール有効/無効切替
app.patch("/api/schedules/:id", async (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) return fail(c, "invalid id");

  const body = await c.req.json<{ enabled: boolean }>().catch(() => ({ enabled: false }));
  const schedule = setScheduleEnabled(id, body.enabled);
  if (!schedule) return fail(c, "not found", 404);

  if (body.enabled) {
    startSchedule(schedule);
  } else {
    stopSchedule(id);
  }

  return c.json<ApiResponse<ScheduleRecord>>({ ok: true, data: schedule });
});

// スケジュール削除
app.delete("/api/schedules/:id", (c) => {
  const id = parseId(c.req.param("id"));
  if (id === null) return fail(c, "invalid id");
  const deleted = deleteSchedule(id);
  if (!deleted) return fail(c, "not found", 404);
  stopSchedule(id);
  return c.json<ApiResponse<null>>({ ok: true, data: null });
});

// サーバー起動
const port = Number(process.env.PORT ?? 3001);
console.log(`🚀 Server running at http://localhost:${port}`);
initScheduler();
serve({ fetch: app.fetch, port });
