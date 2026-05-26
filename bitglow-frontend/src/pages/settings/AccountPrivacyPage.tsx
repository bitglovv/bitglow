import SettingsSubPage from "./SettingsSubPage";

export default function AccountPrivacyPage() {
  return (
    <SettingsSubPage
      title="Account Privacy"
      description="Control profile visibility, message access, and social activity privacy."
      items={[
        { title: "Private Account", subtitle: "Only approved followers can see your posts." },
        { title: "Show Online Status", subtitle: "Let friends know when you are active." },
        { title: "Allow Message Requests", subtitle: "Receive requests from people you do not follow." },
        { title: "Hide Liked Posts", subtitle: "Keep your liked posts private." },
        { title: "Hide Followers / Following", subtitle: "Reduce public social graph visibility." },
        { title: "Screenshot Protection", subtitle: "Future protection placeholder." },
      ]}
    />
  );
}
