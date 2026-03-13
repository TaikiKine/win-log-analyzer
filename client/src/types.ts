// 全型定義は shared パッケージが正。既存の import パスを変えずに済むよう re-export する。
export type {
  LogLevel,
  AnalysisReport,
  AnalysisIssue,
  ApiResponse,
  AnalyzeResponse,
  ReportSummary,
  StoredReport,
  ScheduleRecord,
  DiffReport,
} from "win-log-analyzer-shared";
