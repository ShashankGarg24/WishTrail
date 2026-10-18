import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import Overlay from "./shared/Overlay";
import { ADMIN_BASE } from "./config";

export default function AdminLayout({ onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const location = useLocation();
  const section =
    location.pathname.slice(ADMIN_BASE.length).split("/").filter(Boolean)[0] ||
    "overview";
  const title =
    section === "product-control"
      ? "Product Control"
      : section.charAt(0).toUpperCase() + section.slice(1);
  return (
    <div className="admin-console">
      <a className="admin-skip-link" href="#admin-main">
        Skip to content
      </a>
      <aside className="admin-sidebar">
        <AdminSidebar />
      </aside>
      {mobileOpen && (
        <Overlay
          kind="navigation"
          title="Navigation"
          onClose={() => setMobileOpen(false)}
        >
          <AdminSidebar onNavigate={() => setMobileOpen(false)} />
        </Overlay>
      )}
      <div className="admin-workspace">
        <AdminHeader
          title={title}
          onMenu={() => setMobileOpen(true)}
          onLogout={onLogout}
        />
        <main id="admin-main" className="admin-main" tabIndex={-1}>
          <Outlet context={{ selectedUsers, setSelectedUsers }} />
        </main>
        <footer className="admin-workspace-footer">
          WishTrail · Dreams. Goals. Progress.
        </footer>
      </div>
    </div>
  );
}
