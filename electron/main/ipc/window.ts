import { BrowserWindow, ipcMain } from "electron";

const forceCloseByWindow = new WeakMap<BrowserWindow, boolean>();

export function registerWindowIpc(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle("window:minimize", () => {
    getMainWindow()?.minimize();
  });

  ipcMain.handle("window:maximize", () => {
    getMainWindow()?.maximize();
  });

  ipcMain.handle("window:unmaximize", () => {
    getMainWindow()?.unmaximize();
  });

  ipcMain.handle("window:isMaximized", () => getMainWindow()?.isMaximized() ?? false);

  ipcMain.handle("print:html", async (_event, payload: unknown) => {
    const { title, html } = (payload ?? {}) as { title?: string; html?: string };
    if (!html) throw new Error("Nothing to print.");
    const win = new BrowserWindow({
      width: 860,
      height: 980,
      minWidth: 640,
      minHeight: 480,
      title: title || "Print",
      backgroundColor: "#ffffff",
      autoHideMenuBar: true,
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
      },
    });
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    win.show();
    win.focus();
  });

  ipcMain.handle("window:close", () => {
    const win = getMainWindow();
    if (!win) return;
    win.webContents.send("window:closeRequested");
  });

  ipcMain.on("window:closeAllow", () => {
    const win = getMainWindow();
    if (!win) return;
    forceCloseByWindow.set(win, true);
    win.close();
  });
}

export function attachCloseGuard(
  win: BrowserWindow,
  getMainWindow: () => BrowserWindow | null,
): void {
  win.on("close", (event) => {
    if (win !== getMainWindow()) return;
    if (forceCloseByWindow.get(win)) {
      forceCloseByWindow.delete(win);
      return;
    }
    event.preventDefault();
    win.webContents.send("window:closeRequested");
  });
}
