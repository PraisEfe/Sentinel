import { Bell, Globe, Menu } from "lucide-react";
import { relativeTime } from "../../lib/format";
export default function Header({
  onToggleSidebar,
  monitorsCount = 0,
  sourcesCount,
  lastScan,
  onAlerts,
  demo,
}) {
  return (
    <header className="app-header">
      <div className="header-status">
        <button
          className="mobile-menu"
          aria-label="Open navigation"
          onClick={onToggleSidebar}
        >
          <Menu size={20} />
        </button>
        <i className="live-dot" />
        <span>Monitoring {monitorsCount} topics</span>
        <span className="scan-status">
          · {lastScan ? `Last scan ${relativeTime(lastScan)}` : "No scans yet"}
        </span>
        {demo && <span className="demo-badge">Demo data</span>}
      </div>
      <div className="header-actions">
        {sourcesCount !== undefined && (
          <span className="source-count">
            <Globe size={14} /> {sourcesCount} sources available
          </span>
        )}
        <button aria-label="View alerts" onClick={onAlerts}>
          <Bell size={17} />
        </button>
      </div>
    </header>
  );
}
