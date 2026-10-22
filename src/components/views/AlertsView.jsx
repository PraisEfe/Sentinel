import { useState } from "react";
import { Activity, ArrowRight, Clock3, Globe } from "lucide-react";
import { PageMotion, ResourceState, Tabs } from "../common/WorkspaceUI";
import { useResource, useWorkspace } from "../../lib/workspace";
import { relativeTime } from "../../lib/format";
export default function AlertsView({
  onNavigateSettings,
  onInspectTopic,
  onSelectResult,
}) {
  const { api, onRefresh } = useWorkspace();
  const [tab, setTab] = useState("Unread");
  const [cursor, setCursor] = useState("");
  const resource = useResource(
    `/alerts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
    { list: true },
  );
  const notification = useResource("/settings/notifications");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rows = (resource.data?.data || []).filter(
    (item) =>
      tab === "All" ||
      (tab === "Unread" ? !item.read_at : item.severity === tab.toLowerCase()),
  );
  async function action(path, method = "PATCH", body) {
    setBusy(true);
    setError("");
    try {
      await api(path, { method, ...(body && { body }) });
      resource.reload();
      notification.reload();
      onRefresh();
      return true;
    } catch (failure) {
      setError(failure.message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function open(item) {
    if (
      !item.read_at &&
      !(await action(`/alerts/${encodeURIComponent(item.id)}`))
    )
      return;
    if (item.mention_id)
      onSelectResult({ kind: "mention", id: item.mention_id });
    else if (item.cluster_id)
      onSelectResult({ kind: "cluster", id: item.cluster_id });
    else onInspectTopic(item.monitor?.query || item.title);
  }
  const cadence = notification.data?.digest_cadence;
  return (
    <PageMotion className="research-page">
      <div className="research-heading">
        <div>
          <h1>Alerts</h1>
          <p>Updates generated from the searches and topics you monitor.</p>
        </div>
        <select
          aria-label="Notification digest frequency"
          disabled={busy || notification.loading || !!notification.error}
          value={cadence || ""}
          onChange={(e) =>
            action("/settings/notifications", "PATCH", {
              digest_cadence: e.target.value,
            })
          }
        >
          <option value="" disabled>
            Digest frequency
          </option>
          <option value="20m">20 minutes</option>
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
        </select>
      </div>
      <div className="alert-tabs">
        <Tabs
          label="Alert filters"
          items={["Unread", "All", "Critical", "High", "Normal"]}
          value={tab}
          onChange={setTab}
        />
        {resource.data?.data?.some((item) => !item.read_at) && (
          <button
            className="text-link"
            disabled={busy}
            onClick={() => action("/alerts/read-all", "POST")}
          >
            Mark all as read
          </button>
        )}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <section className="alerts-list">
        <ResourceState resource={resource} empty={!rows.length}>
          You’re all caught up. New alerts will appear here.
        </ResourceState>
        {!resource.loading &&
          !resource.error &&
          rows.map((item) => (
            <button
              key={item.id}
              className={`alert-row ${item.read_at ? "read" : ""}`}
              disabled={busy}
              onClick={() => open(item)}
            >
              <span className={`alert-icon ${item.severity}`}>
                {item.type === "high_authority" ? (
                  <Globe size={16} />
                ) : (
                  <Activity size={16} />
                )}
              </span>
              <span className="alert-copy">
                <small>
                  <span className={`priority-badge ${item.severity}`}>
                    ● {item.severity}
                  </span>
                  {relativeTime(item.created_at)}
                </small>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </span>
              {!item.read_at && <i className="unread-dot" />}
              <ArrowRight size={15} />
            </button>
          ))}
      </section>
      {(resource.data?.meta?.next_cursor ||
        resource.data?.meta?.prev_cursor) && (
        <div className="monitor-pagination">
          <button
            className="outline-button"
            disabled={!resource.data?.meta?.prev_cursor || resource.loading}
            onClick={() => setCursor(resource.data.meta.prev_cursor)}
          >
            Previous
          </button>
          <button
            className="outline-button"
            disabled={!resource.data?.meta?.next_cursor || resource.loading}
            onClick={() => setCursor(resource.data.meta.next_cursor)}
          >
            Next
          </button>
        </div>
      )}
      <ResourceState resource={notification} />
      <div className="digest-notice">
        <Clock3 size={17} />
        <span>
          <strong>
            Notification digest
            {cadence
              ? ` · ${cadence === "20m" ? "every 20 minutes" : cadence}`
              : ""}
          </strong>
          <small>
            You can change the frequency or individual monitors from settings.
          </small>
        </span>
        <button className="outline-button" onClick={onNavigateSettings}>
          Notification settings
        </button>
      </div>
    </PageMotion>
  );
}
