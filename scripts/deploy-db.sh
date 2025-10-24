#!/bin/bash
# Database Deployment Script for AI Provider Architecture
# Deploys Supabase migrations for AI provider tables

set -e

echo "🗄️  Deploying AI Provider Database Schema"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo -e "${RED}❌ .env.local not found${NC}"
  echo "Run ./scripts/setup-env.sh first"
  exit 1
fi

# Load environment variables
source .env.local

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo -e "${YELLOW}⚠️  Supabase CLI not found${NC}"
  echo "Install with: npm install -g supabase"
  echo ""
  echo "Continuing with manual migration instructions..."
  MANUAL_MODE=1
fi

echo ""
echo "📋 Migration files to deploy (in order):"
echo "  1. supabase/migrations/000_base_schema.sql       (projects, outputs, inputs)"
echo "  2. supabase/migrations/001_ai_provider_schema.sql (AI provider tables)"
echo "  3. supabase/migrations/002_auth_policies.sql      (RLS policies)"
echo ""

if [ "$MANUAL_MODE" = "1" ]; then
  echo -e "${YELLOW}📖 Manual Migration Instructions:${NC}"
  echo ""
  echo "1. Go to your Supabase Dashboard: $NEXT_PUBLIC_SUPABASE_URL"
  echo "2. Navigate to: SQL Editor"
  echo "3. Run the following migrations in order:"
  echo ""
  echo "   Migration 1: Base Schema (MUST RUN FIRST)"
  echo "   File: supabase/migrations/000_base_schema.sql"
  echo ""
  echo "   Migration 2: AI Provider Schema"
  echo "   File: supabase/migrations/001_ai_provider_schema.sql"
  echo ""
  echo "   Migration 3: Auth & RLS Policies"
  echo "   File: supabase/migrations/002_auth_policies.sql"
  echo ""
  echo "4. Verify tables created:"
  echo "   - user_profiles"
  echo "   - projects"
  echo "   - inputs"
  echo "   - outputs"
  echo "   - llm_usage_logs"
  echo "   - quality_scores"
  echo "   - provider_health"
  echo "   - response_cache"
  echo ""
  exit 0
fi

# Check if Supabase is linked
echo "🔗 Checking Supabase connection..."
if ! supabase status &> /dev/null; then
  echo -e "${YELLOW}⚠️  Not linked to a Supabase project${NC}"
  echo ""
  read -p "Do you want to link to your Supabase project? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    supabase link
  else
    echo "Aborted. Link your project with: supabase link"
    exit 1
  fi
fi

# Run migrations
echo ""
echo "🚀 Running migrations..."
echo ""

# Check if migrations directory exists
if [ ! -d "supabase/migrations" ]; then
  echo -e "${RED}❌ supabase/migrations directory not found${NC}"
  exit 1
fi

# Apply migrations
supabase db push

echo ""
echo -e "${GREEN}✅ Database migrations deployed successfully!${NC}"
echo ""

# Verify tables
echo "🔍 Verifying tables..."
echo ""

TABLES=("user_profiles" "projects" "inputs" "outputs" "llm_usage_logs" "quality_scores" "provider_health" "response_cache")

for table in "${TABLES[@]}"; do
  if supabase db query "SELECT 1 FROM $table LIMIT 1" &> /dev/null; then
    echo -e "${GREEN}✓${NC} $table"
  else
    echo -e "${RED}✗${NC} $table (not found)"
  fi
done

echo ""
echo "📌 Next steps:"
echo "  1. Run health check: ./scripts/health-check.sh"
echo "  2. Test API endpoints: ./scripts/test-api.sh"
echo "  3. Start development server: npm run dev"
echo ""
echo -e "${GREEN}🎉 Database ready!${NC}"
