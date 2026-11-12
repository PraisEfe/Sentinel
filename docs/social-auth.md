# Social sign-in — frontend implementation guide

The social-auth flow and final local-verification behavior are implemented in the local backend/frontend worktrees. The current changes are uncommitted and undeployed; this guide describes the local contract for Google and Microsoft sign-in.

**Do not put OAuth client IDs or secrets in the frontend.** The client secrets live only in the backend `.env`. The browser never calls Google or Microsoft directly for this flow; it only talks to the same-origin `/api/v1` proxy.

## Backend contract (current local code)

| Step | Endpoint |
|---|---|
| Start sign-in | `GET /api/v1/auth/social/{provider}/redirect` |
| Provider callback | `GET /api/v1/auth/social/{provider}/callback` |
| Exchange one-time code | `POST /api/v1/auth/social/exchange` |

`provider` is `google` or `microsoft`.

### 1. Start sign-in

Send the browser to:

```text
/api/v1/auth/social/google/redirect?device_name=web&remember=1
```

- Use the **same-origin** path. Do not use the `sentinel-api` host directly.
- `remember` is optional (`1` or `0`). It controls the Sanctum token lifetime on the backend.
- `device_name` is optional; use `web`.
- The backend creates a single-use state, redirects to the provider, then returns the browser to the frontend callback.

### 2. Callback result

The provider callback redirects to:

```text
/auth/callback?code=<one-time-code>&provider=google
```

or on failure:

```text
/auth/callback?error=<reason>&provider=google
```

The frontend must never see a provider token or a Sanctum token in the URL.

Known `error` values:

- `access_denied` — user cancelled at the provider
- `invalid_state` — expired or reused state
- `email_missing` — provider returned no usable email
- `account_disabled` — local account is disabled
- `account_unavailable` — account was deleted or cannot be linked
- `social_login_failed` — unexpected provider/backend failure

Provider email verification is intentionally not a callback failure. Google or Microsoft marks the local email verified only when the provider payload contains an explicitly true verified-email claim. A missing or false claim still completes social sign-in without changing local verification state; an unverified account uses local verification delivery when available and is routed to Sentinel's verification gate.

### 3. Exchange the code

```http
POST /api/v1/auth/social/exchange
Content-Type: application/json
Accept: application/json

{"code":"<one-time-code>"}
```

Success (`200`):

```json
{
  "user": { "id": "...", "name": "...", "email": "..." },
  "token": "<sanctum-bearer-token>"
}
```

The shape matches `/auth/login`. The code is single-use and expires after 120 seconds. A reused or expired code returns `422`.

## Implementation steps

### 1. Enable the provider buttons

File: `src/components/views/AuthView.jsx`

The Google and Microsoft buttons now use their bundled brand SVGs and start same-tab sign-in. The integration follows this pattern:

```jsx
function startSocial(provider) {
  sessionStorage.setItem(
    "sentinel_social_remember",
    remember ? "1" : "0",
  );
  window.location.assign(
    `/api/v1/auth/social/${provider}/redirect?device_name=web&remember=${
      remember ? "1" : "0"
    }`,
  );
}
```

- Google button calls `startSocial("google")`.
- Microsoft button calls `startSocial("microsoft")`.
- Disable both while a sign-in is already in progress.
- Do not open the provider in a new tab; the flow must return to `/auth/callback` in the same tab.

### 2. Add the public callback route

File: `src/App.jsx`

Add a public route outside `ProtectedRoute`:

```jsx
<Route path="auth/callback" element={<SocialCallbackPage />} />
```

The page must not require a session and must not render the workspace shell.

### 3. Implement the callback page

Suggested file: `src/components/views/SocialCallbackPage.jsx`

Responsibilities:

1. Read `code`, `error`, and `provider` from the query string.
2. If `error` is present, show a readable message and a link back to `/signin`.
3. If `code` is present:
   - Set a loading state.
   - `POST /api/v1/auth/social/exchange` with `{ code }`.
   - Validate that the response contains `token` and `user.id`.
   - Read `sentinel_social_remember` from `sessionStorage`, then remove it.
   - Call `acceptSession({ token, user }, remember)` from the app store.
   - Navigate to `/`. Email verification, roster status, server approval, current assignments and canonical capabilities determine whether the user opens a workspace, an eligibility gate, or capability-gated `/workspaces/new`.
4. On failure, show the message and a **Back to sign in** link.

Sketch:

```jsx
import { useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { request } from "../../lib/api";
import { useAppStore } from "../../stores/appStore";

export default function SocialCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const acceptSession = useAppStore((state) => state.acceptSession);
  const started = useRef(false);
  const error = params.get("error");
  const code = params.get("code");

  useEffect(() => {
    if (started.current || error || !code) return;
    started.current = true;

    (async () => {
      const session = await request("/auth/social/exchange", {
        method: "POST",
        body: { code },
      });
      if (!session?.token || !session?.user?.id) {
        throw new Error("Sign-in could not be completed. Please try again.");
      }
      const remember =
        sessionStorage.getItem("sentinel_social_remember") === "1";
      sessionStorage.removeItem("sentinel_social_remember");
      await acceptSession(session, remember);
      navigate("/", { replace: true });
    })().catch(() => {
      navigate(
        `/signin?social_error=${encodeURIComponent(
          "Sign-in could not be completed. Please try again.",
        )}`,
        { replace: true },
      );
    });
  }, [acceptSession, code, error, navigate]);

  if (error) {
    return (
      <main className="workspace-gate">
        <h1>Sign-in could not be completed</h1>
        <p>{errorMessage(error)}</p>
        <Link className="primary-button" to="/signin">
          Back to sign in
        </Link>
      </main>
    );
  }

  return (
    <main className="workspace-gate">
      <h1>Completing sign-in…</h1>
    </main>
  );
}
```

Error messages can be local to the callback page:

| Error | Suggested message |
|---|---|
| `access_denied` | Sign-in was cancelled. |
| `invalid_state` | This sign-in link expired. Please try again. |
| `email_missing` | Your provider did not share an email address. |
| `account_disabled` | This account is disabled. |
| `account_unavailable` | This account is not available. |
| `social_login_failed` | Sign-in could not be completed. Please try again. |

### 4. Preserve the requested destination (optional)

If the user started from a private deep link, store the destination before redirecting:

```js
sessionStorage.setItem(
  "sentinel_social_return_to",
  location.pathname + location.search,
);
```

After `acceptSession`, navigate to that stored path instead of `/`, then remove it. Reuse `safeReturnTo` from `src/routing/paths.js` rather than trusting the value.

### 5. Add tests

Use the existing Playwright fixtures in `tests/helpers/apiFixtures.js`.

Minimum coverage:

- Google button sets `remember` and navigates to the correct redirect URL.
- Microsoft button does the same.
- `/auth/callback` exchanges a valid code and lands on the workspace.
- Callback with no workspace lands on `/workspaces/new` only when the refreshed account has workspace-creation capability; otherwise it shows the pending/no-assignment gate.
- Callback with `error=access_denied` shows the message and a working sign-in link.
- Exchange `422` shows a recoverable error.
- The token never appears in the URL.
- Callback route is public (no session required).
- `remember=0` stores the session in `sessionStorage`; `1` uses `localStorage`.
- Explicit provider-verified claims mark the local email verified; missing/false claims neither fail the callback nor verify the email, so an unverified account reaches the local verification gate.

## Do not

- Do not add Google or Microsoft client secrets to the frontend, `.env`, or source control.
- Do not point the browser at `sentinel-api.absg-ohos.cloud`; use same-origin `/api/v1`.
- Do not put provider tokens or Sanctum tokens in the URL.
- Do not change the registered redirect URIs; they must stay:
  - `https://sentinel-api.absg-ohos.cloud/api/v1/auth/social/google/callback`
  - `https://sentinel-api.absg-ohos.cloud/api/v1/auth/social/microsoft/callback`
- Do not create a workspace automatically; `/workspaces/new` is available only when refreshed server capabilities allow Unit-aware root/child creation.

## Acceptance checklist

- [x] Google and Microsoft buttons are enabled.
- [x] Redirect uses the same-origin `/api/v1` path.
- [x] `/auth/callback` is a public route.
- [x] Valid code exchanges for a session and lands on the workspace or onboarding.
- [x] Errors are readable and return the user to `/signin`.
- [x] Missing/false provider verification claims do not fail the callback or verify the email; only explicit true claims mark it verified.
- [x] No secrets or tokens appear in the frontend repo or URLs.
- [x] Playwright coverage added and passing.
- [x] `npm run lint` and `npm run build` pass.

## Verification limits

The frontend uses `SocialCallbackPage.jsx`, removes callback query parameters before exchanging the code, and retains one request promise to avoid duplicate exchanges in React StrictMode. Missing/unknown providers and malformed sessions fail safely. Requested destinations are validated with `safeReturnTo`.

Playwright covers the flow with controlled API/provider responses, including the explicit-true versus missing/false verification-claim contract. Live redirect and invalid-code checks do not establish that a real provider account can complete authentication. Google/Microsoft account login, consent, local verification delivery, and a valid production exchange require interactive verification after deployment.
