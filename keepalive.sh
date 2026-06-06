#!/bin/bash
cd /home/z/my-project
while true; do
  # Check if server is responding
  if ! curl -s -o /dev/null -w "" http://localhost:3000/ 2>/dev/null; then
    # Kill any leftover processes
    pkill -f "next dev" 2>/dev/null
    pkill -f "next-server" 2>/dev/null
    sleep 1
    # Start fresh
    rm -f dev.log
    setsid bun run dev > dev.log 2>&1 &
    disown
    echo "$(date): Restarted dev server" >> dev.log
  fi
  sleep 5
done
