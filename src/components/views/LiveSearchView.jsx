import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { requestList, workspacePath } from "../../lib/api";
import { safeExternalUrl, relativeTime } from "../../lib/format";
export default function LiveSearchView({
  query,
  token,
  workspaceId,
  demo,
  onSearch,
  onSearched,
}) {
  const [input, setInput] = useState(query);
  const [state, setState] = useState({
    loading: false,
    results: [],
    error: "",
  });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!query || demo || !workspaceId) return;
    const controller = new AbortController();
    let active = true;
    async function load() {
      setState({ loading: true, results: [], error: "" });
      try {
        const response = await requestList(
          workspacePath(workspaceId, `/search?q=${encodeURIComponent(query)}`),
          { token, signal: controller.signal },
        );
        if (active) {
          setState({ loading: false, results: response.data, error: "" });
          onSearched();
        }
      } catch (error) {
        if (active)
          setState({ loading: false, results: [], error: error.message });
      }
    }
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [query, token, workspaceId, demo, retry, onSearched]);
  return (
    <section className="live-search-page">
      <form
        className="discovery-search"
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() === query) setRetry((value) => value + 1);
          else if (input.trim()) onSearch(input.trim());
        }}
      >
        <Search size={20} />
        <input
          aria-label="Search query"
          placeholder="Search the public web"
          value={input}
          maxLength={500}
          required
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="primary-button">Search</button>
      </form>
      <h1>{query ? `Results for “${query}”` : "Search the public web"}</h1>
      {demo && (
        <p className="form-message">
          This is a demo workspace. Sign in to search live sources.
        </p>
      )}
      {state.loading && <p role="status">Searching public sources…</p>}
      {state.error && (
        <div role="alert" className="load-error">
          {state.error}
          <button
            className="text-link"
            onClick={() => setRetry((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      )}
      {!state.loading && !state.error && query && !demo && (
        <p>{state.results.length} results</p>
      )}
      <div className="live-results">
        {state.results.map((item) => (
          <article key={item.id}>
            <small>
              {item.source?.name || "Public source"} ·{" "}
              {relativeTime(item.published_at)}
            </small>
            <h2>{item.title || "Untitled mention"}</h2>
            <p>{item.body}</p>
            {safeExternalUrl(item.url) && (
              <a
                href={safeExternalUrl(item.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Read original ↗
              </a>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
