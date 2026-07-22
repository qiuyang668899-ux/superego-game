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
SIMULATE_FAILURE="${SIMULATE_POST_DEPLOY_FAILURE:-0}"
SSH=(ssh -i "${SSH_KEY}" -o BatchMode=yes -o StrictHostKeyChecking=yes "${SERVER_USER}@${SERVER_HOST}")
SCP=(scp -i "${SSH_KEY}" -o BatchMode=yes -o StrictHostKeyChecking=yes)

cleanup() { rm -f "${ARCHIVE}"; }
trap cleanup EXIT

# Every release is gated before the remote version pointer can move.
npm test
npm audit --omit=dev
npm run build
tar -czf "${ARCHIVE}" dist server server.mjs package.json package-lock.json

"${SCP[@]}" "${ARCHIVE}" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_ARCHIVE}"
"${SCP[@]}" .env "${SERVER_USER}@${SERVER_HOST}:${REMOTE_ENV}"
"${SCP[@]}" deploy/superego.service "${SERVER_USER}@${SERVER_HOST}:/tmp/superego.service"
"${SCP[@]}" deploy/superego.nginx.conf "${SERVER_USER}@${SERVER_HOST}:/tmp/superego.nginx.conf"
"${SCP[@]}" deploy/enable-domain-https-when-ready.sh "${SERVER_USER}@${SERVER_HOST}:/tmp/enable-domain-https-when-ready.sh"
"${SCP[@]}" deploy/superego-domain-ready.service "${SERVER_USER}@${SERVER_HOST}:/tmp/superego-domain-ready.service"
"${SCP[@]}" deploy/superego-domain-ready.timer "${SERVER_USER}@${SERVER_HOST}:/tmp/superego-domain-ready.timer"
"${SCP[@]}" deploy/superego-domain-tls.nginx.conf "${SERVER_USER}@${SERVER_HOST}:/tmp/superego-domain-tls.nginx.conf"
"${SCP[@]}" deploy/superego-ip-tls.nginx.conf "${SERVER_USER}@${SERVER_HOST}:/tmp/superego-ip-tls.nginx.conf"

"${SSH[@]}" bash -s -- "${APP_ROOT}" "${RELEASE_ID}" "${REMOTE_ARCHIVE}" "${REMOTE_ENV}" "${SIMULATE_FAILURE}" <<'REMOTE_SCRIPT'
set -euo pipefail
APP_ROOT="$1"
RELEASE_ID="$2"
REMOTE_ARCHIVE="$3"
REMOTE_ENV="$4"
SIMULATE_FAILURE="$5"
PREVIOUS_RELEASE="$(readlink -f "${APP_ROOT}/current" 2>/dev/null || true)"
SWITCHED=0

rollback() {
  status=$?
  if [ "${SWITCHED}" = 1 ] && [ -n "${PREVIOUS_RELEASE}" ] && [ -d "${PREVIOUS_RELEASE}" ]; then
    ln -sfn "${PREVIOUS_RELEASE}" "${APP_ROOT}/current.rollback"
    mv -Tf "${APP_ROOT}/current.rollback" "${APP_ROOT}/current"
    systemctl restart superego.service || true
    nginx -t && systemctl reload nginx || true
    echo "ROLLBACK_OK=${PREVIOUS_RELEASE}"
  fi
  exit "${status}"
}
trap rollback ERR

install -d -m 755 "${APP_ROOT}/releases" "${APP_ROOT}/shared"
install -m 600 "${REMOTE_ENV}" "${APP_ROOT}/shared/.env"
rm -f "${REMOTE_ENV}"
install -d -m 755 "${APP_ROOT}/releases/${RELEASE_ID}"
tar -xzf "${REMOTE_ARCHIVE}" -C "${APP_ROOT}/releases/${RELEASE_ID}"
rm -f "${REMOTE_ARCHIVE}"
chown -R root:root "${APP_ROOT}/releases/${RELEASE_ID}"
chmod -R a=rX "${APP_ROOT}/releases/${RELEASE_ID}"
chown -R www-data:www-data "${APP_ROOT}/shared"

install -m 644 /tmp/superego.service /etc/systemd/system/superego.service
install -m 755 /tmp/enable-domain-https-when-ready.sh /usr/local/sbin/enable-superego-domain-https
install -m 644 /tmp/superego-domain-ready.service /etc/systemd/system/superego-domain-ready.service
install -m 644 /tmp/superego-domain-ready.timer /etc/systemd/system/superego-domain-ready.timer
install -d -m 755 /usr/local/share/superego /var/www/certbot
install -m 644 /tmp/superego-domain-tls.nginx.conf /usr/local/share/superego/superego-domain-tls.nginx.conf
install -m 644 /tmp/superego.nginx.conf /etc/nginx/sites-available/superego-http
ln -sfn /etc/nginx/sites-available/superego-http /etc/nginx/sites-enabled/superego-http
if [ -f /etc/letsencrypt/live/mortals.online/fullchain.pem ]; then
  install -m 644 /tmp/superego-domain-tls.nginx.conf /etc/nginx/sites-available/superego-domain-tls
  ln -sfn /etc/nginx/sites-available/superego-domain-tls /etc/nginx/sites-enabled/superego-domain-tls
else
  rm -f /etc/nginx/sites-enabled/superego-domain-tls
fi
if [ -f /etc/letsencrypt/live/8.152.201.187/fullchain.pem ]; then
  install -m 644 /tmp/superego-ip-tls.nginx.conf /etc/nginx/sites-available/superego-ip-tls
  ln -sfn /etc/nginx/sites-available/superego-ip-tls /etc/nginx/sites-enabled/superego-ip-tls
fi
rm -f /etc/nginx/sites-enabled/superego
rm -f /tmp/superego.service /tmp/superego.nginx.conf /tmp/enable-domain-https-when-ready.sh \
  /tmp/superego-domain-ready.service /tmp/superego-domain-ready.timer /tmp/superego-domain-tls.nginx.conf \
  /tmp/superego-ip-tls.nginx.conf

ln -sfn "${APP_ROOT}/releases/${RELEASE_ID}" "${APP_ROOT}/current.next"
mv -Tf "${APP_ROOT}/current.next" "${APP_ROOT}/current"
SWITCHED=1
systemctl daemon-reload
systemctl enable superego.service
systemctl enable --now superego-domain-ready.timer
systemctl restart superego.service
nginx -t
systemctl reload nginx

wait_for_local_health() {
  local attempt response
  for attempt in $(seq 1 20); do
    if response="$(curl --fail --silent http://127.0.0.1:4175/api/health 2>/dev/null)" \
      && grep -q '"ok":true' <<<"${response}"; then
      return 0
    fi
    sleep 0.5
  done
  echo "Local health check did not become ready within 10 seconds." >&2
  return 1
}

if [ "${SIMULATE_FAILURE}" = 1 ]; then
  echo "SIMULATED_POST_DEPLOY_FAILURE" >&2
  false
fi

wait_for_local_health
curl --fail --silent --show-error --retry 4 --retry-all-errors --retry-delay 1 --connect-timeout 5 --max-time 45 --resolve mortals.online:443:127.0.0.1 \
  https://mortals.online/api/coach \
  -H 'Origin: https://mortals.online' \
  -H 'Content-Type: application/json' \
  --data '{"message":"只回复：发布验收通过","history":[],"context":{}}' | grep -q '"reply"'
curl --fail --silent --show-error --retry 4 --retry-all-errors --retry-delay 1 --connect-timeout 5 --max-time 45 --resolve mortals.online:443:127.0.0.1 \
  https://mortals.online/api/health | grep -q '"ok":true'

trap - ERR
find "${APP_ROOT}/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +4 | cut -d' ' -f2- | xargs -r rm -rf
echo "RELEASE_OK=${APP_ROOT}/releases/${RELEASE_ID}"
systemctl --no-pager --full status superego.service | sed -n '1,14p'
REMOTE_SCRIPT

echo "Published Superego release ${RELEASE_ID} to ${SERVER_HOST}."
