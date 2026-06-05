#!/bin/bash
# Self-healing dev server with browser verification
cd /home/z/my-project
rm -rf .next

# Start server in background with auto-restart
(
  while true; do
    npx next dev -p 3000 -H 0.0.0.0 2>&1 &
    SERVER_PID=$!
    echo "Server PID: $SERVER_PID"
    
    # Wait for server to be ready
    for i in $(seq 1 30); do
      if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200"; then
        echo "Server ready after ${i}s"
        
        # Run browser verification
        agent-browser open http://localhost:3000 2>&1
        sleep 5
        
        # Login
        agent-browser snapshot -i 2>&1 > /tmp/snap1.txt
        EMAIL_REF=$(grep "Email Address" /tmp/snap1.txt | grep -oP '\[ref=e\d+\]' | grep -oP '\d+')
        PASS_REF=$(grep "Password" /tmp/snap1.txt | grep -oP '\[ref=e\d+\]' | grep -oP '\d+' | tail -1)
        SIGN_REF=$(grep "Sign In" /tmp/snap1.txt | grep -oP '\[ref=e\d+\]' | grep -oP '\d+')
        
        echo "Email ref: e${EMAIL_REF}, Pass ref: e${PASS_REF}, Sign ref: e${SIGN_REF}"
        
        agent-browser fill "@e${EMAIL_REF}" "admin@meridian.com" 2>&1
        sleep 1
        agent-browser fill "@e${PASS_REF}" "password123" 2>&1
        sleep 1
        agent-browser click "@e${SIGN_REF}" 2>&1
        sleep 8
        
        # Check dashboard
        agent-browser snapshot -i 2>&1 > /tmp/snap2.txt
        echo "=== DASHBOARD SNAPSHOT ==="
        head -30 /tmp/snap2.txt
        
        # Take screenshot
        agent-browser screenshot /tmp/verified-dashboard.png 2>&1
        
        # Navigate to Settings
        SETTINGS_REF=$(grep '"Settings"' /tmp/snap2.txt | grep -oP '\[ref=e\d+\]' | grep -oP '\d+')
        if [ -n "$SETTINGS_REF" ]; then
          agent-browser click "@e${SETTINGS_REF}" 2>&1
          sleep 3
          agent-browser snapshot -i 2>&1 > /tmp/snap3.txt
          echo "=== SETTINGS SNAPSHOT ==="
          head -50 /tmp/snap3.txt
          agent-browser screenshot /tmp/verified-settings.png 2>&1
        fi
        
        agent-browser close 2>&1
        echo "=== VERIFICATION COMPLETE ==="
        exit 0
      fi
      sleep 1
    done
    
    echo "Server failed to start, waiting..."
    kill $SERVER_PID 2>/dev/null
    sleep 3
  done
) 2>&1 | tee /tmp/verify-output.log
