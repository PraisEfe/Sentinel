import { useEffect, useEffectEvent, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../../stores/appStore";

export default function RosterInactiveView() {
  const { user, refreshAuthorization, logout } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      refreshAuthorization: state.refreshAuthorization,
      logout: state.logout,
    })),
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function refreshStatus({ quiet = false } = {}) {
    if (refreshing) return;
    setRefreshing(true);
    if (!quiet) {
      setError("");
      setMessage("");
    }
    try {
      const result = await refreshAuthorization();
      if (!quiet && result?.user?.is_roster_active === false)
        setMessage("Your linked personnel record is still inactive.");
    } catch (failure) {
      if (!quiet) setError(failure.message);
    } finally {
      setRefreshing(false);
    }
  }

  const refreshOnFocus = useEffectEvent(() => {
    void refreshStatus({ quiet: true });
  });

  useEffect(() => {
    const onFocus = () => refreshOnFocus();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  if (!user) return null;

  return (
    <main className="workspace-gate">
      <span className="eyebrow">PERSONNEL STATUS INACTIVE</span>
      <h1>Your workspace access is paused</h1>
      <p>
        Your account is still signed in, but its linked personnel record is not
        active on your Unit roster. Sentinel cannot open Unit or workspace data
        until an administrator reactivates that roster record.
      </p>

      <dl className="pending-details">
        <div>
          <dt>Identity</dt>
          <dd>{user.name || user.email}</dd>
        </div>
        <div>
          <dt>Staff ID</dt>
          <dd>{user.staff_id || "Not available"}</dd>
        </div>
        <div>
          <dt>Unit</dt>
          <dd>{user.unit?.name || "Not available"}</dd>
        </div>
        <div>
          <dt>Roster status</dt>
          <dd>Inactive</dd>
        </div>
      </dl>

      <p>
        Contact your Unit administrator to confirm or restore your personnel
        status. You do not need to register again, and this screen will update
        after the roster is reactivated.
      </p>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}

      <button
        className="primary-button"
        onClick={() => refreshStatus()}
        disabled={refreshing}
      >
        {refreshing ? "Checking…" : "Refresh personnel status"}
      </button>
      <button className="text-link" onClick={logout}>
        Sign out
      </button>
    </main>
  );
}
