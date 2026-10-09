import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, session } from "electron";
import { initializeDatabase, type ShawishDatabase } from "./database/init";
import { ensureDataDirectories, resolveDataPaths } from "./database/paths";
import { registerApiIpc } from "./ipc/api";
import { registerMediaIpc } from "./ipc/media";
import { registerSystemIpc } from "./ipc/system";
import { attachCloseGuard, registerWindowIpc } from "./ipc/window";
import {
  registerLocalMediaProtocol,
  registerLocalMediaScheme,
} from "./media/localMediaProtocol";
import { maybeRunAutoBackup } from "./services/backupService";
import { scanOperationalAlerts } from "./services/notificationsService";
import { getDatabase, setDatabase } from "./services/store";
import { createMainWindow, loadRenderer } from "./windows/createMainWindow";

registerLocalMediaScheme();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.APP_ROOT) {
  process.env.APP_ROOT = app.isPackaged
    ? app.getAppPath()
    : path.join(__dirname, "../..");
}
process.env.DIST = path.join(process.env.APP_ROOT, "dist");

let mainWindow: BrowserWindow | null = null;
let database: ShawishDatabase | null = null;
const dataPaths = resolveDataPaths();

function getMainWindow() {
  return mainWindow;
}

async function bootstrap() {
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === "media" || permission === "display-capture") {
      callback(true);
      return;
    }
    callback(false);
  });
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
    return permission === "media" || permission === "display-capture";
  });

  registerLocalMediaProtocol(() => dataPaths);
  ensureDataDirectories(dataPaths);
  database = await initializeDatabase(dataPaths);
  setDatabase(database);
  try {
    maybeRunAutoBackup(dataPaths);
    scanOperationalAlerts();
  } catch (error) {
    console.error("Startup maintenance failed:", error);
  }

  registerSystemIpc(() => database, () => dataPaths);
  registerMediaIpc(() => dataPaths);
  registerWindowIpc(getMainWindow);
  registerApiIpc(() => dataPaths);

  mainWindow = createMainWindow();
  attachCloseGuard(mainWindow, getMainWindow);
  await loadRenderer(mainWindow);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(bootstrap).catch((error) => {
  console.error("Failed to start SHAWISH:", error);
  app.quit();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  try {
    const store = getDatabase();
    store.persist();
    store.close();
  } catch {
    database?.persist();
    database?.close();
  }
  database = null;
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void bootstrap();
  }
});
