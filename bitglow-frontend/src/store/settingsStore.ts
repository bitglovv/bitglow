import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppTheme = "dark" | "white";

interface SettingsState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;

}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "dark",
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
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
