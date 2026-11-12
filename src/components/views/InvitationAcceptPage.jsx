import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import LoadingState from "../common/LoadingState";
import { request } from "../../lib/api";
import { useAppStore } from "../../stores/appStore";

export default function InvitationAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, user, refreshAuthorization, logout } = useAppStore(
    useShallow((state) => ({
      session: state.session,
      user: state.user,
      refreshAuthorization: state.refreshAuthorization,
      logout: state.logout,
    })),
  );

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadVersion, setLoadVersion] = useState(0);
  const [inspectError, setInspectError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptedWorkspaceId, setAcceptedWorkspaceId] = useState("");

  const returnTo = `/invitations/${token}`;
  const emailMatches =
    invite?.email && user?.email
      ? invite.email.toLowerCase() === user.email.toLowerCase()
      : false;

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function inspect() {
      setLoading(true);
      setInvite(null);
      setInspectError(null);
      try {
        const result = await request(
          `/invitations/${encodeURIComponent(token)}`,
          { signal: controller.signal },
        );
        if (active) setInvite(result);
      } catch (failure) {
        if (active && failure.name !== "AbortError") setInspectError(failure);
      } finally {
        if (active) setLoading(false);
      }
    }
    void inspect();
    return () => {
      active = false;
      controller.abort();
    };
  }, [token, loadVersion]);

  async function openAcceptedWorkspace(workspaceId) {
    if (!workspaceId) {
      setActionError({
        message:
          "The invitation was accepted, but the server did not identify the office workspace.",
      });
      return;
    }
    try {
      const authorization = await refreshAuthorization(workspaceId);
      if (authorization?.workspaceId !== workspaceId) {
        setActionError({
          message:
            "The invitation was accepted, but office access is not available yet. Refresh access to try again.",
        });
        return;
      }
      navigate("/", { replace: true });
    } catch (failure) {
      setActionError({
        ...failure,
        message:
          "The invitation was accepted, but access could not be refreshed. Check your connection and try again.",
      });
    }
  }

  async function accept() {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      const result = await request(`/invitations/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        token: session?.token,
      });
      const workspaceId = result?.workspace?.id || "";
      setAccepted(true);
      setAcceptedWorkspaceId(workspaceId);
      await openAcceptedWorkspace(workspaceId);
    } catch (failure) {
      setActionError(failure);
    } finally {
      setBusy(false);
    }
  }

  async function retryAccess() {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await openAcceptedWorkspace(acceptedWorkspaceId);
    } finally {
      setBusy(false);
    }
  }

  function reinspectInvitation() {
    setActionError(null);
    setLoadVersion((version) => version + 1);
  }

  if (loading && !invite) {
    return <LoadingState label="Opening invitation…" fullPage />;
  }

  const unavailableTitle =
    inspectError?.code === "invitation_expired"
      ? "This invitation has expired"
      : ["invitation_used", "invitation_already_used"].includes(inspectError?.code)
        ? "This invitation has already been used"
        : inspectError?.status === 410
          ? "This invitation has expired or was already used"
        : "We couldn’t open this invitation";
  const awaitingApproval =
    actionError?.code === "account_pending" ||
    actionError?.code === "pending_approval" ||
    (actionError?.status === 422 && actionError?.errors?.account);
  const actionUnavailable = !accepted && actionError?.status === 410;

  return (
    <main className="workspace-gate">
      <span className="eyebrow">SENTINEL INVITATION</span>

      {!invite && inspectError && (
        <>
          <h1>{unavailableTitle}</h1>
          <p role="alert">{inspectError.message}</p>
          <button
            className="primary-button"
            onClick={() => setLoadVersion((version) => version + 1)}
          >
            Try again
          </button>
          <Link className="text-link" to="/">
            Return home
          </Link>
        </>
      )}

      {invite && (
        <>
          <h1>Join {invite.workspace?.name || "this workspace"}</h1>
          <p>
            You have been invited as <strong>{invite.role}</strong>. Accept the
            invitation with the email it was sent to.
          </p>

          <dl className="pending-details">
            <div>
              <dt>Workspace</dt>
              <dd>{invite.workspace?.name || "—"}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{invite.role || "—"}</dd>
            </div>
            <div>
              <dt>Invited email</dt>
              <dd>{invite.email || "—"}</dd>
            </div>
            <div>
              <dt>Expires</dt>
              <dd>{invite.expires_at || "—"}</dd>
            </div>
          </dl>

          {actionUnavailable && (
            <>
              <h2>This invitation is no longer available</h2>
              <p role="alert">{actionError.message}</p>
              <div className="auth-switch">
                <button
                  className="primary-button"
                  type="button"
                  onClick={reinspectInvitation}
                >
                  Check invitation again
                </button>
                <Link className="text-link" to="/">
                  Return home
                </Link>
              </div>
            </>
          )}

          {session && !user && <p>Loading your account…</p>}

          {!session && (
            <>
              <p>Sign in or create an account with {invite.email} to continue.</p>
              <div className="auth-switch">
                <Link className="primary-button" to="/signin" state={{ from: returnTo }}>
                  Sign in
                </Link>
                <Link className="text-link" to="/signup" state={{ from: returnTo }}>
                  Create an account
                </Link>
              </div>
            </>
          )}

          {session && user && !emailMatches && (
            <>
              <p role="alert">
                You are signed in as {user?.email}, but this invitation is for{" "}
                {invite.email}. Sign out and use the invited email.
              </p>
              <button className="primary-button" onClick={logout}>
                Sign out
              </button>
            </>
          )}

          {session &&
            user &&
            emailMatches &&
            !accepted &&
            actionError?.status !== 410 && (
            <>
              {awaitingApproval && (
                <p>
                  Your account must be approved before this invitation can be
                  accepted. The invitation remains available so you can retry
                  after approval.
                </p>
              )}
              <button className="primary-button" onClick={accept} disabled={busy}>
                {busy
                  ? "Accepting…"
                  : awaitingApproval
                    ? "Retry after approval"
                    : "Accept invitation"}
              </button>
            </>
          )}

          {accepted && (
            <>
              <p role="status">
                Invitation accepted.{" "}
                Your office access is being refreshed.
              </p>
              <button
                className="primary-button"
                disabled={busy}
                onClick={retryAccess}
              >
                Refresh access
              </button>
            </>
          )}

          {actionError && !actionUnavailable && (
            <p role="alert">{actionError.message}</p>
          )}
        </>
      )}
    </main>
  );
}
