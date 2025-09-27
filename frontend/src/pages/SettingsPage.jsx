import { Shield, Palette, UserX, Bell, Lock } from "lucide-react";
import PrivacySettings from "../components/settings/PrivacySettings";
import ThemeSettings from "../components/settings/ThemeSettings";
import BlockedUsers from "../components/settings/BlockedUsersSettings";
import NotificationsSettings from "../components/settings/NotificationsSettings";
import PasswordSettings from "../components/settings/PasswordSettings";
import SettingsLayoutModal from "../components/settings/SettingsLayoutModal";

export default function SettingsPage() {
  const sections = [
    { id: "privacy", label: "Privacy", icon: Shield, component: <PrivacySettings /> },
    { id: "theme", label: "Theme", icon: Palette, component: <ThemeSettings /> },
    { id: "blocked", label: "Blocked", icon: UserX, component: <BlockedUsers /> },
    { id: "notifications", label: "Notifications", icon: Bell, component: <NotificationsSettings /> },
    { id: "password", label: "Password", icon: Lock, component: <PasswordSettings /> },
  ];

  return <SettingsLayoutModal sections={sections} initial="privacy" />;
}
