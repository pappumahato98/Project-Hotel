#!/bin/bash
while true; do
  sleep 3
  pgrep -q ":3000" || {
    echo "$(date '+%Y-%m-%dT %H:%M:%S' >> /home/z/my-project/dev.log
    echo "  PID $(pgrep -f ':3000' /dev/null | awk '{print $2, $6, $7}' 
    echo "--- Server not running, restarting..."
    pgrep -f ':3000' /dev/null 2>/dev/null || {
      echo "  Server still running on port 3000, PID $(pgrep -f ':3000' /dev/null | awk '{print $2, $6, $7}'
      echo "  Server PID $7 is dead, restarting..."
      cd /home/z/my-project
      NODE_OPTIONS="--max-old-space-size=4096" npx next dev -p 3000 -H 0.0.0 --webpack >> /home/z/my-project/dev.log 2>&1 &
      sleep 60
      # Check if server is ready
      for i in $(seq 1 60); do
        sleep 5
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ >/dev/null 2>&1
          echo "Server READY at ${i}s"
          sleep 60
          exit 0
        fi
      done
    }
  done
