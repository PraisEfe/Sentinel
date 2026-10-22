# Sentinel

React 19 / Vite 8 frontend for public-web intelligence. The supplied Sentinel designs are implemented across account access, home, search, monitors, intelligence, analytics, alerts, and settings. Layouts are responsive; Tailwind CSS and fonts are bundled locally. Framer Motion provides page transitions, monitor-wizard step transitions, drawer entrances/exits, and animated charts. Animations respect the system’s reduced-motion preference.

## Develop

Use Node.js 24 and npm (validated with Node 24.19.0 / npm 11.9.0).

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

The app starts at sign-in. `/signin` and `/signup` can be opened directly. Use your existing backend account, create an account through the UI, or choose **Explore the demo workspace**. Demo mode is explicitly marked under `/demo`, never calls the backend, and does not persist demo changes. It never authorizes access to the real private routes.

The supplied API contract is preserved in [docs/openapi.json](docs/openapi.json). The documentation URL requires authentication (401), so the uploaded contract remains the source for field and endpoint mappings.

Browser requests use **same-origin `/api/v1` in every mode**. Vite handles the proxy in development and preview; `npm start` runs the production server with the same API proxy and SPA history fallback. The upstream defaults to `https://sentinel-api.absg-ohos.cloud`. TLS verification remains enabled, and existing HTTPS_PROXY/HTTP_PROXY/NO_PROXY settings are respected. A local backend on loopback uses a direct local connection.

Optional overrides are documented in [.env.example](.env.example). Set `API_PROXY_TARGET=http://127.0.0.1:8000` in `.env.local` for a local backend. Set `VITE_API_BASE_URL` only when intentionally using a different browser API URL; an absolute URL requires the backend to allow your frontend's origin. `VITE_` values are public build-time configuration, never credentials.

## Routes and shared state

React Router handles navigation, deep links, refreshes, query parameters, and browser back/forward.

| Routes | Access |
| --- | --- |
| `/signin`, `/signup`, `/forgot-password` | Public account forms; authenticated users return to their destination |
| `/`, `/search`, `/monitors`, `/intelligence`, `/analytics`, `/alerts`, `/settings` | Protected, server-verified session and selected workspace required |
| `/workspaces/new` | Protected account without a workspace can create one |
| `/demo` and matching `/demo/*` screens | Public sample workspace, isolated from live data and authentication |

`ProtectedRoute` redirects signed-out visitors to sign-in and restores the intended internal URL afterwards. A stored token is verified using `/auth/me` before private pages render. Unauthorized API responses expire the session and clear private state. Logout clears device access even if server-side revocation is temporarily unreachable. Client guards improve navigation; backend bearer authentication and authorization still enforce access to every resource.

Zustand owns the session lifecycle, user, authorized workspaces, selected workspace, monitoring summaries, per-workspace discovery preferences, and shared navigation/drawer/wizard state. Persistence explicitly whitelists only non-secret preferences and workspace selections. Bearer tokens retain the existing remember-me behavior in `sentinel_session` (local storage when checked, session storage otherwise); passwords are never stored. Form drafts and per-page request loading/error states remain local. Aborted/stale session and workspace responses cannot overwrite a newer session or workspace.

Search queries and filters are URL parameters (`/search?q=MTN&sentiment=positive`), monitor pagination uses `page`, and settings sections use `section` (e.g. `/settings?section=notifications`).

## Connected features

| Screen/action | API |
| --- | --- |
| Sign in / register | `POST /auth/login`, `POST /auth/register` |
| Restore session / sign out | `GET /auth/me`, `POST /auth/logout` |
| Request password reset | `POST /auth/forgot-password` |
| Select / create workspace | `GET /workspaces`, `POST /workspaces` |
| Recent searches / clear history | `GET`, `DELETE /workspaces/{workspace}/history/searches` |
| Monitored topics / pagination / creation | `GET`, `POST /workspaces/{workspace}/monitors` |
| Mention totals / last scan | `GET /workspaces/{workspace}/monitors/{monitor}/stats` |
| Available sources / unread alerts | `GET /workspaces/{workspace}/sources`, `GET /workspaces/{workspace}/alerts/counts` |
| Search, sorting and filters | `GET /workspaces/{workspace}/search` with documented query parameters |
| Saved search views | `POST /workspaces/{workspace}/saved-searches` |
| Monitor notification preferences | `PATCH /workspaces/{workspace}/monitors/{monitor}/preferences` |
| Result / story drawer | `GET /workspaces/{workspace}/mentions/{mention}`, `/clusters/{cluster}`, `/clusters/{cluster}/mentions` |
| Intelligence | `GET /workspaces/{workspace}/explore`, `/intelligence/trending`, `/intelligence/emerging` |
| Alerts / read state | `GET /workspaces/{workspace}/alerts`, `PATCH /alerts/{alert}`, `POST /alerts/read-all` (all workspace-scoped) |
| Monitoring, notification and source settings | `GET`, `PATCH /workspaces/{workspace}/settings/monitoring-defaults`, `/settings/notifications`, `/settings/sources` |
| Account settings | `GET`, `PATCH /auth/me` |

Account responses supply a bearer token. **Keep me signed in** uses local storage; otherwise the token is scoped to session storage. Passwords are never stored. Expired sessions return to sign-in, failed requests expose retryable errors, and failed writes do not pretend to succeed. A newly registered account with no workspaces is prompted to create one.

The three-step monitor wizard persists the query, include/exclude keywords, selected available source IDs, frequency, and documented notification preferences. If preferences fail after monitor creation, retry saves only preferences and does not create a duplicate. Monitor totals and new activity come from monitor statistics and the latest scan, not hard-coded live counts. Daily/weekly digest settings are workspace notification preferences; they are not invented as per-monitor settings.

Search date, source, country, language, sentiment, and relevance/latest sorting use documented parameters. Channel tabs filter returned mentions by their documented source type. Saved filters are stored as the contract’s string-array field. Drawer links accept only HTTP(S) URLs. Unknown mention/source/relevance metrics show an unavailable state rather than sample values.

Analytics endpoints in this specification have untyped object responses. Live analytics therefore derives volume, tone, source distribution, keywords, and geography from documented mention records returned for the selected period, with trends from documented story-cluster records. It labels this scope explicitly. Demo mode uses illustrative analytics fixtures. The specification also describes `intelligence/most-mentioned.data` as a string, so Most Mentioned sorts the current page of documented `/explore` records and labels that scope.

Search & discovery display preferences are saved per workspace **on this device** and affect search grouping, inclusion of social results, summary display, and sentiment display. Server-supported monitoring defaults, notification settings, source enablement, and account fields persist through their documented PATCH endpoints. Source-language metadata is displayed; editing languages and registering a browser push subscription are outside this update. Google/Microsoft authentication and completing a password reset from an emailed token are still outside the implemented flows.

## Checks

```sh
npm run lint
npm run build
npm test
```

The browser tests use Playwright with contract-based API fixtures, route/guard tests, and real HTTP proxy tests against a controlled backend. They cover account forms, storage, session verification/expiration, safe redirects, logout, browser history and refresh, workspace switching, onboarding, filters, saved views, drawers, mutations, analytics, and mobile/reduced-motion behavior. Production tests deliberately use an upstream whose CORS header allows a different origin, confirming that browser requests remain on the frontend origin while JSON bodies, bearer headers, and error status codes pass through the proxy.

The opt-in external check runs separately:

```sh
npm run test:live
```

It sends an unauthenticated account request and an empty login request through the production proxy to the **real Sentinel API**, verifying expected 401/422 JSON responses with no CORS failures. It creates no accounts or application data. This external check is skipped in the default suite to keep normal tests deterministic. Successful authenticated production operations require a real account and are not claimed as verified by these checks.

Tests use system Chromium when available. Otherwise run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to your browser executable. Screenshots and traces from failed runs are saved under ignored `test-results/`.

## Production

```sh
npm ci --include=dev
npm run build
npm start
```

The Node production server serves `dist`, proxies `/api/v1` to the configured backend, and serves `index.html` for frontend deep links. It listens on `PORT` (3000 by default) and `HOST` (0.0.0.0 by default). `.env.local` supplies optional runtime settings. A production deployment can install only production dependencies after the build; the server and proxy packages are declared as production dependencies.

Deploying **only static `dist` files** requires your hosting platform to supply both SPA fallback and a same-origin `/api/v1` reverse proxy. Alternatively build with an explicit absolute `VITE_API_BASE_URL`, in which case the API must allow your exact frontend origin. The API currently advertises `https://sentinel.absg-ohos.cloud`; frontend code cannot change that server policy. Do not disable browser security or TLS checks to work around CORS.
