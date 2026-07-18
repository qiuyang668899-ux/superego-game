#!/bin/bash

set -e
cd "$(dirname "$0")"

echo "正在启动《超我》本地预览……"
npm run start:local &
server_pid=$!

cleanup() {
  kill "$server_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

for _ in {1..30}; do
  if curl -fsS http://127.0.0.1:4175/ >/dev/null 2>&1; then
    open http://127.0.0.1:4175/
    echo "《超我》智能心核已打开。使用期间请不要关闭这个终端窗口。"
    wait "$server_pid"
    exit $?
  fi
  sleep 0.2
done

echo "启动失败，请把这个窗口里的信息发给 Codex。"
exit 1
