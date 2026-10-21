import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Clock3,
  Globe,
  Plus,
  Search,
} from "lucide-react";
import { relativeTime } from "../../lib/format";

export default function DashboardView({
  onSearch,
  onSelectTopic,
  onOpenAddMonitor,
  monitors = [],
  history = [],
  loading,
  error,
  onRetry,
  onClearHistory,
  monitorTotal = 0,
  monitorPage = 1,
  lastPage = 1,
  onPageChange,
  monitorsOnly = false,
}) {
  const [query, setQuery] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  async function clearHistory() {
    setClearing(true);
    setClearError("");
    try {
      await onClearHistory();
    } catch (failure) {
      setClearError(failure.message);
    } finally {
      setClearing(false);
    }
  }
  return (
    <div className="dashboard-page">
      {!monitorsOnly && (
        <section className="dashboard-hero">
          <span className="discovery-badge">
            <Activity size={13} /> Live web intelligence
          </span>
          <h1>Discover what’s happening online.</h1>
          <p>
            Search people, organisations, brands, topics and keywords across the
            public web.
          </p>
          <form
            className="discovery-search"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) onSearch(query.trim());
            }}
          >
            <Search size={20} />
            <input
              aria-label="Search the public web"
              placeholder="Search people, organisations, brands, topics and keywords…"
              maxLength={500}
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="primary-button" type="submit">
              Search
            </button>
          </form>
          <div className="search-channels">
            <span>
              <Globe size={12} /> News & websites
            </span>
            <span>Public social</span>
            <span>Blogs & forums</span>
            <span>Continuous discovery</span>
          </div>
        </section>
      )}
      <div className="dashboard-content">
        {error && (
          <div className="load-error" role="alert">
            <span>{error}</span>
            <button className="text-link" onClick={onRetry}>
              Try again
            </button>
          </div>
        )}
        {loading && (
          <p role="status" className="loading-state">
            Loading your workspace…
          </p>
        )}
        {!monitorsOnly && (
          <section aria-labelledby="recent-heading">
            <div className="section-heading">
              <div>
                <h2 id="recent-heading">Recent searches</h2>
                <p>Pick up where you left off</p>
              </div>
              {history.length > 0 && (
                <button
                  disabled={clearing}
                  className="text-link"
                  onClick={clearHistory}
                >
                  {clearing ? "Clearing…" : "Clear history"}
                </button>
              )}
            </div>
            {clearError && (
              <p className="form-error" role="alert">
                {clearError}
              </p>
            )}
            <div className="recent-grid">
              {history.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  className="recent-search"
                  onClick={() => onSearch(item.query)}
                >
                  <span className="recent-icon">
                    <Clock3 size={15} />
                  </span>
                  <span>
                    <strong>{item.query}</strong>
                    <small>
                      {Number(item.result_count || 0).toLocaleString()} results
                      · {relativeTime(item.created_at)}
                    </small>
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))}
              {!loading && !history.length && (
                <p className="empty-state">
                  Your recent searches will appear here. Start with a topic
                  above.
                </p>
              )}
            </div>
          </section>
        )}
        <section aria-labelledby="monitors-heading">
          <div className="section-heading">
            <div>
              <h2 id="monitors-heading">Monitored topics</h2>
              <p>Continuous discovery for saved searches</p>
            </div>
            <button className="outline-button" onClick={onOpenAddMonitor}>
              <Plus size={15} /> Add monitor
            </button>
          </div>
          <div className="monitored-list">
            {monitors.map((monitor, index) => (
              <button
                key={monitor.id}
                className="monitor-row"
                onClick={() => onSelectTopic(monitor.query || monitor.name)}
              >
                <span className={`topic-avatar tone-${index % 3}`}>
                  {monitor.name
                    .split(" ")
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="topic-description">
                  <strong>{monitor.name}</strong>
                  <small>
                    {monitor.type} ·{" "}
                    {monitor.last_scan_at
                      ? `Updated ${relativeTime(monitor.last_scan_at)}`
                      : "Awaiting first scan"}
                  </small>
                </span>
                <span className="topic-count">
                  {monitor.mention_count !== undefined ? (
                    <>
                      <strong>{monitor.mention_count.toLocaleString()}</strong>
                      <small>total mentions</small>
                    </>
                  ) : (
                    <small>Stats unavailable</small>
                  )}
                </span>
                <span
                  className={`monitor-status ${monitor.is_active ? "" : "paused"}`}
                >
                  <i />
                  {monitor.is_active ? "ACTIVE" : "PAUSED"}
                </span>
                <ArrowRight size={15} />
              </button>
            ))}
            {!loading && !monitors.length && (
              <div className="empty-state">
                <p>No monitored topics yet.</p>
                <button className="text-link" onClick={onOpenAddMonitor}>
                  Create your first monitor
                </button>
              </div>
            )}
          </div>
          {lastPage > 1 && (
            <div className="monitor-pagination">
              <button
                className="outline-button"
                disabled={loading || monitorPage <= 1}
                onClick={() => onPageChange(monitorPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {monitorPage} of {lastPage}
              </span>
              <button
                className="outline-button"
                disabled={loading || monitorPage >= lastPage}
                onClick={() => onPageChange(monitorPage + 1)}
              >
                Next
              </button>
            </div>
          )}
          {monitorTotal > monitors.length && (
            <p className="list-note">
              Showing {monitors.length} of {monitorTotal} monitors.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
