import SettingsSubPage from "./SettingsSubPage";

export default function ArchivedPostsPage() {
  return (
    <SettingsSubPage
      title="Archived Posts"
      description="Archived posts stay private until you restore them."
      items={[
        { title: "Archive", subtitle: "No archived posts yet." },
      ]}
    />
  );
}
