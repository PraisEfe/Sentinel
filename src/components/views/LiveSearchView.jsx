import { useEffect, useMemo, useState } from "react";
import { Bookmark, Filter, Globe, Search } from "lucide-react";
import { useResource, useWorkspace, number } from "../../lib/workspace";
import { relativeTime } from "../../lib/format";
import { PageMotion, ResourceState, Tabs } from "../common/WorkspaceUI";
const channels = [
  ["all", "All"],
  ["news", "News"],
  ["social", "Social"],
  ["web", "Websites"],
  ["blog", "Blogs"],
  ["forum", "Forums"],
];
export default function LiveSearchView({
  query,
  onSearch,
  onSearched,
  onSelectResult,
  onMonitor,
  initialFilters = {},
}) {
  const { api, preferences } = useWorkspace();
  const [input, setInput] = useState(query);
  const [channel, setChannel] = useState("all");
  const [filters, setFilters] = useState({
    date: "",
    source_id: "",
    country_code: "",
    language: "",
    sentiment: "",
    sort: "relevance",
    ...initialFilters,
  });
  const [saving, setSaving] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [searchTime] = useState(() => Date.now());
  const from = useMemo(
    () =>
      filters.date
        ? new Date(searchTime - Number(filters.date) * 86400000).toISOString()
        : "",
    [filters.date, searchTime],
  );
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  for (const key of [
    "source_id",
    "country_code",
    "language",
    "sentiment",
    "sort",
    "cluster_id",
  ])
    if (filters[key]) params.set(key, filters[key]);
  if (from) params.set("from", from);
  if (preferences.groupStories) params.set("collapse", "true");
  const resource = useResource(query ? `/search?${params}` : null, {
    list: true,
  });
  const sources = useResource("/sources", { list: true });
  useEffect(() => {
    if (resource.data) onSearched();
  }, [resource.data, onSearched]);
  const results = (resource.data?.data || []).filter(
    (item) => preferences.includeSocial || item.source?.type !== "social",
  );
  const visible = results.filter(
    (item) => channel === "all" || item.source?.type === channel,
  );
  function filter(key, value) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }
  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveMessage("");
    setSaveError("");
    try {
      await api("/saved-searches", {
        method: "POST",
        body: {
          name: saveName.trim(),
          query,
          filters: [...params.entries()]
            .filter(([key]) => key !== "q")
            .map(([key, value]) => `${key}=${value}`),
        },
      });
      setSaveMessage("Search view saved.");
      setSaveOpen(false);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSaving(false);
    }
  }
  const fields = [
    [
      "date",
      "Date",
      [
        ["", "Any time"],
        ["1", "Past 24 hours"],
        ["7", "Past 7 days"],
        ["30", "Past 30 days"],
      ],
    ],
    [
      "source_id",
      "Source",
      [
        ["", "All sources"],
        ...(sources.data?.data || []).map((item) => {
          const source = item.source || item;
          return [source.id, source.name || source.type || "Public source"];
        }),
      ],
    ],
    [
      "country_code",
      "Location",
      [
        ["", "Anywhere"],
        ["NG", "Nigeria"],
        ["GB", "United Kingdom"],
        ["US", "United States"],
      ],
    ],
    [
      "language",
      "Language",
      [
        ["", "All languages"],
        ["en", "English"],
        ["fr", "French"],
      ],
    ],
    [
      "sentiment",
      "Sentiment",
      [
        ["", "Any sentiment"],
        ["positive", "Positive"],
        ["neutral", "Neutral"],
        ["negative", "Negative"],
      ],
    ],
  ];
  return (
    <PageMotion className="research-page search-page">
      <form
        className="discovery-search compact-search"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() === query) resource.reload();
          else if (input.trim()) onSearch(input.trim());
        }}
      >
        <Search size={17} />
        <input
          aria-label="Search query"
          placeholder="Search the public web"
          required
          maxLength={500}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="primary-button">Search</button>
      </form>
      <div className="research-heading">
        <div>
          <h1>{query || "Search the public web"}</h1>
          <p>
            {query
              ? `${number(results.length)} results from ${number(new Set(results.map((item) => item.source_id || item.source?.id).filter(Boolean)).size)} public sources`
              : "Find the stories and conversations that matter."}
          </p>
        </div>
        <button
          disabled={!query}
          className="outline-button"
          onClick={() => onMonitor(query)}
        >
          <Bookmark size={14} />
          Monitor this topic
        </button>
      </div>
      <Tabs
        label="Search channels"
        value={channel}
        onChange={setChannel}
        items={channels.map(([id, label]) => ({
          id,
          label: `${label}${id === "all" && results.length ? `  ${number(results.length)}` : ""}`,
        }))}
      />
      <div className="search-layout">
        <aside className="filter-panel">
          <h2>
            <Filter size={13} />
            Refine results
          </h2>
          {fields.map(([key, label, options]) => (
            <label key={key} className="filter-field">
              {label}
              <select
                aria-label={label}
                value={filters[key]}
                onChange={(e) => filter(key, e.target.value)}
              >
                {options.map(([id, text]) => (
                  <option key={id} value={id}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <ResourceState resource={sources} />
          <button
            className="outline-button"
            disabled={!query}
            onClick={() => setSaveOpen((v) => !v)}
          >
            <Bookmark size={12} />
            Save this view
          </button>
          {saveOpen && (
            <form className="save-view-form" onSubmit={save}>
              <label>
                View name
                <input
                  aria-label="View name"
                  required
                  maxLength={160}
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
              </label>
              <button
                disabled={saving || !saveName.trim()}
                className="primary-button"
              >
                {saving ? "Saving…" : "Save view"}
              </button>
            </form>
          )}
          {saveMessage && (
            <p className="inline-success" role="status">
              {saveMessage}
            </p>
          )}
          {saveError && (
            <p className="form-error" role="alert">
              {saveError}
            </p>
          )}
        </aside>
        <section className="results-panel" aria-label="Search results">
          <div className="results-toolbar">
            <span>Showing {visible.length} representative results</span>
            <label>
              Sort by
              <select
                aria-label="Sort results"
                value={filters.sort}
                onChange={(e) => filter("sort", e.target.value)}
              >
                <option value="relevance">Most Relevant</option>
                <option value="latest">Latest first</option>
              </select>
            </label>
          </div>
          {query ? (
            <ResourceState resource={resource} empty={!visible.length}>
              No results match this search. Try another topic or adjust your
              filters.
            </ResourceState>
          ) : (
            <p className="workspace-empty">
              Enter a topic above to begin searching.
            </p>
          )}
          {!resource.loading &&
            !resource.error &&
            visible.map((item) => (
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
                    {item.cluster?.mention_count != null && (
                      <span>{number(item.cluster.mention_count)} mentions</span>
                    )}
                    {item.cluster?.source_count != null && (
                      <span>{number(item.cluster.source_count)} sources</span>
                    )}
                    {preferences.detectTone && item.sentiment && (
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
                  </span>
                </span>
              </button>
            ))}
        </section>
      </div>
    </PageMotion>
  );
}
