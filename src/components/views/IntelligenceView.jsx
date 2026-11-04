import { useState } from "react";
import { Activity, ArrowRight, Layers3, Sparkles } from "lucide-react";
import {
  PageMotion,
  Pagination,
  ResourceState,
  Tabs,
} from "../common/WorkspaceUI";
import { number, useResource } from "../../lib/workspace";
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
          : `/explore?page=${page}`;
  const resource = useResource(path, { list: true });
  const emerging = useResource("/intelligence/emerging", { list: true });
  const pulse = useResource("/intelligence/pulse");
  const rows = resource.data?.data || [];
  const pulseData = pulse.data?.data;
  const monitorView = tab === "Most Mentioned";
  return (
    <PageMotion className="research-page">
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
        <section className="cluster-panel">
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
          {!monitorView && (
            <Pagination
              page={page}
              lastPage={resource.data?.meta?.last_page || 1}
              onChange={setPage}
              loading={resource.loading}
            />
          )}
        </section>
        <aside className="intelligence-aside">
          <section className="insight-card">
            <h2>Discovery pulse</h2>
            <div className="pulse-row">
              <span>New in the last hour</span>
              <strong>
                {pulseData ? number(pulseData.new_mentions) : "—"}
              </strong>
            </div>
            <div className="pulse-row">
              <span>New story clusters</span>
              <strong>
                {pulseData ? number(pulseData.new_clusters) : "—"}
              </strong>
            </div>
            <div className="pulse-row">
              <span>Sources scanned</span>
              <strong>
                {pulseData ? number(pulseData.sources_scanned) : "—"}
              </strong>
            </div>
          </section>
          <section className="insight-card">
            <h2>Emerging now</h2>
            <ResourceState
              resource={emerging}
              empty={!emerging.data?.data?.length}
            />
            {emerging.data?.data?.slice(0, 4).map((item, i) => (
              <button
                className="emerging-row"
                key={item.cluster_id}
                onClick={() =>
                  onSelectCluster({
                    kind: "cluster",
                    id: item.cluster_id,
                    item,
                  })
                }
              >
                <small>{String(i + 1).padStart(2, "0")}</small>
                <span>{item.title}</span>
                <b>
                  <Activity size={10} />
                  {number(item.velocity)}/hr
                </b>
              </button>
            ))}
          </section>
        </aside>
      </div>
    </PageMotion>
  );
}
