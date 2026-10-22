import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
export const WorkspaceContext = createContext(null);
export function useWorkspace() {
  return useContext(WorkspaceContext);
}
export function useResource(path, { list = false } = {}) {
  const { api } = useWorkspace();
  const [state, setState] = useState({
    data: null,
    loading: !!path,
    error: "",
  });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!path) return;
    let active = true;
    const controller = new AbortController();
    async function load() {
      setState((previous) => ({ ...previous, loading: true, error: "" }));
      try {
        const result = await api(path, { signal: controller.signal });
        if (list && !Array.isArray(result?.data))
          throw Error("This data is not available in a supported format yet.");
        if (active) setState({ data: result, loading: false, error: "" });
      } catch (error) {
        if (active)
          setState({ data: null, loading: false, error: error.message });
      }
    }
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, path, list, version]);
  return { ...state, reload };
}
export const number = (value) => {
  if (value == null || value === "") return "—";
  const parsed =
    typeof value === "string"
      ? Number(value.replaceAll(",", ""))
      : Number(value);
  return Number.isFinite(parsed) ? parsed.toLocaleString() : "—";
};
export const frequencyLabel = (value) =>
  ({
    "5m": "5 minutes",
    "10m": "10 minutes",
    "20m": "20 minutes",
    "30m": "30 minutes",
    "1h": "1 hour",
    "24h": "24 hours",
  })[value] ||
  value ||
  "—";
export const enabled = (value) =>
  value === true || value === 1 || value === "1" || value === "true";
