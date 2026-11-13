# Sentinel

React 19 / Vite 8 frontend for public-web intelligence. The supplied Sentinel designs are implemented across account access, a monitor-first home (glanceable monitor cards plus a collection summary), search as a contextual utility, monitors, intelligence, analytics, alerts, and settings. Layouts are responsive; Tailwind CSS and fonts are bundled locally. Framer Motion provides page transitions, monitor-wizard step transitions, drawer entrances/exits, and animated charts. Animations respect the system’s reduced-motion preference.

**Status:** P0 Unit/onboarding/access, ownership transfer, email verification, password recovery and the final State-free Unit/workspace contract are deployed; backend migration `2026_11_13_000001` is Ran in production batch 9 and service checks passed. The monitor-first home/search-utility release is the next frontend deployment. Authorization, real-mail and product UAT remain.

## Develop

Use Node.js 24 and npm (validated with Node 24.19.0 / npm 11.9.0).

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

The app starts at sign-in. `/signin` and `/signup` can be opened directly. Sign-up requires a government staff ID and an active Unit; State is derived from that Unit rather than entered as the tenancy boundary. An exact Unit-scoped roster match may approve the account, otherwise it remains pending for administrator review. Email verification remains a separate requirement. All workspace screens require a server-verified, email-verified, roster-active and approved session and use the production API.

The backend implementation is authoritative. Its current generated contract is mirrored in [docs/openapi.json](docs/openapi.json); do not infer access from historical designs, workspace levels, or client-side roles.

Browser requests use **same-origin `/api/v1` in every mode**. Vite handles the proxy in development and preview; `npm start` runs the production server with the same API proxy and SPA history fallback. The shared `.env` configures the upstream as `https://sentinel-api.absg-ohos.cloud/api/v1`; the proxy forwards `/api/v1` exactly once. TLS verification remains enabled, and existing HTTPS_PROXY/HTTP_PROXY/NO_PROXY settings are respected. A local backend on loopback uses a direct local connection.

The project uses one optional, **untracked** `.env` file. Development, preview, and production read it if present; otherwise they use the production API default. To override locally, create `.env` with `API_PROXY_TARGET=https://sentinel-api.absg-ohos.cloud/api/v1`. For deployment, configure `API_PROXY_TARGET`, `PORT`, and `HOST` in the hosting provider's environment settings. Process variables override the file. Never commit credentials. Browser API requests always use `/api/v1`.

## Routes and shared state

React Router handles navigation, deep links, refreshes, query parameters, and browser back/forward.

| Routes | Access |
| --- | --- |
| `/` | Public landing page for signed-out visitors; protected workspace dashboard when signed in |
| `/privacy`, `/terms` | Public legal pages |
| `/signin`, `/signup`, `/forgot-password` | Public account forms; authenticated users return to their destination |
| `/verify-email` | Public one-time email-verification landing; may refresh an existing session after verification |
| `/reset-password` | Public password-reset completion; token/email query values are removed from the URL immediately |
| `/invitations/:token` | Public invitation inspection and authenticated acceptance; sign-in/sign-up preserves the return path. Acceptance requires the invited, approved, enabled account in the same Unit |
| `/search`, `/monitors`, `/intelligence`, `/analytics`, `/alerts`, `/settings` | Protected, server-verified session and selected workspace required |
| `/monitors/{id}` | Protected monitor detail; the monitor's matched-mention feed |
| `/auth/callback` | Public Google/Microsoft sign-in callback; exchanges a one-time code and restores session/onboarding |
| `/workspaces/new` | Protected, capability-gated Unit root/child workspace creation |

`ProtectedRoute` redirects signed-out visitors to sign-in and restores the intended internal URL afterwards. A stored token is verified using `/auth/me` before private pages render. It then gates email-unverified users before roster-inactive users, pending/rejected registration and workspace assignment; `/workspaces` is requested only for email-verified, approved, roster-active accounts. Unauthorized API responses expire the session and clear private state. Logout clears device access even if server-side revocation is temporarily unreachable. Client guards improve navigation; backend bearer authentication and authorization still enforce access to every resource.

Zustand owns the session lifecycle, user, authorized workspaces, selected workspace, monitoring summaries, per-workspace discovery preferences, and shared navigation/drawer/wizard state. Persistence explicitly whitelists only non-secret preferences and workspace selections. Bearer tokens retain the existing remember-me behavior in `sentinel_session` (local storage when checked, session storage otherwise); passwords are never stored. Form drafts and per-page request loading/error states remain local. Aborted/stale session and workspace responses cannot overwrite a newer session or workspace.

Each workspace response's canonical `capabilities` object exclusively controls UI access: `view`, `oversee_read`, `manage_members`, `manage_monitors`, `manage_settings`, and `create_workspace`; account-level `user.can_create_workspace` covers an eligible Unit with no root yet. Missing or malformed capabilities fail closed. The client does not infer access from roles, levels, or top-level compatibility flags; backend policies remain the security boundary.

Search queries and filters are URL parameters (`/search?q=MTN&sentiment=positive`), monitor pagination uses `page`, and settings sections use `section` (e.g. `/settings?section=notifications`).

## Connected features

| Screen/action | API |
| --- | --- |
| Sign in / Unit-scoped register | `POST /auth/login`, `POST /auth/register` (`unit_id` + `staff_id`) |
| Restore/refresh authorization / sign out | `GET /auth/me`, `GET /workspaces`, `POST /auth/logout` |
| Verify/resend email | `POST /auth/email/verify` (public token), `POST /auth/email/resend` (authenticated) |
| Request/complete password reset | `POST /auth/forgot-password`, `POST /auth/reset-password` |
| Active Units / manageable Unit members | `GET /units`, `GET /units/{unit}/members` |
| Select / create Unit root or child workspace | `GET /workspaces`, `POST /workspaces` with `unit_id` or `parent_id` |
| Workspace member assignment / ownership | `GET`, `POST`, `PATCH`, `DELETE /workspaces/{workspace}/members`; `POST /workspaces/{workspace}/members/{user}/move`; `POST /workspaces/{workspace}/ownership-transfer` |
| Invitations | inspect/accept by token; list/create/revoke within a workspace |
| Monitored topics / pagination / creation | `GET`, `POST /workspaces/{workspace}/monitors` |
| Monitor matched-mention feed | `GET /workspaces/{workspace}/monitors/{monitor}`, `/monitors/{monitor}/mentions` |
| Mention totals / last scan | `GET /workspaces/{workspace}/monitors/{monitor}/stats` |
| Available sources / unread alerts | `GET /workspaces/{workspace}/sources`, `GET /workspaces/{workspace}/alerts/counts` |
| Search, sorting and filters | `GET /workspaces/{workspace}/search` with documented query parameters |
| Monitor notification preferences | `PATCH /workspaces/{workspace}/monitors/{monitor}/preferences` |
| Result / story drawer | `GET /workspaces/{workspace}/mentions/{mention}`, `/clusters/{cluster}`, `/clusters/{cluster}/mentions` |
| Intelligence | `GET /workspaces/{workspace}/explore`, `/intelligence/trending`, `/intelligence/emerging` |
| Alerts / read state | `GET /workspaces/{workspace}/alerts`, `PATCH /alerts/{alert}`, `POST /alerts/read-all` (all workspace-scoped) |
| Monitoring, notification and source settings | `GET`, `PATCH /workspaces/{workspace}/settings/monitoring-defaults`, `/settings/notifications`, `/settings/sources` |
| Account settings | `GET`, `PATCH /auth/me` |

Account responses supply a bearer token. **Keep me signed in** uses local storage; otherwise the token is scoped to session storage. Passwords are never stored. Expired sessions return to sign-in, failed requests expose retryable errors, and failed writes do not pretend to succeed. Pending accounts stay on the approval screen. An approved account without an assignment sees the no-workspace gate unless canonical server capabilities permit root or child creation.

## Account verification and recovery

- Email verification is a distinct prerequisite, not a side effect of roster or administrator approval. The authenticated verification gate appears before roster, pending and workspace gates, preserves the session, and makes no Unit/workspace requests while blocked.
- The gate can resend verification mail and refresh `/auth/me` manually or when the window regains focus. Workspace discovery starts only after the refreshed account is verified, approved and roster-active.
- `/verify-email` works signed in or signed out. It snapshots the token in memory, removes the query immediately, retains one request promise so React StrictMode cannot consume the one-time token twice, and safely resumes the validated internal destination after authorization refresh.
- Forgot-password always shows the same accepted state for known and unknown addresses. `/reset-password` removes token/email query values immediately; invalid, expired, reused and wrong-email outcomes share one neutral recovery state. A successful reset clears local private/session state, while the backend revokes all existing tokens.
- An inactive linked roster is a separate authenticated gate. It preserves identity/session state, blocks tenant requests, and refreshes `/auth/me` manually and on focus until reactivated.

The three-step monitor wizard persists the query, include/exclude keywords, selected available source IDs, frequency, and documented notification preferences. If preferences fail after monitor creation, retry saves only preferences and does not create a duplicate. Monitor totals and new activity come from monitor statistics and the latest scan, not hard-coded live counts. Daily/weekly digest settings are workspace notification preferences; they are not invented as per-monitor settings.

Search is a utility over mentions the workspace's monitors have already collected, not a live web search and not a discovery trigger. It is not in the primary navigation; it is reached from the header field, the sidebar utility link, and contextual drill-downs (related topics/results, monitor detail, Intelligence and Alerts topic links). Date, source, country, language, sentiment, and relevance/latest sorting use documented parameters. Channel tabs filter returned mentions by their documented source type. Empty results offer converting the query into a monitor, which is the only durable way to keep collecting it. Drawer links accept only HTTP(S) URLs. Unknown mention/source/relevance metrics show an unavailable state rather than sample values.

Analytics uses the six dedicated workspace `/analytics/*` endpoints and Recharts in the original dashboard layout. A Matched/All-collected tab sends `scope=matched` or `scope=all`; matched mode counts only mentions linked to a monitor, while all-collected mode keeps the previous workspace-wide total. All four periods are enabled using `period=24h`, `period=7d`, `period=30d`, and `period=90d`. Authenticated production checks on 30 October 2026 returned HTTP 200 for all 48 sequential/concurrent requests across these periods, with volume bucket sums matching overview totals. The 24-hour report returns hourly buckets; longer reports return daily buckets. The frontend parses both hour/day period units and labels comparisons accordingly, preserving all returned buckets, including explicit zeros and inclusive boundary buckets. It supports production wrappers `volume`, `sentiment`, `sources`, `keywords`, and `avg_discovery_seconds`; source `share` and sentiment fractions are converted to percentages. The overview maps `totals.mentions`, `totals.sources`, `totals.new_today`, `totals.avg_discovery_seconds` and `deltas.mentions_pct`. Unexpected reporting durations remain labeled with the actual service-reported period, and failures show a retry action without substituting a different period. These checks establish current behavior, not a guarantee of future backend availability or support for arbitrary `from`/`to` filters. Trending and geography use their documented intelligence endpoints with the same selected `period`, so both cards follow the period tabs instead of always showing the latest 24 hours. Analytics totals are labeled "collected mentions" because they include every item fetched from enabled sources, including items that matched no monitor; the Monitors page labels its totals "matched mentions" and its per-scan counts "new items collected". Day-based analytics include the current day's live mentions, so the 24-hour total never exceeds the longer-period total. The specification also describes `intelligence/most-mentioned.data` as a string, so Most Mentioned sorts the current page of documented `/explore` records and labels that scope.

Search & discovery display preferences are saved per workspace **on this device** and affect search grouping, inclusion of social results, summary display, and sentiment display. Server-supported monitoring defaults, notification settings, source enablement, and account fields persist through their documented PATCH endpoints. Source-language preferences can be updated, and browser push registration is available in Notifications. Google/Microsoft sign-in is connected through same-origin `/api/v1/auth/social/{provider}/redirect` and a public `/auth/callback` page. The callback removes query parameters, exchanges the single-use code once, and restores the existing remembered/session-only Zustand session and a validated internal destination. Only an explicit provider-verified claim marks the local email verified; a missing or false claim completes social sign-in without bypassing local verification, so an unverified account enters Sentinel's verification flow. Errors return to sign-in; email, roster, approval, assignment and creation capabilities determine the next gate. Brand icons are bundled SVGs. See [docs/social-auth.md](docs/social-auth.md).

## Checks

```sh
npm run lint
npm run build
npm test
```

The browser tests use Playwright with contract-based API fixtures, route/guard tests, and real HTTP proxy tests against a controlled backend. They cover email verification/recovery, eligibility gates, ownership transfer, account forms, storage, session verification/expiration, safe redirects, logout, browser history and refresh, workspace switching, onboarding, filters, saved views, drawers, mutations, analytics, and mobile/reduced-motion behavior. Production tests deliberately use an upstream whose CORS header allows a different origin, confirming that browser requests remain on the frontend origin while JSON bodies, bearer headers, and error status codes pass through the proxy.

Current local coverage is 174 passing tests, plus one opt-in live check skipped by default.

The opt-in external check runs separately:

```sh
npm run test:live
```

It sends an unauthenticated account request and an empty login request through the production proxy to the **real Sentinel API**, verifying expected 401/422 JSON responses with no CORS failures. It creates no accounts or application data. This external check is skipped in the default suite to keep normal tests deterministic. Successful authenticated production operations require a real account and are not claimed as verified by these checks.

Tests use system Chromium when available. Otherwise run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to your browser executable. Screenshots and traces from failed runs are saved under ignored `test-results/`.

## Production

Production deployment for this VPS is documented in [deploy/README.md](deploy/README.md): GitHub Actions → `/opt/sentinel-frontend-deploy.sh` → `deploy/frontend-deploy.sh`, with nginx serving `dist/` and proxying `/api/v1`. The manual runtime below is the fallback for hosts without nginx.

```sh
npm ci --include=dev
npm run build
npm start
```

The Node production server serves `dist`, proxies `/api/v1` to the configured backend, and serves `index.html` for frontend deep links. It listens on `PORT` (3000 by default) and `HOST` (0.0.0.0 by default). `.env` supplies the API target. A production deployment can install only production dependencies after the build; the server and proxy packages are declared as production dependencies.

Deploying **only static `dist` files** requires your hosting platform to supply both SPA fallback and a same-origin `/api/v1` reverse proxy. The API currently advertises `https://sentinel.absg-ohos.cloud`; frontend code cannot change that server policy. Do not disable browser security or TLS checks to work around CORS.

## Test individual API endpoints

See [the endpoint testing guide](docs/api-testing.md) for Postman and PowerShell instructions. The backend-generated [OpenAPI contract](docs/openapi.json) is canonical; the Postman collection is a convenience set for individual customer API requests and must not be treated as a complete admin/API inventory.

## Authentication security and deployment checks

Email format is validated in the frontend using a regex. Passwords are sent unchanged in JSON over HTTPS; special characters are valid and are not stripped. Client validation is bypassable and does **not** prevent SQL injection. The production authentication backend must use parameterized queries or safe ORM bindings, validate input on the server, hash passwords, rate-limit login attempts, and authorize every workspace request. This repository contains the frontend and reverse proxy, not that backend, so these backend guarantees cannot be verified here.

During UAT, verify authenticated `GET /api/v1/workspaces/{workspace}/explore?page=1` through both Latest and Most Mentioned after the retained Unit's root is created. Successful unauthenticated live checks do not establish that this endpoint or every authenticated operation works. The UI retries failed shared requests when switching these tabs and shows a concise retry message.

## Application boundaries

The shipped app has no demo route, sample workspace service, or mock analytics. React Router defines public authentication/invitation routes and a protected workspace layout. Zustand manages shared session/workspace state; `src/lib/api.js` is the HTTP transport, and `useResource` manages page request loading, cancellation, validation, and retries. Views render API results or explicit empty/error states. API test fixtures live under `tests` and are not imported into the application bundle. Figma exports and fetch scripts are neither runtime/build dependencies nor authority for application structure.

## Settings behavior

- **Settings → Team** is driven by canonical `manage_members` and has three explicit sections: **Workspace members**, **Unit members**, and **Invitations**.
- Approved, enabled, roster-active same-Unit staff can be assigned directly as admin/member, updated, moved between same-Unit workspaces the actor can manage, or removed. Owner memberships are protected. The canonical current owner gets a dedicated **Transfer ownership** action for an eligible existing non-owner member, chooses their own resulting admin/member role, may provide a reason, confirms the immediate effect, and refreshes full authorization after the atomic backend transfer.
- Invitations are the fallback for unregistered email addresses. Registered users are assigned directly instead; acceptance requires the invited email, an approved/enabled account, and the same Unit. A pending account can retry the still-valid invitation after approval.
- Every membership-changing success refreshes `/auth/me` and `/workspaces` before the UI trusts new access. Invitation acceptance and workspace creation use the same refresh; pending/no-assignment gates also refresh on focus, and stale refreshes cannot overwrite newer authorization.
- Sign-up collects staff ID and an active Unit. State is shown as the Unit's jurisdiction and is not submitted as a workspace/identity boundary; unapproved accounts see the pending/rejected screen instead of workspaces.

Monitoring, notifications, and source groups save through the workspace settings endpoints. New monitors read the saved monitoring defaults before creation. Disabling the twenty-minute scan shortcut selects thirty minutes; disabling the twenty-minute digest selects daily delivery, since the contract has no disabled cadence. Historical matching uses thirty days when enabled and the API minimum of one day otherwise. Advanced sections retain precise schedules, individual sources, and account profile fields.

Personal search-history visibility is no longer a setting; the home screen does not show recent searches. Compact search-result density remains a device-local preference, scoped by account/workspace. French results update source language preferences; actual collection depends on backend/source support. Automatic emerging-topic monitoring, weekly research summaries, and research-participation preferences have no writable fields in the supplied contract, so those controls remain disabled with an explanation.

API failures use short, actionable messages in the interface; arbitrary upstream messages and validation text are not rendered. HTTP status remains available on the error object and in browser Network diagnostics. Error notices remain accessible and keep recovery actions visible.

Only accounts with canonical `create_workspace` access see **New office workspace**. A root requires an eligible active Unit with no existing root; a child requires a manageable parent and inherits its Unit and State. State is jurisdiction, Unit is the organisation/roster boundary, and Workspace is the office tenant. Creation selects the result, clears prior workspace data, persists the selection, and refreshes authorization. The backend enforces every invariant; being signed in alone never grants creation rights.

## Browser push notifications

Open **Settings → Notifications → Browser notifications → Enable on this device**. Permission is requested only after clicking Enable. The browser registers `/push-sw.js` and a Web Push subscription using the backend VAPID public key. Authenticated account-level `/push/public-key` and `/push/subscriptions` requests register the device; a separate workspace settings PATCH enables delivery for the selected workspace. The advanced workspace delivery switch remains independent of device registration. Disabling this device removes its subscription, leaving other devices/preferences unchanged.

Push requires HTTPS (localhost is supported for development) and browser/OS permission. iOS/iPadOS may require installing the site on the Home Screen. The backend must have matching VAPID credentials, valid subscription persistence, and working notification queue/scheduler delivery. The frontend cannot supply or verify private VAPID configuration. Real end-to-end notification arrival is not claimed verified without an authenticated production registration and a backend-generated push.

Lock-screen notifications use generic content and open the same-origin `/alerts` route, whose authentication guards remain in effect. The worker ignores payload navigation URLs and article/search content, and does not intercept/cache requests or hold bearer tokens. Local subscriptions are account-bound and removed on sign-out/session expiration; registration, permission, retry, logout cleanup, notification-click handling, and worker installation have automated coverage. The backend must enforce subscription ownership. Browser APIs are simulated for subscription tests; a separate test installs the real worker, and worker event tests verify privacy/navigation behavior.

Digest alerts open a dedicated native-dialog drawer rather than searching their titles. The drawer reads the authenticated workspace digest list and matches the alert by `alert_id`, supports cursor navigation to older records, and shows counts/time windows plus any supplied summary or article details. Unsupported or empty payloads are explicitly described, never turned into fabricated summaries. Article links allow only HTTP(S); linked mention records open the existing details panel. Digest payload shapes remain undocumented and require live verification.

## Diagnose live analytics failures

`npm run check:analytics` tests the real API through the project proxy. Without a production session it reports authentication/connectivity results and exits with code 2 (blocked), rather than claiming that protected analytics works. Supply a temporary test-session bearer token as `SENTINEL_TEST_TOKEN` using an environment secret or local ignored `.env`; never commit or paste it into chat. Optionally set `SENTINEL_TEST_WORKSPACE_ID`; otherwise the first authorized workspace is used. It compares all six analytics endpoints without filters, with ISO timestamps, and with date-only filters. `npm run check:analytics -- --supported` checks all four frontend period values: `24h`, `7d`, `30d`, and `90d`. These are diagnostic probes, not a claim that any undocumented filter is supported. It performs no data mutations and logs only status codes, timings and top-level response keys. A filtered-only failure isolates query handling; 500s for every variant need backend logs. It does not test successful password login, change settings or create accounts.
