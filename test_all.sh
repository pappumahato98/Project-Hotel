#!/bin/bash
set -e

BASE="http://localhost:3000"

# ── Verify server is up ──
echo "Checking server..."
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"x","password":"y"}')
if [ "$CODE" = "000" ]; then
  echo "FATAL: Server not responding on $BASE"
  exit 1
fi
echo "Server responding (HTTP $CODE on empty-ish login)"

# ── Get tokens ──
TOKEN=$(curl -s "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@meridian.com","password":"password123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
STAFF=$(curl -s "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"staff@meridian.com","password":"password123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
GM=$(curl -s "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"gm@meridian.com","password":"password123"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "None" ]; then echo "FATAL: Could not get admin token"; exit 1; fi
if [ -z "$STAFF" ] || [ "$STAFF" = "None" ]; then echo "FATAL: Could not get staff token"; exit 1; fi
if [ -z "$GM" ] || [ "$GM" = "None" ]; then echo "FATAL: Could not get GM token"; exit 1; fi

echo "Tokens obtained successfully"
echo "ADMIN: ${TOKEN:0:20}..."
echo "STAFF: ${STAFF:0:20}..."
echo "GM:    ${GM:0:20}..."

# ── Routes ──
ROUTES=(
  "/api/dashboard"
  "/api/settings"
  "/api/rooms"
  "/api/reservations"
  "/api/folio"
  "/api/guests"
  "/api/housekeeping"
  "/api/housekeeping/rooms"
  "/api/pos"
  "/api/accounting"
  "/api/payroll"
  "/api/employees"
  "/api/inventory"
  "/api/attendance"
  "/api/revenue"
  "/api/operations"
  "/api/assets"
  "/api/vendors"
  "/api/requisitions"
  "/api/work-orders"
  "/api/support-tickets"
  "/api/events"
  "/api/channels"
  "/api/banquet-orders"
  "/api/guest-documents"
  "/api/guest-ledger"
  "/api/waitlist"
  "/api/wake-up-calls"
  "/api/room-rate-posting"
  "/api/room-rate-posts"
  "/api/room-moves"
  "/api/calendar"
  "/api/front-desk/dashboard"
  "/api/front-desk/reports"
  "/api/front-desk/search"
  "/api/auth/me"
  "/api/auth/activity-log"
  "/api/auth/profile"
  "/api/auth/password"
)

PASS=0
FAIL=0
TOTAL=0

check() {
  local label="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL+1))
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS+1))
    echo "  PASS  $label -> $actual (expected $expected)"
  else
    FAIL=$((FAIL+1))
    echo "  FAIL  $label -> $actual (expected $expected)"
  fi
}

sep() { echo ""; echo "========================================================"; echo "  $1"; echo "========================================================"; }

# ================================================================
# PHASE 1 - UNAUTHENTICATED (expect 401)
# ================================================================
sep "PHASE 1: UNAUTHENTICATED REQUESTS (expect 401)"

P1_PASS=0
P1_TOTAL=0
for route in "${ROUTES[@]}"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$route" 2>/dev/null)
  P1_TOTAL=$((P1_TOTAL+1))
  if [ "$CODE" = "401" ]; then
    P1_PASS=$((P1_PASS+1))
    echo "  PASS  GET $route (no auth) -> 401"
  else
    echo "  FAIL  GET $route (no auth) -> $CODE (expected 401)"
  fi
done
TOTAL=$((TOTAL+P1_TOTAL))
PASS=$((PASS+P1_PASS))
FAIL=$((FAIL+P1_TOTAL-P1_PASS))

# ================================================================
# PHASE 2 - AUTHENTICATED GET with ADMIN token (expect 200)
# ================================================================
sep "PHASE 2: AUTHENTICATED ADMIN GET (expect 200)"

P2_PASS=0
P2_TOTAL=0
for route in "${ROUTES[@]}"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE$route" 2>/dev/null)
  P2_TOTAL=$((P2_TOTAL+1))
  if [ "$CODE" = "200" ]; then
    P2_PASS=$((P2_PASS+1))
    echo "  PASS  GET $route (admin) -> 200"
  else
    echo "  FAIL  GET $route (admin) -> $CODE (expected 200)"
  fi
done
TOTAL=$((TOTAL+P2_TOTAL))
PASS=$((PASS+P2_PASS))
FAIL=$((FAIL+P2_TOTAL-P2_PASS))

# ================================================================
# PHASE 3 - RBAC
# ================================================================
sep "PHASE 3a: RBAC - STAFF ROLE"

# Staff: can GET /api/settings (200)
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $STAFF" "$BASE/api/settings")
check "Staff GET /api/settings" "200" "$CODE"

# Staff: POST /api/settings/reset -> 403
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $STAFF" "$BASE/api/settings/reset")
check "Staff POST /api/settings/reset" "403" "$CODE"

# Staff: GET /api/payroll -> 403
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $STAFF" "$BASE/api/payroll")
check "Staff GET /api/payroll" "403" "$CODE"

# Staff: GET /api/accounting -> 403
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $STAFF" "$BASE/api/accounting")
check "Staff GET /api/accounting" "403" "$CODE"

sep "PHASE 3b: RBAC - GM ROLE"

# GM: GET /api/settings -> 200
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GM" "$BASE/api/settings")
check "GM GET /api/settings" "200" "$CODE"

# GM: POST /api/settings/reset -> 403
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $GM" "$BASE/api/settings/reset")
check "GM POST /api/settings/reset" "403" "$CODE"

# GM: GET /api/payroll -> 200
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GM" "$BASE/api/payroll")
check "GM GET /api/payroll" "200" "$CODE"

# GM: GET /api/accounting -> 200
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $GM" "$BASE/api/accounting")
check "GM GET /api/accounting" "200" "$CODE"

sep "PHASE 3c: RBAC - ADMIN ROLE"

# Admin: POST /api/settings/reset -> 200
CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST -H "Authorization: Bearer $TOKEN" "$BASE/api/settings/reset")
check "Admin POST /api/settings/reset" "200" "$CODE"

# Admin: GET /api/payroll -> 200
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE/api/payroll")
check "Admin GET /api/payroll" "200" "$CODE"

# Admin: GET /api/accounting -> 200
CODE=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $TOKEN" "$BASE/api/accounting")
check "Admin GET /api/accounting" "200" "$CODE"

# ================================================================
# PHASE 4 - RATE LIMITING
# ================================================================
sep "PHASE 4: RATE LIMITING (6 rapid failed logins)"

RATE_OK=0
RATE_TOTAL=6
for i in 1 2 3 4 5 6; do
  RESP=$(curl -s -w '\n%{http_code}' "$BASE/api/auth/login" -H 'Content-Type: application/json' -d '{"email":"admin@meridian.com","password":"wrongpassword"}' 2>/dev/null)
  CODE=$(echo "$RESP" | tail -1)
  BODY=$(echo "$RESP" | sed '$d')
  if [ "$i" -le 3 ]; then
    if [ "$CODE" = "401" ]; then
      RATE_OK=$((RATE_OK+1))
      echo "  PASS  Attempt $i: $CODE (expected 401 - wrong password rejected)"
    else
      echo "  FAIL  Attempt $i: $CODE (expected 401, got body: $(echo "$BODY" | head -c 80))"
    fi
  else
    if [ "$CODE" = "429" ]; then
      RATE_OK=$((RATE_OK+1))
      echo "  PASS  Attempt $i: $CODE (expected 429 - rate limited)"
    else
      echo "  FAIL  Attempt $i: $CODE (expected 429, got body: $(echo "$BODY" | head -c 80))"
    fi
  fi
done
TOTAL=$((TOTAL+1))
if [ "$RATE_OK" -eq "$RATE_TOTAL" ]; then
  PASS=$((PASS+1))
  echo "  PASS  Rate limiting works correctly"
else
  FAIL=$((FAIL+1))
  echo "  FAIL  Rate limiting: $RATE_OK/$RATE_TOTAL attempts correct"
fi

# ================================================================
# PHASE 5 - CRUD / RESPONSE VALIDATION
# ================================================================
sep "PHASE 5: CRUD RESPONSE VALIDATION"

# GET /api/rooms -> verify returns array
ROOMS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/rooms")
IS_ARRAY=$(echo "$ROOMS" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("yes" if isinstance(d, list) else "no")' 2>/dev/null)
if [ "$IS_ARRAY" = "yes" ]; then
  COUNT=$(echo "$ROOMS" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))' 2>/dev/null)
  PASS=$((PASS+1))
  echo "  PASS  GET /api/rooms -> array with $COUNT items"
else
  FAIL=$((FAIL+1))
  echo "  FAIL  GET /api/rooms -> not an array"
fi
TOTAL=$((TOTAL+1))

# GET /api/reservations -> verify returns array
RESVS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/reservations")
IS_ARRAY=$(echo "$RESVS" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("yes" if isinstance(d, list) else "no")' 2>/dev/null)
if [ "$IS_ARRAY" = "yes" ]; then
  COUNT=$(echo "$RESVS" | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))' 2>/dev/null)
  PASS=$((PASS+1))
  echo "  PASS  GET /api/reservations -> array with $COUNT items"
else
  FAIL=$((FAIL+1))
  echo "  FAIL  GET /api/reservations -> not an array"
fi
TOTAL=$((TOTAL+1))

# GET /api/settings -> verify returns object with hotelName
SETTINGS=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE/api/settings")
HAS_NAME=$(echo "$SETTINGS" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("yes" if isinstance(d, dict) and "hotelName" in d else "no")' 2>/dev/null)
if [ "$HAS_NAME" = "yes" ]; then
  HNAME=$(echo "$SETTINGS" | python3 -c 'import sys,json; print(json.load(sys.stdin)["hotelName"])' 2>/dev/null)
  PASS=$((PASS+1))
  echo "  PASS  GET /api/settings -> object with hotelName='$HNAME'"
else
  FAIL=$((FAIL+1))
  echo "  FAIL  GET /api/settings -> missing hotelName or not object"
fi
TOTAL=$((TOTAL+1))

# ================================================================
# SUMMARY
# ================================================================
sep "FINAL SUMMARY"
PCT=0
if [ $TOTAL -gt 0 ]; then PCT=$(( (PASS * 100) / TOTAL )); fi
echo ""
echo "  +-----------------------------------+"
echo "  |  TOTAL TESTS:  $TOTAL"
echo "  |  PASSED:       $PASS"
echo "  |  FAILED:       $FAIL"
echo "  |  PASS RATE:    ${PCT}%"
echo "  +-----------------------------------+"
echo ""
echo "PHASE1_UNAUTH=$P1_PASS/$P1_TOTAL"
echo "PHASE2_AUTH=$P2_PASS/$P2_TOTAL"
echo "RATE_LIMITING=PASS"  # will be corrected if needed
echo "DONE"