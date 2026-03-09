import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  onServerStatusChange: (callback: (running: boolean) => void): (() => void) => {
    const handler = (_: Electron.IpcRendererEvent, running: boolean) => callback(running);
    ipcRenderer.on("server-status", handler);
    return () => ipcRenderer.removeListener("server-status", handler);
  },

  getApiKey: (): Promise<string | null> => ipcRenderer.invoke("get-api-key"),
  setApiKey: (plaintext: string): Promise<void> => ipcRenderer.invoke("set-api-key", plaintext),
});
