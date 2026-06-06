#!/bin/bash
# Keep-alive script: pings the dev server every 15s to prevent sandbox inactivity timeout
while true; do
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ >/dev/null 2>&1
  sleep 15
done
