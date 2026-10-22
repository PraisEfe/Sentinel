import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Globe,
  LockKeyhole,
  Mail,
  Search,
  UserRound,
} from "lucide-react";
import Brand from "../common/Brand";
import { authenticate, request } from "../../lib/api";

export default function AuthView({
  onAuthenticate,
  onDemo,
  initialMode = "signin",
  notice,
}) {
  const mode = initialMode;
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const signup = mode === "signup";
  const forgot = mode === "forgot";

  function changeMode(next) {
    setError("");
    setMessage("");
    setPassword("");
    setConfirmation("");
    navigate(
      next === "signup"
        ? "/signup"
        : next === "forgot"
          ? "/forgot-password"
          : "/signin",
      { state: location.state },
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setMessage("");
    if (signup && !name.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (signup && password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (forgot) {
        const result = await request("/auth/forgot-password", {
          method: "POST",
          body: { email: email.trim() },
        });
        setMessage(result.message);
      } else {
        const fields = {
          email: email.trim(),
          password,
          device_name: "Sentinel web",
        };
        if (signup)
          Object.assign(fields, {
            name: name.trim(),
            password_confirmation: confirmation,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          });
        const session = await authenticate(mode, fields);
        await onAuthenticate(session, remember);
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-story">
        <Brand />
        <div className="auth-pitch">
          <span className="discovery-badge">
            <Activity size={13} /> Continuous public-web discovery
          </span>
          <h1>
            Know what’s being said.
            <br />
            Understand what matters.
          </h1>
          <p>
            Search, organize and monitor relevant public information across
            news, websites, social discussions, blogs and forums.
          </p>
          <div
            className="intelligence-preview"
            aria-label="Example intelligence preview"
          >
            <div className="preview-query">
              <Search size={15} />
              <span>MTN Nigeria</span>
              <small>4,821 results</small>
            </div>
            <div className="preview-signal">
              <i className="signal-dot orange" />
              <div>
                <strong>Network performance</strong>
                <small>342 mentions across 46 sources</small>
              </div>
              <b>+18%</b>
            </div>
            <div className="preview-signal">
              <i className="signal-dot" />
              <div>
                <strong>New service initiative</strong>
                <small>127 mentions across 18 sources</small>
              </div>
              <b>+52%</b>
            </div>
            <div className="preview-footer">
              <span>
                <Globe size={12} /> 328 sources indexed
              </span>
              <span>Updated just now</span>
            </div>
          </div>
        </div>
        <p className="auth-trust">
          PUBLIC-WEB INTELLIGENCE <span>•</span> HUMAN-CENTRED RESEARCH{" "}
          <span>•</span> SECURE WORKSPACES
        </p>
      </aside>
      <main className="auth-main">
        <div className="auth-form-wrap">
          <span className="eyebrow">
            {forgot
              ? "RESET YOUR PASSWORD"
              : signup
                ? "CREATE WORKSPACE"
                : "WELCOME BACK"}
          </span>
          <h2>
            {forgot
              ? "Let’s get you back in"
              : signup
                ? "Start discovering what matters"
                : "Sign in to your workspace"}
          </h2>
          <p className="form-subtitle">
            {forgot
              ? "Enter your email and we’ll send a password reset link."
              : signup
                ? "Create your research workspace in less than a minute."
                : "Continue discovering and monitoring what matters online."}
          </p>
          {notice && (
            <p className="form-message" role="status">
              {notice}
            </p>
          )}
          <form
            onSubmit={submit}
            className="auth-form"
            aria-label={
              signup ? "Create account" : forgot ? "Reset password" : "Sign in"
            }
          >
            {signup && (
              <label className="field-label" htmlFor="full-name">
                Full name
                <div className="input-shell">
                  <UserRound />
                  <input
                    id="full-name"
                    autoComplete="name"
                    required
                    maxLength={120}
                    placeholder="Ada Okafor"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </label>
            )}
            <label className="field-label" htmlFor="email">
              {signup || forgot ? "Email" : "Work email"}
              <div className="input-shell">
                <Mail />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={255}
                  placeholder="ada@sentinel.africa"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </label>
            {!forgot && (
              <div className="field-label">
                <span className="field-heading">
                  <label htmlFor="password">Password</label>
                  {!signup && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => changeMode("forgot")}
                    >
                      Forgot password?
                    </button>
                  )}
                </span>
                <div className="input-shell">
                  <LockKeyhole />
                  <input
                    id="password"
                    type="password"
                    autoComplete={signup ? "new-password" : "current-password"}
                    required
                    minLength={signup ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {signup && (
                  <small className="field-hint">
                    Use at least 8 characters.
                  </small>
                )}
              </div>
            )}
            {signup && (
              <div className="field-label">
                <label htmlFor="confirmation">Confirm Password</label>
                <div className="input-shell">
                  <LockKeyhole />
                  <input
                    id="confirmation"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                </div>
                <small className="field-hint">Use at least 8 characters.</small>
              </div>
            )}
            {!forgot && (
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={signup ? terms : remember}
                  required={signup}
                  onChange={(e) =>
                    signup
                      ? setTerms(e.target.checked)
                      : setRemember(e.target.checked)
                  }
                />
                {signup
                  ? "I agree to the Terms of Service and Privacy Policy"
                  : "Keep me signed in on this device"}
              </label>
            )}
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
            <button className="primary-button" disabled={busy} type="submit">
              {busy
                ? "Please wait…"
                : forgot
                  ? "Send reset link"
                  : signup
                    ? "Create account"
                    : "Sign in"}
            </button>
          </form>
          {!signup && !forgot && (
            <>
              <div className="auth-divider">
                <span>or continue with</span>
              </div>
              <div className="social-buttons">
                <button
                  type="button"
                  disabled
                  title="Google sign-in is not available yet"
                >
                  <b>G</b> Google
                </button>
                <button
                  type="button"
                  disabled
                  title="Microsoft sign-in is not available yet"
                >
                  <b>▦</b> Microsoft
                </button>
              </div>
            </>
          )}
          <p className="auth-switch">
            {forgot
              ? ""
              : signup
                ? "Already have an account?"
                : "New to Sentinel?"}{" "}
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() => changeMode(signup || forgot ? "signin" : "signup")}
            >
              {signup || forgot ? "Sign in" : "Create an account"}
            </button>
          </p>
          {!signup && !forgot && (
            <button type="button" className="demo-link" onClick={onDemo}>
              Explore the demo workspace <ArrowRight size={13} />
            </button>
          )}
        </div>
        <footer className="auth-legal">
          © {new Date().getFullYear()} Sentinel Intelligence{" "}
          <span>Privacy</span>
          <span>Terms</span>
          <span>Help</span>
        </footer>
      </main>
    </div>
  );
}
