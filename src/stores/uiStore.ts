import { create } from "zustand";

type UiState = {
  notificationsOpen: boolean;
  unsavedChanges: boolean;
  unreadCount: number;
  setNotificationsOpen: (open: boolean) => void;
  setUnsavedChanges: (dirty: boolean) => void;
  setUnreadCount: (count: number) => void;
};

export const useUiStore = create<UiState>((set) => ({
  notificationsOpen: false,
  unsavedChanges: false,
  unreadCount: 0,
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
  setUnsavedChanges: (dirty) => set({ unsavedChanges: dirty }),
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
