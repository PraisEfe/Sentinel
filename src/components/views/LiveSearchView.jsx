import { useEffect, useMemo, useState } from "react";
import { Bookmark, ExternalLink, Filter, Globe, Search } from "lucide-react";
import { frequencyLabel, number, useResource, useSearchSuggestions, useWorkspace } from "../../lib/workspace";
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
  initialFilters = {},
  onFilterChange,
  channel = "all",
  onChannelChange,
}) {
  const { api, canOversee, preferences } = useWorkspace();
  const [input, setInput] = useState(query);
  const suggestions = useSearchSuggestions(input);
  const [resultType, setResultType] = useState("stories");
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
  const sourceSearch = useResource(
    query ? `/search/sources?${new URLSearchParams({ q: query })}` : null,
    { list: true },
  );
  const monitorParams = new URLSearchParams({ q: query || "" });
  if (filters.scope === "oversight") monitorParams.set("scope", "oversight");
  const monitorSearch = useResource(
    query ? `/search/monitors?${monitorParams}` : null,
    { list: true },
  );
  const liveSearch = useResource(
    query && resultType === "live"
      ? `/search/live?${new URLSearchParams({ q: query })}`
      : null,
    { list: true },
  );
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
  const sourceItems = sourceSearch.data?.data || [];
  const sourceTotal = sourceSearch.data?.meta?.total ?? sourceItems.length;
  const monitorItems = monitorSearch.data?.data || [];
  const monitorTotal = monitorSearch.data?.meta?.total ?? monitorItems.length;
  const liveItems = liveSearch.data?.data || [];
  const liveTotal = liveSearch.data?.meta?.total ?? liveItems.length;
  const page = Number(filters.page || 1) || 1;
  const lastPage = resource.data?.meta?.last_page || 1;
  const scopeSuffix =
    filters.scope === "oversight" ? " across your office and descendants" : "";
  const description = !hasSearch
    ? "Find the stories and conversations that matter."
    : monitorScope
      ? `${number(storyTotal)} mentions from ${number(sourceCount)} public sources`
      : resultType === "stories"
      ? `${number(storyTotal)} matching stories from ${number(sourceCount)} public sources${scopeSuffix}`
      : resultType === "sources"
        ? `${number(sourceTotal)} matching sources`
        : resultType === "live"
          ? `${number(liveTotal)} live web results · not saved to this workspace`
          : `${number(monitorTotal)} matching monitors${scopeSuffix}`;
  function filter(key, value) {
    onFilterChange(key, value);
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
            .filter(([key]) => !["q", "page", "monitor_name"].includes(key))
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
              : "Search your monitored public sources"
          }
          list="search-suggestions"
          required
          maxLength={500}
          value={input}
          onChange={(e) => setInput(e.target.value)}
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
              : query || "Search your monitored public sources"}
          </h1>
          <p>{description}</p>
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
      {!monitorScope && (
      <Tabs
        label="Result types"
        value={resultType}
        onChange={setResultType}
        items={[
          { id: "stories", label: `Stories${storyTotal ? ` ${number(storyTotal)}` : ""}` },
          { id: "sources", label: `Sources${sourceTotal ? ` ${number(sourceTotal)}` : ""}` },
          { id: "monitors", label: `Monitors${monitorTotal ? ` ${number(monitorTotal)}` : ""}` },
          { id: "live", label: `Live web${liveTotal ? ` ${number(liveTotal)}` : ""}` },
        ]}
      />
      )}
      {canOversee && !monitorScope && resultType !== "live" && (
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
      {resultType === "stories" && (
        <Tabs
          label="Search channels"
          value={channel}
          onChange={onChannelChange}
          items={channels.map(([id, label]) => ({
            id,
            label: `${label}${id === "all" && results.length ? `  ${number(results.length)}` : ""}`,
          }))}
        />
      )}
      {resultType === "stories" ? (
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
      ) : resultType === "sources" ? (
        <section className="results-panel" aria-label="Matching sources">
          <div className="results-toolbar">
            <span>{number(sourceTotal)} matching sources</span>
          </div>
          <ResourceState resource={sourceSearch} empty={!sourceItems.length}>
            No sources match this search.
          </ResourceState>
          {!sourceSearch.loading &&
            !sourceSearch.error &&
            sourceItems.map((item) => {
              const source = item.source || item;
              return (
                <button
                  className="result-row"
                  key={source.id}
                  onClick={() => {
                    setResultType("stories");
                    filter("source_id", source.id);
                  }}
                >
                  <span className={`source-icon ${source.type || "web"}`}>
                    <Globe size={14} />
                  </span>
                  <span className="result-channel">{source.type || "web"}</span>
                  <span className="result-content">
                    <small>
                      {source.provider || "source"} · {item.coverage || "Global"}
                    </small>
                    <strong>{source.name}</strong>
                    <p>
                      {item.available === false
                        ? "Inactive upstream"
                        : item.enabled_for_workspace === false
                          ? "Disabled for this workspace"
                          : "Available for this workspace"}
                    </p>
                  </span>
                </button>
              );
            })}
        </section>
      ) : resultType === "live" ? (
        <section className="results-panel" aria-label="Live web results">
          <div className="results-toolbar">
            <span>{number(liveTotal)} live web results · not saved</span>
          </div>
          <p className="analytics-card-caption">
            Live results come from Google News and are not stored in this
            workspace. Use “Monitor this topic” to collect them continuously.
          </p>
          <ResourceState resource={liveSearch} empty={!liveItems.length}>
            No live web results match this search.
          </ResourceState>
          {!liveSearch.loading &&
            !liveSearch.error &&
            liveItems.map((item) => (
              <a
                className="result-row"
                key={item.external_id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
              >
                <span className="source-icon web">
                  <Globe size={14} />
                </span>
                <span className="result-channel">live web</span>
                <span className="result-content">
                  <small>
                    {item.publisher || "Google News"} <span>·</span>{" "}
                    {item.published_at
                      ? relativeTime(item.published_at)
                      : "just now"}
                  </small>
                  <strong>{item.title}</strong>
                  <p>{item.snippet}</p>
                  <span className="result-meta">
                    <span>
                      Open on the web <ExternalLink size={11} />
                    </span>
                  </span>
                </span>
              </a>
            ))}
        </section>
      ) : (
        <section className="results-panel" aria-label="Matching monitors">
          <div className="results-toolbar">
            <span>{number(monitorTotal)} matching monitors</span>
          </div>
          <ResourceState resource={monitorSearch} empty={!monitorItems.length}>
            No monitors match this search.
          </ResourceState>
          {!monitorSearch.loading &&
            !monitorSearch.error &&
            monitorItems.map((monitor) => (
              <button
                className="result-row"
                key={monitor.id}
                onClick={() => onSearch(monitor.query || monitor.name)}
              >
                <span className={`source-icon ${monitor.type || "topic"}`}>
                  <Search size={14} />
                </span>
                <span className="result-channel">{monitor.type || "topic"}</span>
                <span className="result-content">
                  <small>
                    {monitor.is_active ? "Active" : "Paused"} ·{" "}
                    {frequencyLabel(monitor.frequency)}
                    {filters.scope === "oversight" && monitor.workspace?.name && (
                      <> · {monitor.workspace.name}</>
                    )}
                  </small>
                  <strong>{monitor.name}</strong>
                  <p>{monitor.query}</p>
                  {monitor.mention_count != null && (
                    <span className="result-meta">
                      <span>{number(monitor.mention_count)} mentions</span>
                    </span>
                  )}
                </span>
              </button>
            ))}
        </section>
      )}
    </PageMotion>
  );
}
