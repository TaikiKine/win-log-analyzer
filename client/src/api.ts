import type { ApiResponse } from "./types";

const SERVER_PORT = 3001;

/**
 * API のベース URL。
 * file:// で読み込まれる Electron prod 環境では絶対 URL が必要。
 * dev (Vite proxy) やブラウザ直アクセスでは相対パスのままでよい。
 */
export const API_BASE =
  location.protocol === "file:" ? `http://localhost:${SERVER_PORT}` : "";

/**
 * fetch + JSON パース + ok チェックをまとめたヘルパー。
 * ok: false のときは error メッセージで reject する。
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  const json: ApiResponse<T> = await res.json();
  if (!json.ok || json.data === undefined) {
    throw new Error(json.error ?? "不明なエラー");
  }
  return json.data;
}
