import { create } from "zustand";
import { fetchAppSettings, type AppSettingsMap } from "@/services/settingsApi";

type AppSettingsState = {
  settings: AppSettingsMap | null;
  loadSettings: () => Promise<void>;
  setSettings: (next: AppSettingsMap) => void;
};

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  settings: null,
  loadSettings: async () => {
    try {
      const settings = await fetchAppSettings();
      set({ settings });
    } catch {
      set({ settings: null });
    }
  },
  setSettings: (settings) => set({ settings }),
}));
