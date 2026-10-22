import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useNavigate } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useAppStore } from "./stores/appStore";
import { useWorkspace } from "./lib/workspace";
import ProtectedRoute from "./routing/ProtectedRoute";
import WorkspaceLayout from "./routing/WorkspaceLayout";
import {
  AuthPage,
  DemoGate,
  HomePage,
  MonitorsPage,
  NewWorkspacePage,
  NotFoundPage,
  SearchPage,
  WorkspaceGate,
} from "./routing/RoutePages";
import IntelligenceView from "./components/views/IntelligenceView";
import AnalyticsView from "./components/views/AnalyticsView";
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
  const { demo } = useWorkspace();
  const openResult = useAppStore((state) => state.openResult);
  return (
    <AlertsView
      onSelectResult={openResult}
      onNavigateSettings={() =>
        navigate(`${workspacePathFor("settings", demo)}?section=notifications`)
      }
      onInspectTopic={(q) =>
        navigate(
          `${workspacePathFor("search", demo)}?${new URLSearchParams({ q })}`,
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
      <Route path="analytics" element={<AnalyticsView />} />
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
          <Route
            path="demo"
            element={
              <DemoGate>
                <WorkspaceLayout />
              </DemoGate>
            }
          >
            {workspaceRoutes()}
          </Route>
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
