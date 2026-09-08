#!/usr/bin/env bash
# Keep Node API alive on SpaceWeb shared hosting (cron every minute).
APP_DIR="/home/s/soloimtech/apps/thai-speak"
PORT=3055
PID_FILE="$APP_DIR/run/server.pid"
LOG_FILE="$APP_DIR/run/server.log"
# Prefer portable Node (SpaceWeb system Node can't build native addons).
if [[ -x "$APP_DIR/.node/bin/node" ]]; then
  NODE_BIN="$APP_DIR/.node/bin/node"
else
  NODE_BIN="$(command -v node)"
fi

mkdir -p "$APP_DIR/run"
cd "$APP_DIR" || exit 1

is_up() {
  if curl -fsS --max-time 2 "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
    return 0
  fi
  return 1
}

if is_up; then
  exit 0
fi

if [[ -f "$PID_FILE" ]]; then
  oldpid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "$oldpid" ]]; then
    kill "$oldpid" >/dev/null 2>&1 || true
  fi
  rm -f "$PID_FILE"
fi

export NODE_ENV=production
export PORT="$PORT"
export HOST=127.0.0.1
nohup "$NODE_BIN" dist/server.cjs >>"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"
sleep 2
is_up || echo "WARN: server did not become healthy" >>"$LOG_FILE"
