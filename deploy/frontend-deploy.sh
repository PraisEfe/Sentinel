#!/usr/bin/env bash
set -euo pipefail

# Canonical Sentinel frontend deploy steps. Executed on the shared VPS by
# /opt/sentinel-frontend-deploy.sh after that entrypoint updates the working tree.
# This file must NOT perform git operations.
#
# The frontend is served as static files from dist/ by nginx. No Node process
# runs in production; Node is required only to build the bundle.

APP_DIR="${APP_DIR:-/var/www/sentinel-frontend}"

cd "$APP_DIR"

for bin in node npm; do
    command -v "$bin" >/dev/null 2>&1 || { echo "ERROR: '$bin' not found" >&2; exit 1; }
done

[[ -f package.json ]] || { echo "ERROR: package.json missing" >&2; exit 1; }

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if (( NODE_MAJOR < 22 )); then
    echo "ERROR: Node 22 or newer is required (found $(node -v))" >&2
    exit 1
fi

echo "==> Installing JavaScript dependencies"
npm ci --include=dev --no-audit --no-fund

echo "==> Building static bundle"
npm run build

echo "==> Fixing dist permissions"
chmod -R 755 dist 2>/dev/null || true
find dist -type d -exec chmod 755 {} \; 2>/dev/null || true
find dist -type f -exec chmod 644 {} \; 2>/dev/null || true

echo "==> Deployment completed successfully."
