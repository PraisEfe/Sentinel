import { useState } from "react";
import { Activity, ArrowRight, Layers3, Sparkles } from "lucide-react";
import {
  PageMotion,
  ResourceState,
  Tabs,
} from "../common/WorkspaceUI";
import { number, useResource } from "../../lib/workspace";
import { useIntelligencePages } from "../../lib/useIntelligencePages";
import { relativeTime } from "../../lib/format";
export default function IntelligenceView({ onSelectCluster, onInspectTopic = () => {} }) {
  const [tab, setTab] = useState("Latest");
  const [page, setPage] = useState(1);
  const path =
    tab === "Trending"
      ? "/intelligence/trending"
      : tab === "Most Mentioned"
        ? "/intelligence/most-mentioned"
        : tab === "Emerging"
          ? "/intelligence/emerging"
          : "/explore";
  const resource = useIntelligencePages(path, page, tab === "Latest");
  const emerging = useResource("/intelligence/emerging", { list: true });
  const pulse = useResource("/intelligence/pulse");
  const rows = resource.data?.data || [];
  const pulseData = pulse.data?.data;
  const monitorView = tab === "Most Mentioned";
  return (
    <PageMotion className="research-page intelligence-page">
      <div className="research-heading">
        <div>
          <h1>Intelligence</h1>
          <p>
            Explore the latest information discovered across your monitored
            topics.
          </p>
        </div>
      </div>
      <Tabs
        label="Intelligence views"
        items={["Latest", "Trending", "Most Mentioned", "Emerging"]}
        value={tab}
        onChange={(value) => {
          setTab(value);
          setPage(1);
        }}
      />
      <div className="intelligence-layout">
        <div className="intelligence-feed">
        <section className="cluster-panel" aria-label={monitorView ? "Most mentioned monitors" : "Stories"}>
          <div className="cluster-note">
            <Sparkles size={15} />
            <div>
              <strong>
                {monitorView
                  ? "Ranked by mention volume"
                  : "Stories are grouped automatically"}
              </strong>
              <p>
                {monitorView
                  ? "Monitors are ranked by mentions discovered in the selected window."
                  : "Similar reports are grouped to help you understand a story without losing the original sources."}
              </p>
            </div>
          </div>
          <ResourceState
            resource={resource}
            empty={!rows.length}
          >
            {monitorView
              ? "No monitored topics have mentions in this window."
              : "No stories are available in this view yet."}
          </ResourceState>
          {!resource.loading &&
            !resource.error &&
            monitorView &&
            rows.map((row) => (
              <button
                className="cluster-row"
                key={row.monitor_id}
                onClick={() => onInspectTopic(row.name)}
              >
                <span className="cluster-stack">
                  <Layers3 size={25} strokeWidth={1} />
                </span>
                <span className="cluster-copy">
                  <span className="cluster-eyebrow">
                    <span className="small-badge">Monitor</span>
                    {number(row.previous_count)} previous mentions
                  </span>
                  <strong>{row.name}</strong>
                  <p>{number(row.mention_count)} mentions in this window.</p>
                </span>
                <span className="cluster-metrics">
                  <strong>
                    {number(row.mention_count)} <small>mentions</small>
                  </strong>
                  <b>
                    {Number(row.delta_pct) > 0 ? "+" : ""}
                    {number(row.delta_pct)}% <small>change</small>
                  </b>
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
          {!resource.loading &&
            !resource.error &&
            !monitorView &&
            rows.map((item) => {
              const tags = item.tags?.length
                ? item.tags
                : [item.representative_mention?.location_name].filter(Boolean);

              return (
                <button
                  className="cluster-row"
                  key={item.id || item.cluster_id}
                  onClick={() =>
                    onSelectCluster({
                      kind: "cluster",
                      id: item.id || item.cluster_id,
                      item,
                    })
                  }
                >
                  <span className="cluster-stack">
                    <Layers3 size={25} strokeWidth={1} />
                  </span>
                  <span className="cluster-copy">
                    <span className="cluster-eyebrow">
                      <span className="small-badge">Story cluster</span>Updated{" "}
                      {relativeTime(item.last_seen_at)}
                    </span>
                    <strong>{item.title}</strong>
                    <p>
                      {item.summary ||
                        "Open this story to explore its sources and related mentions."}
                    </p>
                    {tags.length > 0 && (
                      <span className="keyword-tags">
                        {tags.map((tag) => (
                          <span key={tag}>{tag}</span>
                        ))}
                      </span>
                    )}
                  </span>
                  <span className="cluster-metrics">
                    <strong>
                      {number(item.mention_count)} <small>mentions</small>
                    </strong>
                    {item.source_count != null && (
                      <span>
                        {number(item.source_count)} <small>sources</small>
                      </span>
                    )}
                    {item.velocity != null && (
                      <b>
                        {number(item.velocity)} <small>per hour</small>
                      </b>
                    )}
                  </span>
                  <ArrowRight size={14} />
                </button>
              );
            })}
          {!resource.loading && !resource.error && rows.length > 0 && (
            <nav className="monitor-pagination story-pagination" aria-label="Story pages">
              <button className="outline-button" disabled={resource.data.page <= 1} onClick={() => setPage(resource.data.page - 1)}>Previous</button>
              <span>Page {resource.data.page}{resource.data.lastPage !== null && <> of {resource.data.lastPage}</>}</span>
              <button className="outline-button" disabled={!resource.data.hasNext} onClick={() => setPage(resource.data.page + 1)}>Next</button>
            </nav>
          )}
          {!resource.loading && !resource.error && rows.length > 0 && rows.length < 3 && <p className="intelligence-availability">{rows.length === 1 ? "Only one item is" : "Only two items are"} available in this view right now.</p>}
        </section>
          <section className="insight-card emerging-panel" aria-labelledby="emerging-heading">
            <h2 id="emerging-heading">Emerging now</h2>
            <p className="intelligence-section-description">Stories gaining momentum across your monitored topics.</p>
            <ResourceState
              resource={emerging}
              empty={!emerging.data?.data?.length}
            />
            <div className="emerging-stories">
            {emerging.data?.data?.slice(0, 4).map((item, i) => (
              <button
                className="emerging-row emerging-story-row"
                key={item.cluster_id}
                onClick={() =>
                  onSelectCluster({
                    kind: "cluster",
                    id: item.cluster_id,
                    item,
                  })
                }
              >
                <small className="emerging-index">{String(i + 1).padStart(2, "0")}</small>
                <span className="emerging-title">{item.title}</span>
                <b className="emerging-velocity">
                  <Activity size={12} aria-hidden="true" />
                  <span>{number(item.velocity)}/hr</span>
                </b>
              </button>
            ))}
            </div>
          </section>
        </div>
        <aside className="intelligence-aside">
          <section className="insight-card discovery-pulse" aria-labelledby="discovery-heading">
            <h2 id="discovery-heading">Discovery pulse</h2>
            <p className="intelligence-section-description">Collection activity in the last hour.</p>
            <dl className="discovery-metrics">
              {[["New in the last hour", "new_mentions"], ["New story clusters", "new_clusters"], ["Sources scanned", "sources_scanned"]].map(([label, field]) => (
                <div className="discovery-metric" key={field}>
                  <dt>{label}</dt>
                  <dd>{pulseData ? number(pulseData[field]) : "—"}</dd>
                </div>
              ))}
            </dl>
            <ResourceState resource={pulse} />
          </section>
        </aside>
      </div>
    </PageMotion>
  );
}
