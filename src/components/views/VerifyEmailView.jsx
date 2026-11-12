import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { safeReturnTo } from "../../routing/paths";
import { useAppStore } from "../../stores/appStore";

export default function VerifyEmailView() {
  const { user, authenticatedApi, refreshAuthorization, logout } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      authenticatedApi: state.authenticatedApi,
      refreshAuthorization: state.refreshAuthorization,
      logout: state.logout,
    })),
  );
  const location = useLocation();
  const refreshLock = useRef(false);
  const [resending, setResending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        "sentinel_email_return_to",
        safeReturnTo(location.pathname + location.search + location.hash),
      );
    } catch {
      // Navigation still safely falls back to the dashboard without storage.
    }
  }, [location.hash, location.pathname, location.search]);

  async function refreshStatus({ quiet = false } = {}) {
    if (refreshLock.current) return;
    refreshLock.current = true;
    setRefreshing(true);
    if (!quiet) setFeedback(null);
    try {
      const result = await refreshAuthorization();
      if (!quiet && result?.user?.is_email_verified !== true) {
        setFeedback({
          kind: "status",
          message: "Your email is not verified yet. Open the newest link we sent.",
        });
      }
    } catch {
      if (!quiet) {
        setFeedback({
          kind: "error",
          message: "We couldn’t refresh your verification status. Please try again.",
        });
      }
    } finally {
      refreshLock.current = false;
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

  async function resend() {
    if (resending) return;
    setResending(true);
    setFeedback(null);
    try {
      await authenticatedApi("/auth/email/resend", { method: "POST" });
      setFeedback({
        kind: "status",
        message: "Verification email sent. Check your inbox and use the newest link.",
      });
    } catch (failure) {
      if (failure.status === 429 || failure.code === "email_verification_throttled") {
        setFeedback({
          kind: "error",
          message: "Too many verification emails were requested. Please wait before trying again.",
        });
      } else if (
        failure.status === 503 ||
        failure.code === "email_verification_unavailable"
      ) {
        setFeedback({
          kind: "error",
          message: "Email delivery is temporarily unavailable. Please try again later.",
        });
      } else {
        setFeedback({
          kind: "error",
          message: "We couldn’t send a verification email. Please try again.",
        });
      }
    } finally {
      setResending(false);
    }
  }

  if (!user) return null;

  return (
    <main className="workspace-gate verification-gate">
      <span className="eyebrow">EMAIL VERIFICATION REQUIRED</span>
      <h1>Check your inbox before entering Sentinel</h1>
      <p>
        Workspace and Unit data stay locked until you prove that this mailbox
        belongs to you. Roster or administrator approval does not complete this step.
      </p>

      <dl className="pending-details verification-details">
        <div>
          <dt>Account email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Not verified</dd>
        </div>
      </dl>

      {feedback && (
        <p
          className={feedback.kind === "error" ? "form-error" : "form-message"}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}

      <div className="verification-actions">
        <button className="primary-button" onClick={resend} disabled={resending}>
          {resending ? "Sending…" : "Resend verification email"}
        </button>
        <button
          className="outline-button"
          onClick={() => refreshStatus()}
          disabled={refreshing}
        >
          {refreshing ? "Checking…" : "I verified my email"}
        </button>
      </div>

      <p className="verification-note">
        Links expire and can be used once. If you requested more than one, use the
        newest message.
      </p>
      <button className="text-link" onClick={logout}>
        Sign out
      </button>
    </main>
  );
}
