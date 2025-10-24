#!/bin/bash
# API Testing Script for AI Provider Architecture
# Tests all AI provider endpoints with real Grok API

set -e

echo "🧪 Testing AI Provider API Endpoints"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo -e "${RED}❌ .env.local not found${NC}"
  echo "Run ./scripts/setup-env.sh first"
  exit 1
fi

# Load environment variables
source .env.local

# API base URL
BASE_URL="${API_BASE_URL:-http://localhost:3000}"

# Check if server is running
echo ""
echo "🔍 Checking if development server is running..."
if curl -s -o /dev/null "$BASE_URL" 2>/dev/null; then
  echo -e "${GREEN}✓ Server is running at $BASE_URL${NC}"
else
  echo -e "${YELLOW}⚠️  Server not detected at $BASE_URL${NC}"
  echo ""
  read -p "Start development server? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting server..."
    npm run dev &
    SERVER_PID=$!
    echo "Waiting for server to start..."
    sleep 5
  else
    echo "Please start the server manually: npm run dev"
    exit 1
  fi
fi

echo ""
echo "📋 Running API tests..."
echo ""

PASSED=0
FAILED=0

# Helper function to test endpoint
test_endpoint() {
  local name="$1"
  local method="$2"
  local endpoint="$3"
  local data="$4"

  echo -n "Testing $name... "

  HTTP_CODE=$(curl -s -o /tmp/api_response.json -w "%{http_code}" \
    -X "$method" \
    "$BASE_URL$endpoint" \
    -H "Content-Type: application/json" \
    ${data:+-d "$data"})

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
    ((PASSED++))

    # Show response preview
    if [ -f /tmp/api_response.json ]; then
      echo "  Response: $(cat /tmp/api_response.json | jq -r '.content // .message // .status' 2>/dev/null | head -c 80)..."
    fi
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
    ((FAILED++))

    # Show error message
    if [ -f /tmp/api_response.json ]; then
      echo "  Error: $(cat /tmp/api_response.json | jq -r '.error // .message' 2>/dev/null)"
    fi
  fi

  echo ""
}

# ============================================================================
# Test 1: Research Agent
# ============================================================================
test_endpoint "Research Agent" "POST" "/api/ai/research" '{
  "prompt": "Analyze the AI SaaS market landscape in 2025",
  "projectId": "test-project-123"
}'

# ============================================================================
# Test 2: Strategy Agent
# ============================================================================
test_endpoint "Strategy Agent" "POST" "/api/ai/strategy" '{
  "prompt": "Create a go-to-market strategy for an AI-powered productivity tool",
  "projectId": "test-project-123"
}'

# ============================================================================
# Test 3: Critique Agent
# ============================================================================
test_endpoint "Critique Agent" "POST" "/api/ai/critique" '{
  "prompt": "Review this brand positioning: We help teams work smarter with AI",
  "projectId": "test-project-123"
}'

# ============================================================================
# Test 4: Streaming Endpoint
# ============================================================================
echo -n "Testing Streaming Endpoint... "
STREAM_RESPONSE=$(curl -s -N \
  -X POST \
  "$BASE_URL/api/ai/stream" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Count from 1 to 5",
    "projectId": "test-project-123",
    "taskType": "research"
  }' | head -n 1)

if [ -n "$STREAM_RESPONSE" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  ((PASSED++))
  echo "  First chunk: $STREAM_RESPONSE"
else
  echo -e "${RED}✗ FAIL${NC}"
  ((FAILED++))
  echo "  No streaming response received"
fi
echo ""

# ============================================================================
# Test 5: Usage Analytics
# ============================================================================
test_endpoint "Usage Analytics" "GET" "/api/analytics/usage?projectId=test-project-123"

# ============================================================================
# Test 6: Cost Tracking
# ============================================================================
test_endpoint "Cost Tracking" "GET" "/api/analytics/cost?projectId=test-project-123"

# ============================================================================
# Test 7: Provider Health
# ============================================================================
test_endpoint "Provider Health" "GET" "/api/analytics/health"

# ============================================================================
# Summary
# ============================================================================
echo "====================================="
echo ""
TOTAL=$((PASSED + FAILED))
echo "Test Results:"
echo -e "  ${GREEN}✓ Passed: $PASSED/$TOTAL${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "  ${RED}✗ Failed: $FAILED/$TOTAL${NC}"
fi
echo ""

# Cleanup
rm -f /tmp/api_response.json

# Kill server if we started it
if [ -n "$SERVER_PID" ]; then
  echo "Stopping development server..."
  kill $SERVER_PID 2>/dev/null || true
fi

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All API tests passed!${NC}"
  echo ""
  echo "System is ready for production deployment"
  exit 0
else
  echo -e "${RED}❌ Some API tests failed${NC}"
  echo ""
  echo "Please fix the issues before deploying"
  exit 1
fi
