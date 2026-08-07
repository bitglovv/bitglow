import { create } from "zustand";

type PresenceEntry = {
  isOnline: boolean;
  visible: boolean;
  ts: number;
};

type PresenceState = {
  presence: Record<string, PresenceEntry>;
  setPresence: (userId: string, isOnline: boolean, visible: boolean) => void;
  removePresence: (userId: string) => void;
  getPresence: (userId: string) => PresenceEntry | undefined;
};

export const usePresenceStore = create<PresenceState>((set, get) => ({
  presence: {},
  setPresence: (userId: string, isOnline: boolean, visible: boolean) =>
    set((s) => ({
      presence: {
        ...s.presence,
        [userId]: { isOnline, visible, ts: Date.now() },
      },
    })),
  removePresence: (userId: string) =>
    set((s) => {
      const next = { ...s.presence };
      delete next[userId];
      return { presence: next };
    }),
  getPresence: (userId: string) => get().presence[userId],
}));
