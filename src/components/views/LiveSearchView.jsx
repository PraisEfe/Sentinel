import { useEffect, useMemo, useState } from "react";
import { Bookmark, Filter, Globe, Search } from "lucide-react";
import { number, useResource, useSearchSuggestions, useWorkspace } from "../../lib/workspace";
import { relativeTime } from "../../lib/format";
import { PageMotion, Pagination, ResourceState, Tabs } from "../common/WorkspaceUI";
import ModernSelect from "../common/ModernSelect";
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
  canManageMonitors = false,
  initialFilters = {},
  onFilterChange,
  channel = "all",
  onChannelChange,
}) {
  const { preferences, canOversee } = useWorkspace();
  const [input, setInput] = useState(query);
  const suggestions = useSearchSuggestions(input);
  const filters = {
    date: "",
    source_id: "",
    country_code: "",
    language: "",
    sentiment: "",
    sort: "relevance",
    page: "",
    scope: "workspace",
    ...initialFilters,
  };
  const [searchTime] = useState(() => Date.now());
  const from = useMemo(
    () =>
      filters.date
        ? new Date(searchTime - Number(filters.date) * 86400000).toISOString()
        : "",
    [filters.date, searchTime],
  );
  const monitorId = filters.monitor_id || "";
  const monitorName = filters.monitor_name || "";
  const monitorScope = Boolean(monitorId);
  const hasSearch = Boolean(query || monitorId);
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  for (const key of [
    "source_id",
    "country_code",
    "language",
    "sentiment",
    "sort",
    "cluster_id",
    "page",
    "monitor_id",
  ])
    if (filters[key]) params.set(key, filters[key]);
  if (from) params.set("from", from);
  if (filters.scope === "oversight") params.set("scope", "oversight");
  params.set(
    "collapse",
    monitorScope ? "0" : preferences.groupStories ? "1" : "0",
  );
  const resource = useResource(hasSearch ? `/search?${params}` : null, {
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
  const storyTotal = resource.data?.meta?.total ?? results.length;
  const sourceCount =
    resource.data?.meta?.source_count ??
    new Set(results.map((item) => item.source_id || item.source?.id).filter(Boolean))
      .size;
  const page = Number(filters.page || 1) || 1;
  const lastPage = resource.data?.meta?.last_page || 1;
  const scopeSuffix =
    filters.scope === "oversight" ? " across your office and descendants" : "";
  const description = !hasSearch
    ? "Find what Sentinel has already collected for this workspace."
    : monitorScope
      ? `${number(storyTotal)} mentions from ${number(sourceCount)} public sources`
      : `${number(storyTotal)} matching stories from ${number(sourceCount)} public sources${scopeSuffix}`;
  function filter(key, value) {
    onFilterChange(key, value);
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
    <PageMotion className={`research-page search-page${preferences.compactResults ? " compact-results" : ""}`}>
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
          placeholder={
            monitorScope
              ? "Search within this monitor"
              : "Search collected mentions"
          }
          required
          maxLength={500}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          list="search-suggestions"
        />
        <datalist id="search-suggestions">
          {suggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
        <button className="primary-button">Search</button>
      </form>
      <div className="research-heading">
        <div>
          <h1>
            {monitorScope
              ? monitorName || "Monitor mentions"
              : "Search collected mentions"}
          </h1>
          <p>{description}</p>
        </div>
        {canManageMonitors && (
          <button
            disabled={!query}
            className="outline-button"
            onClick={() => onMonitor(query)}
          >
            <Bookmark size={14} />
            Monitor this topic
          </button>
        )}
      </div>
      <p className="search-corpus-note">
        Search covers mentions your monitors have already collected. Sentinel
        keeps collecting in the background — manual search never triggers a new
        scan.
      </p>
      {canOversee && !monitorScope && (
        <label className="filter-field scope-field">
          Search scope
          <ModernSelect
            ariaLabel="Search scope"
            className="inline"
            value={filters.scope}
            onChange={(value) =>
              filter("scope", value === "oversight" ? "oversight" : "")
            }
            options={[
              { value: "workspace", label: "This office" },
              { value: "oversight", label: "This office and descendants" },
            ]}
          />
        </label>
      )}
      <Tabs
        label="Search channels"
        value={channel}
        onChange={onChannelChange}
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
              <ModernSelect
                ariaLabel={label}
                value={filters[key]}
                onChange={(value) => filter(key, value)}
                options={options.map(([id, text]) => ({ value: id, label: text }))}
              />
            </label>
          ))}
          <ResourceState resource={sources} />
        </aside>
        <section className="results-panel" aria-label="Search results">
          <div className="results-toolbar">
            <span>
              {number(storyTotal)}{" "}
              {monitorScope ? "matched mentions" : "matching stories"} ·
              showing {visible.length} on page {page}
            </span>
            <label>
              Sort by
              <ModernSelect
                ariaLabel="Sort results"
                className="inline"
                value={filters.sort}
                onChange={(value) => filter("sort", value)}
                options={[
                  { value: "relevance", label: "Most Relevant" },
                  { value: "latest", label: "Latest first" },
                ]}
              />
            </label>
          </div>
          {query || monitorScope ? (
            <ResourceState resource={resource} empty={!visible.length}>
              {monitorScope
                ? "No mentions match this monitor yet."
                : "No results match this search. Try another topic or adjust your filters."}
            </ResourceState>
          ) : (
            <p className="workspace-empty">
              Enter a topic above to search what your monitors have already
              collected.
            </p>
          )}
          {!resource.loading &&
            !resource.error &&
            query &&
            !monitorScope &&
            !visible.length &&
            canManageMonitors && (
              <button
                className="outline-button empty-monitor-action"
                onClick={() => onMonitor(query)}
              >
                <Bookmark size={13} />
                Create a monitor for “{query}”
              </button>
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
                    {filters.scope === "oversight" && item.workspace?.name && (
                      <>
                        {" "}<span>·</span> {item.workspace.name}
                      </>
                    )}
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
          <Pagination
            page={page}
            lastPage={lastPage}
            onChange={(value) => filter("page", value > 1 ? String(value) : "")}
            loading={resource.loading}
          />
        </section>
      </div>
    </PageMotion>
  );
}
