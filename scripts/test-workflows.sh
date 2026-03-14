#!/bin/bash
# Test End-to-End Workflows for ParkPilot

BASE_URL="https://parkpilot-production.up.railway.app"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔄 ParkPilot Workflow Test Suite"
echo "=================================="
echo ""

# Workflow 1: Discovery → Venue → Events → Parking → Opportunities
echo "Workflow 1: Full Discovery Workflow"
echo "-----------------------------------"
echo "Testing: Search venue → Discover events → Find parking → Create opportunities"
echo ""

DISCOVER_RESULT=$(curl -s -X POST "$BASE_URL/api/discover/venue" \
  -H "Content-Type: application/json" \
  -d '{"venueName":"Madison Square Garden","city":"New York","state":"NY"}')

if echo "$DISCOVER_RESULT" | jq -e '.success == true' > /dev/null; then
  VENUE_NAME=$(echo "$DISCOVER_RESULT" | jq -r '.venue.name')
  EVENTS_CREATED=$(echo "$DISCOVER_RESULT" | jq '.eventsCreated')
  echo -e "${GREEN}✓${NC} Discovery completed"
  echo "   Venue: $VENUE_NAME"
  echo "   Events created: $EVENTS_CREATED"
  
  # Check if opportunities were created
  sleep 2
  VENUE_ID=$(echo "$DISCOVER_RESULT" | jq -r '.venue.id')
  OPPORTUNITIES=$(curl -s "$BASE_URL/api/opportunities")
  OPP_COUNT=$(echo "$OPPORTUNITIES" | jq "[.[] | select(.event.venue.id == \"$VENUE_ID\")] | length")
  echo "   Opportunities created: $OPP_COUNT"
  
  if [ "$OPP_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Opportunities workflow working"
  else
    echo -e "${YELLOW}⚠${NC} No opportunities created (parking may not have prices)"
  fi
else
  echo -e "${RED}✗${NC} Discovery failed"
  echo "$DISCOVER_RESULT" | jq . | head -5
fi
echo ""

# Workflow 2: Manual Observation → Opportunity Creation
echo "Workflow 2: Manual Observation → Opportunity"
echo "--------------------------------------------"
echo "Testing: Create observation → Auto-create opportunity with scoring"
echo ""

# Get an event
EVENT=$(curl -s "$BASE_URL/api/events" | jq -r '.[0] | select(.id != null)')
if [ -n "$EVENT" ]; then
  EVENT_ID=$(echo "$EVENT" | jq -r '.id')
  EVENT_NAME=$(echo "$EVENT" | jq -r '.name')
  SOURCE_ID=$(curl -s "$BASE_URL/api/sources" | jq -r '.[0].id')
  
  echo "Using event: $EVENT_NAME"
  
  # Create observation
  OBS_DATA=$(cat <<EOF
{
  "eventId": "$EVENT_ID",
  "sourceId": "$SOURCE_ID",
  "observedAt": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "rawPriceText": "\$35.00",
  "normalizedPrice": 35.00,
  "currency": "USD",
  "pageUrl": "https://example.com/test-parking",
  "extractionMethod": "MANUAL"
}
EOF
)
  
  OBS_RESULT=$(curl -s -X POST "$BASE_URL/api/observations" \
    -H "Content-Type: application/json" \
    -d "$OBS_DATA")
  
  if echo "$OBS_RESULT" | jq -e '.id' > /dev/null; then
    OBS_ID=$(echo "$OBS_RESULT" | jq -r '.id')
    echo -e "${GREEN}✓${NC} Observation created (ID: $OBS_ID)"
    
    # Check if opportunity was created
    sleep 1
    OPPORTUNITIES=$(curl -s "$BASE_URL/api/opportunities")
    OPP=$(echo "$OPPORTUNITIES" | jq "[.[] | select(.latestObservationId == \"$OBS_ID\")] | .[0]")
    
    if [ "$OPP" != "null" ] && [ -n "$OPP" ]; then
      OPP_SCORE=$(echo "$OPP" | jq -r '.opportunityScore')
      OPP_PROFIT=$(echo "$OPP" | jq -r '.projectedProfit')
      echo -e "${GREEN}✓${NC} Opportunity auto-created"
      echo "   Score: $OPP_SCORE"
      echo "   Projected Profit: \$$OPP_PROFIT"
    else
      echo -e "${YELLOW}⚠${NC} Opportunity not found (may need parking product)"
    fi
  else
    echo -e "${RED}✗${NC} Failed to create observation"
    echo "$OBS_RESULT" | jq . | head -5
  fi
else
  echo -e "${YELLOW}⚠${NC} No events available for testing"
fi
echo ""

# Workflow 3: Opportunity Filtering
echo "Workflow 3: Opportunity Filtering"
echo "---------------------------------"
echo "Testing: Filter opportunities by score, status, venue"
echo ""

# Test various filters
HIGH_SCORE=$(curl -s "$BASE_URL/api/opportunities?minScore=100" | jq '. | length')
OPEN_OPPS=$(curl -s "$BASE_URL/api/opportunities?status=OPEN" | jq '. | length')
ALL_OPPS=$(curl -s "$BASE_URL/api/opportunities" | jq '. | length')

echo -e "${GREEN}✓${NC} Total opportunities: $ALL_OPPS"
echo -e "${GREEN}✓${NC} Open opportunities: $OPEN_OPPS"
echo -e "${GREEN}✓${NC} High score (>=100): $HIGH_SCORE"
echo ""

# Workflow 4: Data Relationships
echo "Workflow 4: Data Relationships"
echo "-------------------------------"
echo "Testing: Verify relationships between entities"
echo ""

VENUES=$(curl -s "$BASE_URL/api/venues")
EVENTS=$(curl -s "$BASE_URL/api/events")
OPPORTUNITIES=$(curl -s "$BASE_URL/api/opportunities")

VENUE_COUNT=$(echo "$VENUES" | jq '. | length')
EVENT_COUNT=$(echo "$EVENTS" | jq '. | length')
OPP_COUNT=$(echo "$OPPORTUNITIES" | jq '. | length')

# Check events have venues
EVENTS_WITH_VENUES=$(echo "$EVENTS" | jq '[.[] | select(.venue != null)] | length')
# Check opportunities have events
OPPS_WITH_EVENTS=$(echo "$OPPORTUNITIES" | jq '[.[] | select(.event != null)] | length')

echo -e "${GREEN}✓${NC} Venues: $VENUE_COUNT"
echo -e "${GREEN}✓${NC} Events: $EVENT_COUNT ($EVENTS_WITH_VENUES with venue data)"
echo -e "${GREEN}✓${NC} Opportunities: $OPP_COUNT ($OPPS_WITH_EVENTS with event data)"

if [ "$EVENTS_WITH_VENUES" -eq "$EVENT_COUNT" ] && [ "$OPPS_WITH_EVENTS" -eq "$OPP_COUNT" ]; then
  echo -e "${GREEN}✓${NC} All relationships intact"
else
  echo -e "${YELLOW}⚠${NC} Some relationships may be missing"
fi
echo ""

echo "=================================="
echo -e "${GREEN}✅ Workflow Test Suite Complete${NC}"
