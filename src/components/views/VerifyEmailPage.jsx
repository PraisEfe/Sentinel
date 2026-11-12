import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { request } from "../../lib/api";
import { safeReturnTo } from "../../routing/paths";
import { useAppStore } from "../../stores/appStore";
import LoadingState from "../common/LoadingState";

const failureCopy = {
  email_verification_expired: {
    title: "This verification link has expired",
    message: "Return to the email verification screen and request a new link.",
  },
  email_verification_used: {
    title: "This verification link has already been used",
    message: "Sign in to check your account, or request a new link if verification is still required.",
  },
  email_verification_invalid: {
    title: "This verification link is invalid",
    message: "Check that you opened the complete link from the newest Sentinel email.",
  },
};

function storedDestination() {
  try {
    return safeReturnTo(sessionStorage.getItem("sentinel_email_return_to"));
  } catch {
    return "/";
  }
}

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, refreshAuthorization } = useAppStore(
    useShallow((state) => ({
      session: state.session,
      refreshAuthorization: state.refreshAuthorization,
    })),
  );
  const [verification] = useState(() => {
    const params = new URLSearchParams(location.search);
    return {
      token: params.get("token"),
      destination: storedDestination(),
    };
  });
  const attempt = useRef(null);
  const [attemptVersion, setAttemptVersion] = useState(0);
  const [outcome, setOutcome] = useState(() =>
    verification.token
      ? { state: "checking", code: "" }
      : { state: "failed", code: "email_verification_invalid" },
  );

  useLayoutEffect(() => {
    window.history.replaceState(window.history.state, "", location.pathname);
    try {
      sessionStorage.removeItem("sentinel_email_return_to");
    } catch {
      // The destination was already safely snapshotted in memory.
    }
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    if (!verification.token) {
      return () => {
        active = false;
      };
    }

    if (!attempt.current) {
      attempt.current = request("/auth/email/verify", {
        method: "POST",
        token: session?.token,
        body: { token: verification.token },
      });
    }

    attempt.current
      .then(async () => {
        if (!active) return;
        setOutcome({ state: "verified", code: "" });

        if (!session) return;
        try {
          await refreshAuthorization();
          if (active) navigate(verification.destination, { replace: true });
        } catch {
          if (active) setOutcome({ state: "refresh_failed", code: "" });
        }
      })
      .catch((failure) => {
        if (!active) return;
        if (Object.hasOwn(failureCopy, failure.code)) {
          setOutcome({ state: "failed", code: failure.code });
        } else {
          setOutcome({ state: "network_failed", code: "" });
        }
      });

    return () => {
      active = false;
    };
  }, [attemptVersion, navigate, refreshAuthorization, session, verification]);

  async function retryRefresh() {
    setOutcome({ state: "checking", code: "" });
    try {
      await refreshAuthorization();
      navigate(verification.destination, { replace: true });
    } catch {
      setOutcome({ state: "refresh_failed", code: "" });
    }
  }

  function retryVerification() {
    attempt.current = null;
    setOutcome({ state: "checking", code: "" });
    setAttemptVersion((version) => version + 1);
  }

  if (outcome.state === "checking") {
    return (
      <main className="workspace-gate verification-gate verification-landing">
        <span className="eyebrow">SECURE EMAIL CHECK</span>
        <h1>Verifying your email address…</h1>
        <LoadingState label="Checking this one-time link…" />
      </main>
    );
  }

  if (outcome.state === "failed") {
    const copy = failureCopy[outcome.code];
    return (
      <main className="workspace-gate verification-gate verification-landing">
        <span className="eyebrow">EMAIL VERIFICATION</span>
        <h1>{copy.title}</h1>
        <p role="alert">{copy.message}</p>
        <Link className="primary-button" to={session ? verification.destination : "/signin"}>
          {session ? "Return to your account" : "Sign in"}
        </Link>
      </main>
    );
  }

  if (outcome.state === "network_failed") {
    return (
      <main className="workspace-gate verification-gate verification-landing">
        <span className="eyebrow">EMAIL VERIFICATION</span>
        <h1>We couldn’t check this link</h1>
        <p role="alert">
          Check your connection and try again. Your verification token has not been shown or stored.
        </p>
        <button className="primary-button" onClick={retryVerification}>
          Try again
        </button>
      </main>
    );
  }

  if (outcome.state === "refresh_failed") {
    return (
      <main className="workspace-gate verification-gate verification-landing">
        <span className="eyebrow">EMAIL VERIFIED</span>
        <h1>Your email address is verified</h1>
        <p role="alert">
          Verification succeeded, but we couldn’t refresh your signed-in account yet.
        </p>
        <button className="primary-button" onClick={retryRefresh}>
          Continue to your account
        </button>
      </main>
    );
  }

  return (
    <main className="workspace-gate verification-gate verification-landing">
      <span className="eyebrow">EMAIL VERIFIED</span>
      <h1>Your email address is verified</h1>
      <p>You can now sign in. Workspace access will still follow your roster and approval status.</p>
      <Link
        className="primary-button"
        to="/signin"
        state={{ from: verification.destination }}
      >
        Sign in
      </Link>
    </main>
  );
}
