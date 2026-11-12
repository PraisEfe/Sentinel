import LoadingState from "../components/common/LoadingState";
import PendingApprovalView from "../components/views/PendingApprovalView";
import RosterInactiveView from "../components/views/RosterInactiveView";
import VerifyEmailView from "../components/views/VerifyEmailView";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../stores/appStore";

export default function ProtectedRoute() {
  const { session, user, boot, initializeSession, logout, notice } = useAppStore(
    useShallow((state) => ({
      session: state.session,
      user: state.user,
      boot: state.boot,
      initializeSession: state.initializeSession,
      logout: state.logout,
      notice: state.notice,
    })),
  );
  const location = useLocation();
  if (!session)
    return (
      <Navigate
        to="/signin"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
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
        {boot.loading && <LoadingState label="Verifying your session…" fullPage />}
        {boot.error && (
          <>
            <p role="alert">{boot.error}</p>
            <button className="primary-button" onClick={initializeSession}>
              Try again
            </button>
          </>
        )}
        <button className="text-link" onClick={logout}>
          Sign out
        </button>
        {notice && <p role="alert">{notice}</p>}
      </main>
    );
  if (user?.email_verification_required || user?.is_email_verified === false)
    return <VerifyEmailView />;
  if (user?.is_roster_active === false) return <RosterInactiveView />;
  if (user && !user.is_approved) return <PendingApprovalView />;
  return <Outlet />;
}
