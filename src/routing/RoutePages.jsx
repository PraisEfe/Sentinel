import { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import AuthView from "../components/views/AuthView";
import DashboardView from "../components/views/DashboardView";
import MonitorsView from "../components/views/MonitorsView";
import LiveSearchView from "../components/views/LiveSearchView";
import { useAppStore } from "../stores/appStore";
import { useWorkspace } from "../lib/workspace";
import { isDemoPath, safeReturnTo, workspacePathFor } from "./paths";

export function AuthPage({ mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, notice, acceptSession } = useAppStore(
    useShallow((state) => ({
      session: state.session,
      notice: state.notice,
      acceptSession: state.acceptSession,
    })),
  );
  const target = safeReturnTo(location.state?.from);
  if (session) return <Navigate to={target} replace />;
  return (
    <AuthView
      key={mode}
      initialMode={mode}
      notice={notice}
      onAuthenticate={async (next, remember) => {
        await acceptSession(next, remember);
        if (useAppStore.getState().session) navigate(target, { replace: true });
      }}
      onDemo={() => navigate("/demo")}
    />
  );
}
export function NewWorkspacePage() {
  const { workspaceId, createWorkspace } = useAppStore(
    useShallow((state) => ({
      workspaceId: state.workspaceId,
      createWorkspace: state.createWorkspace,
    })),
  );
  const location = useLocation();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  if (workspaceId)
    return <Navigate to={safeReturnTo(location.state?.from)} replace />;
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await createWorkspace(name);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace-gate">
      <h1>Create your research workspace</h1>
      <p>You’re signed in. Give your first workspace a name to get started.</p>
      <form className="auth-form" onSubmit={submit}>
        <label className="field-label" htmlFor="workspace-name">
          Workspace name
          <input
            id="workspace-name"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" disabled={busy || !name.trim()}>
          {busy ? "Creating…" : "Create workspace"}
        </button>
      </form>
      <button className="text-link" onClick={useAppStore.getState().logout}>
        Sign out
      </button>
    </main>
  );
}
function useSummary() {
  const { demo } = useWorkspace();
  return useAppStore(
    useShallow((state) => ({
      data: demo ? state.demoData : state.data,
      loading: demo ? false : state.dataStatus.loading,
      error: demo ? "" : state.dataStatus.error,
      page: demo ? 1 : state.monitorPage,
      refresh: demo ? state.refreshDemo : state.refreshWorkspace,
      clearHistory: state.clearHistory,
      openMonitor: state.openMonitor,
    })),
  );
}
export function HomePage() {
  const { demo } = useWorkspace();
  const summary = useSummary();
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const search = (text) =>
    navigate(
      `${workspacePathFor("search", demo)}?${new URLSearchParams({ q: text })}`,
    );
  return (
    <DashboardView
      onSearch={search}
      onSelectTopic={search}
      onOpenAddMonitor={() => summary.openMonitor()}
      monitors={summary.data.monitors}
      history={summary.data.history}
      loading={summary.loading}
      error={summary.error}
      onRetry={summary.refresh}
      onClearHistory={() => summary.clearHistory(demo)}
      monitorTotal={summary.data.monitorTotal}
      monitorPage={summary.page}
      lastPage={summary.data.lastPage || 1}
      onPageChange={(page) => setParams({ page: String(page) })}
    />
  );
}
export function MonitorsPage() {
  const { demo } = useWorkspace();
  const summary = useSummary();
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  return (
    <MonitorsView
      monitors={summary.data.monitors}
      loading={summary.loading}
      error={summary.error}
      onRetry={summary.refresh}
      onCreate={() => summary.openMonitor()}
      onSelect={(text) =>
        navigate(
          `${workspacePathFor("search", demo)}?${new URLSearchParams({ q: text })}`,
        )
      }
      page={summary.page}
      lastPage={summary.data.lastPage || 1}
      onPageChange={(page) => setParams({ page: String(page) })}
      total={summary.data.monitorTotal}
    />
  );
}
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { onRefresh, scopeKey } = useWorkspace();
  const actions = useAppStore(
    useShallow((state) => ({
      openResult: state.openResult,
      openMonitor: state.openMonitor,
    })),
  );
  const query = params.get("q") || "";
  const filters = Object.fromEntries(params);
  function search(q) {
    setParams({ q });
  }
  function filter(key, value) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  }
  return (
    <LiveSearchView
      key={`${scopeKey}:${query}:${params.get("cluster_id") || ""}`}
      query={query}
      onSearch={search}
      onSearched={onRefresh}
      onSelectResult={actions.openResult}
      onMonitor={actions.openMonitor}
      initialFilters={filters}
      onFilterChange={filter}
      channel={params.get("channel") || "all"}
      onChannelChange={(value) => filter("channel", value)}
    />
  );
}
export function DemoGate({ children }) {
  const { ready, startDemo } = useAppStore(
    useShallow((state) => ({
      ready: !!state.demoService,
      startDemo: state.startDemo,
    })),
  );
  useEffect(() => {
    startDemo();
  }, [startDemo]);
  return ready ? (
    children
  ) : (
    <p className="workspace-loading" role="status">
      Opening demo workspace…
    </p>
  );
}
export function WorkspaceGate({ children }) {
  const workspaceId = useAppStore((state) => state.workspaceId);
  const location = useLocation();
  if (!workspaceId && !isDemoPath(location.pathname))
    return (
      <Navigate
        to="/workspaces/new"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  return children;
}
export function NotFoundPage() {
  const { demo } = useWorkspace();
  return (
    <main className="workspace-gate">
      <h1>Page not found</h1>
      <p>The page you requested doesn’t exist.</p>
      <Link className="primary-button" to={workspacePathFor("dashboard", demo)}>
        Go home
      </Link>
    </main>
  );
}
