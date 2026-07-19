#!/usr/bin/env bash
set -euo pipefail
export LANG=C
export LC_ALL=C

SERVER_HOST="${SERVER_HOST:-8.152.201.187}"
SERVER_USER="${SERVER_USER:-root}"
SSH_KEY="${SSH_KEY:-/Users/mac/Documents/Codex/2026-06-15/files-mentioned-by-the-user-1/server-access/maiyi-tools-ed25519}"
APP_ROOT="/srv/maiyi-tools/superego"
RELEASE_ID="$(date -u +%Y%m%d%H%M%S)"
ARCHIVE="$(mktemp -t superego-release.XXXXXX.tar.gz)"
REMOTE_ARCHIVE="/tmp/superego-${RELEASE_ID}.tar.gz"
REMOTE_ENV="/tmp/superego-${RELEASE_ID}.env"
SSH=(ssh -i "${SSH_KEY}" -o BatchMode=yes -o StrictHostKeyChecking=yes "${SERVER_USER}@${SERVER_HOST}")
SCP=(scp -i "${SSH_KEY}" -o BatchMode=yes -o StrictHostKeyChecking=yes)

cleanup() {
  rm -f "${ARCHIVE}"
}
trap cleanup EXIT

npm run build
tar -czf "${ARCHIVE}" dist server server.mjs package.json package-lock.json

"${SCP[@]}" "${ARCHIVE}" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_ARCHIVE}"
"${SCP[@]}" .env "${SERVER_USER}@${SERVER_HOST}:${REMOTE_ENV}"
"${SCP[@]}" deploy/superego.service "${SERVER_USER}@${SERVER_HOST}:/tmp/superego.service"
"${SCP[@]}" deploy/superego.nginx.conf "${SERVER_USER}@${SERVER_HOST}:/tmp/superego.nginx.conf"

"${SSH[@]}" "set -euo pipefail
install -d -m 755 '${APP_ROOT}/releases' '${APP_ROOT}/shared'
install -m 600 '${REMOTE_ENV}' '${APP_ROOT}/shared/.env'
rm -f '${REMOTE_ENV}'
install -d -m 755 '${APP_ROOT}/releases/${RELEASE_ID}'
tar -xzf '${REMOTE_ARCHIVE}' -C '${APP_ROOT}/releases/${RELEASE_ID}'
rm -f '${REMOTE_ARCHIVE}'
chown -R root:root '${APP_ROOT}/releases/${RELEASE_ID}'
chmod -R a=rX '${APP_ROOT}/releases/${RELEASE_ID}'
chown -R www-data:www-data '${APP_ROOT}/shared'
ln -sfn '${APP_ROOT}/releases/${RELEASE_ID}' '${APP_ROOT}/current.next'
mv -Tf '${APP_ROOT}/current.next' '${APP_ROOT}/current'
install -m 644 /tmp/superego.service /etc/systemd/system/superego.service
if [ ! -f /etc/letsencrypt/live/mortals.online/fullchain.pem ]; then
  install -m 644 /tmp/superego.nginx.conf /etc/nginx/sites-available/superego
fi
rm -f /tmp/superego.service /tmp/superego.nginx.conf
ln -sfn /etc/nginx/sites-available/superego /etc/nginx/sites-enabled/superego
systemctl daemon-reload
systemctl enable superego.service
systemctl restart superego.service
nginx -t
systemctl reload nginx
curl --fail --silent --show-error http://127.0.0.1:4175/api/health
curl --fail --silent --show-error -H 'Host: mortals.online' http://127.0.0.1/healthz
find '${APP_ROOT}/releases' -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +4 | cut -d' ' -f2- | xargs -r rm -rf
systemctl --no-pager --full status superego.service | sed -n '1,18p'
"

echo "Published Superego release ${RELEASE_ID} to ${SERVER_HOST}."
