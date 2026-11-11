import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "../../stores/appStore";

export default function PendingApprovalView() {
  const { user, logout } = useAppStore(
    useShallow((state) => ({ user: state.user, logout: state.logout })),
  );

  if (!user) return null;

  const rejected = user.verification_status === "rejected";
  const days = user.days_until_deletion;

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
          : "An administrator will check your staff ID and state against the authorised personnel list. Your account will unlock once it is approved."}
      </p>

      <dl className="pending-details">
        <div>
          <dt>Staff ID</dt>
          <dd>{user.staff_id || "Not provided"}</dd>
        </div>
        <div>
          <dt>State</dt>
          <dd>{user.state || "Not provided"}</dd>
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
          <strong>{days} day{days === 1 ? "" : "s"}</strong> left.
        </p>
      )}

      {rejected && user.verification_note && (
        <p role="alert">{user.verification_note}</p>
      )}

      <p>Please contact your Head of Service administrator for verification.</p>

      <button className="primary-button" onClick={logout}>
        Sign out
      </button>
    </main>
  );
}
