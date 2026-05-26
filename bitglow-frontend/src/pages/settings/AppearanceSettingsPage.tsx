import SettingsSubPage from "./SettingsSubPage";

export default function AppearanceSettingsPage() {
  return (
    <SettingsSubPage
      title="Appearance"
      description="Tune BitGlow's visual density, color, and accessibility preferences."
      items={[
        { title: "Accent Color", subtitle: "Glow, blue, rose, or violet." },
        { title: "Theme Mode", subtitle: "Dark, light, or system." },
        { title: "Font Size", subtitle: "Small, default, or large." },
        { title: "Compact Mode", subtitle: "Show more content on screen." },
        { title: "Reduce Animations", subtitle: "Use calmer transitions." },
        { title: "Data Saver Mode", subtitle: "Reduce media and network usage." },
        { title: "High Contrast Mode", subtitle: "Increase contrast for readability." },
      ]}
    />
  );
}
