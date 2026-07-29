import { api, Friend, User } from "../services/api";
import { useChatStore } from "../store/chatStore";

export type SocialTarget = Pick<User, "id" | "username" | "displayName" | "avatarUrl" | "isVerified">;

const toFriend = (user: SocialTarget): Friend => ({
  id: user.id,
  username: user.username,
  displayName: user.displayName,
  avatarUrl: user.avatarUrl,
  isVerified: user.isVerified,
});

export async function blockUserEverywhere(user: SocialTarget) {
  await api.settings.blockUser(user.id);
  useChatStore.getState().blockLocal(user.id);
  window.dispatchEvent(new CustomEvent("bitglow:block-changed", {
    detail: { userId: user.id, user: toFriend(user), blocked: true },
  }));
}

export async function unblockUserEverywhere(userId: string) {
  await api.settings.unblockUser(userId);
  useChatStore.getState().unblockLocal(userId);
  window.dispatchEvent(new CustomEvent("bitglow:block-changed", {
    detail: { userId, blocked: false },
  }));
}

export async function muteUserEverywhere(user: SocialTarget) {
  await api.settings.muteUser(user.id);
  useChatStore.getState().muteLocal(user.id);
  window.dispatchEvent(new CustomEvent("bitglow:mute-changed", {
    detail: { userId: user.id, user: toFriend(user), muted: true },
  }));
}

export async function unmuteUserEverywhere(userId: string) {
  await api.settings.unmuteUser(userId);
  useChatStore.getState().unmuteLocal(userId);
  window.dispatchEvent(new CustomEvent("bitglow:mute-changed", {
    detail: { userId, muted: false },
  }));
}

export async function reportUser(userId: string, reason: string) {
  await api.settings.reportProblem("account", reason, userId);
}
