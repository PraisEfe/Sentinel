import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { request } from "../../lib/api";
import { useAppStore } from "../../stores/appStore";

export default function PendingApprovalView() {
  const { user, session, initializeSession, updateUser, logout } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      session: state.session,
      initializeSession: state.initializeSession,
      updateUser: state.updateUser,
      logout: state.logout,
    })),
  );

  const [units, setUnits] = useState([]);
  const [name, setName] = useState(user?.name || "");
  const [staffId, setStaffId] = useState(user?.staff_id || "");
  const [unitId, setUnitId] = useState(user?.unit_id || "");
  const [officialTitle, setOfficialTitle] = useState(
    user?.official_title || "",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const rejected = user?.verification_status === "rejected";
  const days = user?.days_until_deletion;

  useEffect(() => {
    let active = true;
    request("/units")
      .then((result) => {
        if (!active) return;
        setUnits(Array.isArray(result?.data) ? result.data : []);
      })
      .catch(() => {
        if (active) setError("We couldn’t load the unit list. Please try again.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (busy || rejected) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await request("/auth/registration", {
        method: "PATCH",
        token: session?.token,
        body: {
          name: name.trim(),
          staff_id: staffId.trim(),
          unit_id: unitId,
          official_title: officialTitle.trim() || null,
        },
      });
      const updated = result?.data ?? result;
      updateUser(updated);
      if (updated?.is_approved) {
        await initializeSession();
        return;
      }
      setMessage(
        "Details saved. Your details still do not match the unit roster, so an administrator will review the account.",
      );
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <main className="workspace-gate">
      <span className="eyebrow">
        {rejected ? "REGISTRATION NOT APPROVED" : "AWAITING VERIFICATION"}
      </span>
      <h1>
        {rejected
          ? "Your registration was not approved"
          : "Your account is awaiting approval"}
      </h1>
      <p>
        {rejected
          ? "An administrator reviewed your registration and could not verify it. Contact your Head of Service administrator if you believe this is a mistake."
          : "We check your name, email, staff ID and unit against the authorised personnel list. If they match, your account unlocks automatically; otherwise an administrator will review it."}
      </p>

      <dl className="pending-details">
        <div>
          <dt>Staff ID</dt>
          <dd>{user.staff_id || "Not provided"}</dd>
        </div>
        <div>
          <dt>Unit</dt>
          <dd>{user.unit?.name || "Not selected"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{rejected ? "Rejected" : "Pending"}</dd>
        </div>
      </dl>

      {!rejected && days != null && (
        <p>
          If the account is not approved within 30 days of registration, it will
          be automatically deleted. You have about{" "}
          <strong>
            {days} day{days === 1 ? "" : "s"}
          </strong>{" "}
          left.
        </p>
      )}

      {!rejected && (
        <form className="auth-form" onSubmit={submit}>
          <label className="field-label" htmlFor="pending-name">
            Full name
            <input
              id="pending-name"
              required
              maxLength={120}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="field-label" htmlFor="pending-staff-id">
            Staff ID
            <input
              id="pending-staff-id"
              required
              maxLength={64}
              value={staffId}
              onChange={(event) => setStaffId(event.target.value)}
            />
          </label>
          <label className="field-label" htmlFor="pending-unit">
            Unit or state
            <select
              id="pending-unit"
              required
              value={unitId}
              onChange={(event) => setUnitId(event.target.value)}
            >
              <option value="">Select your unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.name} — {unit.state}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label" htmlFor="pending-title">
            Title (optional)
            <input
              id="pending-title"
              maxLength={120}
              value={officialTitle}
              onChange={(event) => setOfficialTitle(event.target.value)}
            />
          </label>
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
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Checking…" : "Save and check again"}
          </button>
        </form>
      )}

      {rejected && user.verification_note && (
        <p role="alert">{user.verification_note}</p>
      )}

      <p>Please contact your Head of Service administrator for verification.</p>

      <button className="text-link" onClick={logout}>
        Sign out
      </button>
    </main>
  );
}
