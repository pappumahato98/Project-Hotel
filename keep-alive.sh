#!/bin/bash
# Start or keep-alive the Next.js dev server using bun
PIDFILE="/home/z/my-project/.server.pid"
LOGFILE="/home/z/my-project/dev.log"
SERVER_CMD="cd /home/z/my-project && bun run dev"

start_server() {
  if [ -f "$PIDFILE" ]; then
    OLD_PID=$(cat "$PIDFILE" 2>/dev/null)
    if kill -0 "$OLD_PID" 2>/dev/null; then
      return 0  # Already running
    fi
  fi
  eval "$SERVER_CMD" >> "$LOGFILE" 2>&1 &
  echo $! > "$PIDFILE"
  disown
  return 1
}

# Try to start, wait, then check
start_server
sleep 10
# Verify
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null | grep -q "200"; then
  exit 0
else
  # Server died, try once more
  start_server
  sleep 10
  exit 0
fi
