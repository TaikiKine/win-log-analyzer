import { db } from "./db.js";
import type {
  AnalysisReport,
  ReportSummary,
  StoredReport,
  ScheduleRecord,
} from "./types.js";

interface ReportRow {
  id: number;
  log_name: string;
  level: string | null;
  max_events: number;
  event_count: number;
  system_health: string;
  report_json: string;
  fetched_at: string;
}

function rowToSummary(row: ReportRow): ReportSummary {
  const report = JSON.parse(row.report_json) as AnalysisReport;
  return {
    id: row.id,
    logName: row.log_name,
    level: row.level,
    maxEvents: row.max_events,
    eventCount: row.event_count,
    systemHealth: row.system_health as ReportSummary["systemHealth"],
    issueCount: report.issues.length,
    fetchedAt: row.fetched_at,
  };
}

function rowToStoredReport(row: ReportRow): StoredReport {
  return {
    ...rowToSummary(row),
    report: JSON.parse(row.report_json) as AnalysisReport,
  };
}

export function saveReport(params: {
  logName: string;
  level?: string;
  maxEvents: number;
  eventCount: number;
  report: AnalysisReport;
  fetchedAt: string;
}): StoredReport {
  const result = db
    .prepare(
      `INSERT INTO reports (log_name, level, max_events, event_count, system_health, report_json, fetched_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      params.logName,
      params.level ?? null,
      params.maxEvents,
      params.eventCount,
      params.report.systemHealth,
      JSON.stringify(params.report),
      params.fetchedAt,
    );

  return getReportById(Number(result.lastInsertRowid))!;
}

export function listReports(limit = 50): ReportSummary[] {
  const rows = db
    .prepare(`SELECT * FROM reports ORDER BY fetched_at DESC LIMIT ?`)
    .all(limit) as ReportRow[];
  return rows.map(rowToSummary);
}

export function getReportById(id: number): StoredReport | null {
  const row = db
    .prepare(`SELECT * FROM reports WHERE id = ?`)
    .get(id) as ReportRow | undefined;
  return row ? rowToStoredReport(row) : null;
}

// ---- Schedules ----

interface ScheduleRow {
  id: number;
  log_name: string;
  level: string | null;
  max_events: number;
  cron_expr: string;
  enabled: number;
  last_run_at: string | null;
  created_at: string;
}

function rowToSchedule(row: ScheduleRow): ScheduleRecord {
  return {
    id: row.id,
    logName: row.log_name,
    level: row.level,
    maxEvents: row.max_events,
    cronExpr: row.cron_expr,
    enabled: row.enabled === 1,
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
  };
}

export function listSchedules(): ScheduleRecord[] {
  const rows = db
    .prepare(`SELECT * FROM schedules ORDER BY created_at DESC`)
    .all() as ScheduleRow[];
  return rows.map(rowToSchedule);
}

export function createSchedule(params: {
  logName: string;
  level?: string;
  maxEvents: number;
  cronExpr: string;
}): ScheduleRecord {
  const createdAt = new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO schedules (log_name, level, max_events, cron_expr, enabled, created_at)
       VALUES (?, ?, ?, ?, 1, ?)`,
    )
    .run(
      params.logName,
      params.level ?? null,
      params.maxEvents,
      params.cronExpr,
      createdAt,
    );
  return getScheduleById(Number(result.lastInsertRowid))!;
}

export function setScheduleEnabled(
  id: number,
  enabled: boolean,
): ScheduleRecord | null {
  db.prepare(`UPDATE schedules SET enabled = ? WHERE id = ?`).run(
    enabled ? 1 : 0,
    id,
  );
  return getScheduleById(id);
}

export function updateScheduleLastRun(id: number, lastRunAt: string): void {
  db.prepare(`UPDATE schedules SET last_run_at = ? WHERE id = ?`).run(
    lastRunAt,
    id,
  );
}

export function deleteSchedule(id: number): boolean {
  const result = db
    .prepare(`DELETE FROM schedules WHERE id = ?`)
    .run(id);
  return Number(result.changes) > 0;
}

function getScheduleById(id: number): ScheduleRecord | null {
  const row = db
    .prepare(`SELECT * FROM schedules WHERE id = ?`)
    .get(id) as ScheduleRow | undefined;
  return row ? rowToSchedule(row) : null;
}
