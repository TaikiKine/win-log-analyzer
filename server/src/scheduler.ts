import cron from "node-cron";
import { fetchWindowsLogs, formatLogsForPrompt } from "./fetch-logs.js";
import { analyzeLogs } from "./analyze.js";
import {
  listSchedules,
  saveReport,
  updateScheduleLastRun,
} from "./repository.js";
import type { ScheduleRecord, LogLevel } from "./types.js";

import type { ScheduledTask } from "node-cron";

const activeTasks = new Map<number, ScheduledTask>();

async function runSchedule(schedule: ScheduleRecord): Promise<void> {
  console.log(
    `[Cron] Schedule #${schedule.id} start (${schedule.logName}, ${schedule.cronExpr})`,
  );
  try {
    const events = fetchWindowsLogs({
      logName: schedule.logName,
      maxEvents: schedule.maxEvents,
      level: schedule.level as LogLevel | undefined,
    });
    const logsText = formatLogsForPrompt(events);
    const report = await analyzeLogs(logsText);
    const fetchedAt = new Date().toISOString();
    saveReport({
      logName: schedule.logName,
      level: schedule.level ?? undefined,
      maxEvents: schedule.maxEvents,
      eventCount: events.length,
      report,
      fetchedAt,
    });
    updateScheduleLastRun(schedule.id, fetchedAt);
    console.log(`[Cron] Schedule #${schedule.id} done`);
  } catch (err) {
    console.error(
      `[Cron] Schedule #${schedule.id} failed:`,
      err instanceof Error ? err.message : err,
    );
  }
}

export function startSchedule(schedule: ScheduleRecord): void {
  stopSchedule(schedule.id);
  const task = cron.schedule(schedule.cronExpr, () => {
    void runSchedule(schedule);
  });
  activeTasks.set(schedule.id, task);
}

export function stopSchedule(id: number): void {
  const task = activeTasks.get(id);
  if (task) {
    task.stop();
    activeTasks.delete(id);
  }
}

export function initScheduler(): void {
  const schedules = listSchedules();
  const enabled = schedules.filter((s) => s.enabled);
  for (const s of enabled) {
    startSchedule(s);
  }
  console.log(`[Cron] Initialized ${enabled.length} schedule(s)`);
}
