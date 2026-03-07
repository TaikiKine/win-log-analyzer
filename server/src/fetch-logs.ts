import { spawnSync } from "node:child_process";
import type { FetchConfig, WinEvent } from "./types.js";

/**
 * PowerShell スクリプトを Base64 エンコードして -EncodedCommand で実行する。
 */
function runPowerShell(psScript: string): {
  stdout: string;
  stderr: string;
  exitCode: number | null;
} {
  const utf16leBuffer = Buffer.from(psScript, "utf16le");
  const base64 = utf16leBuffer.toString("base64");

  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", base64],
    {
      maxBuffer: 10 * 1024 * 1024,
      timeout: 60_000,
    },
  );

  return {
    stdout: result.stdout?.toString("utf-8") ?? "",
    stderr: result.stderr?.toString("utf-8") ?? "",
    exitCode: result.status,
  };
}

/**
 * WSL 環境から powershell.exe を呼び出して Windows Event Log を取得する。
 */
export function fetchWindowsLogs(config: FetchConfig): WinEvent[] {
  const { logName, maxEvents, level } = config;

  // レベルフィルタがある場合は Get-WinEvent の -FilterHashtable を使う
  // （取得後にフィルタすると maxEvents 件中の該当分しか取れないため）
  const lines: string[] = [
    "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8",
    "$OutputEncoding = [System.Text.Encoding]::UTF8",
    "",
  ];

  const levelNum = level ? buildLevelFilter(level) : null;

  if (levelNum) {
    // FilterHashtable で取得時にフィルタ
    // Level 配列: 指定レベル以下（より深刻）を全て含める
    const levels = Array.from({ length: levelNum }, (_, i) => i + 1);
    lines.push(
      `$events = Get-WinEvent -FilterHashtable @{LogName='${logName}'; Level=${levels.join(",")}} -MaxEvents ${maxEvents} -ErrorAction SilentlyContinue`,
    );
  } else {
    lines.push(
      `$events = Get-WinEvent -LogName '${logName}' -MaxEvents ${maxEvents} -ErrorAction SilentlyContinue`,
    );
  }

  lines.push(
    "",
    "if ($null -eq $events -or $events.Count -eq 0) {",
    "  Write-Output '[]'",
    "} else {",
    "  $events | Select-Object Id, Version, LogName, ProviderName, LevelDisplayName, Level, TimeCreated, Message, MachineName, TaskDisplayName | ConvertTo-Json -Depth 3",
    "}",
  );

  const psScript = lines.join("\r\n");

  const { stdout, stderr, exitCode } = runPowerShell(psScript);

  if (exitCode !== 0) {
    console.error(`[DEBUG] PowerShell exit code: ${exitCode}`);
    console.error("[DEBUG] stderr:", stderr.slice(0, 1000));
  }

  const cleaned = stdout.replace(/^\uFEFF/, "").trim();

  if (!cleaned) {
    throw new Error(
      "PowerShell からの出力が空です。\n" +
        `exit code: ${exitCode}\n` +
        `stderr: ${stderr.slice(0, 500)}`,
    );
  }

  const parsed = JSON.parse(cleaned);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function buildLevelFilter(level: string): number | null {
  const levelMap: Record<string, number> = {
    Critical: 1,
    Error: 2,
    Warning: 3,
    Information: 4,
    Verbose: 5,
  };
  return levelMap[level] ?? null;
}

export function formatLogsForPrompt(events: WinEvent[]): string {
  return events
    .map((e, i) => {
      const time = parseWinEventTime(e.TimeCreated);
      const msg = (e.Message ?? "").slice(0, 300);
      return [
        `--- Event ${i + 1} ---`,
        `Time: ${time}`,
        `Source: ${e.ProviderName}`,
        `Level: ${e.LevelDisplayName ?? e.Level}`,
        `ID: ${e.Id}`,
        `Message: ${msg}`,
      ].join("\n");
    })
    .join("\n\n");
}

/**
 * .NET の JSON 日時形式 "/Date(ミリ秒)/" を ISO 文字列に変換する。
 * 通常の文字列が来た場合はそのまま返す。
 */
function parseWinEventTime(raw: string | undefined): string {
  if (!raw) return "unknown";
  const match = raw.match(/\/Date\((\d+)\)\//);
  if (match) {
    return new Date(Number(match[1])).toLocaleString("ja-JP");
  }
  return raw;
}
