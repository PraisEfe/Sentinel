export const API_BASE_URL = (
  import.meta.env?.VITE_API_BASE_URL ||
  (import.meta.env?.DEV
    ? "/api/v1"
    : "https://sentinel-api.absg-ohos.cloud/api/v1")
).replace(/\/$/, "");
const SESSION_KEY = "sentinel_session";

export class ApiError extends Error {
  constructor(message, status = 0, errors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
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
    if (response.status === 401 && token && typeof window !== "undefined")
      window.dispatchEvent(new Event("sentinel:unauthorized"));
    const errors = json?.errors || {};
    const detail = Object.values(errors)
      .flat()
      .find((value) => typeof value === "string");
    throw new ApiError(
      detail ||
        json?.message ||
        (response.status === 401
          ? "Your session has expired. Please sign in again."
          : `The request failed (${response.status}). Please try again.`),
      response.status,
      errors,
    );
  }
  if (json === null)
    throw new ApiError(
      "The server returned an unexpected response. Please try again.",
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
      "The server returned an unexpected response. Please try again.",
    );
  }
  return response;
}
