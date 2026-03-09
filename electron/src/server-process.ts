import { spawn } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { EventEmitter } from "node:events";
import { utilityProcess } from "electron";
import type { ChildProcess } from "node:child_process";

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

/** kill() を持つ共通インターフェース（ChildProcess / UtilityProcess 両対応） */
interface ProcessHandle {
  kill(): void | boolean;
}

let serverProcess: ProcessHandle | null = null;

// ---- パス解決 ----

function getDevPaths() {
  // electron/dist/main.js → ../../ = root/
  const serverDir = path.join(__dirname, "../../server");
  return {
    cwd: serverDir,
    // tsx は server ワークスペース内に留まる（root へ hoist されない）
    cmd: path.join(
      serverDir,
      "node_modules/.bin",
      process.platform === "win32" ? "tsx.cmd" : "tsx",
    ),
    args: ["src/index.ts"] as string[],
  };
}

function getProdPaths() {
  // process.resourcesPath = <install>/resources/
  const serverDir = path.join(process.resourcesPath, "server");
  return {
    serverDir,
    scriptPath: path.join(serverDir, "dist/index.js"),
  };
}

// ---- ヘルスチェック ----

function waitForServer(maxAttempts = 30, intervalMs = 500): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const tryConnect = () => {
      const req = http.get("http://localhost:3001/api/health", (res) => {
        res.resume();
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

// ---- プロセス起動 ----

function spawnDev(apiKey: string | null): ProcessHandle {
  const { cwd, cmd, args } = getDevPaths();
  // Windows では .cmd ファイルを直接 spawn できないため shell: true が必要
  const proc: ChildProcess = spawn(cmd, args, {
    cwd,
    shell: process.platform === "win32",
    env: {
      ...process.env,
      ...(apiKey ? { ANTHROPIC_API_KEY: apiKey } : {}),
    },
  });

  proc.stdout?.on("data", (d: Buffer) => process.stdout.write(`[Server] ${d}`));
  proc.stderr?.on("data", (d: Buffer) => process.stderr.write(`[Server] ${d}`));
  proc.on("exit", (code) => {
    console.log(`[Server] exited with code ${code}`);
    serverProcess = null;
    serverEvents.emit("status-change", false);
  });

  return proc;
}

function spawnProd(apiKey: string | null): ProcessHandle {
  const { serverDir, scriptPath } = getProdPaths();

  const proc = utilityProcess.fork(scriptPath, [], {
    stdio: "pipe",
    cwd: serverDir,
    env: {
      ...process.env,
      NODE_PATH: path.join(serverDir, "node_modules"),
      ...(apiKey ? { ANTHROPIC_API_KEY: apiKey } : {}),
    },
  });

  proc.stdout?.on("data", (d: Buffer) => process.stdout.write(`[Server] ${d}`));
  proc.stderr?.on("data", (d: Buffer) => process.stderr.write(`[Server] ${d}`));
  proc.on("exit", (code: number) => {
    console.log(`[Server] exited with code ${code}`);
    serverProcess = null;
    serverEvents.emit("status-change", false);
  });

  return proc;
}

// ---- 公開 API ----

export async function startServer(isDev: boolean, apiKey: string | null = null): Promise<void> {
  if (serverProcess) return;

  serverProcess = isDev ? spawnDev(apiKey) : spawnProd(apiKey);

  return waitForServer().then(() => {
    serverEvents.emit("status-change", true);
  });
}

export function stopServer(): void {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
    serverEvents.emit("status-change", false);
  }
}

export function isServerRunning(): boolean {
  return serverProcess !== null;
}
