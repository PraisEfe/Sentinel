import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useAppStore } from "./stores/appStore";
import ProtectedRoute from "./routing/ProtectedRoute";
import WorkspaceLayout from "./routing/WorkspaceLayout";
import {
  AuthPage,
  HomePage,
  MonitorsPage,
  NewWorkspacePage,
  NotFoundPage,
  SearchPage,
  WorkspaceGate,
} from "./routing/RoutePages";
import IntelligenceView from "./components/views/IntelligenceView";
import RouteBoundary from "./routing/RouteBoundary";
import LoadingState from "./components/common/LoadingState";
const AnalyticsView = lazy(() => import("./components/views/AnalyticsView"));
import AlertsView from "./components/views/AlertsView";
import SettingsView from "./components/views/SettingsView";
import { workspacePathFor } from "./routing/paths";
import "./App.css";

function IntelligencePage() {
  const openResult = useAppStore((state) => state.openResult);
  return <IntelligenceView onSelectCluster={openResult} />;
}
function AlertsPage() {
  const navigate = useNavigate();
  const openResult = useAppStore((state) => state.openResult);
  return (
    <AlertsView
      onSelectResult={openResult}
      onNavigateSettings={() =>
        navigate(`${workspacePathFor("settings")}?section=notifications`)
      }
      onInspectTopic={(q) =>
        navigate(
          `${workspacePathFor("search")}?${new URLSearchParams({ q })}`,
        )
      }
    />
  );
}
function SessionInitializer() {
  const initialize = useAppStore((state) => state.initializeSession);
  useEffect(() => {
    void initialize();
  }, [initialize]);
  return null;
}
function workspaceRoutes() {
  return (
    <>
      <Route index element={<HomePage />} />
      <Route path="search" element={<SearchPage />} />
      <Route path="monitors" element={<MonitorsPage />} />
      <Route path="intelligence" element={<IntelligencePage />} />
      <Route path="analytics" element={<RouteBoundary><Suspense fallback={<LoadingState label="Opening analytics…" />}><AnalyticsView /></Suspense></RouteBoundary>} />
      <Route path="alerts" element={<AlertsPage />} />
      <Route path="settings" element={<SettingsView />} />
      <Route path="*" element={<NotFoundPage />} />
    </>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <SessionInitializer />
        <Routes>
          <Route path="signin" element={<AuthPage mode="signin" />} />
          <Route path="signup" element={<AuthPage mode="signup" />} />
          <Route path="forgot-password" element={<AuthPage mode="forgot" />} />
          <Route element={<ProtectedRoute />}>
            <Route path="workspaces/new" element={<NewWorkspacePage />} />
            <Route
              path="/"
              element={
                <WorkspaceGate>
                  <WorkspaceLayout />
                </WorkspaceGate>
              }
            >
              {workspaceRoutes()}
            </Route>
          </Route>
        </Routes>
      </MotionConfig>
    </BrowserRouter>
  );
}
