#!/bin/bash
# API Endpoint Testing Script
# Agent 4: Backend API Developer
#
# Usage: ./curl-test-commands.sh
# Make sure to set environment variables first:
#   export API_URL="http://localhost:3000"
#   export SUPABASE_TOKEN="your-auth-token"
#   export PROJECT_ID="test-project-uuid"

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
SUPABASE_TOKEN="${SUPABASE_TOKEN:-}"
PROJECT_ID="${PROJECT_ID:-}"

echo -e "${GREEN}=== API Endpoint Testing ===${NC}"
echo "API URL: $API_URL"
echo ""

# Check if required env vars are set
if [ -z "$SUPABASE_TOKEN" ]; then
  echo -e "${RED}Error: SUPABASE_TOKEN not set${NC}"
  echo "Set it with: export SUPABASE_TOKEN='your-token'"
  exit 1
fi

if [ -z "$PROJECT_ID" ]; then
  echo -e "${YELLOW}Warning: PROJECT_ID not set, using test-project-id${NC}"
  PROJECT_ID="test-project-id"
fi

echo ""

# Helper function for testing endpoints
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4

  echo -e "${GREEN}Testing: $name${NC}"
  echo "URL: $method $API_URL$endpoint"
  echo ""

  if [ "$method" = "GET" ]; then
    curl -s -w "\nHTTP Status: %{http_code}\n" \
      -H "Authorization: Bearer $SUPABASE_TOKEN" \
      "$API_URL$endpoint"
  else
    curl -s -w "\nHTTP Status: %{http_code}\n" \
      -X "$method" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $SUPABASE_TOKEN" \
      -d "$data" \
      "$API_URL$endpoint"
  fi

  echo ""
  echo "---"
  echo ""
}

# 1. Test Research Endpoint
test_endpoint \
  "Research Endpoint" \
  "POST" \
  "/api/ai/research" \
  '{
    "projectId": "'"$PROJECT_ID"'",
    "brief": "Launch a sustainable fashion brand targeting Gen Z consumers in urban areas. Focus on circular economy principles and affordable pricing."
  }'

# 2. Test Strategy Endpoint
test_endpoint \
  "Strategy Endpoint" \
  "POST" \
  "/api/ai/strategy" \
  '{
    "projectId": "'"$PROJECT_ID"'",
    "researchData": "Target Audience: Gen Z, ages 18-25, urban areas, eco-conscious. Competitors: Patagonia, Reformation, Everlane. Market Size: $25B sustainable fashion market. Trends: Circular economy, rental models, transparency."
  }'

# 3. Test Critique Endpoint
test_endpoint \
  "Critique Endpoint" \
  "POST" \
  "/api/ai/critique" \
  '{
    "projectId": "'"$PROJECT_ID"'",
    "strategyData": "Strategic Positioning: Leader in affordable sustainable fashion for Gen Z. Messaging: Sustainability meets style. Target Channels: Instagram, TikTok, sustainable fashion marketplaces. KPIs: 10K followers, 500 orders in Q1."
  }'

# 4. Test Streaming Endpoint (basic check)
echo -e "${GREEN}Testing: Streaming Endpoint${NC}"
echo "URL: POST $API_URL/api/ai/stream"
echo ""
echo "Starting stream (will show first 10 lines)..."
echo ""

curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $SUPABASE_TOKEN" \
  -N \
  --max-time 30 \
  -d '{
    "projectId": "'"$PROJECT_ID"'",
    "task": "research",
    "prompt": "Analyze the sustainable fashion market",
    "systemPrompt": "You are a brand researcher"
  }' \
  "$API_URL/api/ai/stream" | head -n 10

echo ""
echo "(Stream truncated)"
echo "---"
echo ""

# 5. Test Analytics Endpoint
test_endpoint \
  "Analytics - 24h" \
  "GET" \
  "/api/analytics/usage?timeframe=24h"

test_endpoint \
  "Analytics - 7d" \
  "GET" \
  "/api/analytics/usage?timeframe=7d"

test_endpoint \
  "Analytics - Per Project" \
  "GET" \
  "/api/analytics/usage?timeframe=7d&projectId=$PROJECT_ID"

# 6. Test Error Cases
echo -e "${YELLOW}Testing Error Cases:${NC}"
echo ""

# Missing required field
test_endpoint \
  "Missing Brief (should return 400)" \
  "POST" \
  "/api/ai/research" \
  '{
    "projectId": "'"$PROJECT_ID"'"
  }'

# Invalid timeframe
test_endpoint \
  "Invalid Timeframe (should return 400)" \
  "GET" \
  "/api/analytics/usage?timeframe=invalid"

# Unauthorized request (no token)
echo -e "${GREEN}Testing: Unauthorized Request${NC}"
echo "URL: POST $API_URL/api/ai/research"
echo ""
curl -s -w "\nHTTP Status: %{http_code}\n" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "'"$PROJECT_ID"'",
    "brief": "Test"
  }' \
  "$API_URL/api/ai/research"
echo ""
echo "---"
echo ""

# Summary
echo -e "${GREEN}=== Test Summary ===${NC}"
echo ""
echo "✅ Research endpoint tested"
echo "✅ Strategy endpoint tested"
echo "✅ Critique endpoint tested"
echo "✅ Streaming endpoint tested"
echo "✅ Analytics endpoint tested"
echo "✅ Error cases tested"
echo ""
echo -e "${YELLOW}Note: Some endpoints may return 500 errors if Agent 3's provider implementations are not complete yet.${NC}"
echo ""
