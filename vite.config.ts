import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron/simple";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: "electron/main/main.ts",
        vite: {
          build: {
            outDir: "dist-electron/main",
            rollupOptions: {
              external: ["electron", "sql.js", "node:fs", "node:path", "node:os", "node:url"],
            },
          },
        },
      },
      preload: {
        input: "electron/preload/preload.ts",
        vite: {
          build: {
            outDir: "dist-electron/preload",
            rollupOptions: {
              output: {
                format: "cjs",
                entryFileNames: "preload.js",
              },
            },
          },
        },
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
}));
