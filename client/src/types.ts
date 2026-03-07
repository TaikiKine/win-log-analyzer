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

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface AnalyzeResponse {
  report: AnalysisReport;
  eventCount: number;
  fetchedAt: string;
  reportId: number;
}

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

export interface StoredReport extends ReportSummary {
  report: AnalysisReport;
}

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

export type LogLevel =
  | "Critical"
  | "Error"
  | "Warning"
  | "Information"
  | "Verbose";
