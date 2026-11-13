import { useState } from "react";
import { Bell, Globe, Menu, Search } from "lucide-react";
import { relativeTime } from "../../lib/format";
export default function Header({
  onToggleSidebar,
  monitorsCount = 0,
  sourcesCount,
  lastScan,
  onAlerts,
  onSearch,
}) {
  const [query, setQuery] = useState("");
  function submit(event) {
    event.preventDefault();
    if (query.trim()) onSearch(query.trim());
  }
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
      </div>
      <div className="header-actions">
        {onSearch && (
          <form className="header-search" role="search" onSubmit={submit}>
            <Search size={14} />
            <input
              aria-label="Search collected mentions"
              placeholder="Search collected mentions…"
              maxLength={500}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </form>
        )}
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
