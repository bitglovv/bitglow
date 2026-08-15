import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../services/api";

export type AppTheme = "dark" | "white";

interface SettingsState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;

  onlineStatusVisible: boolean;
  setOnlineStatusVisible: (isVisible: boolean) => Promise<void>;

  hydrateFromUser: (onlineStatusVisible: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
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
            // Privacy belongs to AuthContext; this store only mirrors online status.
            set({ onlineStatusVisible: freshUser.onlineStatusVisible ?? true });
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

      hydrateFromUser: (onlineStatusVisible) => {
        set({ onlineStatusVisible });
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
