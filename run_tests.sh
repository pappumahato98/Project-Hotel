#!/bin/bash
# Combined server start + test script
cd /home/z/my-project

# Start server in background
npx next start -p 3000 > /tmp/server.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Wait for server
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"x","password":"y"}' 2>/dev/null)
  if [ "$CODE" != "000" ]; then
    echo "Server ready after ${i}s (HTTP $CODE)"
    break
  fi
  sleep 1
done

# Debug: check actual login response
echo "--- DEBUG LOGIN ---"
curl -s http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@meridian.com","password":"password123"}'
echo ""
echo "--- END DEBUG ---"

# Now run the test script
bash /home/z/my-project/test_all.sh

# Cleanup
kill $SERVER_PID 2>/dev/null
echo "Server stopped"