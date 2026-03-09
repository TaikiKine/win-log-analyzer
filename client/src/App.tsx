import { useState, useEffect } from "react";
import { useAnalyze } from "./useAnalyze";
import { Report } from "./Report";
import { HistoryView } from "./HistoryView";
import { ScheduleView } from "./ScheduleView";
import { DiffView } from "./DiffView";
import { SettingsView } from "./SettingsView";
import type { LogLevel } from "./types";

const LOG_NAMES = ["System", "Application", "Security"] as const;
const LOG_LEVELS: Array<{ value: LogLevel | ""; label: string }> = [
  { value: "", label: "全レベル" },
  { value: "Critical", label: "Critical" },
  { value: "Error", label: "Error" },
  { value: "Warning", label: "Warning" },
  { value: "Information", label: "Information" },
];

type Tab = "analyze" | "history" | "diff" | "schedule" | "settings";

export function App() {
  const [tab, setTab] = useState<Tab>("analyze");
  // Electron 環境でのみ有効。ブラウザ直アクセス時は null のまま（表示しない）
  const [serverRunning, setServerRunning] = useState<boolean | null>(null);

  useEffect(() => {
    if (!window.electronAPI) return;
    const unsubscribe = window.electronAPI.onServerStatusChange(setServerRunning);
    return unsubscribe;
  }, []);
  const [logName, setLogName] = useState("System");
  const [maxEvents, setMaxEvents] = useState(50);
  const [level, setLevel] = useState<LogLevel | "">("");

  const { data, loading, error, analyze } = useAnalyze();

  const handleAnalyze = () => {
    analyze({
      logName,
      maxEvents,
      ...(level ? { level } : {}),
    });
  };

  return (
    <div className="app">
      <header className="header">
        <h1>win-log-analyzer</h1>
        <span className="subtitle">v0.3.0</span>
        {serverRunning !== null && (
          <span className={`server-badge ${serverRunning ? "running" : "stopped"}`}>
            {serverRunning ? "● server" : "○ server stopped"}
          </span>
        )}
      </header>

      <div className="tabs">
        <button
          className={`tab ${tab === "analyze" ? "active" : ""}`}
          onClick={() => setTab("analyze")}
        >
          分析
        </button>
        <button
          className={`tab ${tab === "history" ? "active" : ""}`}
          onClick={() => setTab("history")}
        >
          履歴
        </button>
        <button
          className={`tab ${tab === "diff" ? "active" : ""}`}
          onClick={() => setTab("diff")}
        >
          差分
        </button>
        <button
          className={`tab ${tab === "schedule" ? "active" : ""}`}
          onClick={() => setTab("schedule")}
        >
          スケジュール
        </button>
        {window.electronAPI && (
          <button
            className={`tab ${tab === "settings" ? "active" : ""}`}
            onClick={() => setTab("settings")}
          >
            設定
          </button>
        )}
      </div>

      {tab === "analyze" && (
        <>
          <div className="controls">
            <div className="field">
              <label>Log Source</label>
              <select
                value={logName}
                onChange={(e) => setLogName(e.target.value)}
              >
                {LOG_NAMES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
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
              <label>Min Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as LogLevel | "")}
              >
                {LOG_LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn-analyze"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? "分析中..." : "分析を実行"}
            </button>
          </div>

          {error && <div className="error-banner">{error}</div>}

          {loading && (
            <div className="loading">
              <div className="spinner" />
              <span>ログを取得して分析しています...</span>
            </div>
          )}

          {!loading && !data && !error && (
            <div className="empty-state">
              <div className="icon">📊</div>
              <p>
                「分析を実行」を押して Windows Event Log の分析を開始してください
              </p>
            </div>
          )}

          {!loading && data && <Report data={data} />}
        </>
      )}

      {tab === "history" && <HistoryView />}

      {tab === "diff" && <DiffView />}

      {tab === "schedule" && <ScheduleView />}

      {tab === "settings" && <SettingsView />}
    </div>
  );
}
