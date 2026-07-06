#!/bin/bash
# =============================================================================
# stop-dev.sh — Clean shutdown for all Project Neo dev services
# =============================================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info() { echo -e "${CYAN}[stop-dev]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
fail() { echo -e "${RED}[✗]${NC} $*"; }

PID_DIR="/tmp"
KILLED=false

for service in watchdog next realtime; do
  pidfile="$PID_DIR/neo-${service}.pid"
  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      info "Stopping $service (PID $pid)..."
      # Kill the process group
      kill -TERM -- -"$pid" 2>/dev/null || true
      kill -TERM "$pid" 2>/dev/null || true
      sleep 1
      kill -9 -- -"$pid" 2>/dev/null || true
      kill -9 "$pid" 2>/dev/null || true
      KILLED=true
      ok "$service stopped"
    fi
    rm -f "$pidfile"
  fi
done

# Force-kill any stragglers
pkill -9 -f "next-server" 2>/dev/null || true
pkill -9 -f "node_modules/next/dist/bin/next" 2>/dev/null || true
pkill -9 -f "bun.*hot.*index.ts" 2>/dev/null || true
pkill -9 -f "neo-watchdog.sh" 2>/dev/null || true

sleep 1

# Verify ports are free
for port in 3000 3004; do
  if ss -tlnp | grep -q ":${port} "; then
    fail "Port $port still in use — force freeing..."
    fuser -k "${port}/tcp" 2>/dev/null || true
  fi
done

if [ "$KILLED" = true ]; then
  ok "All services stopped cleanly"
else
  info "No running services found"
fi
