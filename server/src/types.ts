// 共通型は shared パッケージから re-export
export type {
  LogLevel,
  AnalysisReport,
  AnalysisIssue,
  ApiResponse,
  AnalyzeRequest,
  AnalyzeResponse,
  ReportSummary,
  StoredReport,
  ScheduleRecord,
  CreateScheduleRequest,
  DiffReport,
} from "win-log-analyzer-shared";

// Server 固有の型

/** Windows Event Log entry as returned by Get-WinEvent | ConvertTo-Json */
export interface WinEvent {
  Id: number;
  Version: number | null;
  LogName: string;
  ProviderName: string;
  LevelDisplayName: string | null;
  Level: number;
  TimeCreated: string;
  Message: string;
  MachineName: string;
  TaskDisplayName: string | null;
}

/** Configuration for log fetching */
export interface FetchConfig {
  logName: string;
  maxEvents: number;
  level?: LogLevel;
}
