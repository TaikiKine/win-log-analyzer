import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const DB_PATH =
  process.env.DB_PATH ?? resolve(process.cwd(), "data", "logs.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    log_name      TEXT    NOT NULL,
    level         TEXT,
    max_events    INTEGER NOT NULL,
    event_count   INTEGER NOT NULL,
    system_health TEXT    NOT NULL,
    report_json   TEXT    NOT NULL,
    fetched_at    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    log_name    TEXT    NOT NULL,
    level       TEXT,
    max_events  INTEGER NOT NULL,
    cron_expr   TEXT    NOT NULL,
    enabled     INTEGER NOT NULL DEFAULT 1,
    last_run_at TEXT,
    created_at  TEXT    NOT NULL
  );
`);
