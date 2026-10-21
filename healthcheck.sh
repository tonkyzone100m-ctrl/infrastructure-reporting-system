#!/bin/bash
cd ~/Documents/reporthub-pro
set -a; source .env; set +a
BASE=http://localhost:${PORT:-3000}
ok(){ echo "PASS  $1"; }; bad(){ echo "FAIL  $1"; }

# Database
pg_isready -q && ok "Postgres accepting connections" || bad "Postgres down"
psql "$DATABASE_URL" -tAc "select 1" >/dev/null 2>&1 && ok "DATABASE_URL works" || bad "DATABASE_URL login failed"
echo "SQL counts: reports=$(psql "$DATABASE_URL" -tAc 'select count(*) from reports') users=$(psql "$DATABASE_URL" -tAc 'select count(*) from users')"

# Server
curl -s $BASE/health | grep -q connected && ok "/health says database connected" || bad "/health not connected"

# Login (set ADMIN_PASS in your shell first, don't hardcode it)
TOKEN=$(curl -s -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d "{\"email\":\"admin@reporthub.local\",\"password\":\"$ADMIN_PASS\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).token||""' 2>/dev/null)
[ -n "$TOKEN" ] && ok "Admin login returns a token" || bad "Admin login failed (check path/password)"

# Admin endpoints
for p in overview reports users departments audit-log; do
  code=$(curl -s -o /tmp/hc.json -w '%{http_code}' -H "Authorization: Bearer $TOKEN" $BASE/api/admin/$p)
  [ "$code" = "200" ] && ok "GET /api/admin/$p" || bad "GET /api/admin/$p -> $code"
  grep -q password_hash /tmp/hc.json && bad "password_hash leaked in $p"
done

# Unauthenticated access must be blocked
code=$(curl -s -o /dev/null -w '%{http_code}' $BASE/api/admin/users)
[ "$code" = "401" ] && ok "Admin routes reject no-token requests" || bad "No-token request returned $code"
