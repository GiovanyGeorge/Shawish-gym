import type { AppInfo, AppPaths } from "@/types/system";

type ShawishWindowApi = {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  unmaximize: () => Promise<void>;
  isMaximized: () => Promise<boolean>;
  close: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
};

declare global {
  interface Window {
    shawish?: {
      system: {
        getAppPaths: () => Promise<AppPaths>;
        getAppInfo: () => Promise<AppInfo>;
      };
      api: {
        invoke: <T>(channel: string, payload?: unknown) => Promise<T>;
      };
      window: ShawishWindowApi;
      print?: {
        open: (payload: { title: string; html: string }) => Promise<void>;
      };
      onCloseRequested: (
        handler: () => boolean | Promise<boolean>,
      ) => () => void;
    };
  }
}

export {};
