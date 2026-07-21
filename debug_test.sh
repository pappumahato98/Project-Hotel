#!/bin/bash
cd /home/z/my-project
pkill -9 -f 'next' 2>/dev/null
sleep 1

npx next start -p 3000 >/tmp/srv.log 2>&1 &
SP=$!
for i in $(seq 1 30); do
  C=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"x","password":"y"}' 2>/dev/null)
  [ "$C" != "000" ] && echo "READY after ${i}s" && break
  sleep 1
done

BASE="http://localhost:3000"

# Get admin token
curl -s "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@meridian.com","password":"password123"}' > /tmp/admin_resp.json
TOKEN=$(python3 -c "import json;d=json.load(open('/tmp/admin_resp.json'));print(d.get('token',''))")
echo "TOKEN: ${TOKEN:0:15}..."

echo ""
echo "=== INVESTIGATING FAILURES ==="

echo ""
echo "--- /api/auth/password GET (expect 405, correct for POST-only route) ---"
curl -s -w "\nHTTP_CODE: %{http_code}\n" "$BASE/api/auth/password" -H "Authorization: Bearer $TOKEN"

echo ""
echo "--- /api/work-orders GET admin ---"
curl -s -w "\nHTTP_CODE: %{http_code}\n" "$BASE/api/work-orders" -H "Authorization: Bearer $TOKEN" | tail -5

echo ""
echo "--- /api/guest-documents GET admin ---"
curl -s -w "\nHTTP_CODE: %{http_code}\n" "$BASE/api/guest-documents" -H "Authorization: Bearer $TOKEN" | tail -5

echo ""
echo "--- /api/guest-ledger GET admin ---"
curl -s -w "\nHTTP_CODE: %{http_code}\n" "$BASE/api/guest-ledger" -H "Authorization: Bearer $TOKEN" | tail -5

echo ""
echo "--- /api/room-rate-posting GET admin ---"
curl -s -w "\nHTTP_CODE: %{http_code}\n" "$BASE/api/room-rate-posting" -H "Authorization: Bearer $TOKEN" | tail -5

echo ""
echo "--- /api/room-rate-posts GET admin ---"
curl -s -w "\nHTTP_CODE: %{http_code}\n" "$BASE/api/room-rate-posts" -H "Authorization: Bearer $TOKEN" | tail -5

echo ""
echo "--- /api/rooms GET admin (first 500 chars) ---"
curl -s -w "\nHTTP_CODE: %{http_code}\n" "$BASE/api/rooms" -H "Authorization: Bearer $TOKEN" | head -c 500

echo ""
echo "--- /api/reservations GET admin (first 500 chars) ---"
curl -s -w "\nHTTP_CODE: %{http_code}\n" "$BASE/api/reservations" -H "Authorization: Bearer $TOKEN" | head -c 500

echo ""
echo "=== RATE LIMITING RAW ==="
for i in 1 2 3 4 5 6; do
  RESP=$(curl -s -w "\nHTTP:%{http_code}" "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@meridian.com","password":"wrongpassword"}')
  echo "Attempt $i: $(echo "$RESP" | tail -1)  body=$(echo "$RESP" | head -1 | head -c 100)"
done

kill $SP 2>/dev/null
echo ""
echo "DONE"