#!/bin/bash
while true; do
  if ! curl -s -o /dev/null -w "" http://localhost:3000/ 2>/dev/null; then
    pkill -f "next-server" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    sleep 2
    cd /home/z/my-project
    rm -f dev.log
    nohup bun run dev >> dev.log 2>&1 &
  fi
  sleep 3
done
