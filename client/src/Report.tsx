import type { AnalyzeResponse, AnalysisIssue } from "./types";

const HEALTH_LABELS = {
  healthy: { label: "正常", icon: "✅" },
  attention: { label: "要注意", icon: "⚠️" },
  critical: { label: "要対応", icon: "🚨" },
} as const;

interface ReportProps {
  data: AnalyzeResponse;
}

export function Report({ data }: ReportProps) {
  const { report, eventCount, fetchedAt } = data;
  const health = HEALTH_LABELS[report.systemHealth];
  const fetchedTime = new Date(fetchedAt).toLocaleString("ja-JP");

  return (
    <div className="report">
      <div className="report-meta">
        <span>{eventCount} 件のイベントを分析</span>
        <span>{fetchedTime}</span>
      </div>

      <div className={`health-badge ${report.systemHealth}`}>
        <span>{health.icon}</span>
        <span>システム状態: {health.label}</span>
      </div>

      <div className="summary">{report.summary}</div>

      <div className="issues-header">
        検出された問題 ({report.issues.length}件)
      </div>

      {report.issues.length === 0 ? (
        <div className="no-issues">特に問題は検出されませんでした</div>
      ) : (
        report.issues.map((issue, i) => <IssueCard key={i} issue={issue} />)
      )}
    </div>
  );
}

function IssueCard({ issue }: { issue: AnalysisIssue }) {
  return (
    <div className="issue-card">
      <div className="issue-header">
        <div className={`severity-dot ${issue.severity}`} />
        <span className="issue-title">{issue.title}</span>
      </div>
      <p className="issue-description">{issue.description}</p>
      <div className="issue-recommendation">{issue.recommendation}</div>
      {issue.relatedEventIds.length > 0 && (
        <div className="issue-event-ids">
          関連イベントID: {issue.relatedEventIds.join(", ")}
        </div>
      )}
    </div>
  );
}
