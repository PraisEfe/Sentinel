import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "./workspace";

const PAGE_SIZE = 3;
const pageCount = (total) => Math.max(1, Math.floor(total / PAGE_SIZE));

// API batches and visible pages are independent. Buffer only enough batches for
// the current page plus one lookahead, so a final 1–2 items join the last page.
export function useIntelligencePages(path, page, paginated) {
  const { api, scopeKey } = useWorkspace();
  const cache = useRef(null);
  const [version, setVersion] = useState(0);
  const [state, setState] = useState({ key: "", data: null, loading: true, error: "" });
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const key = `${scopeKey}:${path}:${page}:${version}`;
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    if (cache.current?.scopeKey !== scopeKey || cache.current?.path !== path) {
      cache.current = { scopeKey, path, items: [], nextPage: 1, hasMore: true, total: null };
    }
    const list = cache.current;
    async function load() {
      setState({ key, data: null, loading: true, error: "" });
      try {
        const needed = (page + 1) * PAGE_SIZE;
        while (active && list.hasMore && list.items.length < needed) {
          const result = await api(paginated ? `${path}?page=${list.nextPage}` : path, { signal: controller.signal });
          if (!active) return;
          if (!Array.isArray(result?.data)) throw Error("We couldn’t load this information. Please try again.");
          list.items.push(...result.data);
          const lastPage = result.meta?.last_page;
          list.hasMore = paginated && result.data.length > 0 && (Number.isSafeInteger(lastPage)
            ? list.nextPage < lastPage
            : !!result.links?.next);
          list.nextPage += 1;
          const total = result.meta?.total;
          if (Number.isSafeInteger(total) && total >= 0) list.total = total;
          if (!list.hasMore) list.total = list.items.length;
        }
        if (!active) return;
        const lastPage = list.total === null ? null : pageCount(list.total);
        const currentPage = lastPage === null ? page : Math.min(page, lastPage);
        const start = (currentPage - 1) * PAGE_SIZE;
        const isLast = !list.hasMore && start + PAGE_SIZE * 2 > list.items.length;
        setState({ key, loading: false, error: "", data: {
          data: list.items.slice(start, isLast ? undefined : start + PAGE_SIZE),
          page: currentPage, lastPage,
          hasNext: lastPage === null ? list.hasMore || start + PAGE_SIZE * 2 <= list.items.length : currentPage < lastPage,
        } });
      } catch (failure) {
        if (active) setState({ key, loading: false, data: null, error: failure.message });
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [api, scopeKey, path, page, paginated, version, key]);
  return { ...(state.key === key ? state : { loading: true, data: null, error: "" }), reload };
}
