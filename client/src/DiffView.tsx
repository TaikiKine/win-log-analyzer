import { useState, useEffect, useCallback } from "react";
import type {
  ApiResponse,
  ReportSummary,
  DiffReport,
  AnalysisIssue,
} from "./types";

const HEALTH_LABELS = {
  healthy: "正常",
  attention: "要注意",
  critical: "要対応",
} as const;

export function DiffView() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [id1, setId1] = useState<string>("");
  const [id2, setId2] = useState<string>("");
  const [diff, setDiff] = useState<DiffReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/reports");
      const json: ApiResponse<ReportSummary[]> = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error ?? "取得失敗");
      setReports(json.data);
      if (json.data.length >= 2) {
        setId1(String(json.data[1].id));
        setId2(String(json.data[0].id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  const handleCompare = async () => {
    if (!id1 || !id2) return;
    setLoading(true);
    setError(null);
    setDiff(null);
    try {
      const res = await fetch(`/api/reports/diff/${id1}/${id2}`);
      const json: ApiResponse<DiffReport> = await res.json();
      if (!json.ok || !json.data) throw new Error(json.error ?? "比較失敗");
      setDiff(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "不明なエラー");
    } finally {
      setLoading(false);
    }
  };

  const reportOption = (r: ReportSummary) => {
    const time = new Date(r.fetchedAt).toLocaleString("ja-JP");
    return `#${r.id} ${r.logName} — ${time}`;
  };

  if (loadingList) {
    return (
      <div className="loading">
        <div className="spinner" />
        <span>読み込み中...</span>
      </div>
    );
  }

  if (reports.length < 2) {
    return (
      <div className="empty-state">
        <div className="icon">🔍</div>
        <p>差分比較には最低2件の分析履歴が必要です。</p>
      </div>
    );
  }

  return (
    <div>
      {/* セレクター */}
      <div className="diff-selector">
        <div className="field">
          <label>旧レポート</label>
          <select value={id1} onChange={(e) => setId1(e.target.value)}>
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {reportOption(r)}
              </option>
            ))}
          </select>
        </div>

        <div className="diff-arrow">→</div>

        <div className="field">
          <label>新レポート</label>
          <select value={id2} onChange={(e) => setId2(e.target.value)}>
            {reports.map((r) => (
              <option key={r.id} value={r.id}>
                {reportOption(r)}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn-analyze"
          onClick={() => void handleCompare()}
          disabled={loading || !id1 || !id2 || id1 === id2}
        >
          {loading ? "比較中..." : "比較"}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && (
        <div className="loading">
          <div className="spinner" />
          <span>差分を計算しています...</span>
        </div>
      )}

      {diff && <DiffResult diff={diff} />}
    </div>
  );
}

function DiffResult({ diff }: { diff: DiffReport }) {
  const oldTime = new Date(diff.oldReport.fetchedAt).toLocaleString("ja-JP");
  const newTime = new Date(diff.newReport.fetchedAt).toLocaleString("ja-JP");

  return (
    <div className="diff-result">
      {/* ヘッダー */}
      <div className="diff-meta">
        <span className="mono">#{diff.oldReport.id} {oldTime}</span>
        <span className="diff-meta-arrow">→</span>
        <span className="mono">#{diff.newReport.id} {newTime}</span>
      </div>

      {/* システム状態の変化 */}
      {diff.systemHealthChanged && (
        <div className="diff-health-change">
          <span className={`history-health ${diff.oldSystemHealth}`}>
            {HEALTH_LABELS[diff.oldSystemHealth]}
          </span>
          <span className="diff-meta-arrow">→</span>
          <span className={`history-health ${diff.newSystemHealth}`}>
            {HEALTH_LABELS[diff.newSystemHealth]}
          </span>
          <span className="diff-health-note">システム状態が変化しました</span>
        </div>
      )}

      {/* サマリーバー */}
      <div className="diff-summary-bar">
        <span className="diff-count new">+{diff.newIssues.length} 新規</span>
        <span className="diff-count ongoing">{diff.ongoingIssues.length} 継続</span>
        <span className="diff-count resolved">-{diff.resolvedIssues.length} 解消</span>
      </div>

      {/* 新規 issues */}
      {diff.newIssues.length > 0 && (
        <DiffSection
          title="新規"
          status="new"
          issues={diff.newIssues}
        />
      )}

      {/* 継続 issues */}
      {diff.ongoingIssues.length > 0 && (
        <DiffSection
          title="継続"
          status="ongoing"
          issues={diff.ongoingIssues}
        />
      )}

      {/* 解消 issues */}
      {diff.resolvedIssues.length > 0 && (
        <DiffSection
          title="解消"
          status="resolved"
          issues={diff.resolvedIssues}
        />
      )}

      {diff.newIssues.length === 0 &&
        diff.ongoingIssues.length === 0 &&
        diff.resolvedIssues.length === 0 && (
          <div className="no-issues">変化はありません</div>
        )}
    </div>
  );
}

function DiffSection({
  title,
  status,
  issues,
}: {
  title: string;
  status: "new" | "ongoing" | "resolved";
  issues: AnalysisIssue[];
}) {
  return (
    <div className="diff-section">
      <div className={`diff-section-title ${status}`}>{title}</div>
      {issues.map((issue, i) => (
        <div key={i} className={`issue-card diff-issue-card ${status}`}>
          <div className="issue-header">
            <div className={`severity-dot ${issue.severity}`} />
            <span className="issue-title">{issue.title}</span>
          </div>
          <p className="issue-description">{issue.description}</p>
          {status !== "resolved" && (
            <div className="issue-recommendation">{issue.recommendation}</div>
          )}
          {issue.relatedEventIds.length > 0 && (
            <div className="issue-event-ids">
              関連イベントID: {issue.relatedEventIds.join(", ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
