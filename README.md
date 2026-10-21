# Sentinel

React 19 / Vite 8 frontend for public-web intelligence. Sign-in, registration, and home match the supplied Sentinel designs, with responsive layouts and locally bundled Tailwind CSS and fonts.

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
| Home search / topic click | `GET /workspaces/{workspace}/search?q=...` |

Account responses supply a bearer token. **Keep me signed in** uses local storage; otherwise the token is scoped to session storage. Passwords are never stored. Expired sessions return to sign-in, failed requests expose retryable errors, and failed writes do not pretend to succeed. A newly registered account with no workspaces is prompted to create one.

The API documents total mentions, not the design's “new mentions” counter, so home shows real mention totals. Source counts reflect available providers, rather than an invented indexed-source statistic. Google/Microsoft authentication is not in the supplied contract; those buttons are disabled. Analytics, intelligence, alerts, and settings remain clearly marked design previews using the existing sample data. Completing a password reset from an emailed token is outside these three initial screens.

## Checks

```sh
npm run lint
npm run build
npm test
```

The browser tests use Playwright and API fixtures matched to the supplied OpenAPI routes and required request fields. They cover account forms, persistent and session-only storage, expiration, loading/empty/error states, history clearing, workspace creation, monitor creation/pagination, live search wiring, demo isolation, and mobile navigation. These tests do not prove production credentials or production data are valid.

Tests use system Chromium when available. Otherwise run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to your browser executable. Screenshots and traces from failed runs are saved under ignored `test-results/`.

## Production

```sh
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Production builds default to `https://sentinel-api.absg-ohos.cloud/api/v1`, whose CORS policy currently permits `https://sentinel.absg-ohos.cloud`. Hosting elsewhere requires allowing that frontend origin on the backend, or setting `VITE_API_BASE_URL=/api/v1` at build time and configuring a same-origin reverse proxy. A Vite development proxy is not a production deployment server. Configure SPA fallback to `index.html` for direct auth URLs.

Live verification during implementation confirmed that JSON requests to `/auth/me` return 401 without authentication, and empty login requests return documented 422 validation errors. Both checks also passed from a real browser through the development proxy. Successful account and workspace operations are covered by browser fixtures; production authentication requires a real account and has not been claimed as verified.
