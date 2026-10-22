# Sentinel

React 19 / Vite 8 frontend for public-web intelligence. The supplied Sentinel designs are implemented across account access, home, search, monitors, intelligence, analytics, alerts, and settings. Layouts are responsive; Tailwind CSS and fonts are bundled locally. Framer Motion provides page transitions, monitor-wizard step transitions, drawer entrances/exits, and animated charts. Animations respect the system’s reduced-motion preference.

## Develop

Use Node.js 24 and npm (validated with Node 24.19.0 / npm 11.9.0).

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

The app starts at sign-in. `/signin` and `/signup` can be opened directly. Use your existing backend account, create an account through the UI, or choose **Explore the demo workspace**. Demo mode is explicitly marked, never calls the backend, and does not persist demo changes.

The supplied API contract is preserved in [docs/openapi.json](docs/openapi.json). Development calls `/api/v1` through Vite's HTTPS-verifying proxy to `https://sentinel-api.absg-ohos.cloud`. This avoids the production backend's CORS restriction to `https://sentinel.absg-ohos.cloud` without weakening that policy. The proxy respects existing HTTPS_PROXY/HTTP_PROXY/NO_PROXY settings, including this cloud environment’s egress proxy; TLS verification stays enabled.

Optional local overrides are documented in [.env.example](.env.example). To use a local backend, set `API_PROXY_TARGET=http://127.0.0.1:8000` in `.env.local`, then restart Vite. Override `VITE_API_BASE_URL` only if you intend to bypass the development proxy. `VITE_` values are public, build-time configuration; never store credentials in them.

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

The browser tests use Playwright and API fixtures matched to the supplied OpenAPI routes and required request fields. They cover account forms, persistent and session-only storage, expiration, loading/empty/error states, history clearing, workspace creation, monitor wizard creation/pagination and partial-failure retry, search filters and saved views, result/cluster drawers, alert read state, server settings and failure feedback, local preferences, analytics periods, demo isolation, and mobile navigation with reduced motion. These tests do not prove production credentials or production data are valid.

Tests use system Chromium when available. Otherwise run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to your browser executable. Screenshots and traces from failed runs are saved under ignored `test-results/`.

## Production

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Production builds default to `https://sentinel-api.absg-ohos.cloud/api/v1`, whose CORS policy currently permits `https://sentinel.absg-ohos.cloud`. Hosting elsewhere requires allowing that frontend origin on the backend, or setting `VITE_API_BASE_URL=/api/v1` at build time and configuring a same-origin reverse proxy. A Vite development proxy is not a production deployment server. Configure SPA fallback to `index.html` for direct auth URLs.

Live verification during implementation confirmed that JSON requests to `/auth/me` return 401 without authentication, and empty login requests return documented 422 validation errors. Both checks also passed from a real browser through the development proxy. Successful account and workspace operations are covered by browser fixtures; production authentication requires a real account and has not been claimed as verified.
