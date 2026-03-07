/**
 * Electron の preload.ts が contextBridge で公開する API の型宣言。
 * ブラウザで直接開いた場合は window.electronAPI が存在しないため optional にする。
 */
export {};

declare global {
  interface Window {
    electronAPI?: {
      onServerStatusChange: (callback: (running: boolean) => void) => () => void;
    };
  }
}
