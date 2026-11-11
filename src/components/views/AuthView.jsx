import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  Activity,
  Eye,
  EyeOff,
  Hash,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import Brand from "../common/Brand";
import { safeReturnTo } from "../../routing/paths";
import { authenticate, request } from "../../lib/api";

export default function AuthView({
  onAuthenticate,
  initialMode = "signin",
  notice,
}) {
  const mode = initialMode;
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [staffId, setStaffId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [units, setUnits] = useState([]);
  const [unitsError, setUnitsError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const signup = mode === "signup";
  const forgot = mode === "forgot";

  useEffect(() => {
    let active = true;
    request("/units")
      .then((result) => {
        if (!active) return;
        setUnits(Array.isArray(result?.data) ? result.data : []);
      })
      .catch(() => {
        if (active) setUnitsError("We couldn’t load the unit list. Please try again.");
      });
    return () => {
      active = false;
    };
  }, []);

  function changeMode(next) {
    setError("");
    setMessage("");
    setPassword("");
    setShowPassword(false);
    setShowConfirmation(false);
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

  function startSocial(provider) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      sessionStorage.setItem("sentinel_social_remember", remember ? "1" : "0");
      sessionStorage.setItem("sentinel_social_return_to", safeReturnTo(location.state?.from));
      window.location.assign(`/api/v1/auth/social/${provider}/redirect?${new URLSearchParams({ device_name: "web", remember: remember ? "1" : "0" })}`);
    } catch {
      setBusy(false);
      setError("We couldn’t start sign-in. Allow site storage and try again.");
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    setMessage("");
    // Format validation only. SQL injection prevention belongs in backend
    // parameterized queries; never strip punctuation from passwords.
    const validEmail = /^[^\s@\p{Cc}]+@[^\s@\p{Cc}]+\.[^\s@\p{Cc}]+$/u;
    if (email.trim().length > 255 || !validEmail.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (signup && !name.trim()) {
      setError("Enter your full name.");
      return;
    }
    if (signup && !staffId.trim()) {
      setError("Enter your government staff ID.");
      return;
    }
    if (signup && !unitId) {
      setError("Select your unit.");
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
            staff_id: staffId.trim(),
            unit_id: unitId,
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
                ? "CREATE ACCOUNT"
                : "WELCOME BACK"}
          </span>
          <h2>
            {forgot
              ? "Let’s get you back in"
              : signup
                ? "Register your official account"
                : "Sign in to your workspace"}
          </h2>
          <p className="form-subtitle">
            {forgot
              ? "Enter your email and we’ll send a password reset link."
              : signup
                ? "Use your government staff ID. An administrator will verify your account before access is granted."
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
            {signup && (
              <label className="field-label" htmlFor="staff-id">
                Staff ID
                <div className="input-shell">
                  <Hash />
                  <input
                    id="staff-id"
                    required
                    maxLength={64}
                    placeholder="e.g. AB-001"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                  />
                </div>
                <small className="field-hint">
                  Your government staff ID, used to verify you against the
                  authorised personnel list.
                </small>
              </label>
            )}
            {signup && (
              <label className="field-label" htmlFor="unit">
                Unit or state
                <select
                  id="unit"
                  required
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
                >
                  <option value="">Select your unit</option>
                  {units.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} — {unit.state}
                    </option>
                  ))}
                </select>
                <small className="field-hint">
                  The state or unit your authorised personnel list was registered under.
                </small>
                {unitsError && <small className="form-error">{unitsError}</small>}
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
                    type={showPassword ? "text" : "password"}
                    autoComplete={signup ? "new-password" : "current-password"}
                    required
                    minLength={signup ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} aria-controls="password" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
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
                    type={showConfirmation ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                  />
                  <button type="button" className="password-toggle" aria-label={showConfirmation ? "Hide confirm password" : "Show confirm password"} aria-controls="confirmation" aria-pressed={showConfirmation} onClick={() => setShowConfirmation(!showConfirmation)}>
                    {showConfirmation ? <EyeOff /> : <Eye />}
                  </button>
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
                  disabled={busy}
                  onClick={() => startSocial("google")}
                >
                  <img src="/google.svg" alt="" width="18" height="18" /> Google
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => startSocial("microsoft")}
                >
                  <img src="/microsoft.svg" alt="" width="18" height="18" /> Microsoft
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
        </div>
        <footer className="auth-legal">
          © {new Date().getFullYear()} Sentinel Intelligence{" "}
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <span>Help</span>
        </footer>
      </main>
    </div>
  );
}
