# AGENTS.md — Sentinel Frontend

Component rules. The umbrella `../AGENTS.md` also applies.

## Safety

- **Never run SSH commands, locally or remotely.** Do not invoke `ssh`, `scp`, `sftp`, `rsync` over SSH, or any remote shell. Provide the exact commands for the owner and wait for output.
- Never run commands on the production VPS.
- Never modify `.env` or append to it with a shell command. The owner edits it via SSH/IDE.
- Never commit secrets, `.env` files, private keys, or credential files.
- Ask before installing packages, committing, pushing, or starting long-running servers.

## Architecture

- React 19 + Vite 8 + React Router 7; Zustand for shared session/workspace state.
- Browser API calls are same-origin `/api/v1` in every mode. Do not point the browser at the backend domain directly.
- Production is static `dist/` served by nginx with `/api/v1` proxied to `https://sentinel-api.absg-ohos.cloud`. The Express server in `server/` is a fallback host mode.
- Public routes: `/`, `/privacy`, `/terms`, `/signin`, `/signup`, `/forgot-password`, `/auth/callback`. `/` shows the landing page when signed out and the dashboard when signed in.
- Google/Microsoft sign-in uses same-origin social redirect endpoints and the public `/auth/callback` route. It exchanges a single-use code once, removes callback query parameters, and accepts sessions through Zustand. Follow `docs/social-auth.md`; provider secrets stay on the backend.

## Commands

```bash
npm ci
npm run lint
npm run build
npm test
```

Playwright uses `http://127.0.0.1:5173` and starts the dev server automatically. Run `npx playwright install chromium` once if the browser is missing.

## Deployment

- Domain `https://sentinel-org.absg-ohos.cloud`; app dir `/var/www/sentinel-frontend`.
- GitHub Actions → `/opt/sentinel-frontend-deploy.sh` → `deploy/frontend-deploy.sh`.
- See `deploy/README.md` for VPS setup, nginx, TLS, and rollback.
- Never execute deployment commands yourself; print them for the owner.

## Documentation

Update `README.md`, `deploy/README.md`, and this file when routes, hosting, or deployment behavior changes.
