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
