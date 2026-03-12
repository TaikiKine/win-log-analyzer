/**
 * API のベース URL。
 * file:// で読み込まれる Electron prod 環境では絶対 URL が必要。
 * dev (Vite proxy) やブラウザ直アクセスでは相対パスのままでよい。
 */
export const API_BASE =
  location.protocol === "file:" ? "http://localhost:3001" : "";
