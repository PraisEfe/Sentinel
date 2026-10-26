import { useEffect, useState, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { defaultPreferences, useAppStore } from "../stores/appStore";

export function useWorkspace() {
  const state = useAppStore(
    useShallow((store) => ({
      api: store.api,
      user: store.user,
      workspaceId: store.workspaceId,
      authVersion: store.authVersion,
      preferences: store.preferences,
      save: store.savePreferences,
      updateUser: store.updateUser,
      onRefresh: store.refreshWorkspace,
    })),
  );
  const key = `${state.user?.id}:${state.workspaceId}`;
  return {
    api: state.api,
    user: state.user,
    scopeKey: `${state.authVersion}:${state.workspaceId}`,
    preferences: state.preferences[key] || defaultPreferences,
    savePreferences: state.save,
    onUserUpdate: state.updateUser,
    onRefresh: state.onRefresh,
  };
}
export function useResource(path, { list = false } = {}) {
  const { api, scopeKey } = useWorkspace();
  const key = `${scopeKey}:${path}`;
  const [state, setState] = useState({
    key: "",
    data: null,
    loading: !!path,
    error: "",
  });
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    if (!path) return;
    let active = true;
    const controller = new AbortController();
    async function load() {
      setState((previous) => ({
        key,
        data: previous.key === key ? previous.data : null,
        loading: true,
        error: "",
      }));
      try {
        const result = await api(path, { signal: controller.signal });
        if (list && !Array.isArray(result?.data))
          throw Error("We couldn’t load this information. Please try again.");
        if (active) setState({ key, data: result, loading: false, error: "" });
      } catch (error) {
        if (active)
          setState({ key, data: null, loading: false, error: error.message, errorStatus: error.status || 0 });
      }
    }
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [api, scopeKey, path, list, version, key]);
  return {
    ...(path && state.key === key
      ? state
      : { data: null, loading: !!path, error: "" }),
    reload,
  };
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
