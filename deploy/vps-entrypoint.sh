#!/usr/bin/env bash
set -euo pipefail

# Install as /opt/sentinel-frontend-deploy.sh (owned by root, mode 755).
# The SSH remote on the server must use the sentinel deploy-key alias, e.g.
#   git@github-sentinel-frontend:ghum-abia/sentinel-frontend.git

APP_DIR="${APP_DIR:-/var/www/sentinel-frontend}"
BRANCH="${BRANCH:-main}"

cd "$APP_DIR"

echo "==> Updating repository"
git fetch origin "$BRANCH" --prune
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"
git clean -fd \
    --exclude=.env \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=test-results \
    --exclude=playwright-report

exec "$APP_DIR/deploy/frontend-deploy.sh"
