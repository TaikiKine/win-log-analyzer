import { useState, useEffect, useCallback } from "react";
import type { ApiResponse, ScheduleRecord, LogLevel } from "./types";

const LOG_NAMES = ["System", "Application", "Security"] as const;
const LOG_LEVELS: Array<{ value: LogLevel | ""; label: string }> = [
  { value: "", label: "全レベル" },
  { value: "Critical", label: "Critical" },
  { value: "Error", label: "Error" },
  { value: "Warning", label: "Warning" },
  { value: "Information", label: "Information" },
];
const CRON_PRESETS = [
  { label: "毎時", value: "0 * * * *" },
  { label: "毎日 9:00", value: "0 9 * * *" },
  { label: "毎週月 9:00", value: "0 9 * * 1" },
  { label: "カスタム", value: "" },
];

export function ScheduleView() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [logName, setLogName] = useState("System");
  const [level, setLevel] = useState<LogLevel | "">("");
  const [maxEvents, setMaxEvents] = useState(50);
  const [preset, setPreset] = useState(CRON_PRESETS[0].value);
  const [customCron, setCustomCron] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isCustom = preset === "";
  const cronExpr = isCustom ? customCron : preset;

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schedules");
      const json: ApiResponse<ScheduleRecord[]> = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error ?? "取得失敗");
      setSchedules(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSchedules();
  }, [fetchSchedules]);

  const handleCreate = async () => {
    setFormError(null);
    if (!cronExpr.trim()) {
      setFormError("cron 式を入力してください");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          logName,
          maxEvents,
          cronExpr: cronExpr.trim(),
          ...(level ? { level } : {}),
        }),
      });
      const json: ApiResponse<ScheduleRecord> = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error ?? "作成失敗");
      setSchedules((prev) => [json.data!, ...prev]);
      setCustomCron("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "不明なエラー");
    } finally {
      setCreating(false);
    }
  };

  const toggleEnabled = async (s: ScheduleRecord) => {
    try {
      const res = await fetch(`/api/schedules/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !s.enabled }),
      });
      const json: ApiResponse<ScheduleRecord> = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error ?? "更新失敗");
      setSchedules((prev) =>
        prev.map((x) => (x.id === s.id ? json.data! : x)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
      const json: ApiResponse<null> = await res.json();
      if (!json.ok) throw new Error(json.error ?? "削除失敗");
      setSchedules((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    }
  };

  return (
    <div>
      {/* 作成フォーム */}
      <div className="schedule-form">
        <div className="schedule-form-title">新規スケジュール</div>

        <div className="schedule-form-fields">
          <div className="field">
            <label>Log Source</label>
            <select value={logName} onChange={(e) => setLogName(e.target.value)}>
              {LOG_NAMES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Min Level</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as LogLevel | "")}
            >
              {LOG_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Max Events</label>
            <input
              type="number"
              min={10}
              max={200}
              value={maxEvents}
              onChange={(e) => setMaxEvents(Number(e.target.value))}
              style={{ width: "80px" }}
            />
          </div>

          <div className="field">
            <label>実行間隔</label>
            <select value={preset} onChange={(e) => setPreset(e.target.value)}>
              {CRON_PRESETS.map((p) => (
                <option key={p.label} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {isCustom && (
            <div className="field">
              <label>Cron 式</label>
              <input
                type="text"
                placeholder="例: 0 * * * *"
                value={customCron}
                onChange={(e) => setCustomCron(e.target.value)}
                style={{ width: "140px" }}
              />
            </div>
          )}

          <button
            className="btn-analyze"
            onClick={() => void handleCreate()}
            disabled={creating}
          >
            {creating ? "作成中..." : "追加"}
          </button>
        </div>

        {!isCustom && (
          <div className="schedule-cron-preview">
            cron: <code>{cronExpr}</code>
          </div>
        )}
        {formError && <div className="error-banner" style={{ marginTop: "0.75rem" }}>{formError}</div>}
      </div>

      {/* エラー */}
      {error && <div className="error-banner">{error}</div>}

      {/* 一覧 */}
      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <span>読み込み中...</span>
        </div>
      ) : schedules.length === 0 ? (
        <div className="empty-state">
          <div className="icon">⏰</div>
          <p>スケジュールがまだありません</p>
        </div>
      ) : (
        <div className="schedule-list">
          {schedules.map((s) => (
            <ScheduleCard
              key={s.id}
              schedule={s}
              onToggle={() => void toggleEnabled(s)}
              onDelete={() => void handleDelete(s.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ScheduleCard({
  schedule: s,
  onToggle,
  onDelete,
}: {
  schedule: ScheduleRecord;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const lastRun = s.lastRunAt
    ? new Date(s.lastRunAt).toLocaleString("ja-JP")
    : "未実行";

  return (
    <div className={`schedule-card ${s.enabled ? "enabled" : "disabled"}`}>
      <div className="schedule-card-left">
        <div className="schedule-card-top">
          <span className="mono schedule-id">#{s.id}</span>
          <span className="schedule-log-name">{s.logName}</span>
          {s.level && <span className="history-level">{s.level}</span>}
          <code className="schedule-cron">{s.cronExpr}</code>
        </div>
        <div className="schedule-card-bottom">
          <span className="history-stats">Max {s.maxEvents} events</span>
          <span className="history-time">最終実行: {lastRun}</span>
        </div>
      </div>
      <div className="schedule-card-actions">
        <button
          className={`btn-toggle ${s.enabled ? "on" : "off"}`}
          onClick={onToggle}
        >
          {s.enabled ? "有効" : "無効"}
        </button>
        <button className="btn-delete" onClick={onDelete}>
          削除
        </button>
      </div>
    </div>
  );
}
