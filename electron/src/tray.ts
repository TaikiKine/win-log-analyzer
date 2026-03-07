import { Tray, Menu, nativeImage, app } from "electron";
import path from "node:path";
import type { BrowserWindow } from "electron";
import { startServer, stopServer, isServerRunning } from "./server-process";

let tray: Tray | null = null;

const iconPath = path.join(__dirname, "../assets/icon.png");

/** コンテキストメニューを組み立てて tray にセットする */
function buildMenu(win: BrowserWindow): void {
  const running = isServerRunning();

  const menu = Menu.buildFromTemplate([
    {
      label: "Win Log Analyzer",
      enabled: false,
    },
    { type: "separator" },
    {
      label: win.isVisible() ? "ウィンドウを非表示" : "ウィンドウを表示",
      click: () => {
        if (win.isVisible()) {
          win.hide();
        } else {
          win.show();
          win.focus();
        }
        // 表示状態が変わったのでメニューを再構築
        buildMenu(win);
      },
    },
    { type: "separator" },
    {
      label: running ? "サーバー: 起動中 ✓" : "サーバー: 停止中",
      click: async () => {
        if (running) {
          stopServer();
        } else {
          await startServer(!app.isPackaged);
        }
        buildMenu(win);
      },
    },
    { type: "separator" },
    {
      label: "終了",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray!.setContextMenu(menu);
}

/** トレイを初期化する */
export function initTray(win: BrowserWindow): void {
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  tray.setToolTip("Win Log Analyzer");

  // 左クリックでウィンドウ表示/非表示
  tray.on("click", () => {
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
    buildMenu(win);
  });

  buildMenu(win);
}

/** トレイのメニューを再描画する（外部から呼ぶ用） */
export function refreshTray(win: BrowserWindow): void {
  if (tray) buildMenu(win);
}

/** トレイを破棄する */
export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
