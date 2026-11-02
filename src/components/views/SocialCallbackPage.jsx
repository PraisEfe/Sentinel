import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { request } from "../../lib/api";
import { safeReturnTo } from "../../routing/paths";
import { useAppStore } from "../../stores/appStore";
import LoadingState from "../common/LoadingState";

const messages = {
  access_denied: "Sign-in was cancelled.",
  invalid_state: "This sign-in link expired. Please try again.",
  email_unverified: "Your provider email is not verified.",
  email_missing: "Your provider did not share an email address.",
  account_disabled: "This account is disabled.",
  account_unavailable: "This account is not available.",
};
const fallback = "Sign-in could not be completed. Please try again.";
const errorMessage = (reason) => Object.hasOwn(messages, reason) ? messages[reason] : fallback;

export default function SocialCallbackPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const acceptSession = useAppStore((state) => state.acceptSession);
  // Snapshot once: scrub the URL before exchanging the short-lived code.
  const [callback] = useState(() => {
    const params = new URLSearchParams(location.search);
    return { code: params.get("code"), error: params.get("error"), provider: params.get("provider") };
  });
  const [error, setError] = useState("");
  const exchange = useRef(null);
  const preferences = useRef(null);
  useEffect(() => {
    let active = true;
    window.history.replaceState(window.history.state, "", location.pathname);
    if (!preferences.current) {
      try {
        preferences.current = {
          remember: sessionStorage.getItem("sentinel_social_remember") === "1",
          destination: safeReturnTo(sessionStorage.getItem("sentinel_social_return_to")),
        };
        sessionStorage.removeItem("sentinel_social_remember");
        sessionStorage.removeItem("sentinel_social_return_to");
      } catch {
        preferences.current = { remember: false, destination: "/" };
      }
    }
    // A retained promise prevents React StrictMode from exchanging a code twice.
    if (!exchange.current) {
      exchange.current = (async () => {
        if (callback.error) throw new Error(errorMessage(callback.error));
        if (!callback.code || !["google", "microsoft"].includes(callback.provider)) throw new Error(fallback);
        const session = await request("/auth/social/exchange", { method: "POST", body: { code: callback.code } });
        if (typeof session?.token !== "string" || !session.token || !session.user?.id) throw new Error(fallback);
        return session;
      })();
    }
    exchange.current.then(async (session) => {
      if (!active) return;
      await acceptSession({ token: session.token, user: session.user }, preferences.current.remember);
      if (active) navigate(preferences.current.destination, { replace: true });
    }).catch((failure) => {
      if (active) setError(callback.error ? errorMessage(callback.error) : failure.status === 422 ? "This sign-in link expired or has already been used. Please try again." : fallback);
    });
    return () => { active = false; };
  }, [acceptSession, callback, location.pathname, navigate]);
  return <main className="workspace-gate social-callback">
    <h1>{error ? "Sign-in could not be completed" : "Completing sign-in…"}</h1>
    {error ? <><p role="alert">{error}</p><Link className="primary-button" to="/signin">Back to sign in</Link></> : <LoadingState label="Connecting to your workspace…" />}
  </main>;
}
