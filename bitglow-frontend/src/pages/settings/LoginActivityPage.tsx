import SettingsSubPage from "./SettingsSubPage";

export default function LoginActivityPage() {
  return (
    <SettingsSubPage
      title="Login Activity"
      description="Recent sign-ins and security events for your account."
      items={[
        { title: "Current Session", subtitle: "Active now on this device." },
        { title: "Recent Login", subtitle: "Login history will appear here." },
      ]}
    />
  );
}
