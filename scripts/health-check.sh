#!/bin/bash
# Health Check Script for AI Provider Architecture
# Verifies all systems are operational before deployment

set -e

echo "🏥 AI Provider Architecture - Health Check"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0

# Helper function to check status
check_status() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}"
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}"
    ((ERRORS++))
    return 1
  fi
}

echo ""
echo "📋 Running health checks..."
echo ""

# ============================================================================
# 1. Environment Variables
# ============================================================================
echo -n "1. Environment Variables... "
if [ -f .env.local ]; then
  source .env.local

  if [ -n "$XAI_API_KEY" ] || [ -n "$GROK_API_KEY" ]; then
    if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ] && [ -n "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
      check_status 0
    else
      check_status 1
      echo "  Missing Supabase configuration"
    fi
  else
    check_status 1
    echo "  Missing Grok API key"
  fi
else
  check_status 1
  echo "  .env.local not found. Run: ./scripts/setup-env.sh"
fi

# ============================================================================
# 2. Node Modules
# ============================================================================
echo -n "2. Node Modules... "
if [ -d "node_modules" ]; then
  check_status 0
else
  check_status 1
  echo "  Run: npm install"
fi

# ============================================================================
# 3. TypeScript Build
# ============================================================================
echo -n "3. TypeScript Build... "
if npm run build:types &> /dev/null; then
  check_status 0
else
  check_status 1
  echo "  Run: npm run build to see errors"
fi

# ============================================================================
# 4. Tests
# ============================================================================
echo -n "4. Unit Tests... "
if npm test -- --silent &> /dev/null; then
  check_status 0
else
  check_status 1
  echo "  Run: npm test to see failures"
fi

# ============================================================================
# 5. Database Connection
# ============================================================================
echo -n "5. Database Connection... "
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  # Try to ping Supabase
  if curl -s -o /dev/null -w "%{http_code}" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" | grep -q "200\|401"; then
    check_status 0
  else
    check_status 1
    echo "  Cannot reach Supabase at $NEXT_PUBLIC_SUPABASE_URL"
  fi
else
  check_status 1
  echo "  NEXT_PUBLIC_SUPABASE_URL not set"
fi

# ============================================================================
# 6. Database Tables
# ============================================================================
echo -n "6. Database Tables... "
if command -v supabase &> /dev/null; then
  # Check if tables exist
  TABLES_EXIST=true
  for table in projects llm_usage_logs quality_scores provider_health; do
    if ! supabase db query "SELECT 1 FROM $table LIMIT 1" &> /dev/null; then
      TABLES_EXIST=false
      break
    fi
  done

  if [ "$TABLES_EXIST" = true ]; then
    check_status 0
  else
    check_status 1
    echo "  Run: ./scripts/deploy-db.sh"
  fi
else
  echo -e "${YELLOW}⚠ SKIP${NC} (Supabase CLI not installed)"
fi

# ============================================================================
# 7. Grok API Connectivity
# ============================================================================
echo -n "7. Grok API Connectivity... "
if [ -n "$XAI_API_KEY" ] || [ -n "$GROK_API_KEY" ]; then
  API_KEY="${XAI_API_KEY:-$GROK_API_KEY}"

  # Test Grok API with a simple request
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "https://api.x.ai/v1/chat/completions" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"grok-2-latest","messages":[{"role":"user","content":"test"}],"max_tokens":1}')

  if [ "$HTTP_CODE" = "200" ]; then
    check_status 0
  elif [ "$HTTP_CODE" = "401" ]; then
    check_status 1
    echo "  Invalid API key"
  elif [ "$HTTP_CODE" = "429" ]; then
    check_status 1
    echo "  Rate limited"
  else
    check_status 1
    echo "  HTTP $HTTP_CODE"
  fi
else
  check_status 1
  echo "  No API key configured"
fi

# ============================================================================
# 8. Port Availability
# ============================================================================
echo -n "8. Port 3000 Availability... "
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
  check_status 1
  echo "  Port 3000 is in use. Stop existing server first."
else
  check_status 0
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "=========================================="

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ All health checks passed!${NC}"
  echo ""
  echo "🚀 System is ready for deployment"
  echo ""
  echo "Next steps:"
  echo "  • Start dev server: npm run dev"
  echo "  • Run API tests: ./scripts/test-api.sh"
  echo "  • Deploy to Vercel: vercel"
  exit 0
else
  echo -e "${RED}❌ $ERRORS health check(s) failed${NC}"
  echo ""
  echo "Please fix the issues above before deploying"
  exit 1
fi
