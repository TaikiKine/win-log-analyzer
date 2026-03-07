import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  /**
   * サーバーの起動・停止状態の変化を受け取る。
   * 返り値の関数を呼ぶと購読を解除できる（useEffect の cleanup で使う）。
   */
  onServerStatusChange: (callback: (running: boolean) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, running: boolean) => callback(running);
    ipcRenderer.on("server-status", handler);
    return () => ipcRenderer.removeListener("server-status", handler);
  },
});
