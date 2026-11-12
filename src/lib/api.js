// Keep browser requests same-origin; the server reads the upstream from .env.
export const API_BASE_URL = "/api/v1";
let unauthorizedHandler = null;
export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}
const SESSION_KEY = "sentinel_session";
const SAFE_ERROR_CODES = new Set([
  "account_pending",
  "account_rejected",
  "account_roster_inactive",
  "email_already_verified",
  "email_verification_expired",
  "email_verification_invalid",
  "email_verification_required",
  "email_verification_throttled",
  "email_verification_unavailable",
  "email_verification_used",
  "email_verified",
  "existing_root",
  "invitation_already_used",
  "invitation_expired",
  "invitation_used",
  "last_owner",
  "membership_conflict",
  "ownership_conflict",
  "ownership_integrity_conflict",
  "ownership_target_ineligible",
  "pending_approval",
  "password_reset_invalid",
  "workspace_root_exists",
]);

export class ApiError extends Error {
  constructor(message, status = 0, errors = {}, code = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.fields = Object.keys(errors);
    this.code = SAFE_ERROR_CODES.has(code) ? code : "";
  }
}

function safeErrorFields(errors) {
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return {};

  return Object.fromEntries(
    Object.keys(errors)
      .filter(
        (field) =>
          typeof field === "string" &&
          field.length <= 120 &&
          /^[a-zA-Z0-9_.-]+$/.test(field),
      )
      .slice(0, 50)
      .map((field) => [field, true]),
  );
}

function errorMessage(path, status, code, errors) {
  if (code === "account_pending" || code === "pending_approval")
    return "Your account must be approved before you can continue.";
  if (code === "account_rejected")
    return "This registration was not approved. Contact your administrator.";
  if (code === "account_roster_inactive")
    return "Your linked personnel record is inactive. Contact your Unit administrator.";
  if (code === "email_verification_required")
    return "Verify your email address before opening workspace data.";
  if (code === "email_verification_expired")
    return "This verification link has expired.";
  if (code === "email_verification_used")
    return "This verification link has already been used.";
  if (code === "email_verification_invalid")
    return "This verification link is invalid.";
  if (code === "email_verification_throttled")
    return "Too many verification emails were requested. Please wait before trying again.";
  if (code === "email_verification_unavailable")
    return "Email delivery is temporarily unavailable. Please try again later.";
  if (code === "password_reset_invalid")
    return "This password reset link can’t be used.";
  if (code === "invitation_expired") return "This invitation has expired.";
  if (code === "invitation_used" || code === "invitation_already_used")
    return "This invitation has already been used.";
  if (code === "last_owner")
    return "The office owner must be transferred before this change can be made.";
  if (code === "ownership_conflict" || code === "ownership_integrity_conflict")
    return "Workspace ownership changed on the server. Refresh the Team page and try again.";
  if (code === "ownership_target_ineligible")
    return "This member is no longer eligible to own the workspace. Refresh the Team page and choose another member.";
  if (code === "workspace_root_exists" || code === "existing_root")
    return "This Unit already has a root office workspace. Choose a parent office to create a child workspace.";
  if (status === 401)
    return path === "/auth/login"
      ? "Check your email and password, then try again."
      : "Your session has expired. Please sign in again.";
  if (status === 403) return "You don’t have access to this action.";
  if (status === 404) return "This item is no longer available.";
  if (status === 409) {
    if (path.endsWith("/ownership-transfer"))
      return "Workspace ownership changed on the server. Refresh the Team page and try again.";
    if (path === "/workspaces")
      return "This Unit already has a root office workspace. Choose a parent office to create a child workspace.";
    if (path.includes("/members"))
      return "This membership changed on the server. Refresh the Team page and try again.";
    return "This item changed on the server. Refresh and try again.";
  }
  if (status === 410)
    return path.startsWith("/invitations/")
      ? "This invitation has expired or has already been used."
      : "This item is no longer available.";
  if (status === 422) {
    if (path === "/auth/login")
      return "Check your email and password, then try again.";
    if (path.endsWith("/accept") && errors.account)
      return "Your account must be approved before you can accept this invitation.";
    if (path.includes("/members") && errors.role)
      return "Office owners must be transferred before their role or membership can change.";
    if (path.includes("/members") && errors.unit_id)
      return "The person and both offices must belong to the same Unit.";
    if (path.endsWith("/ownership-transfer"))
      return "This member is no longer eligible to own the workspace. Refresh the Team page and choose another member.";
    if (path.includes("/invitations") && errors.email)
      return "That email is already registered or cannot be invited. Use Unit members for registered staff.";
    return "Please check your details and try again.";
  }
  if (status === 429)
    return path === "/auth/forgot-password"
      ? "Too many password reset requests. Please wait before trying again."
      : "Please wait a moment before trying again.";
  return "We couldn’t complete that request. Please try again.";
}

export function readSession() {
  try {
    const raw =
      sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    const session = JSON.parse(raw);
    return typeof session?.token === "string" && session.token ? session : null;
  } catch {
    return null;
  }
}

export function saveSession(session, remember = false) {
  clearSession();
  (remember ? localStorage : sessionStorage).setItem(
    SESSION_KEY,
    JSON.stringify(session),
  );
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export async function request(
  path,
  { token, body, method = "GET", signal } = {},
) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined && { "Content-Type": "application/json" }),
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
      credentials: "omit",
    });
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new ApiError(
      error.name === "TimeoutError"
        ? "The request timed out. Please try again."
        : "Unable to connect. Check your connection and try again.",
    );
  }
  if (response.status === 204) return null;
  const json = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401 && token) unauthorizedHandler?.(token);
    const errors = safeErrorFields(json?.errors);
    const code = SAFE_ERROR_CODES.has(json?.code) ? json.code : "";
    // Never render arbitrary upstream messages: they may contain infrastructure
    // details. Keep status and validation data on ApiError for diagnostics.
    throw new ApiError(
      errorMessage(path, response.status, code, errors),
      response.status,
      errors,
      code,
    );
  }
  if (json === null)
    throw new ApiError(
      "We couldn’t load this information. Please try again.",
      response.status,
    );
  return json;
}

export const workspacePath = (workspaceId, resource = "") =>
  `/workspaces/${encodeURIComponent(workspaceId)}${resource}`;

export async function authenticate(mode, fields) {
  const response = await request(
    `/auth/${mode === "signup" ? "register" : "login"}`,
    { method: "POST", body: fields },
  );
  if (!response.token || !response.user?.id)
    throw new ApiError("Sign-in could not be completed. Please try again.");
  return { token: response.token, user: response.user };
}

// Collection endpoints in the supplied contract always return a data array.
export async function requestList(path, options) {
  const response = await request(path, options);
  if (!Array.isArray(response?.data)) {
    throw new ApiError(
      "We couldn’t load this information. Please try again.",
    );
  }
  return response;
}
