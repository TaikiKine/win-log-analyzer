import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fetchWindowsLogs, formatLogsForPrompt } from "./fetch-logs.js";
import { analyzeLogs } from "./analyze.js";
import { displayReport } from "./display.js";
import type { FetchConfig } from "./types.js";

// ---- .env 読み込み (dotenv 不要の簡易実装) ----
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
    // .env ファイルが無くても環境変数から読めればOK
  }
}

// ---- CLI 引数パース ----
function parseArgs(): FetchConfig & { dryRun: boolean } {
  const args = process.argv.slice(2);
  const config = {
    logName: process.env.LOG_NAME ?? "System",
    maxEvents: Number(process.env.MAX_EVENTS ?? "50"),
    level: (process.env.LOG_LEVEL as FetchConfig["level"]) ?? undefined,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--log":
        config.logName = args[++i];
        break;
      case "--max":
        config.maxEvents = Number(args[++i]);
        break;
      case "--level":
        config.level = args[++i] as FetchConfig["level"];
        break;
      case "--dry-run":
        config.dryRun = true;
        break;
    }
  }

  return config;
}

// ---- メイン ----
async function main(): Promise<void> {
  loadEnv(resolve(process.cwd(), ".env"));

  const config = parseArgs();

  console.log(`📡 ログを取得中... (${config.logName}, 最大${config.maxEvents}件)`);

  // Step 1: Windows Event Log 取得
  const events = fetchWindowsLogs(config);
  console.log(`  → ${events.length} 件のイベントを取得しました`);

  // Step 2: プロンプト用テキストに変換
  const logsText = formatLogsForPrompt(events);

  // dry-run: ログ内容だけ表示して終了 (API呼び出しなし)
  if (config.dryRun) {
    console.log("\n--- Dry Run: 取得したログ ---\n");
    console.log(logsText);
    return;
  }

  // Step 3: Claude API で分析
  console.log("🤖 Claude API で分析中...");
  const report = await analyzeLogs(logsText);

  // Step 4: ターミナルに表示
  displayReport(report);
}

main().catch((err) => {
  console.error("エラーが発生しました:", err);
  process.exit(1);
});
