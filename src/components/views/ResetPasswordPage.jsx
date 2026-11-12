import { useLayoutEffect, useRef, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { request } from "../../lib/api";
import { useAppStore } from "../../stores/appStore";

const invalidCopy =
  "This link may be invalid, expired, or already used. Request a new password reset link to continue.";

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [link, setLink] = useState(() => {
    const params = new URLSearchParams(location.search);
    return {
      token: params.get("token") || "",
      email: params.get("email") || "",
    };
  });
  const clearSessionAfterPasswordReset = useAppStore(
    (state) => state.clearSessionAfterPasswordReset,
  );
  const submitting = useRef(false);
  const [email, setEmail] = useState(link.email);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retryable, setRetryable] = useState(false);
  const [outcome, setOutcome] = useState(link.token ? "form" : "invalid");

  useLayoutEffect(() => {
    if (location.search) navigate(location.pathname, { replace: true });
  }, [location.pathname, location.search, navigate]);

  function clearSensitiveFields() {
    setLink({ token: "", email: "" });
    setPassword("");
    setConfirmation("");
    setShowPassword(false);
    setShowConfirmation(false);
  }

  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !link.token) return;

    setError("");
    setRetryable(false);
    const normalizedEmail = email.trim();
    const validEmail = /^[^\s@\p{Cc}]+@[^\s@\p{Cc}]+\.[^\s@\p{Cc}]+$/u;
    if (normalizedEmail.length > 255 || !validEmail.test(normalizedEmail)) {
      setError("Enter the email address associated with this reset link.");
      return;
    }
    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      setError("Passwords do not match.");
      return;
    }

    submitting.current = true;
    setBusy(true);
    try {
      await request("/auth/reset-password", {
        method: "POST",
        body: {
          token: link.token,
          email: normalizedEmail,
          password,
          password_confirmation: confirmation,
        },
      });
      clearSensitiveFields();
      clearSessionAfterPasswordReset();
      setOutcome("success");
    } catch (failure) {
      if (failure.code === "password_reset_invalid") {
        clearSensitiveFields();
        setOutcome("invalid");
      } else {
        setError(failure.message);
        setRetryable(true);
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (outcome === "success") {
    return (
      <main className="workspace-gate verification-gate verification-landing password-reset-page">
        <span className="eyebrow">PASSWORD UPDATED</span>
        <h1>Your password has been reset</h1>
        <p role="status">
          Sign in with your new password. Any previous Sentinel sessions have
          been signed out for your protection.
        </p>
        <Link className="primary-button" to="/signin">
          Sign in
        </Link>
      </main>
    );
  }

  if (outcome === "invalid") {
    return (
      <main className="workspace-gate verification-gate verification-landing password-reset-page">
        <span className="eyebrow">PASSWORD RECOVERY</span>
        <h1>This password reset link can’t be used</h1>
        <p role="alert">{invalidCopy}</p>
        <Link className="primary-button" to="/forgot-password">
          Request a new link
        </Link>
        <Link className="text-link" to="/signin">
          Return to sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="workspace-gate verification-gate verification-landing password-reset-page">
      <span className="eyebrow">SECURE PASSWORD RESET</span>
      <h1>Choose a new password</h1>
      <p>
        Enter the address from your Sentinel email and choose a password you
        haven’t used for this account.
      </p>
      <form className="auth-form" onSubmit={submit} noValidate>
        <label className="field-label" htmlFor="reset-email">
          Email
          <div className="input-shell">
            <Mail aria-hidden="true" />
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              maxLength={255}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </label>
        <div className="field-label">
          <label htmlFor="reset-password">New password</label>
          <div className="input-shell">
            <LockKeyhole aria-hidden="true" />
            <input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              aria-describedby="reset-password-hint"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Hide new password" : "Show new password"}
              aria-controls="reset-password"
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          <small className="field-hint" id="reset-password-hint">
            Use at least 8 characters. Social-only accounts can use this flow
            to create their first Sentinel password.
          </small>
        </div>
        <div className="field-label">
          <label htmlFor="reset-confirmation">Confirm new password</label>
          <div className="input-shell">
            <LockKeyhole aria-hidden="true" />
            <input
              id="reset-confirmation"
              type={showConfirmation ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={
                showConfirmation
                  ? "Hide password confirmation"
                  : "Show password confirmation"
              }
              aria-controls="reset-confirmation"
              aria-pressed={showConfirmation}
              onClick={() => setShowConfirmation((visible) => !visible)}
            >
              {showConfirmation ? <EyeOff /> : <Eye />}
            </button>
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Resetting…" : retryable ? "Try again" : "Reset password"}
        </button>
      </form>
      <Link className="text-link" to="/signin" onClick={clearSensitiveFields}>
        Return to sign in
      </Link>
    </main>
  );
}
