import { useState, useEffect, useCallback } from "react";
import type { ReportSummary, StoredReport } from "./types";
import { Report } from "./Report";
import { apiFetch } from "./api";

const HEALTH_LABELS = {
  healthy: { label: "正常", cls: "healthy" },
  attention: { label: "要注意", cls: "attention" },
  critical: { label: "要対応", cls: "critical" },
} as const;

export function HistoryView() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<StoredReport | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ReportSummary[]>("/api/reports");
      setReports(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const data = await apiFetch<StoredReport>(`/api/reports/${id}`);
      setSelectedReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    } finally {
      setDetailLoading(false);
    }
  };

  if (selectedReport) {
    return (
      <div>
        <button className="btn-back" onClick={() => setSelectedReport(null)}>
          &larr; 履歴一覧に戻る
        </button>
        <div className="history-detail-meta">
          <span className="mono">{selectedReport.logName}</span>
          {selectedReport.level && (
            <span className="mono">Lv: {selectedReport.level}</span>
          )}
          <span className="mono">#{selectedReport.id}</span>
        </div>
        <Report
          data={{
            report: selectedReport.report,
            eventCount: selectedReport.eventCount,
            fetchedAt: selectedReport.fetchedAt,
            reportId: selectedReport.id,
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>履歴を読み込み中...</span>
      </div>
    );
  }

  if (error) {
    return <div className="error-banner">{error}</div>;
  }

  if (reports.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <p>まだ分析履歴がありません。「分析」タブで実行してください。</p>
      </div>
    );
  }

  return (
    <div>
      {detailLoading && (
        <div className="loading">
          <div className="spinner" />
          <span>読み込み中...</span>
        </div>
      )}
      <div className="history-list">
        {reports.map((r) => {
          const health = HEALTH_LABELS[r.systemHealth];
          const time = new Date(r.fetchedAt).toLocaleString("ja-JP");
          return (
            <button
              key={r.id}
              className="history-card"
              onClick={() => void openDetail(r.id)}
              disabled={detailLoading}
            >
              <div className="history-card-top">
                <span className="mono history-id">#{r.id}</span>
                <span className={`history-health ${health.cls}`}>
                  {health.label}
                </span>
                <span className="history-log-name">{r.logName}</span>
                {r.level && (
                  <span className="history-level">{r.level}</span>
                )}
              </div>
              <div className="history-card-bottom">
                <span className="history-time">{time}</span>
                <span className="history-stats">
                  {r.eventCount} events &middot; {r.issueCount} issues
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
