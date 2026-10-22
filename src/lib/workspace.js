import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { defaultPreferences, useAppStore } from "../stores/appStore";

export function useWorkspace() {
  const { pathname } = useLocation();
  const demo = pathname === "/demo" || pathname.startsWith("/demo/");
  const state = useAppStore(
    useShallow((store) => ({
      api: demo ? store.demoApi : store.api,
      user: demo ? store.demoUser : store.user,
      workspaceId: store.workspaceId,
      authVersion: store.authVersion,
      preferences: store.preferences,
      save: store.savePreferences,
      updateUser: store.updateUser,
      onRefresh: demo ? store.refreshDemo : store.refreshWorkspace,
    })),
  );
  const { save, updateUser } = state;
  const savePreferences = useCallback((next) => save(next, demo), [save, demo]);
  const onUserUpdate = useCallback(
    (user) => updateUser(user, demo),
    [updateUser, demo],
  );
  const key = demo ? "demo" : `${state.user?.id}:${state.workspaceId}`;
  return {
    api: state.api,
    demo,
    user: state.user,
    scopeKey: demo ? "demo" : `${state.authVersion}:${state.workspaceId}`,
    preferences: state.preferences[key] || defaultPreferences,
    savePreferences,
    onUserUpdate,
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
          throw Error("This data is not available in a supported format yet.");
        if (active) setState({ key, data: result, loading: false, error: "" });
      } catch (error) {
        if (active)
          setState({ key, data: null, loading: false, error: error.message });
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
