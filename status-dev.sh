#!/bin/bash
# =============================================================================
# status-dev.sh — Quick health check for all Project Neo dev services
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; DIM='\033[2m'; NC='\033[0m'

check() {
  local name="$1" port="$2" pidfile="/tmp/neo-${1}.pid"
  local pid="" alive="?" port_status="?"

  if [ -f "$pidfile" ]; then
    pid=$(cat "$pidfile")
    if kill -0 "$pid" 2>/dev/null; then
      alive="${GREEN}running${NC}"
    else
      alive="${RED}dead (PID orphan)${NC}"
      pid="(stale)"
    fi
  else
    pid="(no pidfile)"
    alive="${RED}not started${NC}"
  fi

  if ss -tlnp | grep -q ":${port} "; then
    port_status="${GREEN}LISTENING${NC}"
  else
    port_status="${RED}DOWN${NC}"
  fi

  printf "  %-12s  PID: %-12s  Port %s: %s\n" "$name" "$pid" "$port" "$port_status"
  echo -e "               Status: $alive"
}

echo -e "${CYAN}Project Neo — Service Status${NC}"
echo -e "${DIM}─────────────────────────────────────────────────${NC}"
check "next" 3000
echo ""
check "realtime" 3004
echo ""

# Watchdog
WD_PID=""
if [ -f /tmp/neo-watchdog.pid ]; then
  WD_PID=$(cat /tmp/neo-watchdog.pid)
  if kill -0 "$WD_PID" 2>/dev/null; then
    printf "  %-12s  PID: %-12s  Status: ${GREEN}running${NC}\n" "watchdog" "$WD_PID"
  else
    printf "  %-12s  PID: %-12s  Status: ${RED}dead${NC}\n" "watchdog" "$WD_PID"
  fi
else
  printf "  %-12s  PID: %-12s  Status: ${RED}not started${NC}\n" "watchdog" "(no pidfile)"
fi
echo ""

# Watchdog log (last 5 lines)
if [ -f /tmp/neo-watchdog.log ]; then
  echo -e "${DIM}Watchdog log (last 5 entries):${NC}"
  tail -5 /tmp/neo-watchdog.log 2>/dev/null | while read -r line; do
    echo -e "  ${DIM}$line${NC}"
  done
fi

# Quick HTTP check
echo ""
printf "  HTTP check: "
HTTP_CODE=$(curl -4 -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://localhost:3000/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}200 OK${NC}"
elif [ "$HTTP_CODE" = "000" ]; then
  echo -e "${RED}UNREACHABLE${NC}"
else
  echo -e "${YELLOW}${HTTP_CODE}${NC}"
fi
