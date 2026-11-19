import { lazy, Suspense, useEffect, useRef } from "react";
import {
  BrowserRouter,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useAppStore } from "./stores/appStore";
import ProtectedRoute from "./routing/ProtectedRoute";
import WorkspaceLayout from "./routing/WorkspaceLayout";
import {
  AuthPage,
  HomePage,
  MonitorDetailPage,
  MonitorsPage,
  NewWorkspacePage,
  NotFoundPage,
  SearchPage,
  WorkspaceGate,
} from "./routing/RoutePages";
import IntelligenceView from "./components/views/IntelligenceView";
import RouteBoundary from "./routing/RouteBoundary";
import LoadingState from "./components/common/LoadingState";
import LandingView from "./components/views/LandingView";
import LegalView from "./components/views/LegalView";
import "./landing.css";
const SocialCallbackPage = lazy(() => import("./components/views/SocialCallbackPage"));
const VerifyEmailPage = lazy(() => import("./components/views/VerifyEmailPage"));
const ResetPasswordPage = lazy(() => import("./components/views/ResetPasswordPage"));
const InvitationAcceptPage = lazy(() => import("./components/views/InvitationAcceptPage"));
const AnalyticsView = lazy(() => import("./components/views/AnalyticsView"));
import AlertsView from "./components/views/AlertsView";
import SettingsView from "./components/views/SettingsView";
import { workspacePathFor } from "./routing/paths";
import "./App.css";
import "./responsive.css";

function IntelligencePage() {
  const navigate = useNavigate();
  const openResult = useAppStore((state) => state.openResult);
  return (
    <IntelligenceView
      onSelectCluster={openResult}
      onInspectTopic={(q) =>
        navigate(`${workspacePathFor("search")}?${new URLSearchParams({ q })}`)
      }
    />
  );
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
  const location = useLocation();
  const started = useRef(false);
  useEffect(() => {
    if (location.pathname === "/reset-password") return;
    if (started.current) return;
    started.current = true;
    void initialize();
  }, [initialize, location.pathname]);
  return null;
}
function RootPage() {
  const session = useAppStore((state) => state.session);
  const location = useLocation();
  if (location.pathname === "/" && !session) {
    return <LandingView />;
  }
  return <Outlet />;
}
function workspaceRoutes() {
  return (
    <>
      <Route index element={<HomePage />} />
      <Route path="search" element={<SearchPage />} />
      <Route path="monitors" element={<MonitorsPage />} />
      <Route path="monitors/:monitorId" element={<MonitorDetailPage />} />
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
          <Route path="auth/callback" element={<RouteBoundary><Suspense fallback={<LoadingState label="Completing sign-in…" />}><SocialCallbackPage /></Suspense></RouteBoundary>} />
          <Route path="verify-email" element={<RouteBoundary><Suspense fallback={<LoadingState label="Checking verification link…" />}><VerifyEmailPage /></Suspense></RouteBoundary>} />
          <Route path="reset-password" element={<RouteBoundary><Suspense fallback={<LoadingState label="Opening password reset…" />}><ResetPasswordPage /></Suspense></RouteBoundary>} />
          <Route path="invitations/:token" element={<RouteBoundary><Suspense fallback={<LoadingState label="Opening invitation…" />}><InvitationAcceptPage /></Suspense></RouteBoundary>} />
          <Route path="signin" element={<AuthPage mode="signin" />} />
          <Route path="signup" element={<AuthPage mode="signup" />} />
          <Route path="forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="privacy" element={<LegalView kind="privacy" />} />
          <Route path="terms" element={<LegalView kind="terms" />} />
          <Route element={<ProtectedRoute />}>
            <Route path="workspaces/new" element={<NewWorkspacePage />} />
          </Route>
          <Route path="/" element={<RootPage />}>
            <Route element={<ProtectedRoute />}>
              <Route
                element={
                  <WorkspaceGate>
                    <WorkspaceLayout />
                  </WorkspaceGate>
                }
              >
                {workspaceRoutes()}
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </MotionConfig>
    </BrowserRouter>
  );
}
