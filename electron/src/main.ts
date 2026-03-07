import { app, BrowserWindow } from "electron";
import path from "node:path";

// パッケージ化されていない = 開発モード
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
    // Vite dev server (HMR 有効)
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    // ビルド済み React assets を file:// でロード
    win.loadFile(path.join(__dirname, "../../client/dist/index.html"));
  }

  return win;
}

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});
