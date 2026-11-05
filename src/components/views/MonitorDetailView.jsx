import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Search } from "lucide-react";
import LoadingState from "../common/LoadingState";
import { PageMotion, ResourceState } from "../common/WorkspaceUI";
import { frequencyLabel, number, useResource } from "../../lib/workspace";
import { relativeTime } from "../../lib/format";
import { workspacePathFor } from "../../routing/paths";

export default function MonitorDetailView({ onSelectResult }) {
  const { monitorId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [cursor, setCursor] = useState("");
  const monitor = useResource(`/monitors/${encodeURIComponent(monitorId)}`);
  const stats = useResource(`/monitors/${encodeURIComponent(monitorId)}/stats`);
  const mentions = useResource(
    `/monitors/${encodeURIComponent(monitorId)}/mentions?per_page=25${
      cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""
    }`,
    { list: true },
  );

  if (monitor.loading) return <LoadingState label="Opening monitor…" />;
  if (monitor.error) {
    return (
      <PageMotion className="research-page">
        <div className="load-error" role="alert">
          <span>{monitor.error}</span>
          <button className="text-link" onClick={monitor.reload}>
            Try again
          </button>
        </div>
      </PageMotion>
    );
  }

  const monitorData = monitor.data?.data;
  if (!monitorData) return null;

  const totals = stats.data?.data || {};
  const rows = mentions.data?.data || [];
  const next = mentions.data?.meta?.next_cursor;
  const previous = mentions.data?.meta?.prev_cursor;

  function searchWithin(event) {
    event.preventDefault();
    const q = input.trim();
    if (!q) return;
    navigate(
      `${workspacePathFor("search")}?${new URLSearchParams({
        q,
        monitor_id: monitorData.id,
        monitor_name: monitorData.name,
      })}`,
    );
  }

  return (
    <PageMotion className="research-page">
      <Link className="text-link monitor-detail-back" to={workspacePathFor("monitors")}>
        <ArrowLeft size={13} /> All monitors
      </Link>

      <form className="discovery-search compact-search" onSubmit={searchWithin}>
        <Search size={17} />
        <input
          aria-label="Search within this monitor"
          placeholder="Search within this monitor"
          maxLength={500}
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button className="primary-button">Search</button>
      </form>

      <div className="research-heading">
        <div>
          <h1>{monitorData.name}</h1>
          <p>
            {monitorData.type} · {frequencyLabel(monitorData.frequency)} ·{" "}
            {monitorData.is_active ? "Active" : "Paused"}
            {monitorData.query ? ` · ${monitorData.query}` : ""}
          </p>
        </div>
      </div>

      <section className="monitors-table-card monitor-detail-stats">
        <div className="monitor-overview">
          <div>
            <strong>{number(totals.mention_count)}</strong>
            <small>Matched mentions</small>
          </div>
          <div>
            <strong>{number(totals.source_count)}</strong>
            <small>Public sources</small>
          </div>
          <div>
            <strong>{relativeTime(monitorData.last_scan_at)}</strong>
            <small>Last scan</small>
          </div>
          <div>
            <strong>
              {monitorData.next_scan_at
                ? relativeTime(monitorData.next_scan_at)
                : "—"}
            </strong>
            <small>Next scan</small>
          </div>
        </div>
        <p className="metric-subtitle monitors-legend">
          These are the mentions that matched this monitor, not everything
          collected from its sources.
        </p>
      </section>

      <section className="results-panel monitor-detail-feed" aria-label="Matched mentions">
        <div className="results-toolbar">
          <span>
            {number(totals.mention_count)} matched mentions
            {rows.length ? ` · showing ${rows.length}` : ""}
          </span>
        </div>
        <ResourceState
          resource={mentions}
          empty={!rows.length}
        >
          No mentions have matched this monitor yet.
        </ResourceState>
        {!mentions.loading &&
          !mentions.error &&
          rows.map((item) => {
            const matched = Array.isArray(item.matched_terms)
              ? item.matched_terms
              : [];
            return (
              <button
                className="result-row"
                key={item.id}
                onClick={() =>
                  onSelectResult({ kind: "mention", id: item.id, item })
                }
              >
                <span className={`source-icon ${item.source?.type || "web"}`}>
                  <Globe size={14} />
                </span>
                <span className="result-channel">
                  {item.source?.type || "web"}
                </span>
                <span className="result-content">
                  <small>
                    {item.source?.name || "Public source"} <span>·</span>{" "}
                    {relativeTime(item.published_at)}
                  </small>
                  <strong>{item.title || "Untitled mention"}</strong>
                  <p>{item.body}</p>
                  <span className="result-meta">
                    {item.sentiment && (
                      <span className={`sentiment ${item.sentiment}`}>
                        {item.sentiment}
                      </span>
                    )}
                    {item.relevance_score != null && (
                      <span>
                        {Math.round(Number(item.relevance_score) * 100)}%
                        relevance
                      </span>
                    )}
                    {matched.length > 0 && (
                      <span className="match-terms">
                        Matched:{" "}
                        {matched.map((term) => (
                          <span className="match-chip" key={term}>
                            {term}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
      </section>

      {(next || previous) && (
        <div className="monitor-pagination">
          <button
            className="outline-button"
            disabled={!previous || mentions.loading}
            onClick={() => setCursor(previous || "")}
          >
            Previous
          </button>
          <button
            className="outline-button"
            disabled={!next || mentions.loading}
            onClick={() => setCursor(next || "")}
          >
            Next
          </button>
        </div>
      )}
    </PageMotion>
  );
}
