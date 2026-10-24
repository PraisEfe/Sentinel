import { useEffect } from "react";
import {
  useLocation,
  useNavigate,
  useOutlet,
  useSearchParams,
} from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import Header from "../components/common/Header";
import Sidebar from "../components/common/Sidebar";
import CreateMonitorDialog from "../components/common/CreateMonitorDialog";
import ResultPanel from "../components/common/ResultPanel";
import { useAppStore } from "../stores/appStore";
import { useWorkspace } from "../lib/workspace";
import { workspacePathFor } from "./paths";
export default function WorkspaceLayout() {
  const { scopeKey } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const [params] = useSearchParams();
  const reduced = useReducedMotion();
  const state = useAppStore(
    useShallow((store) => ({
      user: store.user,
      data: store.data,
      workspaces: store.workspaces,
      workspaceId: store.workspaceId,
      monitorPage: store.monitorPage,
      sidebarOpen: store.sidebarOpen,
      selection: store.selection,
      createOpen: store.createOpen,
      monitorSeed: store.monitorSeed,
      notice: store.notice,
      setSidebarOpen: store.setSidebarOpen,
      closeResult: store.closeResult,
      closeMonitor: store.closeMonitor,
      openMonitor: store.openMonitor,
      selectWorkspace: store.selectWorkspace,
      createMonitor: store.createMonitor,
      logout: store.logout,
      loadWorkspace: store.loadWorkspace,
    })),
  );
  const base = workspacePathFor("dashboard");
  const isSummary =
    location.pathname === base ||
    location.pathname === workspacePathFor("monitors");
  const requestedPage = Number(params.get("page") || 1);
  const page = isSummary
    ? Number.isSafeInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1
    : state.monitorPage;
  const {
    loadWorkspace,
    setSidebarOpen,
    closeResult,
    closeMonitor,
    workspaceId,
  } = state;
  useEffect(() => {
    void loadWorkspace({ page });
  }, [workspaceId, page, loadWorkspace]);
  useEffect(() => {
    setSidebarOpen(false);
    closeResult();
    closeMonitor();
  }, [location.pathname, setSidebarOpen, closeResult, closeMonitor]);
  const workspace = state.workspaces.find((item) => item.id === state.workspaceId);
  const lastScan = state.data.monitors
    .map((item) => item.last_scan_at)
    .filter(Boolean)
    .sort()
    .at(-1);
  function related(text, filters = {}) {
    state.closeResult();
    navigate(
      `${workspacePathFor("search")}?${new URLSearchParams({ q: text, ...filters })}`,
    );
  }
  async function signOut() {
    await state.logout();
    navigate("/signin", { replace: true });
  }
  return (
    <div className="workspace-shell">
      <Sidebar
        isOpen={state.sidebarOpen}
        onClose={() => state.setSidebarOpen(false)}
        unreadAlertsCount={state.data.unread}
        onSignOut={signOut}
        user={state.user}
        workspace={workspace}
        workspaces={state.workspaces}
        onWorkspaceChange={(id) => {
          state.selectWorkspace(id);
          navigate("/", { replace: true });
        }}
      />
      <div className="workspace-main">
        <Header
          onToggleSidebar={() => state.setSidebarOpen(true)}
          monitorsCount={state.data.monitorTotal}
          sourcesCount={state.data.sourcesCount}
          lastScan={lastScan}
          onAlerts={() => navigate(workspacePathFor("alerts"))}
        />
        {state.notice && (
          <div className="load-error" role="alert">
            {state.notice}
          </div>
        )}
        <main>
          <motion.div
            key={`${scopeKey}:${location.pathname}`}
            initial={{ opacity: reduced ? 1 : 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduced ? 0 : 0.16 }}
          >
            {outlet}
          </motion.div>
        </main>
      </div>
      <ResultPanel
        selection={state.selection}
        onClose={state.closeResult}
        onMonitor={state.openMonitor}
        onRelated={related}
      />
      <AnimatePresence>
        {state.createOpen && (
          <CreateMonitorDialog
            initialTopic={state.monitorSeed}
            onClose={state.closeMonitor}
            onCreate={(fields) => state.createMonitor(fields)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
