import { LogOut, Menu } from "lucide-react";
export default function AdminHeader({ title, onMenu, onLogout }) {
  return (
    <header className="admin-header">
      <div className="admin-header-title">
        <button
          className="admin-icon-button admin-mobile-menu"
          aria-label="Open navigation"
          onClick={onMenu}
        >
          <Menu size={21} />
        </button>
        <span>
          Workspace <span className="admin-muted">/</span>{" "}
          <strong>{title}</strong>
        </span>
      </div>
      <button className="admin-button" onClick={onLogout}>
        <LogOut size={15} />
        Sign out
      </button>
    </header>
  );
}
