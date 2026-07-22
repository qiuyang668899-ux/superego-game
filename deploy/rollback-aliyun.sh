#!/usr/bin/env bash
set -euo pipefail

SERVER_HOST="${SERVER_HOST:-8.152.201.187}"
SERVER_USER="${SERVER_USER:-root}"
SSH_KEY="${SSH_KEY:-/Users/mac/Documents/Codex/2026-06-15/files-mentioned-by-the-user-1/server-access/maiyi-tools-ed25519}"
APP_ROOT="/srv/maiyi-tools/superego"

ssh -i "${SSH_KEY}" -o BatchMode=yes -o StrictHostKeyChecking=yes "${SERVER_USER}@${SERVER_HOST}" bash -s -- "${APP_ROOT}" <<'REMOTE_SCRIPT'
set -euo pipefail
APP_ROOT="$1"
CURRENT="$(readlink -f "${APP_ROOT}/current")"
PREVIOUS="$(find "${APP_ROOT}/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | cut -d' ' -f2- | grep -Fxv "${CURRENT}" | head -1)"
test -n "${PREVIOUS}"
ln -sfn "${PREVIOUS}" "${APP_ROOT}/current.rollback"
mv -Tf "${APP_ROOT}/current.rollback" "${APP_ROOT}/current"
systemctl restart superego.service
curl --fail --silent --show-error http://127.0.0.1:4175/api/health | grep -q '"ok":true'
echo "Rolled back to ${PREVIOUS}"
REMOTE_SCRIPT
