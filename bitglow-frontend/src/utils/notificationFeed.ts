import type { Notification } from "../services/api";

/** Shown in the social activity feed (excludes DMs). */
export const ACTIVITY_NOTIFICATION_TYPES = new Set<string>([
    "like",
    "comment",
    "follow",
    "follow_back",
    "follow_request",
    "mention",
]);

export type ActivityNotification =
    | Extract<Notification, { type: "like" }>
    | Extract<Notification, { type: "comment" }>
    | Extract<Notification, { type: "follow_request" }>
    | Extract<Notification, { type: "follow" }>
    | Extract<Notification, { type: "follow_back" }>
    | Extract<Notification, { type: "mention" }>;

export function isActivityNotification(n: Notification): n is ActivityNotification {
    return ACTIVITY_NOTIFICATION_TYPES.has(n.type);
}

export function notificationStableId(n: {
    id?: string;
    type: string;
    user: { id: string };
    createdAt: string;
}): string {
    if (n.id) return n.id;
    return `${n.type}-${n.user.id}-${new Date(n.createdAt).getTime()}`;
}

export const NOTIFICATIONS_UPDATED_EVENT = "bitglow:notifications-updated";

export function dispatchNotificationsUpdated() {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATED_EVENT));
}
