import type { AnalysisReport, AnalysisIssue, DiffReport, ReportSummary } from "./types.js";

export function computeDiff(
  oldSummary: ReportSummary,
  newSummary: ReportSummary,
  oldReport: AnalysisReport,
  newReport: AnalysisReport,
): DiffReport {
  const oldTitles = new Set(oldReport.issues.map((i) => i.title));
  const newTitles = new Set(newReport.issues.map((i) => i.title));

  const newIssues: AnalysisIssue[] = newReport.issues.filter(
    (i) => !oldTitles.has(i.title),
  );
  const ongoingIssues: AnalysisIssue[] = newReport.issues.filter((i) =>
    oldTitles.has(i.title),
  );
  const resolvedIssues: AnalysisIssue[] = oldReport.issues.filter(
    (i) => !newTitles.has(i.title),
  );

  return {
    oldReport: oldSummary,
    newReport: newSummary,
    systemHealthChanged: oldReport.systemHealth !== newReport.systemHealth,
    oldSystemHealth: oldReport.systemHealth,
    newSystemHealth: newReport.systemHealth,
    newIssues,
    ongoingIssues,
    resolvedIssues,
  };
}
