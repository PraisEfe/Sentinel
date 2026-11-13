import LoadingState from "../common/LoadingState";
import { Activity, ArrowRight, Plus } from "lucide-react";
import { relativeTime } from "../../lib/format";
import { frequencyLabel, number, useResource } from "../../lib/workspace";

export default function DashboardView({
  onOpenMonitor,
  onOpenMonitors,
  onOpenAddMonitor,
  onOpenIntelligence,
  canManageMonitors = false,
  monitors = [],
  loading,
  error,
  onRetry,
  monitorTotal = 0,
  monitorPage = 1,
  lastPage = 1,
  onPageChange,
}) {
  const pulse = useResource("/intelligence/pulse");
  const pulseData = pulse.data?.data;
  return (
    <div className="dashboard-page">
      <section className="dashboard-pulse" aria-labelledby="pulse-heading">
        <span className="discovery-badge">
          <Activity size={13} /> Autonomous monitoring
        </span>
        <div className="dashboard-pulse-heading">
          <div>
            <h1 id="pulse-heading">What Sentinel found for you.</h1>
            <p>
              Every monitored topic runs continuously in the background. Open a
              topic to see the mentions it collected.
            </p>
          </div>
          <button className="outline-button" onClick={onOpenIntelligence}>
            Open Intelligence <ArrowRight size={14} />
          </button>
        </div>
      </section>
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
          <LoadingState label="Loading your workspace…" rows={3} />
        )}
        <section aria-labelledby="monitors-heading">
          <div className="section-heading">
            <div>
              <h2 id="monitors-heading">Monitored topics</h2>
              <p>
                {monitorTotal > 0
                  ? `${number(monitorTotal)} topic${monitorTotal === 1 ? "" : "s"} collecting in the background`
                  : "Continuous discovery running in the background"}
              </p>
            </div>
            <div className="section-actions">
              {monitorTotal > 0 && onOpenMonitors && (
                <button className="text-link" onClick={onOpenMonitors}>
                  View all monitors
                </button>
              )}
              {canManageMonitors && (
                <button className="outline-button" onClick={onOpenAddMonitor}>
                  <Plus size={15} /> Add monitor
                </button>
              )}
            </div>
          </div>
          <div className="monitor-card-grid">
            {monitors.map((monitor, index) => (
              <button
                key={monitor.id}
                className="monitor-card"
                onClick={() => onOpenMonitor(monitor)}
              >
                <span className="monitor-card-top">
                  <span className={`topic-avatar tone-${index % 3}`}>
                    {monitor.name
                      .split(" ")
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span className="monitor-card-title">
                    <strong>{monitor.name}</strong>
                    <small>
                      {monitor.type} · every {frequencyLabel(monitor.frequency)}
                    </small>
                  </span>
                  <span
                    className={`monitor-status ${monitor.is_active ? "" : "paused"}`}
                  >
                    <i />
                    {monitor.is_active ? "ACTIVE" : "PAUSED"}
                  </span>
                </span>
                <span className="monitor-card-stats">
                  <span>
                    <strong>
                      {monitor.mention_count !== undefined
                        ? number(monitor.mention_count)
                        : "—"}
                    </strong>
                    <small>mentions</small>
                  </span>
                  <span>
                    <strong>
                      {monitor.source_count !== undefined
                        ? number(monitor.source_count)
                        : "—"}
                    </strong>
                    <small>sources</small>
                  </span>
                  <span>
                    <strong>
                      {monitor.latest_scan?.items_new !== undefined
                        ? number(monitor.latest_scan.items_new)
                        : "—"}
                    </strong>
                    <small>new last scan</small>
                  </span>
                </span>
                <span className="monitor-card-footer">
                  <span>
                    {monitor.last_scan_at
                      ? `Updated ${relativeTime(monitor.last_scan_at)}`
                      : "Awaiting first scan"}
                  </span>
                  <span className="monitor-card-open">
                    Open <ArrowRight size={13} />
                  </span>
                </span>
              </button>
            ))}
            {!loading && !monitors.length && (
              <div className="empty-state monitor-empty">
                <p>No monitored topics yet.</p>
                <p>
                  Create a monitor and Sentinel will collect public mentions for
                  it continuously.
                </p>
                {canManageMonitors && (
                  <button className="outline-button" onClick={onOpenAddMonitor}>
                    <Plus size={15} /> Create your first monitor
                  </button>
                )}
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
        <section className="dashboard-glance" aria-labelledby="glance-heading">
          <div className="section-heading">
            <div>
              <h2 id="glance-heading">At a glance</h2>
              <p>What collection produced in the last hour</p>
            </div>
          </div>
          <div className="pulse-grid">
            <div className="pulse-card">
              <span>New mentions</span>
              <strong>
                {pulseData ? number(pulseData.new_mentions) : "—"}
              </strong>
              <small>across all monitored topics</small>
            </div>
            <div className="pulse-card">
              <span>New story clusters</span>
              <strong>
                {pulseData ? number(pulseData.new_clusters) : "—"}
              </strong>
              <small>grouped automatically</small>
            </div>
            <div className="pulse-card">
              <span>Sources scanned</span>
              <strong>
                {pulseData ? number(pulseData.sources_scanned) : "—"}
              </strong>
              <small>without manual searching</small>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
