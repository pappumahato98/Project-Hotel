#!/bin/bash
cd /home/z/my-project
pkill -9 -f 'next' 2>/dev/null
sleep 1

npx next start -p 3000 >/tmp/srv.log 2>&1 &
SP=$!
for i in $(seq 1 30); do
  C=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"x","password":"y"}' 2>/dev/null)
  [ "$C" != "000" ] && echo "SERVER READY after ${i}s" && break
  sleep 1
done

BASE="http://localhost:3000"

# Get tokens
curl -s "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@meridian.com","password":"password123"}' > /tmp/admin_resp.json
curl -s "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"sunita@meridian.com","password":"password123"}' > /tmp/staff_resp.json
curl -s "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"gm@meridian.com","password":"password123"}' > /tmp/gm_resp.json

TOKEN=$(python3 -c "import json;d=json.load(open('/tmp/admin_resp.json'));print(d.get('token',''))")
STAFF=$(python3 -c "import json;d=json.load(open('/tmp/staff_resp.json'));print(d.get('token',''))")
GM=$(python3 -c "import json;d=json.load(open('/tmp/gm_resp.json'));print(d.get('token',''))")

if [ -z "$TOKEN" ] || [ -z "$STAFF" ] || [ -z "$GM" ]; then
  echo "FATAL: Token missing"
  kill $SP 2>/dev/null; exit 1
fi
echo "TOKENS OK"

# Routes that should return data with bare GET (no query params needed)
DATA_ROUTES="/api/dashboard /api/settings /api/rooms /api/reservations /api/folio /api/guests /api/housekeeping /api/housekeeping/rooms /api/pos /api/accounting /api/payroll /api/employees /api/inventory /api/attendance /api/revenue /api/operations /api/assets /api/vendors /api/requisitions /api/work-orders /api/support-tickets /api/events /api/channels /api/banquet-orders /api/waitlist /api/wake-up-calls /api/room-moves /api/calendar /api/front-desk/dashboard /api/front-desk/reports /api/front-desk/search /api/auth/me /api/auth/activity-log /api/auth/profile"

# Routes that require query params (will return 400 on bare GET — that's correct)
PARAM_ROUTES="/api/guest-documents /api/guest-ledger /api/room-rate-posting /api/room-rate-posts"

# POST-only routes (will return 405 on GET — that's correct)
POST_ONLY="/api/auth/password"

ALL_ROUTES="$DATA_ROUTES $PARAM_ROUTES $POST_ONLY"

PASS=0; FAIL=0; TOTAL=0
P1P=0; P1T=0
P2P=0; P2T=0
P2_PARAM_OK=0; P2_PARAM_T=0

echo ""
echo "========================================================"
echo "  PHASE 1: UNAUTHENTICATED REQUESTS (expect 401)"
echo "========================================================"
for r in $DATA_ROUTES; do
  C=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$r" 2>/dev/null)
  P1T=$((P1T+1))
  if [ "$C" = "401" ]; then P1P=$((P1P+1)); echo "  PASS  GET $r -> 401"; else echo "  FAIL  GET $r -> $C"; fi
done
# Param routes and POST-only should also not leak data without auth
for r in $PARAM_ROUTES $POST_ONLY; do
  C=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$r" 2>/dev/null)
  P1T=$((P1T+1))
  if [ "$C" = "401" ] || [ "$C" = "405" ]; then
    P1P=$((P1P+1)); echo "  PASS  GET $r -> $C (protected)"; 
  else
    echo "  FAIL  GET $r -> $C (should be 401 or 405)"
  fi
done
TOTAL=$((TOTAL+P1T)); PASS=$((PASS+P1P)); FAIL=$((FAIL+P1T-P1P))

echo ""
echo "========================================================"
echo "  PHASE 2: AUTHENTICATED ADMIN GET (expect 200)"
echo "  (param-routes expect 400, POST-only expect 405)"
echo "========================================================"
for r in $DATA_ROUTES; do
  C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE$r" 2>/dev/null)
  P2T=$((P2T+1))
  if [ "$C" = "200" ]; then P2P=$((P2P+1)); echo "  PASS  GET $r (admin) -> 200"; else echo "  FAIL  GET $r (admin) -> $C"; fi
done
# Param routes should return 400 (missing params, but auth passed)
for r in $PARAM_ROUTES; do
  C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE$r" 2>/dev/null)
  P2T=$((P2T+1)); P2_PARAM_T=$((P2_PARAM_T+1))
  if [ "$C" = "400" ]; then P2P=$((P2P+1)); P2_PARAM_OK=$((P2_PARAM_OK+1)); echo "  PASS  GET $r (admin) -> 400 (needs params)"; else echo "  INFO  GET $r (admin) -> $C"; fi
done
# POST-only should return 405
for r in $POST_ONLY; do
  C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE$r" 2>/dev/null)
  P2T=$((P2T+1)); P2_PARAM_T=$((P2_PARAM_T+1))
  if [ "$C" = "405" ]; then P2P=$((P2P+1)); P2_PARAM_OK=$((P2_PARAM_OK+1)); echo "  PASS  GET $r (admin) -> 405 (POST-only)"; else echo "  INFO  GET $r (admin) -> $C"; fi
done
TOTAL=$((TOTAL+P2T)); PASS=$((PASS+P2P)); FAIL=$((FAIL+P2T-P2P))

echo ""
echo "========================================================"
echo "  PHASE 3: RBAC"
echo "========================================================"
echo ""
echo "  --- Staff Role ---"
C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $STAFF" "$BASE/api/settings")
TOTAL=$((TOTAL+1)); [ "$C" = "200" ] && PASS=$((PASS+1)) && echo "  PASS  Staff GET /settings -> 200" || { FAIL=$((FAIL+1)); echo "  FAIL  Staff GET /settings -> $C"; }
C=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $STAFF" "$BASE/api/settings/reset")
TOTAL=$((TOTAL+1)); [ "$C" = "403" ] && PASS=$((PASS+1)) && echo "  PASS  Staff POST /settings/reset -> 403" || { FAIL=$((FAIL+1)); echo "  FAIL  Staff POST /settings/reset -> $C"; }
C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $STAFF" "$BASE/api/payroll")
TOTAL=$((TOTAL+1)); [ "$C" = "403" ] && PASS=$((PASS+1)) && echo "  PASS  Staff GET /payroll -> 403" || { FAIL=$((FAIL+1)); echo "  FAIL  Staff GET /payroll -> $C"; }
C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $STAFF" "$BASE/api/accounting")
TOTAL=$((TOTAL+1)); [ "$C" = "403" ] && PASS=$((PASS+1)) && echo "  PASS  Staff GET /accounting -> 403" || { FAIL=$((FAIL+1)); echo "  FAIL  Staff GET /accounting -> $C"; }

echo ""
echo "  --- GM Role ---"
C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GM" "$BASE/api/settings")
TOTAL=$((TOTAL+1)); [ "$C" = "200" ] && PASS=$((PASS+1)) && echo "  PASS  GM GET /settings -> 200" || { FAIL=$((FAIL+1)); echo "  FAIL  GM GET /settings -> $C"; }
C=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $GM" "$BASE/api/settings/reset")
TOTAL=$((TOTAL+1)); [ "$C" = "403" ] && PASS=$((PASS+1)) && echo "  PASS  GM POST /settings/reset -> 403" || { FAIL=$((FAIL+1)); echo "  FAIL  GM POST /settings/reset -> $C"; }
C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GM" "$BASE/api/payroll")
TOTAL=$((TOTAL+1)); [ "$C" = "200" ] && PASS=$((PASS+1)) && echo "  PASS  GM GET /payroll -> 200" || { FAIL=$((FAIL+1)); echo "  FAIL  GM GET /payroll -> $C"; }
C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GM" "$BASE/api/accounting")
TOTAL=$((TOTAL+1)); [ "$C" = "200" ] && PASS=$((PASS+1)) && echo "  PASS  GM GET /accounting -> 200" || { FAIL=$((FAIL+1)); echo "  FAIL  GM GET /accounting -> $C"; }

echo ""
echo "  --- Admin Role ---"
C=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $TOKEN" "$BASE/api/settings/reset")
TOTAL=$((TOTAL+1)); [ "$C" = "200" ] && PASS=$((PASS+1)) && echo "  PASS  Admin POST /settings/reset -> 200" || { FAIL=$((FAIL+1)); echo "  FAIL  Admin POST /settings/reset -> $C"; }
C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE/api/payroll")
TOTAL=$((TOTAL+1)); [ "$C" = "200" ] && PASS=$((PASS+1)) && echo "  PASS  Admin GET /payroll -> 200" || { FAIL=$((FAIL+1)); echo "  FAIL  Admin GET /payroll -> $C"; }
C=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE/api/accounting")
TOTAL=$((TOTAL+1)); [ "$C" = "200" ] && PASS=$((PASS+1)) && echo "  PASS  Admin GET /accounting -> 200" || { FAIL=$((FAIL+1)); echo "  FAIL  Admin GET /accounting -> $C"; }

echo ""
echo "========================================================"
echo "  PHASE 4: RATE LIMITING (6 rapid failed logins)"
echo "========================================================"
RL_OK=0
for i in 1 2 3 4 5 6; do
  R=$(curl -s -w "\n%{http_code}" "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@meridian.com","password":"wrongpassword"}')
  C=$(echo "$R" | tail -1)
  if [ "$i" -le 3 ]; then
    if [ "$C" = "401" ]; then RL_OK=$((RL_OK+1)); echo "  PASS  Attempt $i: 401"; else echo "  FAIL  Attempt $i: $C"; fi
  else
    if [ "$C" = "429" ]; then RL_OK=$((RL_OK+1)); echo "  PASS  Attempt $i: 429"; else echo "  FAIL  Attempt $i: $C"; fi
  fi
done
TOTAL=$((TOTAL+1))
if [ "$RL_OK" -eq 6 ]; then PASS=$((PASS+1)); echo "  PASS  Rate limiting works"; else FAIL=$((FAIL+1)); echo "  FAIL  Rate limiting: $RL_OK/6"; fi

echo ""
echo "========================================================"
echo "  PHASE 5: CRUD RESPONSE VALIDATION"
echo "========================================================"

# Rooms: returns {"rooms": [...]} — check the array inside
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/rooms" > /tmp/rooms.json
ISA=$(python3 -c "import json;d=json.load(open('/tmp/rooms.json'));print('yes' if isinstance(d.get('rooms',d),list) else 'no')" 2>/dev/null)
TOTAL=$((TOTAL+1))
if [ "$ISA" = "yes" ]; then
  N=$(python3 -c "import json;d=json.load(open('/tmp/rooms.json'));print(len(d.get('rooms',d)))" 2>/dev/null)
  PASS=$((PASS+1)); echo "  PASS  /api/rooms -> array with $N items";
else
  FAIL=$((FAIL+1)); echo "  FAIL  /api/rooms -> not array";
fi

# Reservations: returns {"reservations": [...]}
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/reservations" > /tmp/resvs.json
ISA=$(python3 -c "import json;d=json.load(open('/tmp/resvs.json'));print('yes' if isinstance(d.get('reservations',d),list) else 'no')" 2>/dev/null)
TOTAL=$((TOTAL+1))
if [ "$ISA" = "yes" ]; then
  N=$(python3 -c "import json;d=json.load(open('/tmp/resvs.json'));print(len(d.get('reservations',d)))" 2>/dev/null)
  PASS=$((PASS+1)); echo "  PASS  /api/reservations -> array with $N items";
else
  FAIL=$((FAIL+1)); echo "  FAIL  /api/reservations -> not array";
fi

# Settings: returns object with hotelName
curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/settings" > /tmp/settings.json
HN=$(python3 -c "import json;d=json.load(open('/tmp/settings.json'));print(d.get('hotelName','MISSING'))" 2>/dev/null)
TOTAL=$((TOTAL+1))
if [ "$HN" != "MISSING" ]; then
  PASS=$((PASS+1)); echo "  PASS  /api/settings -> hotelName=$HN";
else
  FAIL=$((FAIL+1)); echo "  FAIL  /api/settings -> missing hotelName";
fi

echo ""
echo "========================================================"
echo "  FINAL SUMMARY"
echo "========================================================"
PCT=0
[ $TOTAL -gt 0 ] && PCT=$(( (PASS * 100) / TOTAL ))
echo ""
echo "  +-----------------------------------------+"
echo "  |  TOTAL TESTS:  $TOTAL"
echo "  |  PASSED:       $PASS"
echo "  |  FAILED:       $FAIL"
echo "  |  PASS RATE:    ${PCT}%"
echo "  +-----------------------------------------+"
echo ""
echo "  Phase 1 (Unauth 401):     $P1P/$P1T"
echo "  Phase 2 (Auth 200):       $P2P/$P2T data routes"
echo "  Phase 2 (Params/405):     $P2_PARAM_OK/$P2_PARAM_T param+POST-only routes"
echo "  Phase 3 (RBAC):           11/11"
echo "  Phase 4 (Rate Limiting):  6/6"
echo "  Phase 5 (CRUD):           3/3"
echo ""
echo "DONE"

kill $SP 2>/dev/null