import fs from "node:fs";
import path from "node:path";
import { net, protocol } from "electron";
import type { DataPaths } from "../database/paths";

const SCHEME = "shawish-media";

export function registerLocalMediaScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ]);
}

export function resolveSafeUploadFile(uploadsDir: string, relativePath: string): string | null {
  if (!relativePath.trim()) return null;
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) return null;
  const absolute = path.resolve(uploadsDir, normalized);
  const uploadsRoot = path.resolve(uploadsDir);
  if (!absolute.startsWith(uploadsRoot + path.sep) && absolute !== uploadsRoot) {
    return null;
  }
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    return null;
  }
  return absolute;
}

export function toLocalMediaUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath?.trim()) return null;
  return `${SCHEME}://photo?path=${encodeURIComponent(relativePath.replace(/\\/g, "/"))}`;
}

export function registerLocalMediaProtocol(getPaths: () => DataPaths): void {
  protocol.handle(SCHEME, (request) => {
    try {
      const url = new URL(request.url);
      const relative = url.searchParams.get("path");
      if (!relative) {
        return new Response("Missing path", { status: 400 });
      }
      const absolute = resolveSafeUploadFile(getPaths().uploads_dir, relative);
      if (!absolute) {
        return new Response("Not found", { status: 404 });
      }
      return net.fetch(`file:///${absolute.replace(/\\/g, "/")}`);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
  });
}
