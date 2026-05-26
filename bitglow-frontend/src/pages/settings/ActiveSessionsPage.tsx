import SettingsSubPage from "./SettingsSubPage";

export default function ActiveSessionsPage() {
  return (
    <SettingsSubPage
      title="Active Sessions"
      description="Manage devices currently signed into BitGlow."
      items={[
        { title: "This Device", subtitle: "Current active session." },
        { title: "Session Management", subtitle: "Remote logout support coming soon." },
      ]}
    />
  );
}
