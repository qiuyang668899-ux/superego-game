#!/usr/bin/env bash
set -euo pipefail
export LANG=C
export LC_ALL=C

SERVER_HOST="${SERVER_HOST:-8.152.201.187}"
SERVER_USER="${SERVER_USER:-root}"
SSH_KEY="${SSH_KEY:-/Users/mac/Documents/Codex/2026-06-15/files-mentioned-by-the-user-1/server-access/maiyi-tools-ed25519}"
SSH=(ssh -i "${SSH_KEY}" -o BatchMode=yes -o StrictHostKeyChecking=yes "${SERVER_USER}@${SERVER_HOST}")
SCP=(scp -i "${SSH_KEY}" -o BatchMode=yes -o StrictHostKeyChecking=yes)

"${SCP[@]}" deploy/superego.nginx.conf "${SERVER_USER}@${SERVER_HOST}:/tmp/superego.nginx.conf"
"${SCP[@]}" deploy/superego-ip-tls.nginx.conf "${SERVER_USER}@${SERVER_HOST}:/tmp/superego-ip-tls.nginx.conf"
"${SCP[@]}" deploy/certbot-ip-renew.service "${SERVER_USER}@${SERVER_HOST}:/tmp/certbot-ip-renew.service"
"${SCP[@]}" deploy/certbot-ip-renew.timer "${SERVER_USER}@${SERVER_HOST}:/tmp/certbot-ip-renew.timer"

"${SSH[@]}" "set -euo pipefail
install -d -m 755 /var/www/certbot
install -m 644 /tmp/superego.nginx.conf /etc/nginx/sites-available/superego
ln -sfn /etc/nginx/sites-available/superego /etc/nginx/sites-enabled/superego
nginx -t
systemctl reload nginx

if [ ! -x /opt/certbot-ip/bin/certbot ]; then
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y python3-venv
  python3 -m venv /opt/certbot-ip
  /opt/certbot-ip/bin/pip install --upgrade pip
  /opt/certbot-ip/bin/pip install 'certbot>=5.4,<6'
fi

if [ ! -f '/etc/letsencrypt/live/${SERVER_HOST}/fullchain.pem' ]; then
  /opt/certbot-ip/bin/certbot certonly \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    --preferred-profile shortlived \
    --webroot \
    --webroot-path /var/www/certbot \
    --ip-address '${SERVER_HOST}'
fi

install -m 644 /tmp/superego-ip-tls.nginx.conf /etc/nginx/sites-available/superego-ip-tls
ln -sfn /etc/nginx/sites-available/superego-ip-tls /etc/nginx/sites-enabled/superego-ip-tls
install -m 644 /tmp/certbot-ip-renew.service /etc/systemd/system/certbot-ip-renew.service
install -m 644 /tmp/certbot-ip-renew.timer /etc/systemd/system/certbot-ip-renew.timer
rm -f /tmp/superego.nginx.conf /tmp/superego-ip-tls.nginx.conf /tmp/certbot-ip-renew.service /tmp/certbot-ip-renew.timer
systemctl daemon-reload
systemctl enable --now certbot-ip-renew.timer
nginx -t
systemctl reload nginx
curl --fail --silent --show-error 'https://${SERVER_HOST}/api/health'
"

echo "HTTPS enabled at https://${SERVER_HOST}/"
