import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Target,
  Repeat2,
  Flag,
  Mail,
  FileText,
  Settings,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { adminPath } from "./config";

const groups = [
  { label: "Workspace", items: [["", "Overview", LayoutDashboard]] },
  { label: "People", items: [["users", "Users", Users]] },
  {
    label: "Content",
    items: [
      ["goals", "Goals", Target],
      ["habits", "Habits", Repeat2],
      ["reports", "Reports", Flag],
    ],
  },
  { label: "Engagement", items: [["campaigns", "Campaigns", Mail]] },
  {
    label: "Product",
    items: [
      ["releases", "Releases", FileText],
      ["product-control", "Product Control", Settings],
    ],
  },
];

export default function AdminSidebar({ onNavigate }) {
  return (
    <div className="admin-sidebar-content">
      <NavLink to={adminPath()} className="admin-brand" onClick={onNavigate}>
        <span className="admin-brand-icon">
          <Target size={23} />
        </span>
        <span>
          WishTrail<small>OPERATIONS CONSOLE</small>
        </span>
      </NavLink>
      <nav aria-label="Admin navigation">
        {groups.map((group) => (
          <div className="admin-nav-group" key={group.label}>
            <p>{group.label}</p>
            {group.items.map(([path, label, Icon]) => (
              <NavLink
                key={path}
                end={!path}
                to={adminPath(path)}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `admin-nav-link ${isActive ? "is-active" : ""}`
                }
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <div className="admin-sidebar-footer">
        <div>
          <ShieldCheck size={17} />
          <span>Admin workspace</span>
        </div>
        <a href="/" target="_blank" rel="noreferrer">
          Open WishTrail
          <ArrowUpRight size={16} />
        </a>
      </div>
    </div>
  );
}
