import { ipcMain } from "electron";
import type { ShawishDatabase } from "../database/init";
import type { DataPaths } from "../database/paths";

export type AppInfo = {
  product_name: string;
  version: string;
  database_ready: boolean;
};

export function registerSystemIpc(
  getDatabase: () => ShawishDatabase | null,
  getPaths: () => DataPaths,
): void {
  ipcMain.handle("system:getAppPaths", () => getPaths());

  ipcMain.handle("system:getAppInfo", (): AppInfo => {
    const database = getDatabase();
    return {
      product_name: "SHAWISH",
      version: process.env.npm_package_version ?? "0.1.0",
      database_ready: database != null,
    };
  });
}
