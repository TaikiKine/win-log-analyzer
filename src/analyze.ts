import Anthropic from "@anthropic-ai/sdk";
import type { AnalysisReport } from "./types.js";

const SYSTEM_PROMPT = `あなたは Windows システム管理の専門家です。
Windows Event Log の内容を分析し、以下の JSON 形式で回答してください。
日本語で回答してください。

\`\`\`json
{
  "summary": "全体の要約（2〜3文）",
  "issues": [
    {
      "severity": "critical | warning | info",
      "title": "問題のタイトル",
      "description": "何が起こっているかの説明",
      "recommendation": "推奨される対応",
      "relatedEventIds": [イベントID]
    }
  ],
  "systemHealth": "healthy | attention | critical"
}
\`\`\`

分析のポイント:
- 繰り返し発生しているエラーのパターンを特定する
- 深刻度が高い順に issues を並べる
- 具体的で実行可能な recommendation を書く
- 正常な動作と思われるログは issues に含めない
- JSON のみを返し、それ以外のテキストは含めない`;

export async function analyzeLogs(logsText: string): Promise<AnalysisReport> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY が設定されていません。.env ファイルを確認してください。"
    );
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `以下の Windows Event Log を分析してください:\n\n${logsText}`,
      },
    ],
  });

  // レスポンスからテキストを抽出
  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("API からテキストレスポンスが返されませんでした");
  }

  // JSON パース (```json ... ``` で囲まれている場合も対応)
  const jsonStr = textBlock.text
    .replace(/^```json\s*/m, "")
    .replace(/```\s*$/m, "")
    .trim();

  return JSON.parse(jsonStr) as AnalysisReport;
}
