import {
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
  currentView,
  onSelectView,
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
        {workspaces.length > 1 && (
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
        <div className="nav-caption">EXPLORE</div>
        <nav aria-label="Main navigation">
          {navigation.map(([id, label, Icon]) => (
            <button
              key={id}
              className={`nav-item ${currentView === id ? "active" : ""} ${id === "settings" ? "nav-settings" : ""}`}
              aria-current={currentView === id ? "page" : undefined}
              onClick={() => {
                onSelectView(id);
                onClose();
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === "alerts" && unreadAlertsCount > 0 && (
                <span className="alert-count">{unreadAlertsCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => {
              onSelectView("settings");
              onClose();
            }}
          >
            <CircleHelp size={17} /> Help & resources
          </button>
          <div className="sidebar-profile">
            <span className="user-avatar">{initials}</span>
            <div>
              <strong>{user?.name || "Your account"}</strong>
              <small>{workspace?.name || "Demo workspace"}</small>
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
