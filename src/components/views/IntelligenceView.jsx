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
export default function IntelligenceView({ onSelectCluster }) {
  const [tab, setTab] = useState("Latest");
  const [page, setPage] = useState(1);
  // The contract describes most-mentioned.data as a string. Sort documented
  // cluster records instead of assuming that endpoint returns a collection.
  const path =
    tab === "Trending"
      ? "/intelligence/trending"
      : tab === "Emerging"
        ? "/intelligence/emerging"
        : `/explore?page=${page}`;
  const resource = useResource(path, { list: true });
  const emerging = useResource("/intelligence/emerging", { list: true });
  const rows = [...(resource.data?.data || [])];
  if (tab === "Most Mentioned")
    rows.sort((a, b) => b.mention_count - a.mention_count);
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
          // Latest and Most Mentioned share the same resource key. Switching
          // between them must retry a failed request rather than retain its error.
          if (resource.error && page === 1 &&
              ["Latest", "Most Mentioned"].includes(tab) &&
              ["Latest", "Most Mentioned"].includes(value) && tab !== value)
            resource.reload();
          setTab(value);
          setPage(1);
        }}
      />
      <div className="intelligence-layout">
        <section className="cluster-panel">
          <div className="cluster-note">
            <Sparkles size={15} />
            <div>
              <strong>Stories are grouped automatically</strong>
              <p>
                Similar reports are grouped to help you understand a story
                without losing the original sources.
              </p>
            </div>
          </div>
          <ResourceState resource={resource} empty={!rows.length} />
          {!resource.loading &&
            !resource.error &&
            rows.map((item) => (
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
                  {item.representative_mention?.location_name && (
                    <span className="keyword-tags">
                      <span>{item.representative_mention.location_name}</span>
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
                      {Number(item.velocity) > 0 ? "+" : ""}
                      {number(item.velocity)}% <small>velocity</small>
                    </b>
                  )}
                </span>
                <ArrowRight size={14} />
              </button>
            ))}
          <Pagination
            page={page}
            lastPage={resource.data?.meta?.last_page || 1}
            onChange={setPage}
            loading={resource.loading}
          />
          {tab === "Most Mentioned" && (
            <p className="list-note">
              Ranked by mention count within the loaded stories.
            </p>
          )}
        </section>
        <aside className="intelligence-aside">
          <section className="insight-card">
            <h2>Discovery pulse</h2>
            <div className="pulse-row">
              <span>Stories in this view</span>
              <strong>{number(rows.length)}</strong>
            </div>
            <div className="pulse-row">
              <span>Mentions in these stories</span>
              <strong>
                {number(
                  rows.reduce(
                    (sum, item) => sum + Number(item.mention_count || 0),
                    0,
                  ),
                )}
              </strong>
            </div>
            <div className="pulse-row">
              <span>Emerging stories</span>
              <strong>
                {emerging.data ? number(emerging.data.data.length) : "—"}
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
                  {number(item.velocity)}%
                </b>
              </button>
            ))}
          </section>
        </aside>
      </div>
    </PageMotion>
  );
}
