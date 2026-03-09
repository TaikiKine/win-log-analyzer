import { app, BrowserWindow, dialog, ipcMain } from "electron";
import path from "node:path";
import { startServer, stopServer, serverEvents } from "./server-process";
import { initTray, destroyTray, refreshTray } from "./tray";
import { restoreWindowBounds, saveWindowBounds, getApiKey, setApiKey } from "./window-state";

const isDev = !app.isPackaged;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 960,
    height: 700,
    show: false,
    title: "Win Log Analyzer",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.once("ready-to-show", () => win.show());

  // app.whenReady() 後に呼ばれるので screen API が使える
  restoreWindowBounds(win);

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    // prod: extraResources で process.resourcesPath/client/dist/ に配置される
    win.loadFile(path.join(process.resourcesPath, "client/dist/index.html"));
  }

  // ×ボタンで閉じてもウィンドウを非表示にするだけ（終了しない）
  win.on("close", (e) => {
    if (!isQuitting) {
      e.preventDefault();
      saveWindowBounds(win);
      win.hide();
    }
  });

  return win;
}

// トレイの「終了」または before-quit で true にする
let isQuitting = false;

// IPC: APIキーの取得・保存
ipcMain.handle("get-api-key", () => getApiKey());
ipcMain.handle("set-api-key", (_e, plaintext: string) => setApiKey(plaintext));

app.whenReady().then(async () => {
  try {
    console.log("[Main] サーバーを起動中...");
    await startServer(isDev, getApiKey());
    console.log("[Main] サーバー起動完了");

    const win = createWindow();
    initTray(win);

    // サーバーの状態変化をレンダラーへ転送し、トレイも同期する
    serverEvents.on("status-change", (running) => {
      if (!win.isDestroyed()) {
        win.webContents.send("server-status", running);
      }
      refreshTray(win);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await dialog.showErrorBox("起動エラー", `サーバーの起動に失敗しました:\n${msg}`);
    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  destroyTray();
  stopServer();
});

// macOS 以外はウィンドウを全て閉じても終了しない（トレイ常駐）
app.on("window-all-closed", () => {
  if (process.platform === "darwin") app.quit();
});
