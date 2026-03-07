import { app, BrowserWindow, dialog } from "electron";
import path from "node:path";
import { startServer, stopServer } from "./server-process";

const isDev = !app.isPackaged;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 960,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../../client/dist/index.html"));
  }

  return win;
}

app.whenReady().then(async () => {
  try {
    console.log("[Main] サーバーを起動中...");
    await startServer(isDev);
    console.log("[Main] サーバー起動完了");
    createWindow();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await dialog.showErrorBox("起動エラー", `サーバーの起動に失敗しました:\n${msg}`);
    app.quit();
  }
});

app.on("before-quit", () => {
  stopServer();
});

app.on("window-all-closed", () => {
  app.quit();
});
