import LoadingState from "../components/common/LoadingState";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../stores/appStore";

export default function ProtectedRoute() {
  const { session, boot, initializeSession, logout, notice } = useAppStore(
    useShallow((state) => ({
      session: state.session,
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
  return <Outlet />;
}
