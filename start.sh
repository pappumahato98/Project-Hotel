#!/bin/bash
# Meridian PMS - Server startup script
# Usage: ./start.sh [dev|prod|watchdog]
# 
# dev     - Start turbopack dev server (port 3000)
# prod    - Start production server (port 3000)
# watchdog- Auto-restart production server on crash

MODE="${1:-dev}"
cd "$(dirname "$0")"

case "$MODE" in
  dev)
    echo "Starting dev server (turbopack) on port 3000..."
    export NODE_OPTIONS="--max-old-space-size=4096"
    exec npx next dev -p 3000 -H 0.0.0.0
    ;;
  prod)
    echo "Starting production server on port 3000..."
    if [ ! -f .next/BUILD_ID ]; then
      echo "No build found. Run 'npm run build' first or use: ./start.sh build"
      exit 1
    fi
    exec npx next start -p 3000 -H 0.0.0.0
    ;;
  watchdog)
    echo "Starting production server with watchdog..."
    if [ ! -f .next/BUILD_ID ]; then
      echo "Building for production..."
      NODE_OPTIONS="--max-old-space-size=4096" npx next build
    fi
    while true; do
      npx next start -p 3000 -H 0.0.0.0 </dev/null >>dev.log 2>&1
      echo "[$(date '+%H:%M:%S')] Server exited, restarting in 1s..." >>dev.log
      sleep 1
    done
    ;;
  build)
    echo "Building for production..."
    export NODE_OPTIONS="--max-old-space-size=4096"
    npx next build
    echo "Build complete. Run './start.sh prod' to start."
    ;;
  *)
    echo "Usage: $0 {dev|prod|watchdog|build}"
    echo ""
    echo "  dev      - Development server with hot reload (turbopack)"
    echo "  prod     - Production server (fast, stable)"
    echo "  watchdog - Production server with auto-restart"
    echo "  build    - Build for production"
    exit 1
    ;;
esac