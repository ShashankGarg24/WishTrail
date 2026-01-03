import { Shield, Palette, UserX, Bell, Lock } from "lucide-react";
import { lazy, Suspense } from "react";
const PrivacySettings = lazy(() => import("../components/settings/PrivacySettings"));
const ThemeSettings = lazy(() => import("../components/settings/ThemeSettings"));
const BlockedUsers = lazy(() => import("../components/settings/BlockedUsersSettings"));
const NotificationsSettings = lazy(() => import("../components/settings/NotificationsSettings"));
const PasswordSettings = lazy(() => import("../components/settings/PasswordSettings"));
const SettingsLayoutModal = lazy(() => import("../components/settings/SettingsLayoutModal"));

export default function SettingsPage() {
  const sections = [
    { id: "privacy", label: "Privacy", icon: Shield, component: <Suspense fallback={null}><PrivacySettings /></Suspense> },
    { id: "theme", label: "Theme", icon: Palette, component: <Suspense fallback={null}><ThemeSettings /></Suspense> },
    { id: "blocked", label: "Blocked", icon: UserX, component: <Suspense fallback={null}><BlockedUsers /></Suspense> },
    // { id: "notifications", label: "Notifications", icon: Bell, component: <Suspense fallback={null}><NotificationsSettings /></Suspense> },
    { id: "password", label: "Password", icon: Lock, component: <Suspense fallback={null}><PasswordSettings /></Suspense> },
  ];

  return <Suspense fallback={null}><SettingsLayoutModal sections={sections} initial="privacy" /></Suspense>;
}
