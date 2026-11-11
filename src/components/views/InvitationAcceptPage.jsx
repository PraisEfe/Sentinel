import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import LoadingState from "../common/LoadingState";
import { request } from "../../lib/api";
import { useAppStore } from "../../stores/appStore";

export default function InvitationAcceptPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session, user, initializeSession, logout } = useAppStore(
    useShallow((state) => ({
      session: state.session,
      user: state.user,
      initializeSession: state.initializeSession,
      logout: state.logout,
    })),
  );

  const [invite, setInvite] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const returnTo = `/invitations/${token}`;
  const emailMatches =
    invite?.email && user?.email
      ? invite.email.toLowerCase() === user.email.toLowerCase()
      : false;

  useEffect(() => {
    let active = true;
    request(`/invitations/${encodeURIComponent(token)}`)
      .then((result) => {
        if (active) setInvite(result);
      })
      .catch((failure) => {
        if (active) setError(failure.message);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function accept() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await request(`/invitations/${encodeURIComponent(token)}/accept`, {
        method: "POST",
        token: session?.token,
      });
      setAccepted(true);
      await initializeSession();
      if (useAppStore.getState().user?.is_approved) {
        navigate("/", { replace: true });
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  if (!invite && !error) {
    return <LoadingState label="Opening invitation…" fullPage />;
  }

  return (
    <main className="workspace-gate">
      <span className="eyebrow">SENTINEL INVITATION</span>

      {error && (
        <>
          <h1>We couldn’t open this invitation</h1>
          <p role="alert">{error}</p>
          <Link className="text-link" to="/">
            Return home
          </Link>
        </>
      )}

      {invite && !error && (
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

          {session && user && emailMatches && !accepted && (
            <button className="primary-button" onClick={accept} disabled={busy}>
              {busy ? "Accepting…" : "Accept invitation"}
            </button>
          )}

          {accepted && (
            <>
              <p role="status">
                Invitation accepted.{" "}
                {user?.is_approved
                  ? "You now have access to the workspace."
                  : "Your account still needs administrator verification before you can use the workspace."}
              </p>
              <Link className="primary-button" to="/">
                Continue
              </Link>
            </>
          )}

          {error && <p role="alert">{error}</p>}
        </>
      )}
    </main>
  );
}
