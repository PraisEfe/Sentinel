import {
  Plus,
  Home,
  Search,
  Radio,
  Activity,
  ChartNoAxesColumn,
  Bell,
  Settings,
  CircleHelp,
  LogOut,
  X,
} from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import { workspacePathFor } from "../../routing/paths";
import Brand from "./Brand";
const navigation = [
  ["dashboard", "Home", Home],
  ["search", "Search", Search],
  ["monitors", "Monitors", Radio],
  ["intelligence", "Intelligence", Activity],
  ["analytics", "Analytics", ChartNoAxesColumn],
  ["alerts", "Alerts", Bell],
  ["settings", "Settings", Settings],
];
export default function Sidebar({
  isOpen,
  onClose,
  unreadAlertsCount = 0,
  onSignOut,
  user,
  workspace,
  workspaces = [],
  onWorkspaceChange,
}) {
  const initials = (user?.name || "Your account")
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");
  return (
    <>
      {isOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}
      <aside className={`app-sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="sidebar-brand">
          <Brand />
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        {workspaces.length > 0 && (
          <label className="workspace-picker">
            Workspace
            <select
              aria-label="Workspace"
              value={workspace?.id || ""}
              onChange={(e) => onWorkspaceChange(e.target.value)}
            >
              {workspaces.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <Link className="workspace-create" to="/workspaces/new" onClick={onClose}>
          <Plus size={14} /> New workspace
        </Link>
        <div className="nav-caption">EXPLORE</div>
        <nav aria-label="Main navigation">
          {navigation.map(([id, label, Icon]) => (
            <NavLink
              key={id}
              to={workspacePathFor(id)}
              end={id === "dashboard"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""} ${id === "settings" ? "nav-settings" : ""}`
              }
              onClick={onClose}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === "alerts" && unreadAlertsCount > 0 && (
                <span className="alert-count">{unreadAlertsCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link
            className="nav-item"
            to={workspacePathFor("settings")}
            onClick={onClose}
          >
            <CircleHelp size={17} /> Help & resources
          </Link>
          <div className="sidebar-profile">
            <span className="user-avatar">{initials}</span>
            <div>
              <strong>{user?.name || "Your account"}</strong>
              <small>{workspace?.name || "Workspace"}</small>
            </div>
            <button aria-label="Sign out" title="Sign out" onClick={onSignOut}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
