#!/bin/bash
cd /home/z/my-project
while true; do
  bun run dev >> /home/z/my-project/dev.log 2>&1
  echo "[$(date)] Server died, restarting..." >> /home/z/my-project/dev.log
  sleep 1
done
