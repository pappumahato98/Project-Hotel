#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_OPTIONS="--max-old-space-size=4096" node /home/z/my-project/node_modules/.bin/next dev -p 3000 -H 0.0.0.0 --turbopack >> /home/z/my-project/dev.log 2>&1
  echo "[auto-restart] Server died, restarting in 3s..." >> /home/z/my-project/dev.log
  sleep 3
done