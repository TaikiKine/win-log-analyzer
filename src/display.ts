import type { AnalysisReport } from "./types.js";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

const SEVERITY_STYLE = {
  critical: { icon: "🔴", color: COLORS.red },
  warning: { icon: "🟡", color: COLORS.yellow },
  info: { icon: "🔵", color: COLORS.cyan },
} as const;

const HEALTH_STYLE = {
  healthy: { icon: "✅", label: "正常", color: COLORS.green },
  attention: { icon: "⚠️", label: "要注意", color: COLORS.yellow },
  critical: { icon: "🚨", label: "要対応", color: COLORS.red },
} as const;

export function displayReport(report: AnalysisReport): void {
  const health = HEALTH_STYLE[report.systemHealth];

  console.log("");
  console.log(
    `${COLORS.bold}══════════════════════════════════════════${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}  Windows Log Analysis Report${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}══════════════════════════════════════════${COLORS.reset}`
  );
  console.log("");

  // System Health
  console.log(
    `  システム状態: ${health.color}${health.icon} ${health.label}${COLORS.reset}`
  );
  console.log("");

  // Summary
  console.log(`${COLORS.bold}  📋 概要${COLORS.reset}`);
  console.log(`  ${report.summary}`);
  console.log("");

  // Issues
  if (report.issues.length === 0) {
    console.log(`  ${COLORS.green}特に問題は検出されませんでした。${COLORS.reset}`);
  } else {
    console.log(
      `${COLORS.bold}  🔍 検出された問題 (${report.issues.length}件)${COLORS.reset}`
    );
    console.log("");

    for (const issue of report.issues) {
      const style = SEVERITY_STYLE[issue.severity];
      console.log(
        `  ${style.icon} ${style.color}${COLORS.bold}${issue.title}${COLORS.reset}`
      );
      console.log(`     ${issue.description}`);
      console.log(
        `     ${COLORS.green}→ 推奨: ${issue.recommendation}${COLORS.reset}`
      );
      if (issue.relatedEventIds.length > 0) {
        console.log(
          `     ${COLORS.gray}関連イベントID: ${issue.relatedEventIds.join(", ")}${COLORS.reset}`
        );
      }
      console.log("");
    }
  }

  console.log(
    `${COLORS.gray}  分析時刻: ${new Date().toLocaleString("ja-JP")}${COLORS.reset}`
  );
  console.log(
    `${COLORS.bold}══════════════════════════════════════════${COLORS.reset}`
  );
  console.log("");
}
