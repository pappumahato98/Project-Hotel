#!/bin/bash
cd /home/z/my-project
while true; do
  npx next start -p 3000 -H 0.0.0.0 </dev/null >>/home/z/my-project/dev.log 2>&1
  echo "[$(date '+%H:%M:%S')] next start exited, restarting in 0.5s..." >>/home/z/my-project/dev.log
  sleep 0.5
done
