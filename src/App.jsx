import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig } from "framer-motion";
import WorkspaceProvider from "./components/common/WorkspaceProvider";
import ResultPanel from "./components/common/ResultPanel";
import MonitorsView from "./components/views/MonitorsView";
import { createDemoService } from "./data/demoWorkspace";
import Header from "./components/common/Header";
import Sidebar from "./components/common/Sidebar";
import CreateMonitorDialog from "./components/common/CreateMonitorDialog";
import DashboardView from "./components/views/DashboardView";
import AuthView from "./components/views/AuthView";
import LiveSearchView from "./components/views/LiveSearchView";
import AnalyticsView from "./components/views/AnalyticsView";
import AlertsView from "./components/views/AlertsView";
import IntelligenceView from "./components/views/IntelligenceView";
import SettingsView from "./components/views/SettingsView";
import {
  clearSession,
  readSession,
  request,
  requestList,
  saveSession,
  workspacePath,
} from "./lib/api";
import "./App.css";

const demoUser = { id: "demo", name: "Ada Okafor" };
const demoWorkspace = { id: "demo", name: "Research workspace" };
function demoData() {
  const now = Date.now();
  return {
    monitors: [
      ["MTN Nigeria", "organisation", 4821],
      ["Dangote Group", "organisation", 2317],
      ["Cybersecurity", "topic", 1203],
    ].map(([name, type, count], index) => ({
      id: `demo-${index}`,
      name,
      query: name,
      type,
      is_active: true,
      mention_count: count,
      last_scan_at: new Date(now - index * 60000).toISOString(),
    })),
    history: [
      ["MTN Nigeria", 4821],
      ["Dangote", 1201],
      ["Nigerian banking sector", 1082],
      ["Cybersecurity", 2403],
    ].map(([query, count], index) => ({
      id: `history-${index}`,
      query,
      result_count: count,
      created_at: new Date(now - (index + 1) * 3600000).toISOString(),
    })),
    sourcesCount: 328,
    unread: 3,
    monitorTotal: 3,
  };
}
const emptyData = {
  monitors: [],
  history: [],
  sourcesCount: undefined,
  unread: 0,
  monitorTotal: 0,
};

export default function App() {
  const [session, setSession] = useState(readSession);
  const [demo, setDemo] = useState(false);
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceId, setWorkspaceId] = useState("");
  const [monitorPage, setMonitorPage] = useState(1);
  const [boot, setBoot] = useState({ loading: !!session, error: "" });
  const [data, setData] = useState(emptyData);
  const [dataStatus, setDataStatus] = useState({ loading: false, error: "" });
  const [revision, setRevision] = useState(0);
  const [bootstrapRevision, setBootstrapRevision] = useState(0);
  const [currentView, setCurrentView] = useState("dashboard");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const token = session?.token;
  const demoService = useRef(null);
  if (demoService.current == null) {
    demoService.current = createDemoService();
  }
  const [selection, setSelection] = useState(null);
  const [monitorSeed, setMonitorSeed] = useState("");
  const [searchFilters, setSearchFilters] = useState({});
  const [settingsTab, setSettingsTab] = useState("Search & discovery");
  const api = useCallback(
    (path, options = {}) => {
      if (demo) return demoService.current.call(path, options);
      return request(
        path.startsWith("/auth/") ? path : workspacePath(workspaceId, path),
        { ...options, token },
      );
    },
    [demo, token, workspaceId],
  );

  const expire = useCallback(() => {
    clearSession();
    setSession(null);
    setUser(null);
    setWorkspaces([]);
    setWorkspaceId("");
    setData(emptyData);
    setCreateOpen(false);
    setCurrentView("dashboard");
    setNotice("Your session has expired. Please sign in again.");
  }, []);

  useEffect(() => {
    const listener = () => expire();
    window.addEventListener("sentinel:unauthorized", listener);
    return () => window.removeEventListener("sentinel:unauthorized", listener);
  }, [expire]);

  useEffect(() => {
    if (!token || demo) return;
    const controller = new AbortController();
    let active = true;
    async function bootstrap() {
      setBoot({ loading: true, error: "" });
      try {
        const [account, list] = await Promise.all([
          request("/auth/me", { token, signal: controller.signal }),
          requestList("/workspaces", { token, signal: controller.signal }),
        ]);
        if (!active) return;
        if (!account.user?.id)
          throw new Error(
            "The server returned an unexpected account response. Please try again.",
          );
        setUser(account.user);
        setWorkspaces(list.data);
        setWorkspaceId((previous) =>
          list.data.some((item) => item.id === previous)
            ? previous
            : list.data[0]?.id || "",
        );
        setBoot({ loading: false, error: "" });
      } catch (error) {
        if (active && error.status !== 401)
          setBoot({ loading: false, error: error.message });
      }
    }
    bootstrap();
    return () => {
      active = false;
      controller.abort();
    };
  }, [token, demo, bootstrapRevision]);

  useEffect(() => {
    if (!token || !workspaceId || demo) return;
    const controller = new AbortController();
    let active = true;
    async function load() {
      setDataStatus({ loading: true, error: "" });
      const options = { token, signal: controller.signal };
      const paths = [
        `/monitors?page=${monitorPage}`,
        "/history/searches",
        "/sources",
        "/alerts/counts",
      ];
      const results = await Promise.allSettled(
        paths.map((path, index) =>
          (index < 3 ? requestList : request)(
            workspacePath(workspaceId, path),
            options,
          ),
        ),
      );
      if (!active) return;
      const value = (index) =>
        results[index].status === "fulfilled"
          ? results[index].value
          : undefined;
      const monitors = value(0)?.data || [];
      const stats = await Promise.allSettled(
        monitors.map((monitor) =>
          request(
            workspacePath(
              workspaceId,
              `/monitors/${encodeURIComponent(monitor.id)}/stats`,
            ),
            options,
          ),
        ),
      );
      if (!active) return;
      const errors = results.filter((item) => item.status === "rejected");
      const statsFailed = stats.some((item) => item.status === "rejected");
      setData({
        monitors: monitors.map((monitor, index) => ({
          ...monitor,
          ...(stats[index].status === "fulfilled"
            ? stats[index].value.data
            : {}),
        })),
        history: value(1)?.data || [],
        sourcesCount: value(2)?.data?.filter((source) => source.available)
          .length,
        unread: value(3)?.unread || 0,
        monitorTotal: value(0)?.meta?.total ?? monitors.length,
        lastPage: value(0)?.meta?.last_page || 1,
      });
      setDataStatus({
        loading: false,
        error:
          errors.length || statsFailed
            ? "Some workspace data could not be loaded. Please try again."
            : "",
      });
    }
    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [token, workspaceId, demo, revision, monitorPage]);

  const refresh = useCallback(() => {
    if (demo)
      setData((previous) => ({
        ...previous,
        monitors: [...demoService.current.store.monitors],
        monitorTotal: demoService.current.store.monitors.length,
        unread: demoService.current.store.alerts.filter((item) => !item.read_at)
          .length,
      }));
    else setRevision((value) => value + 1);
  }, [demo]);
  function navigate(view) {
    setCurrentView(view);
    setSidebarOpen(false);
  }
  function search(text, filters = {}) {
    setSearchFilters(filters);
    setQuery(text);
    setCurrentView("search");
  }
  async function signIn(next, remember) {
    saveSession(next, remember);
    setSession(next);
    setDemo(false);
    setUser(next.user);
    setNotice("");
    setBoot({ loading: true, error: "" });
    setCurrentView("dashboard");
    window.history.replaceState(null, "", "/");
  }
  function startDemo() {
    setDemo(true);
    setUser(demoUser);
    setWorkspaces([demoWorkspace]);
    setWorkspaceId("demo");
    demoService.current = createDemoService();
    setData({
      ...demoData(),
      monitors: demoService.current.store.monitors,
      monitorTotal: 4,
    });
    setBoot({ loading: false, error: "" });
    setDataStatus({ loading: false, error: "" });
    setCurrentView("dashboard");
  }
  async function signOut() {
    if (!demo && token) {
      try {
        await request("/auth/logout", { token, method: "POST" });
      } catch (error) {
        if (error.status !== 401) {
          setNotice(
            "Could not sign out securely. Please check your connection and try again.",
          );
          return;
        }
      }
    }
    clearSession();
    setSession(null);
    setDemo(false);
    setUser(null);
    setData(emptyData);
    setWorkspaces([]);
    setWorkspaceId("");
    setCreateOpen(false);
    setNotice("");
    window.history.replaceState(null, "", "/signin");
  }
  async function clearHistory() {
    if (!demo)
      await request(workspacePath(workspaceId, "/history/searches"), {
        token,
        method: "DELETE",
      });
    setData((previous) => ({ ...previous, history: [] }));
  }
  async function createMonitor(fields) {
    if (demo) {
      const monitor = {
        ...fields,
        id: crypto.randomUUID(),
        is_active: true,
        mention_count: 0,
        latest_scan: null,
      };
      demoService.current.store.monitors.push(monitor);
      refresh();
      return monitor;
    }
    const result = await request(workspacePath(workspaceId, "/monitors"), {
      token,
      method: "POST",
      body: fields,
    });
    refresh();
    return result.data;
  }
  function openMonitor(topic = "") {
    setSelection(null);
    setMonitorSeed(topic);
    setCreateOpen(true);
  }
  function openRelated(text, filters = {}) {
    setSelection(null);
    search(text, filters);
  }
  async function createWorkspace(event) {
    event.preventDefault();
    if (creatingWorkspace) return;
    if (!workspaceName.trim()) {
      setNotice("Enter a workspace name.");
      return;
    }
    setCreatingWorkspace(true);
    setNotice("");
    try {
      const result = await request("/workspaces", {
        token,
        method: "POST",
        body: {
          name: workspaceName.trim(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      });
      setWorkspaces([result.data]);
      setWorkspaceId(result.data.id);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setCreatingWorkspace(false);
    }
  }

  if (!session && !demo)
    return (
      <AuthView
        onAuthenticate={signIn}
        onDemo={startDemo}
        notice={notice}
        initialMode={
          window.location.pathname === "/signup" ? "signup" : "signin"
        }
      />
    );
  if (boot.loading || boot.error)
    return (
      <main className="workspace-gate">
        <h1>
          {boot.loading
            ? "Opening your workspace…"
            : "Unable to open your workspace"}
        </h1>
        {boot.error && (
          <>
            <p role="alert">{boot.error}</p>
            <button
              className="primary-button"
              onClick={() => setBootstrapRevision((value) => value + 1)}
            >
              Try again
            </button>
          </>
        )}
        <button className="text-link" onClick={signOut}>
          Sign out
        </button>
        {notice && <p role="alert">{notice}</p>}
      </main>
    );
  if (!workspaceId)
    return (
      <main className="workspace-gate">
        <h1>Create your research workspace</h1>
        <p>
          You’re signed in. Give your first workspace a name to get started.
        </p>
        <form className="auth-form" onSubmit={createWorkspace}>
          <label className="field-label" htmlFor="workspace-name">
            Workspace name
            <input
              id="workspace-name"
              required
              maxLength={120}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
            />
          </label>
          {notice && (
            <p className="form-error" role="alert">
              {notice}
            </p>
          )}
          <button className="primary-button" disabled={creatingWorkspace}>
            {creatingWorkspace ? "Creating…" : "Create workspace"}
          </button>
        </form>
        <button className="text-link" onClick={signOut}>
          Sign out
        </button>
      </main>
    );
  const workspace = workspaces.find((item) => item.id === workspaceId);
  const lastScan = data.monitors
    .map((item) => item.last_scan_at)
    .filter(Boolean)
    .sort()
    .at(-1);
  return (
    <WorkspaceProvider
      key={workspaceId}
      workspaceId={workspaceId}
      api={api}
      demo={demo}
      user={user}
      onUserUpdate={setUser}
      onRefresh={refresh}
    >
      <MotionConfig reducedMotion="user">
        <div className="workspace-shell">
          <Sidebar
            currentView={currentView}
            onSelectView={navigate}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            unreadAlertsCount={data.unread}
            onSignOut={signOut}
            user={user}
            workspace={workspace}
            workspaces={workspaces}
            onWorkspaceChange={(id) => {
              setWorkspaceId(id);
              setSelection(null);
              setCreateOpen(false);
              setMonitorPage(1);
              setData(emptyData);
              setDataStatus({ loading: true, error: "" });
              setQuery("");
              setCurrentView("dashboard");
            }}
          />
          <div className="workspace-main">
            <Header
              onToggleSidebar={() => setSidebarOpen(true)}
              monitorsCount={data.monitorTotal}
              sourcesCount={data.sourcesCount}
              lastScan={lastScan}
              onAlerts={() => navigate("alerts")}
              demo={demo}
            />
            {notice && (
              <div role="alert" className="load-error">
                {notice}
              </div>
            )}
            <main>
              <AnimatePresence mode="wait" initial={false}>
                {currentView === "dashboard" && (
                  <DashboardView
                    key="dashboard"
                    onSearch={search}
                    onSelectTopic={search}
                    onOpenAddMonitor={() => openMonitor()}
                    monitors={data.monitors}
                    history={data.history}
                    loading={dataStatus.loading}
                    error={dataStatus.error}
                    onRetry={refresh}
                    onClearHistory={clearHistory}
                    monitorTotal={data.monitorTotal}
                    monitorPage={monitorPage}
                    lastPage={data.lastPage || 1}
                    onPageChange={setMonitorPage}
                  />
                )}
                {currentView === "monitors" && (
                  <MonitorsView
                    key="monitors"
                    monitors={data.monitors}
                    loading={dataStatus.loading}
                    error={dataStatus.error}
                    onRetry={refresh}
                    onCreate={() => openMonitor()}
                    onSelect={search}
                    page={monitorPage}
                    lastPage={data.lastPage || 1}
                    onPageChange={setMonitorPage}
                    total={data.monitorTotal}
                  />
                )}
                {currentView === "search" && (
                  <LiveSearchView
                    key={`${workspaceId}-${query}-${searchFilters.cluster_id || ""}`}
                    query={query}
                    token={token}
                    workspaceId={workspaceId}
                    demo={demo}
                    onSearch={search}
                    onSearched={refresh}
                    onSelectResult={setSelection}
                    onMonitor={openMonitor}
                    initialFilters={searchFilters}
                  />
                )}
                {currentView === "analytics" && (
                  <AnalyticsView key="analytics" />
                )}
                {currentView === "alerts" && (
                  <AlertsView
                    key="alerts"
                    onNavigateSettings={() => {
                      setSettingsTab("Notifications");
                      navigate("settings");
                    }}
                    onInspectTopic={search}
                    onSelectResult={setSelection}
                  />
                )}
                {currentView === "intelligence" && (
                  <IntelligenceView
                    key="intelligence"
                    onSelectCluster={setSelection}
                  />
                )}
                {currentView === "settings" && (
                  <SettingsView
                    key={`settings-${settingsTab}`}
                    initialTab={settingsTab}
                  />
                )}
              </AnimatePresence>
            </main>
          </div>
          <ResultPanel
            selection={selection}
            onClose={() => setSelection(null)}
            onMonitor={openMonitor}
            onRelated={openRelated}
          />
          <AnimatePresence>
            {createOpen && (
              <CreateMonitorDialog
                onClose={() => setCreateOpen(false)}
                onCreate={createMonitor}
                initialTopic={monitorSeed}
              />
            )}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </WorkspaceProvider>
  );
}
