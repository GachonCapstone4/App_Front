import { create } from "zustand";

export const useUiStore = create((set) => ({
  searchOpen: false,
  notificationOpen: false,
  profileOpen: false,
  setSearchOpen: (open) =>
    set(() => ({ searchOpen: open, notificationOpen: false, profileOpen: false })),
  setNotificationOpen: (open) =>
    set(() => ({ searchOpen: false, notificationOpen: open, profileOpen: false })),
  setProfileOpen: (open) =>
    set(() => ({ searchOpen: false, notificationOpen: false, profileOpen: open })),
}));
