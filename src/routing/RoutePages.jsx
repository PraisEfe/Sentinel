import { lazy, Suspense, useEffect, useEffectEvent, useState } from "react";
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
import LoadingState from "../components/common/LoadingState";
import RouteBoundary from "./RouteBoundary";
const MonitorsView = lazy(() => import("../components/views/MonitorsView"));
const MonitorDetailView = lazy(() => import("../components/views/MonitorDetailView"));
import LiveSearchView from "../components/views/LiveSearchView";
import { useAppStore } from "../stores/appStore";
import {
  canCreateAnyWorkspace,
  useWorkspace,
  workspaceCapabilities,
} from "../lib/workspace";
import { safeReturnTo, workspacePathFor } from "./paths";

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
    />
  );
}
export function NewWorkspacePage() {
  const {
    workspaceId,
    workspaces,
    createWorkspace,
    authenticatedApi,
    user,
    logout,
  } = useAppStore(
    useShallow((state) => ({
      workspaceId: state.workspaceId,
      workspaces: state.workspaces,
      createWorkspace: state.createWorkspace,
      authenticatedApi: state.authenticatedApi,
      user: state.user,
      logout: state.logout,
    })),
  );
  const location = useLocation();
  const navigate = useNavigate();
  const [additional] = useState(Boolean(workspaceId));
  const [name, setName] = useState("");
  const [units, setUnits] = useState([]);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [unitsError, setUnitsError] = useState("");
  const [unitsVersion, setUnitsVersion] = useState(0);
  const [unitId, setUnitId] = useState("");
  const [parentId, setParentId] = useState("");
  const [level, setLevel] = useState("office");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canCreate = canCreateAnyWorkspace(user, workspaces);
  const scopes = (user?.oversight_scopes || []).filter(
    (scope) => scope.can_manage_members === true,
  );
  const eligibleUnits = units.filter(
    (unit) =>
      (!unit.status || unit.status === "active") &&
      scopes.some(
        (scope) =>
          scope.state === unit.state &&
          (!scope.unit_id || scope.unit_id === unit.id),
      ) &&
      !workspaces.some(
        (workspace) => workspace.unit_id === unit.id && !workspace.parent_id,
      ),
  );
  const parents = workspaces.filter(
    (workspace) =>
      workspace.unit_id &&
      workspaceCapabilities(workspace).canCreateWorkspace,
  );
  const selectedParent = parents.find((workspace) => workspace.id === parentId);
  const selectedUnitId =
    unitId ||
    scopes.find(
      (scope) =>
        scope.unit_id && eligibleUnits.some((unit) => unit.id === scope.unit_id),
    )?.unit_id ||
    "";

  useEffect(() => {
    if (!canCreate) return;
    let active = true;
    const controller = new AbortController();
    async function loadUnits() {
      setUnitsLoading(true);
      setUnitsError("");
      try {
        const result = await authenticatedApi("/units", {
          signal: controller.signal,
        });
        if (active) setUnits(Array.isArray(result?.data) ? result.data : []);
      } catch (failure) {
        if (active && failure.name !== "AbortError")
          setUnitsError(failure.message);
      } finally {
        if (active) setUnitsLoading(false);
      }
    }
    void loadUnits();
    return () => {
      active = false;
      controller.abort();
    };
  }, [authenticatedApi, canCreate, unitsVersion]);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const workspace = await createWorkspace({
        name,
        level,
        ...(parentId
          ? { parent_id: parentId }
          : { unit_id: selectedUnitId }),
      });
      if (workspace?.id) navigate(safeReturnTo(location.state?.from), { replace: true });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  if (!canCreate) {
    return (
      <main className="workspace-gate">
        <h1>Office workspace creation is managed by authorised officials</h1>
        <p>
          Members cannot create office workspaces. Ask an office administrator,
          Head of Service or Commissioner to assign you to the right office.
        </p>
        <button className="text-link" onClick={logout}>
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main className="workspace-gate">
      <h1>{additional ? "Create another office workspace" : "Create your office workspace"}</h1>
      <p>
        A Workspace is an office tenant. Its Unit is the organisation and staff
        roster boundary; its State is the jurisdiction.
      </p>
      <form className="auth-form" onSubmit={submit}>
        <label className="field-label" htmlFor="workspace-name">
          Office workspace name
          <input
            id="workspace-name"
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="field-label" htmlFor="workspace-parent">
          Parent office (optional)
          <select
            id="workspace-parent"
            value={parentId}
            onChange={(event) => {
              setParentId(event.target.value);
              setError("");
            }}
          >
            <option value="">No parent (create a Unit root office)</option>
            {parents.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
        </label>
        {!parentId && (
          <label className="field-label" htmlFor="workspace-unit">
            Unit
            <select
              id="workspace-unit"
              required
              disabled={unitsLoading}
              value={selectedUnitId}
              onChange={(event) => setUnitId(event.target.value)}
            >
              <option value="">Select an eligible active Unit</option>
              {eligibleUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} · {unit.state} jurisdiction
                </option>
              ))}
            </select>
          </label>
        )}
        {selectedParent && (
          <p className="field-hint">
            Unit is inherited from {selectedParent.name}.
          </p>
        )}
        <label className="field-label" htmlFor="workspace-level">
          Office type
          <select
            id="workspace-level"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          >
            <option value="office">Office</option>
            <option value="directorate">Directorate</option>
            <option value="oversight">Oversight office</option>
          </select>
        </label>
        {unitsLoading && <p className="field-hint">Loading active Units…</p>}
        {unitsError && (
          <div className="load-error" role="alert">
            <span>{unitsError}</span>
            <button
              className="text-link"
              type="button"
              onClick={() => setUnitsVersion((version) => version + 1)}
            >
              Try again
            </button>
          </div>
        )}
        {!unitsLoading && !parentId && eligibleUnits.length === 0 && !unitsError && (
          <p className="field-hint">
            No Unit is eligible for another root office. Choose a manageable
            parent office to create a child workspace.
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="primary-button"
          disabled={
            busy ||
            unitsLoading ||
            !name.trim() ||
            (!parentId && !selectedUnitId)
          }
        >
          {busy ? "Creating…" : "Create workspace"}
        </button>
      </form>
      {additional && <Link className="text-link" to="/">Cancel and return to workspace</Link>}
      <button className="text-link" onClick={useAppStore.getState().logout}>
        Sign out
      </button>
    </main>
  );
}
function useSummary() {
  return useAppStore(
    useShallow((state) => ({
      data: state.data,
      loading: state.dataStatus.loading,
      error: state.dataStatus.error,
      page: state.monitorPage,
      refresh: state.refreshWorkspace,
      deleteMonitor: state.deleteMonitor,
      openMonitor: state.openMonitor,
    })),
  );
}
export function HomePage() {
  const summary = useSummary();
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  const { canManageMonitors } = useWorkspace();
  return (
    <DashboardView
      onOpenAddMonitor={() => summary.openMonitor()}
      onOpenMonitor={(monitor) =>
        navigate(`${workspacePathFor("monitors")}/${monitor.id}`)
      }
      onOpenMonitors={() => navigate(workspacePathFor("monitors"))}
      onOpenIntelligence={() => navigate(workspacePathFor("intelligence"))}
      canManageMonitors={canManageMonitors}
      monitors={summary.data.monitors}
      loading={summary.loading}
      error={summary.error}
      onRetry={summary.refresh}
      monitorTotal={summary.data.monitorTotal}
      monitorPage={summary.page}
      lastPage={summary.data.lastPage || 1}
      onPageChange={(page) => setParams({ page: String(page) })}
    />
  );
}
export function MonitorsPage() {
  const summary = useSummary();
  const { canManageMonitors } = useWorkspace();
  const navigate = useNavigate();
  const [, setParams] = useSearchParams();
  return (
    <RouteBoundary><Suspense fallback={<LoadingState label="Opening monitors…" />}><MonitorsView
      monitors={summary.data.monitors}
      loading={summary.loading}
      error={summary.error}
      onRetry={summary.refresh}
      onCreate={() => summary.openMonitor()}
      canManageMonitors={canManageMonitors}
      onDelete={async (id) => {
        const nextPage = await summary.deleteMonitor(id);
        if (nextPage !== null && nextPage !== summary.page) setParams({ page: String(nextPage) }, { replace: true });
      }}
      onSelect={(monitor) =>
        navigate(`${workspacePathFor("monitors")}/${monitor.id}`)
      }
      page={summary.page}
      lastPage={summary.data.lastPage || 1}
      onPageChange={(page) => setParams({ page: String(page) })}
      total={summary.data.monitorTotal}
    /></Suspense></RouteBoundary>
  );
}
export function MonitorDetailPage() {
  const openResult = useAppStore((state) => state.openResult);
  return (
    <RouteBoundary>
      <Suspense fallback={<LoadingState label="Opening monitor…" />}>
        <MonitorDetailView onSelectResult={openResult} />
      </Suspense>
    </RouteBoundary>
  );
}
export function SearchPage() {
  const [params, setParams] = useSearchParams();
  const { onRefresh, scopeKey, canManageMonitors } = useWorkspace();
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
        if (key !== "page") next.delete("page");
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
      canManageMonitors={canManageMonitors}
      initialFilters={filters}
      onFilterChange={filter}
      channel={params.get("channel") || "all"}
      onChannelChange={(value) => filter("channel", value)}
    />
  );
}
export function WorkspaceGate({ children }) {
  const { workspaceId, workspaces, user, refreshAuthorization, logout } = useAppStore(
    useShallow((state) => ({
      workspaceId: state.workspaceId,
      workspaces: state.workspaces,
      user: state.user,
      refreshAuthorization: state.refreshAuthorization,
      logout: state.logout,
    })),
  );
  const location = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const canCreate = canCreateAnyWorkspace(user, workspaces);

  async function refreshStatus({ quiet = false } = {}) {
    if (refreshing) return;
    setRefreshing(true);
    if (!quiet) setRefreshError("");
    try {
      await refreshAuthorization();
    } catch (failure) {
      if (!quiet) setRefreshError(failure.message);
    } finally {
      setRefreshing(false);
    }
  }

  const refreshOnFocus = useEffectEvent(() => {
    void refreshStatus({ quiet: true });
  });

  useEffect(() => {
    if (workspaceId) return undefined;
    const onFocus = () => refreshOnFocus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [workspaceId]);

  if (!workspaceId) {
    if (canCreate)
      return (
        <Navigate
          to="/workspaces/new"
          replace
          state={{ from: location.pathname + location.search }}
        />
      );

    return (
      <main className="workspace-gate">
        <h1>No office workspace is assigned yet</h1>
        <p>
          Your account is approved, but you have not been assigned to an office
          Workspace in your Unit. Ask an authorised office manager to add you.
        </p>
        {refreshError && <p className="form-error" role="alert">{refreshError}</p>}
        <button className="primary-button" onClick={refreshStatus} disabled={refreshing}>
          {refreshing ? "Checking…" : "Refresh assignment status"}
        </button>
        <button className="text-link" onClick={logout}>
          Sign out
        </button>
      </main>
    );
  }

  return children;
}
export function NotFoundPage() {
  return (
    <main className="workspace-gate">
      <h1>Page not found</h1>
      <p>The page you requested doesn’t exist.</p>
      <Link className="primary-button" to={workspacePathFor("dashboard")}>
        Go home
      </Link>
    </main>
  );
}
