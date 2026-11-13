# Deployment — Sentinel Frontend

> **Execution rule:** agents must never run SSH commands, locally or remotely, and must never run commands on the VPS. Provide the exact commands for the owner and wait for output.

Target:

- Domain: `https://sentinel-org.absg-ohos.cloud`
- App dir: `/var/www/sentinel-frontend`
- Entrypoint: `/opt/sentinel-frontend-deploy.sh`
- Repository: `ghum-abia/sentinel-frontend`, branch `main`
- Runtime: **static `dist/` served by nginx**; Node is required only to build
- API: same-origin `/api/v1` proxied over loopback to the local Sentinel API nginx vhost, with `sentinel-api.absg-ohos.cloud` retained as the TLS SNI and HTTP Host

This app is separate from `sentinel-backend` and `sentinel-admin`: separate repository, domain, deploy key, and CI. It never receives the backend or admin `.env` files.

## Three layers

1. `.github/workflows/deploy.yml` — runs on push to `main` or manual dispatch.
2. `/opt/sentinel-frontend-deploy.sh` — installed from `deploy/vps-entrypoint.sh`; fetches `origin/main`, hard-resets, cleans, then execs the in-repo script.
3. `deploy/frontend-deploy.sh` — installs dependencies, builds `dist/`, fixes permissions.

No migrations, seeds, queue workers, or runtime Node process are involved.

## Requirements on the VPS

- Node 22+ and npm (Node 24 recommended; the deploy script rejects older majors)
- nginx
- certbot for TLS
- Git with a deploy key for `ghum-abia/sentinel-frontend`

## First-time setup

DNS already resolves `sentinel-org.absg-ohos.cloud` to `2.25.219.236`. Confirm before issuing TLS.

1. Create the app directory and clone the repository:

   ```bash
   sudo mkdir -p /var/www/sentinel-frontend
   sudo chown -R ifeanatz:www-data /var/www/sentinel-frontend
   sudo -u ifeanatz git clone git@github-sentinel-frontend:ghum-abia/sentinel-frontend.git /var/www/sentinel-frontend
   ```

2. Create the deploy key and SSH alias on the VPS (owner action), then add the public key to the GitHub repository as a deploy key:

   ```bash
   ssh-keygen -t ed25519 -C "sentinel-frontend-deploy" -f ~/.ssh/sentinel-frontend-github -N ""
   cat ~/.ssh/sentinel-frontend-github.pub
   ```

   Add to `~/.ssh/config`:

   ```text
   Host github-sentinel-frontend
       HostName github.com
       User git
       IdentityFile ~/.ssh/sentinel-frontend-github
       IdentitiesOnly yes
   ```

3. Install the entrypoint:

   ```bash
   sudo cp /var/www/sentinel-frontend/deploy/vps-entrypoint.sh /opt/sentinel-frontend-deploy.sh
   sudo chown root:root /opt/sentinel-frontend-deploy.sh
   sudo chmod 755 /opt/sentinel-frontend-deploy.sh
   ```

4. Run the first build:

   ```bash
   cd /var/www/sentinel-frontend && /opt/sentinel-frontend-deploy.sh
   ```

5. Install the nginx vhost from `deploy/nginx.conf.example`, then issue TLS:

   ```bash
   sudo cp /var/www/sentinel-frontend/deploy/nginx.conf.example /etc/nginx/sites-available/sentinel-frontend
   sudo ln -s /etc/nginx/sites-available/sentinel-frontend /etc/nginx/sites-enabled/sentinel-frontend
   sudo nginx -t
   sudo certbot --nginx -d sentinel-org.absg-ohos.cloud
   sudo nginx -t && sudo systemctl reload nginx
   ```

6. Add the GitHub repository secrets and variables (same names as the other Sentinel repos):

   Secrets:
   - `VPS_SSH_KEY`
   - `VPS_KNOWN_HOSTS` (optional; the workflow falls back to `ssh-keyscan`)

   Variables:
   - `VPS_HOST`
   - `VPS_PORT`
   - `VPS_USER`
   - `FRONTEND_URL` = `https://sentinel-org.absg-ohos.cloud`

## Deploys

Push to `main`; `.github/workflows/deploy.yml` calls `/opt/sentinel-frontend-deploy.sh`. Manual deploys use the same entrypoint from the VPS.

The health check requests `/`, `/privacy`, and `/terms`.

The nginx proxy deliberately connects to `https://127.0.0.1` while sending the
API domain as SNI and Host. This avoids making nginx startup depend on public
DNS when unattended upgrades restart nginx and the local resolver together.

Routine deployments build assets only; they do **not** install or reload
`deploy/nginx.conf.example`. The active vhost is owner-managed. When releasing
a template change, the owner must compare it with the active configuration,
preserve host-specific/Certbot settings, and validate with `nginx -t` before
any approved reload. A successful frontend workflow alone does not verify
the active proxy configuration.

## Rollback

```bash
cd /var/www/sentinel-frontend
git fetch origin main --prune
git reset --hard <previous-sha>
npm ci --include=dev --no-audit --no-fund
npm run build
```

Then reload nginx only if the vhost changed:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Optional Node server mode

The repository also ships an Express server (`npm start`) that serves `dist/` and proxies `/api/v1`. If a host cannot provide nginx, run it under systemd with an untracked `.env`:

```text
API_PROXY_TARGET=https://sentinel-api.absg-ohos.cloud/api/v1
PORT=3000
HOST=127.0.0.1
```

The nginx vhost should then `proxy_pass http://127.0.0.1:3000;` instead of serving `dist/` directly. The static-nginx mode is the default for this VPS.

## Operational checks

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -fsS https://sentinel-org.absg-ohos.cloud/ >/dev/null && echo ok
curl -fsS https://sentinel-org.absg-ohos.cloud/privacy >/dev/null && echo ok
curl -fsS https://sentinel-org.absg-ohos.cloud/terms >/dev/null && echo ok
curl -fsS https://sentinel-org.absg-ohos.cloud/api/v1/units >/dev/null && echo ok
tail -f /var/log/nginx/error.log
```

## Social sign-in

Google/Microsoft buttons navigate through the existing same-origin `/api/v1` proxy. The public `/auth/callback` route must use the SPA fallback, including when its URL contains `code`, `provider`, or `error` query parameters. No OAuth client IDs or secrets are needed in the frontend environment. Backend provider redirect URIs remain unchanged; the backend must send the browser back to `https://sentinel-org.absg-ohos.cloud/auth/callback`.

Automated browser tests cover redirect/exchange/session/onboarding/error flows with controlled responses. Live redirect checks are separate from completing an interactive provider login; verify one real sign-in with each provider after deployment. Do not share callback codes, bearer tokens, or full OAuth redirect URLs in logs or screenshots.
