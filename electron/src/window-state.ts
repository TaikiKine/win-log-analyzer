import Store from "electron-store";
import { screen, safeStorage } from "electron";
import type { BrowserWindow, Rectangle } from "electron";

interface AppStore {
  windowBounds: Partial<Rectangle> & { width: number; height: number };
  /** safeStorage で暗号化した APIキー (Base64) */
  apiKeyEncrypted?: string;
}

const store = new Store<AppStore>({
  defaults: {
    windowBounds: { width: 960, height: 700 },
  },
});

/** APIキーを safeStorage で暗号化して保存する */
export function setApiKey(plaintext: string): void {
  if (!plaintext) {
    store.delete("apiKeyEncrypted");
    return;
  }
  const encrypted = safeStorage.encryptString(plaintext);
  store.set("apiKeyEncrypted", encrypted.toString("base64"));
}

/** 保存された APIキーを復号して返す。未設定なら null */
export function getApiKey(): string | null {
  const b64 = store.get("apiKeyEncrypted");
  if (!b64) return null;
  try {
    return safeStorage.decryptString(Buffer.from(b64, "base64"));
  } catch {
    return null;
  }
}

/** 保存された座標が現在の画面領域内に収まっているか確認する */
function isWithinDisplays(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some((d) => {
    const { x, y, width, height } = d.workArea;
    return (
      bounds.x >= x &&
      bounds.y >= y &&
      bounds.x + bounds.width <= x + width &&
      bounds.y + bounds.height <= y + height
    );
  });
}

/** 前回のウィンドウ位置・サイズを復元する */
export function restoreWindowBounds(win: BrowserWindow): void {
  const saved = store.get("windowBounds");
  win.setSize(saved.width, saved.height);

  if (
    saved.x !== undefined &&
    saved.y !== undefined &&
    isWithinDisplays({ x: saved.x, y: saved.y, width: saved.width, height: saved.height })
  ) {
    win.setPosition(saved.x, saved.y);
  } else {
    win.center();
  }
}

/** ウィンドウの現在位置・サイズを保存する */
export function saveWindowBounds(win: BrowserWindow): void {
  store.set("windowBounds", win.getBounds());
}

/** store インスタンスを公開する（将来の設定項目追加用） */
export { store };
