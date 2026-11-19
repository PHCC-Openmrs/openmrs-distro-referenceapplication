#!/usr/bin/env bash
# Warm up the OpenMRS backend after a deploy or restart, before staff start using it.
#
# A freshly started JVM interprets code until its JIT compiler has compiled the hot paths. Until
# then every screen costs 2-10x more CPU than it does later (measured: patient search 13 s of CPU
# cold vs 6.7 s warm; stock overview 2.7 s vs 0.27 s), so the first users of the day hit a slow,
# saturated server. This script sends the read-only requests behind the main screens a few times
# so that compilation happens now instead.
#
# Read-only: GET requests only. Safe to run against production.
#
# Usage:
#   WARMUP_USER=admin WARMUP_PASSWORD=... ops/warmup-backend.sh [base-url] [location-uuid]
#   base-url defaults to http://localhost/openmrs; location-uuid is the clinic's session location
#   (used for the queue and stock requests; skipped when empty).
set -euo pipefail

BASE="${1:-http://localhost/openmrs}"
LOCATION="${2:-}"
ROUNDS="${WARMUP_ROUNDS:-15}"
: "${WARMUP_USER:?set WARMUP_USER}"
: "${WARMUP_PASSWORD:?set WARMUP_PASSWORD}"
REST="$BASE/ws/rest/v1"
FHIR="$BASE/ws/fhir2/R4"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

echo "Waiting for $BASE to answer..."
for _ in $(seq 1 120); do
  if curl -fsS -o /dev/null -u "$WARMUP_USER:$WARMUP_PASSWORD" -c "$JAR" "$REST/session"; then break; fi
  sleep 5
done
curl -fsS -o /dev/null -c "$JAR" -b "$JAR" -u "$WARMUP_USER:$WARMUP_PASSWORD" "$REST/session" ||
  { echo "Backend did not answer with a session; giving up." >&2; exit 1; }

today="$(date -u +%Y-%m-%dT00:00:00.000Z)"
month_ago="$(date -u -d '30 days ago' +%Y-%m-%d 2>/dev/null || date -u -v-30d +%Y-%m-%d)"
today_d="$(date -u +%Y-%m-%d)"

urls=(
  "$REST/session"
  "$REST/patient?q=a&v=custom:(uuid,display,identifiers,person:(gender,age,birthdate,personName,addresses,display,dead,deathDate),attributes:(value,attributeType:(uuid,display)))&limit=50&totalCount=true"
  "$REST/visit?includeInactive=false&v=custom:(uuid,startDatetime,stopDatetime,patient:(uuid,display),visitType:(uuid,display),location:(uuid,display),encounters:(uuid,encounterDatetime,encounterType:(uuid,display)))&limit=50"
  "$REST/queue-entry?v=custom:(uuid,display,queue:(uuid,name),status:(uuid,display),priority:(uuid,display),patient:(uuid,display,person:(uuid,display,age,gender),identifiers:(uuid,identifier)),visit:(uuid,startDatetime),startedAt,endedAt,sortWeight)&startedOnOrAfter=$today&limit=100&totalCount=true"
  "$REST/queue?v=full"
  "$REST/obs?v=default&limit=50"
  "$REST/concept?q=a&v=default&limit=50"
  "$REST/encountertype?v=default"
  "$REST/location?v=default&limit=100"
  "$REST/order?v=default&limit=50"
  "$FHIR/Patient?_count=20"
  "$FHIR/Observation?_count=50"
  "$FHIR/Condition?_count=50"
  "$REST/stockmanagement/stockitem?v=default&limit=100"
  "$REST/stockmanagement/stockoperation?v=default&limit=100"
  "$BASE/module/labtestreport/api/notifications.json"
  "$BASE/module/labtestreport/api/encounters.json?startDate=$month_ago&endDate=$today_d"
)
if [ -n "$LOCATION" ]; then
  urls+=(
    "$REST/stockmanagement/dashboardsummary?locationUuid=$LOCATION"
    "$REST/queue-entry?v=default&location=$LOCATION&isEnded=false&limit=100"
  )
fi

start=$(date +%s)
for round in $(seq 1 "$ROUNDS"); do
  for u in "${urls[@]}"; do
    # Ignore individual failures (a module may be absent); the point is exercising the code paths.
    curl -sS -o /dev/null -b "$JAR" -w '' "$u" &
  done
  wait
  printf '\rround %d/%d' "$round" "$ROUNDS"
done
echo
echo "Warm-up done in $(( $(date +%s) - start )) s (${#urls[@]} requests x $ROUNDS rounds)."
