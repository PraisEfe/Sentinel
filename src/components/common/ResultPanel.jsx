import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Bookmark, Globe, Sparkles, X } from "lucide-react";
import { useResource, useWorkspace, number } from "../../lib/workspace";
import { relativeTime, safeExternalUrl } from "../../lib/format";
import { ResourceState } from "./WorkspaceUI";
function Drawer({ selection, onClose, onMonitor, onRelated }) {
  const dialog = useRef(null);
  const reduced = useReducedMotion();
  const { preferences } = useWorkspace();
  const resource = useResource(
    `/${selection.kind === "cluster" ? "clusters" : "mentions"}/${encodeURIComponent(selection.id)}`,
  );
  const item = resource.data?.data;
  const clusterId =
    selection.kind === "cluster" ? selection.id : item?.cluster_id;
  const related = useResource(
    clusterId ? `/clusters/${encodeURIComponent(clusterId)}/mentions` : null,
    { list: true },
  );
  const cluster = selection.kind === "cluster" ? item : item?.cluster;
  const mention =
    selection.kind === "cluster" ? item?.representative_mention : item;
  const url = safeExternalUrl(mention?.url);
  const metadata = Array.isArray(mention?.metadata)
    ? Object.assign(
        {},
        ...mention.metadata.filter(
          (value) => value && typeof value === "object",
        ),
      )
    : mention?.metadata || {};
  const tags = [
    ...new Set(
      (Array.isArray(metadata.topics)
        ? metadata.topics
        : (mention?.monitors || []).map((monitor) => monitor.name)
      ).filter((tag) => typeof tag === "string" && tag.trim()),
    ),
  ];
  useEffect(() => {
    const node = dialog.current;
    node.showModal();
    return () => node.close();
  }, []);
  return (
    <motion.dialog
      ref={dialog}
      className="result-drawer"
      aria-labelledby="drawer-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      initial={{ opacity: 0, x: reduced ? 0 : 70 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduced ? 0 : 70 }}
      transition={{ duration: reduced ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="drawer-caption">
        <span>
          {selection.kind === "cluster" ? "Story cluster" : "News result"}
        </span>
        <button aria-label="Close details" onClick={onClose}>
          <X size={19} />
        </button>
      </div>
      <div className="drawer-body">
        <ResourceState resource={resource} />
        {item && (
          <>
            <div className="drawer-kicker">
              <span className="small-badge">
                {selection.kind === "cluster"
                  ? `${number(item.source_count)} sources`
                  : mention?.source?.type || "web"}
              </span>
              <span>
                {relativeTime(item.last_seen_at || item.published_at)}
              </span>
            </div>
            <h2 id="drawer-title">{item.title || "Untitled mention"}</h2>
            <p className="drawer-excerpt">
              {item.body ||
                item.summary ||
                "No description is available for this story."}
            </p>
            <div className="drawer-source">
              <Globe size={17} />
              <span>
                <strong>
                  {mention?.source?.name || "Multiple public sources"}
                </strong>
                <small>
                  Published{" "}
                  {relativeTime(mention?.published_at || item.first_seen_at)}
                </small>
              </span>
              {url && (
                <a
                  className="outline-button"
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ArrowUpRight size={13} />
                  Open source
                </a>
              )}
            </div>
            {preferences.aiSummaries && cluster?.summary && (
              <div className="summary-callout">
                <h3>
                  <Sparkles size={12} />
                  AI-generated summary
                </h3>
                <p>{cluster.summary}</p>
              </div>
            )}
            <div className="drawer-stats">
              <div>
                <strong>
                  {cluster?.mention_count == null
                    ? "—"
                    : number(cluster.mention_count)}
                </strong>
                <small>Mentions</small>
              </div>
              <div>
                <strong>
                  {cluster?.source_count == null
                    ? "—"
                    : number(cluster.source_count)}
                </strong>
                <small>Related sources</small>
              </div>
              <div>
                <strong>
                  {mention?.relevance_score == null
                    ? "—"
                    : `${Math.round(Number(mention.relevance_score) * 100)}%`}
                </strong>
                <small>Relevance</small>
              </div>
            </div>
            {tags.length > 0 && (
              <section className="drawer-section">
                <h3>Related topics</h3>
                <div className="keyword-tags">
                  {tags.map((tag) => (
                    <button key={tag} onClick={() => onRelated(tag)}>
                      {tag}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="drawer-section">
              <h3>Related mentions</h3>
              {clusterId ? (
                <>
                  <ResourceState
                    resource={related}
                    empty={!related.data?.data?.length}
                  />
                  {related.data?.data
                    ?.filter((row) => row.id !== mention?.id)
                    .slice(0, 4)
                    .map((row) => (
                      <button
                        className="related-row"
                        key={row.id}
                        onClick={() =>
                          onRelated(row.title || "", { cluster_id: clusterId })
                        }
                      >
                        <span className="small-badge">
                          {row.source?.type || "web"}
                        </span>
                        <span>
                          <strong>{row.title || "Untitled mention"}</strong>
                          <small>
                            {row.source?.name || "Public source"} ·{" "}
                            {relativeTime(row.published_at)}
                          </small>
                        </span>
                      </button>
                    ))}
                </>
              ) : (
                <p>No related story cluster is available yet.</p>
              )}
            </section>
            <div className="drawer-actions">
              <button
                className="outline-button"
                onClick={() => onMonitor(item.title || "")}
              >
                <Bookmark size={13} />
                Monitor topic
              </button>
              <button
                className="primary-button"
                onClick={() =>
                  onRelated(
                    item.title || "",
                    clusterId ? { cluster_id: clusterId } : {},
                  )
                }
              >
                View related results
              </button>
            </div>
          </>
        )}
      </div>
    </motion.dialog>
  );
}
export default function ResultPanel(props) {
  return (
    <AnimatePresence>
      {props.selection && (
        <Drawer
          key={`${props.selection.kind}-${props.selection.id}`}
          {...props}
        />
      )}
    </AnimatePresence>
  );
}
