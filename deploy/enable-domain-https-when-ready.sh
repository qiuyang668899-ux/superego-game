#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-mortals.online}"
WWW_DOMAIN="${WWW_DOMAIN:-www.mortals.online}"
SERVER_IP="${SERVER_IP:-8.152.201.187}"
CERTBOT="${CERTBOT:-/opt/certbot-ip/bin/certbot}"
WEBROOT="${WEBROOT:-/var/www/certbot}"
TLS_CONFIG_SOURCE="${TLS_CONFIG_SOURCE:-/usr/local/share/superego/superego-domain-tls.nginx.conf}"
TLS_CONFIG_TARGET="${TLS_CONFIG_TARGET:-/etc/nginx/sites-available/superego-domain-tls}"

resolve_ipv4() {
  getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | sort -u
}

contains_server_ip() {
  resolve_ipv4 "$1" | grep -Fxq "$SERVER_IP"
}

if ! contains_server_ip "$DOMAIN" || ! contains_server_ip "$WWW_DOMAIN"; then
  echo "DNS not ready: ${DOMAIN} and ${WWW_DOMAIN} must both resolve to ${SERVER_IP}."
  exit 0
fi

install -d -m 755 "$WEBROOT"

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  "$CERTBOT" certonly \
    --non-interactive \
    --agree-tos \
    --register-unsafely-without-email \
    --webroot \
    --webroot-path "$WEBROOT" \
    --cert-name "$DOMAIN" \
    -d "$DOMAIN" \
    -d "$WWW_DOMAIN"
fi

install -m 644 "$TLS_CONFIG_SOURCE" "$TLS_CONFIG_TARGET"
ln -sfn "$TLS_CONFIG_TARGET" /etc/nginx/sites-enabled/superego-domain-tls
nginx -t
systemctl reload nginx

curl --fail --silent --show-error --resolve "${DOMAIN}:443:${SERVER_IP}" \
  "https://${DOMAIN}/api/health" >/dev/null

echo "Domain HTTPS ready: https://${DOMAIN}/"
