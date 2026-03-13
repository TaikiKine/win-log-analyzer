/** Severity levels for Windows Event Log */
export type LogLevel =
  | "Critical"
  | "Error"
  | "Warning"
  | "Information"
  | "Verbose";

/** Structured analysis result from Claude */
export interface AnalysisReport {
  summary: string;
  issues: AnalysisIssue[];
  systemHealth: "healthy" | "attention" | "critical";
}

export interface AnalysisIssue {
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  recommendation: string;
  relatedEventIds: number[];
}

/** API response wrapper */
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/** Analysis request body */
export interface AnalyzeRequest {
  logName?: string;
  maxEvents?: number;
  level?: LogLevel;
}

/** Full analysis response */
export interface AnalyzeResponse {
  report: AnalysisReport;
  eventCount: number;
  fetchedAt: string;
  reportId: number;
}

/** Summary of a stored report (for list view) */
export interface ReportSummary {
  id: number;
  logName: string;
  level: string | null;
  maxEvents: number;
  eventCount: number;
  systemHealth: "healthy" | "attention" | "critical";
  issueCount: number;
  fetchedAt: string;
}

/** Full stored report with complete analysis data */
export interface StoredReport extends ReportSummary {
  report: AnalysisReport;
}

/** Schedule record stored in DB */
export interface ScheduleRecord {
  id: number;
  logName: string;
  level: string | null;
  maxEvents: number;
  cronExpr: string;
  enabled: boolean;
  lastRunAt: string | null;
  createdAt: string;
}

/** Request body for creating a schedule */
export interface CreateScheduleRequest {
  logName?: string;
  level?: LogLevel;
  maxEvents?: number;
  cronExpr: string;
}

/** Diff result comparing two stored reports */
export interface DiffReport {
  oldReport: ReportSummary;
  newReport: ReportSummary;
  systemHealthChanged: boolean;
  oldSystemHealth: "healthy" | "attention" | "critical";
  newSystemHealth: "healthy" | "attention" | "critical";
  newIssues: AnalysisIssue[];
  ongoingIssues: AnalysisIssue[];
  resolvedIssues: AnalysisIssue[];
}
