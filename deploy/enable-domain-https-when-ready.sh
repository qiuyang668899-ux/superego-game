#!/usr/bin/env bash
set -euo pipefail

DOMAIN="${DOMAIN:-mortals.online}"
WWW_DOMAIN="${WWW_DOMAIN:-www.mortals.online}"
SERVER_IP="${SERVER_IP:-8.152.201.187}"
ACME_SH="${ACME_SH:-/opt/acme.sh/acme.sh}"
ACME_SERVER="${ACME_SERVER:-letsencrypt}"
TLS_CONFIG_SOURCE="${TLS_CONFIG_SOURCE:-/usr/local/share/superego/superego-domain-tls.nginx.conf}"
TLS_CONFIG_TARGET="${TLS_CONFIG_TARGET:-/etc/nginx/sites-available/superego-domain-tls}"
RENEW_BEFORE_SECONDS="${RENEW_BEFORE_SECONDS:-2592000}"

resolve_ipv4() {
  getent ahostsv4 "$1" 2>/dev/null | awk '{print $1}' | sort -u
}

contains_server_ip() {
  resolve_ipv4 "$1" | grep -Fxq "$SERVER_IP"
}

if ! contains_server_ip "$DOMAIN"; then
  echo "DNS not ready: ${DOMAIN} must resolve to ${SERVER_IP}."
  exit 0
fi

certificate_domains=(-d "$DOMAIN")
www_ready=false
if contains_server_ip "$WWW_DOMAIN"; then
  certificate_domains+=(-d "$WWW_DOMAIN")
  www_ready=true
fi

certificate_path="/etc/letsencrypt/live/${DOMAIN}/fullchain.pem"
certificate_key_path="/etc/letsencrypt/live/${DOMAIN}/privkey.pem"
needs_certificate=false
expand_certificate=false
renew_certificate=false

if [ ! -f "$certificate_path" ]; then
  needs_certificate=true
elif $www_ready && ! openssl x509 -in "$certificate_path" -noout -text | grep -Fq "DNS:${WWW_DOMAIN}"; then
  needs_certificate=true
  expand_certificate=true
elif ! openssl x509 -checkend "$RENEW_BEFORE_SECONDS" -noout -in "$certificate_path"; then
  needs_certificate=true
  renew_certificate=true
fi

if $needs_certificate; then
  if [ ! -x "$ACME_SH" ]; then
    echo "ACME client is missing: ${ACME_SH}" >&2
    exit 1
  fi

  acme_options=(--issue --alpn --server "$ACME_SERVER" --keylength ec-256)
  if $expand_certificate || $renew_certificate; then
    acme_options+=(--force)
  fi

  restart_nginx() {
    systemctl start nginx
  }
  trap restart_nginx EXIT
  systemctl stop nginx

  "$ACME_SH" \
    "${acme_options[@]}" \
    "${certificate_domains[@]}"

  systemctl start nginx
  trap - EXIT

  install -d -m 755 "/etc/letsencrypt/live/${DOMAIN}"
  "$ACME_SH" --install-cert -d "$DOMAIN" --ecc \
    --key-file "$certificate_key_path" \
    --fullchain-file "$certificate_path" \
    --reloadcmd "systemctl reload nginx"
fi

install -m 644 "$TLS_CONFIG_SOURCE" "$TLS_CONFIG_TARGET"
ln -sfn "$TLS_CONFIG_TARGET" /etc/nginx/sites-enabled/superego-domain-tls
nginx -t
systemctl reload nginx

curl --fail --silent --show-error --resolve "${DOMAIN}:443:${SERVER_IP}" \
  "https://${DOMAIN}/api/health" >/dev/null

if $www_ready; then
  echo "Domain HTTPS ready: https://${DOMAIN}/ (including ${WWW_DOMAIN})"
else
  echo "Domain HTTPS ready: https://${DOMAIN}/ (${WWW_DOMAIN} will be added automatically when DNS is ready)"
fi
