#!/bin/bash
# Environment Setup Script for AI Provider Architecture (Grok Only)

set -e

echo "🚀 Setting up AI Provider Architecture environment (Grok Only)"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local already exists
if [ -f .env.local ]; then
  echo -e "${YELLOW}⚠️  .env.local already exists${NC}"
  read -p "Do you want to overwrite it? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted. Keeping existing .env.local"
    exit 0
  fi
fi

# Copy template
echo "📋 Copying .env.example.grok to .env.local..."
cp .env.example.grok .env.local

# Prompt for required values
echo ""
echo "📝 Please provide the following required values:"
echo ""

# Grok API Key
read -p "Enter your Grok (X.AI) API Key: " grok_api_key
if [ -z "$grok_api_key" ]; then
  echo -e "${RED}❌ Grok API key is required${NC}"
  exit 1
fi

# Supabase URL
read -p "Enter your Supabase URL: " supabase_url
if [ -z "$supabase_url" ]; then
  echo -e "${RED}❌ Supabase URL is required${NC}"
  exit 1
fi

# Supabase Anon Key
read -p "Enter your Supabase Anon Key: " supabase_anon_key
if [ -z "$supabase_anon_key" ]; then
  echo -e "${RED}❌ Supabase Anon Key is required${NC}"
  exit 1
fi

# Optional: Supabase Service Role Key
read -p "Enter your Supabase Service Role Key (optional, press Enter to skip): " supabase_service_key

# Generate NextAuth Secret
echo ""
echo "🔐 Generating NextAuth secret..."
nextauth_secret=$(openssl rand -base64 32)

# Update .env.local with values
echo ""
echo "✍️  Writing configuration to .env.local..."

# Use different delimiters for sed to avoid conflicts with URLs
sed -i.bak "s|XAI_API_KEY=your_grok_api_key_here|XAI_API_KEY=$grok_api_key|g" .env.local
sed -i.bak "s|GROK_API_KEY=your_grok_api_key_here|GROK_API_KEY=$grok_api_key|g" .env.local
sed -i.bak "s|NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co|NEXT_PUBLIC_SUPABASE_URL=$supabase_url|g" .env.local
sed -i.bak "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here|NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_anon_key|g" .env.local

if [ -n "$supabase_service_key" ]; then
  sed -i.bak "s|SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here|SUPABASE_SERVICE_ROLE_KEY=$supabase_service_key|g" .env.local
fi

sed -i.bak "s|NEXTAUTH_SECRET=your_nextauth_secret_here|NEXTAUTH_SECRET=$nextauth_secret|g" .env.local

# Remove backup file
rm .env.local.bak

echo ""
echo -e "${GREEN}✅ Environment setup complete!${NC}"
echo ""
echo "📋 Configuration summary:"
echo "  ✓ Grok API Key: ${grok_api_key:0:10}..."
echo "  ✓ Supabase URL: $supabase_url"
echo "  ✓ Supabase Anon Key: ${supabase_anon_key:0:10}..."
if [ -n "$supabase_service_key" ]; then
  echo "  ✓ Supabase Service Key: ${supabase_service_key:0:10}..."
fi
echo "  ✓ NextAuth Secret: Generated"
echo ""
echo "📌 Next steps:"
echo "  1. Review .env.local and adjust settings as needed"
echo "  2. Run database migrations: ./scripts/deploy-db.sh"
echo "  3. Run health check: ./scripts/health-check.sh"
echo "  4. Start development server: npm run dev"
echo ""
echo -e "${GREEN}🎉 Ready to go!${NC}"
