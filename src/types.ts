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

/** Severity levels for Windows Event Log */
export type LogLevel = "Critical" | "Error" | "Warning" | "Information" | "Verbose";

/** Configuration for log fetching */
export interface FetchConfig {
  logName: string;       // System, Application, Security
  maxEvents: number;
  level?: LogLevel;
}

/** Structured analysis result from Claude */
export interface AnalysisReport {
  summary: string;
  issues: {
    severity: "critical" | "warning" | "info";
    title: string;
    description: string;
    recommendation: string;
    relatedEventIds: number[];
  }[];
  systemHealth: "healthy" | "attention" | "critical";
}
