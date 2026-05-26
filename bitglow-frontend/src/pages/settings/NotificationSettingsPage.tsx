import SettingsSubPage from "./SettingsSubPage";

export default function NotificationSettingsPage() {
  return (
    <SettingsSubPage
      title="Notifications"
      description="Choose which BitGlow activity can notify you."
      items={[
        { title: "Likes", subtitle: "Activity on posts you shared." },
        { title: "Comments", subtitle: "Replies and conversations on your posts." },
        { title: "Mentions", subtitle: "When someone mentions your username." },
        { title: "Follows", subtitle: "New followers and follow requests." },
        { title: "Messages", subtitle: "Direct message notifications." },
        { title: "Message Requests", subtitle: "Requests from people outside your friends." },
        { title: "Reposts", subtitle: "When someone shares your post." },
        { title: "Story Notifications", subtitle: "Updates from close friends." },
        { title: "Push Notifications", subtitle: "Device notifications." },
        { title: "Email Notifications", subtitle: "Email summaries and alerts." },
      ]}
    />
  );
}
