import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../services/api";

export type AppTheme = "dark" | "white";

interface SettingsState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;

  privateAccount: boolean;
  setPrivateAccount: (isPrivate: boolean) => Promise<void>;

  onlineStatusVisible: boolean;
  setOnlineStatusVisible: (isVisible: boolean) => Promise<void>;

  hydrateFromUser: (isPrivate: boolean, onlineStatusVisible: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      privateAccount: false,
      setPrivateAccount: async (isPrivate) => {
        // Optimistic update, revert if API fails
        set({ privateAccount: isPrivate });
        try {
          await api.settings.updatePrivacy(isPrivate);
          // Refresh authoritative user profile from backend
          try {
            const freshUser = await api.auth.me();
            localStorage.setItem('user', JSON.stringify(freshUser));
            set({ privateAccount: !!freshUser.isPrivate, onlineStatusVisible: freshUser.onlineStatusVisible ?? true });
            try { window.dispatchEvent(new CustomEvent('bitglow:user-updated', { detail: freshUser })); } catch (e) {}
          } catch (refreshErr) {
            console.warn('Failed to refresh user after updating privacy', refreshErr);
          }
        } catch (error) {
          console.error("Failed to update privacy", error);
          // revert
          set({ privateAccount: !isPrivate });
          throw error;
        }
      },

      onlineStatusVisible: true,
      setOnlineStatusVisible: async (isVisible) => {
        // Optimistic update, revert if API fails
        set({ onlineStatusVisible: isVisible });
        try {
          await api.settings.updateOnlineStatus(isVisible);
          // Refresh authoritative user profile from backend to ensure persisted value is synced
          try {
            const freshUser = await api.auth.me();
            // Persist the updated user to localStorage so hydrations use the fresh value
            localStorage.setItem('user', JSON.stringify(freshUser));
            // Update settings store from authoritative user
            set({ privateAccount: !!freshUser.isPrivate, onlineStatusVisible: freshUser.onlineStatusVisible ?? true });
            // Notify interested parts of the app
            try { window.dispatchEvent(new CustomEvent('bitglow:user-updated', { detail: freshUser })); } catch (e) {}
          } catch (refreshErr) {
            // Non-fatal: keep optimistic value if refresh fails
            console.warn('Failed to refresh user after updating online status', refreshErr);
          }
        } catch (error) {
          console.error("Failed to update online status", error);
          set({ onlineStatusVisible: !isVisible });
          throw error;
        }
      },

      hydrateFromUser: (isPrivate, onlineStatusVisible) => {
        set({ privateAccount: isPrivate, onlineStatusVisible });
      },
    }),
    {
      name: "bitglow-settings",
      partialize: (state) => ({ theme: state.theme }), // Only persist theme locally
      merge: (persistedState: any, currentState) => {
        let theme = persistedState?.theme;
        if (theme === "amoled") theme = "dark";
        if (theme === "light") theme = "white";
        if (theme !== "dark" && theme !== "white") theme = "dark";
        return { ...currentState, ...persistedState, theme };
      },
    }
  )
);

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.classList.remove("theme-dark", "theme-white", "theme-amoled", "theme-light");
  root.classList.add(`theme-${theme}`);
}
