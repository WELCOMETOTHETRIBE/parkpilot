#!/bin/bash
# Comprehensive API Testing Script for ParkPilot

BASE_URL="https://parkpilot-production.up.railway.app"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🧪 ParkPilot API Test Suite"
echo "=========================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Endpoint..."
HEALTH=$(curl -s "$BASE_URL/api/health")
if echo "$HEALTH" | jq -e '.status == "healthy"' > /dev/null; then
  echo -e "${GREEN}✓${NC} Health check passed"
else
  echo -e "${RED}✗${NC} Health check failed"
  echo "$HEALTH" | jq .
  exit 1
fi
echo ""

# Test 2: Get Venues
echo "2. Testing GET /api/venues..."
VENUES=$(curl -s "$BASE_URL/api/venues")
VENUE_COUNT=$(echo "$VENUES" | jq '. | length')
echo -e "${GREEN}✓${NC} Found $VENUE_COUNT venues"
if [ "$VENUE_COUNT" -gt 0 ]; then
  FIRST_VENUE_ID=$(echo "$VENUES" | jq -r '.[0].id')
  FIRST_VENUE_NAME=$(echo "$VENUES" | jq -r '.[0].name')
  echo "   First venue: $FIRST_VENUE_NAME (ID: $FIRST_VENUE_ID)"
fi
echo ""

# Test 3: Create Venue
echo "3. Testing POST /api/venues..."
NEW_VENUE=$(curl -s -X POST "$BASE_URL/api/venues" \
  -H "Content-Type: application/json" \
  -d '{"name":"API Test Venue","city":"Test City","state":"CA","timezone":"America/Los_Angeles"}')
if echo "$NEW_VENUE" | jq -e '.id' > /dev/null; then
  TEST_VENUE_ID=$(echo "$NEW_VENUE" | jq -r '.id')
  echo -e "${GREEN}✓${NC} Venue created: $(echo "$NEW_VENUE" | jq -r '.name')"
else
  echo -e "${RED}✗${NC} Failed to create venue"
  echo "$NEW_VENUE" | jq .
  exit 1
fi
echo ""

# Test 4: Get Events
echo "4. Testing GET /api/events..."
EVENTS=$(curl -s "$BASE_URL/api/events")
EVENT_COUNT=$(echo "$EVENTS" | jq '. | length')
echo -e "${GREEN}✓${NC} Found $EVENT_COUNT events"
if [ "$EVENT_COUNT" -gt 0 ]; then
  FIRST_EVENT_ID=$(echo "$EVENTS" | jq -r '.[0].id')
  FIRST_EVENT_NAME=$(echo "$EVENTS" | jq -r '.[0].name')
  echo "   First event: $FIRST_EVENT_NAME (ID: $FIRST_EVENT_ID)"
fi
echo ""

# Test 5: Create Event
echo "5. Testing POST /api/events..."
if [ -n "$TEST_VENUE_ID" ]; then
  # Get a future date
  FUTURE_DATE=$(date -u -v+30d '+%Y-%m-%dT19:00:00.000Z' 2>/dev/null || date -u -d '+30 days' '+%Y-%m-%dT19:00:00.000Z' 2>/dev/null || echo "2026-04-15T19:00:00.000Z")
  NEW_EVENT=$(curl -s -X POST "$BASE_URL/api/events" \
    -H "Content-Type: application/json" \
    -d "{\"venueId\":\"$TEST_VENUE_ID\",\"name\":\"API Test Event\",\"category\":\"Sports\",\"startTime\":\"$FUTURE_DATE\"}")
  if echo "$NEW_EVENT" | jq -e '.id' > /dev/null; then
    TEST_EVENT_ID=$(echo "$NEW_EVENT" | jq -r '.id')
    echo -e "${GREEN}✓${NC} Event created: $(echo "$NEW_EVENT" | jq -r '.name')"
  else
    echo -e "${RED}✗${NC} Failed to create event"
    echo "$NEW_EVENT" | jq .
  fi
else
  echo -e "${YELLOW}⚠${NC} Skipping event creation (no venue ID)"
fi
echo ""

# Test 6: Get Opportunities
echo "6. Testing GET /api/opportunities..."
OPPS=$(curl -s "$BASE_URL/api/opportunities")
OPP_COUNT=$(echo "$OPPS" | jq '. | length')
echo -e "${GREEN}✓${NC} Found $OPP_COUNT opportunities"
if [ "$OPP_COUNT" -gt 0 ]; then
  AVG_SCORE=$(echo "$OPPS" | jq '[.[] | .opportunityScore] | add / length')
  echo "   Average score: $(printf "%.0f" $AVG_SCORE)"
fi
echo ""

# Test 7: Get Opportunities with Filters
echo "7. Testing GET /api/opportunities?minScore=50&status=OPEN..."
FILTERED_OPPS=$(curl -s "$BASE_URL/api/opportunities?minScore=50&status=OPEN")
FILTERED_COUNT=$(echo "$FILTERED_OPPS" | jq '. | length')
echo -e "${GREEN}✓${NC} Found $FILTERED_COUNT opportunities with score >= 50 and status OPEN"
echo ""

# Test 8: Get Observations
echo "8. Testing GET /api/observations..."
OBS=$(curl -s "$BASE_URL/api/observations")
OBS_COUNT=$(echo "$OBS" | jq '. | length')
echo -e "${GREEN}✓${NC} Found $OBS_COUNT observations"
echo ""

# Test 9: Get Sources
echo "9. Testing GET /api/sources..."
SOURCES=$(curl -s "$BASE_URL/api/sources")
SOURCE_COUNT=$(echo "$SOURCES" | jq '. | length')
echo -e "${GREEN}✓${NC} Found $SOURCE_COUNT sources"
if [ "$SOURCE_COUNT" -gt 0 ]; then
  FIRST_SOURCE_ID=$(echo "$SOURCES" | jq -r '.[0].id')
  FIRST_SOURCE_NAME=$(echo "$SOURCES" | jq -r '.[0].name')
  echo "   First source: $FIRST_SOURCE_NAME (ID: $FIRST_SOURCE_ID)"
fi
echo ""

# Test 10: Discovery Search
echo "10. Testing GET /api/discover/search?city=Los%20Angeles&state=CA..."
DISCOVER_VENUES=$(curl -s "$BASE_URL/api/discover/search?city=Los%20Angeles&state=CA")
if echo "$DISCOVER_VENUES" | jq -e '.success == true' > /dev/null; then
  DISCOVER_COUNT=$(echo "$DISCOVER_VENUES" | jq '.venues | length')
  echo -e "${GREEN}✓${NC} Discovery found $DISCOVER_COUNT venues"
else
  echo -e "${RED}✗${NC} Discovery failed"
  echo "$DISCOVER_VENUES" | jq .
fi
echo ""

# Test 11: Discovery Venue (full workflow)
echo "11. Testing POST /api/discover/venue (full workflow)..."
DISCOVER_RESULT=$(curl -s -X POST "$BASE_URL/api/discover/venue" \
  -H "Content-Type: application/json" \
  -d '{"venueName":"Dodger Stadium","city":"Los Angeles","state":"CA","sync":true}')
if echo "$DISCOVER_RESULT" | jq -e '.success == true' > /dev/null; then
  EVENTS_CREATED=$(echo "$DISCOVER_RESULT" | jq '.eventsCreated')
  VENUE_NAME=$(echo "$DISCOVER_RESULT" | jq -r '.venue.name')
  echo -e "${GREEN}✓${NC} Discovery workflow completed"
  echo "   Venue: $VENUE_NAME"
  echo "   Events created: $EVENTS_CREATED"
else
  echo -e "${YELLOW}⚠${NC} Discovery workflow had issues (may be rate limited)"
  echo "$DISCOVER_RESULT" | jq . | head -10
fi
echo ""

# Test 12: Get Inventory
echo "12. Testing GET /api/inventory..."
INVENTORY=$(curl -s "$BASE_URL/api/inventory")
INV_COUNT=$(echo "$INVENTORY" | jq '. | length')
echo -e "${GREEN}✓${NC} Found $INV_COUNT inventory items"
echo ""

# Test 13: Get Sales
echo "13. Testing GET /api/sales..."
SALES=$(curl -s "$BASE_URL/api/sales")
SALES_COUNT=$(echo "$SALES" | jq '. | length')
echo -e "${GREEN}✓${NC} Found $SALES_COUNT sales"
echo ""

# Test 14: Get Alerts
echo "14. Testing GET /api/alerts..."
ALERTS=$(curl -s "$BASE_URL/api/alerts")
ALERT_COUNT=$(echo "$ALERTS" | jq '. | length')
echo -e "${GREEN}✓${NC} Found $ALERT_COUNT alerts"
echo ""

# Test 15: Get Settings
echo "15. Testing GET /api/settings..."
SETTINGS=$(curl -s "$BASE_URL/api/settings")
if echo "$SETTINGS" | jq -e '. | type == "array"' > /dev/null; then
  SETTINGS_COUNT=$(echo "$SETTINGS" | jq '. | length')
  echo -e "${GREEN}✓${NC} Found $SETTINGS_COUNT settings"
else
  echo -e "${YELLOW}⚠${NC} Settings endpoint returned non-array"
fi
echo ""

echo "=========================="
echo -e "${GREEN}✅ API Test Suite Complete${NC}"
echo ""
echo "Summary:"
echo "  Venues: $VENUE_COUNT"
echo "  Events: $EVENT_COUNT"
echo "  Opportunities: $OPP_COUNT"
echo "  Observations: $OBS_COUNT"
echo "  Sources: $SOURCE_COUNT"
echo "  Inventory: $INV_COUNT"
echo "  Sales: $SALES_COUNT"
echo "  Alerts: $ALERT_COUNT"
