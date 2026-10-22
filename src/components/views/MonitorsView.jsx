import { Activity, ArrowRight, Plus } from "lucide-react";
import { PageMotion, Pagination } from "../common/WorkspaceUI";
import { frequencyLabel, number } from "../../lib/workspace";
import { relativeTime } from "../../lib/format";
export default function MonitorsView({
  monitors,
  loading,
  error,
  onRetry,
  onCreate,
  onSelect,
  page,
  lastPage,
  onPageChange,
  total,
}) {
  const active = monitors.filter((item) => item.is_active).length;
  const scans = monitors.map((item) => item.latest_scan).filter(Boolean);
  const fresh = scans.length
    ? scans.reduce((sum, item) => sum + Number(item.items_new || 0), 0)
    : null;
  const failed = scans.some(
    (scan) =>
      scan.status === "failed" || scan.status === "partial" || scan.error,
  );
  const health = failed
    ? "A scan needs attention"
    : scans.some((scan) => scan.status === "running")
      ? "Scanning in progress"
      : scans.length
        ? "Latest scans completed"
        : "Awaiting scan information";
  return (
    <PageMotion className="research-page">
      <div className="research-heading">
        <div>
          <h1>Monitors</h1>
          <p>Track topics and receive updates as new information appears.</p>
        </div>
        <button className="primary-button" onClick={onCreate}>
          <Plus size={14} />
          Add monitor
        </button>
      </div>
      {error && (
        <div className="load-error" role="alert">
          {error}
          <button className="text-link" onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
      <section className="monitors-table-card">
        <div className="monitor-overview">
          <div>
            <strong>{number(active)}</strong>
            <small>Active monitors on this page</small>
          </div>
          <div>
            <strong>{fresh === null ? "—" : number(fresh)}</strong>
            <small>New mentions · latest scans</small>
          </div>
          <div>
            <strong>{number(total)}</strong>
            <small>Total saved monitors</small>
          </div>
          <span className={failed ? "scan-health warning" : "scan-health"}>
            <Activity size={14} />
            {health}
          </span>
        </div>
        <div className="table-scroll">
          <table className="monitor-table">
            <thead>
              <tr>
                <th>Monitor</th>
                <th>New activity</th>
                <th>Total mentions</th>
                <th>Frequency</th>
                <th>Status</th>
                <th aria-label="Open monitor"></th>
              </tr>
            </thead>
            <tbody>
              {monitors.map((item, i) => (
                <tr key={item.id}>
                  <td>
                    <button
                      className="table-topic"
                      onClick={() => onSelect(item.query || item.name)}
                    >
                      <span className={`topic-avatar tone-${i % 4}`}>
                        {item.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <span>
                        <strong>{item.name}</strong>
                        <small>
                          {item.type} ·{" "}
                          {item.last_scan_at
                            ? `Updated ${relativeTime(item.last_scan_at)}`
                            : "Awaiting first scan"}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td className="new-activity">
                    {item.latest_scan
                      ? `${number(item.latest_scan.items_new)} new`
                      : "—"}
                  </td>
                  <td>
                    {item.mention_count == null
                      ? "—"
                      : number(item.mention_count)}
                  </td>
                  <td>{frequencyLabel(item.frequency)}</td>
                  <td>
                    <span
                      className={`monitor-status ${item.is_active ? "" : "paused"}`}
                    >
                      <i />
                      {item.is_active ? "Active" : "Paused"}
                    </span>
                  </td>
                  <td>
                    <button
                      aria-label={`View ${item.name}`}
                      onClick={() => onSelect(item.query || item.name)}
                    >
                      <ArrowRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && (
          <p className="workspace-loading" role="status">
            Loading monitors…
          </p>
        )}
        {!loading && !monitors.length && (
          <p className="workspace-empty">
            No monitors yet. Create a monitor to start discovering.
          </p>
        )}
      </section>
      <Pagination
        page={page}
        lastPage={lastPage}
        onChange={onPageChange}
        loading={loading}
      />
    </PageMotion>
  );
}
