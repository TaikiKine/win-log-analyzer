import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { EventEmitter } from "node:events";
import type { ChildProcess } from "node:child_process";

// electron/dist/ から見たルートディレクトリ
const rootDir = path.join(__dirname, "../..");

// サーバーディレクトリ
const serverDir = path.join(rootDir, "server");

// tsx バイナリ（npm workspaces でルートに hoist される）
const tsxBin = path.join(
  rootDir,
  "node_modules/.bin",
  process.platform === "win32" ? "tsx.cmd" : "tsx",
);

/** サーバーの起動・停止を通知する EventEmitter */
class ServerEventEmitter extends EventEmitter {
  emit(event: "status-change", running: boolean): boolean {
    return super.emit(event, running);
  }
  on(event: "status-change", listener: (running: boolean) => void): this {
    return super.on(event, listener);
  }
}
export const serverEvents = new ServerEventEmitter();

let serverProcess: ChildProcess | null = null;

/**
 * /api/health に対して最大 maxAttempts 回ポーリングし、
 * サーバーが応答するまで待つ。
 */
function waitForServer(maxAttempts = 30, intervalMs = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryConnect = () => {
      const req = http.get("http://localhost:3001/api/health", (res) => {
        res.resume(); // ボディを読み捨てる
        if (res.statusCode === 200) {
          resolve();
        } else {
          scheduleRetry();
        }
      });

      req.setTimeout(1000, () => {
        req.destroy();
        scheduleRetry();
      });

      req.on("error", scheduleRetry);
    };

    const scheduleRetry = () => {
      if (++attempts >= maxAttempts) {
        reject(new Error(`サーバーが ${maxAttempts} 回試行後も起動しませんでした`));
      } else {
        setTimeout(tryConnect, intervalMs);
      }
    };

    tryConnect();
  });
}

/**
 * Hono サーバーを子プロセスとして起動し、
 * ヘルスチェックが通るまで待ってから resolve する。
 */
export function startServer(isDev: boolean): Promise<void> {
  if (serverProcess) return Promise.resolve(); // 多重起動防止

  serverProcess = isDev
    ? spawn(tsxBin, ["src/index.ts"], { cwd: serverDir })
    : spawn(process.execPath, ["dist/index.js"], { cwd: serverDir });

  serverProcess.stdout?.on("data", (d: Buffer) =>
    process.stdout.write(`[Server] ${d}`),
  );
  serverProcess.stderr?.on("data", (d: Buffer) =>
    process.stderr.write(`[Server] ${d}`),
  );

  serverProcess.on("exit", (code) => {
    console.log(`[Server] exited with code ${code}`);
    serverProcess = null;
    serverEvents.emit("status-change", false);
  });

  return waitForServer().then(() => {
    serverEvents.emit("status-change", true);
  });
}

/** サーバー子プロセスを停止する。 */
export function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    serverEvents.emit("status-change", false);
  }
}

/** サーバーが現在起動中かどうか。 */
export function isServerRunning(): boolean {
  return serverProcess !== null;
}
