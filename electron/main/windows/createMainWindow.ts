import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, nativeImage, type NativeImage } from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function resolveWindowIcon(): NativeImage | undefined {
  const candidates = [
    path.join(process.resourcesPath, "icon.png"),
    path.join(process.env.APP_ROOT ?? "", "build", "icon.png"),
    path.join(app.getAppPath(), "build", "icon.png"),
    path.join(__dirname, "../../build/icon.png"),
  ];
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return nativeImage.createFromPath(candidate);
    }
  }
  return undefined;
}

export function createMainWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, "../preload/preload.js");
  const icon = resolveWindowIcon();

  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: "SHAWISH",
    backgroundColor: "#0a0d10",
    show: false,
    frame: false,
    autoHideMenuBar: true,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => {
    win.show();
  });

  return win;
}

export async function loadRenderer(win: BrowserWindow): Promise<void> {
  if (process.env.VITE_DEV_SERVER_URL) {
    await win.loadURL(process.env.VITE_DEV_SERVER_URL);
    if (process.env.SHAWISH_OPEN_DEVTOOLS === "1") {
      win.webContents.openDevTools({ mode: "detach" });
    }
    return;
  }

  await win.loadFile(path.join(process.env.APP_ROOT!, "dist/index.html"));
}
