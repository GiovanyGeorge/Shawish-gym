import { contextBridge, ipcRenderer } from "electron";

type AppPaths = {
  data_dir: string;
  database_path: string;
  backups_dir: string;
  uploads_dir: string;
  logs_dir: string;
};

type AppInfo = {
  product_name: string;
  version: string;
  database_ready: boolean;
};

const shawish = {
  system: {
    getAppPaths: (): Promise<AppPaths> => ipcRenderer.invoke("system:getAppPaths"),
    getAppInfo: (): Promise<AppInfo> => ipcRenderer.invoke("system:getAppInfo"),
  },
  api: {
    invoke: <T>(channel: string, payload?: unknown): Promise<T> =>
      ipcRenderer.invoke(channel, payload),
  },
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke("window:minimize"),
    maximize: (): Promise<void> => ipcRenderer.invoke("window:maximize"),
    unmaximize: (): Promise<void> => ipcRenderer.invoke("window:unmaximize"),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke("window:isMaximized"),
    close: (): Promise<void> => ipcRenderer.invoke("window:close"),
    async toggleMaximize(): Promise<void> {
      const maximized = await ipcRenderer.invoke("window:isMaximized");
      if (maximized) {
        await ipcRenderer.invoke("window:unmaximize");
      } else {
        await ipcRenderer.invoke("window:maximize");
      }
    },
  },
  print: {
    open: (payload: { title: string; html: string }): Promise<void> =>
      ipcRenderer.invoke("print:html", payload),
  },
  onCloseRequested(handler: () => boolean | Promise<boolean>): () => void {
    const listener = async () => {
      const allow = await handler();
      if (allow) {
        ipcRenderer.send("window:closeAllow");
      }
    };

    ipcRenderer.on("window:closeRequested", listener);
    return () => {
      ipcRenderer.removeListener("window:closeRequested", listener);
    };
  },
};

contextBridge.exposeInMainWorld("shawish", shawish);
