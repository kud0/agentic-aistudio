# 🗄️ Database Setup Guide - FIXED!

## ✅ Problem Solved

The migration error `relation "projects" does not exist` has been fixed!

We created a **new base schema migration** that creates all foundational tables first.

---

## 📋 Migration Files (In Order)

### 1. **000_base_schema.sql** ⭐ (RUN FIRST)
Creates foundational tables:
- ✅ `user_profiles` - Extended user data
- ✅ `projects` - Rebrand projects (main entity)
- ✅ `inputs` - Uploaded files (PDFs, images)
- ✅ `outputs` - AI-generated content (research, strategy, critique)
- ✅ RLS policies for user isolation
- ✅ Auto-update triggers
- ✅ Helpful views (project_summaries)

### 2. **001_ai_provider_schema.sql** (RUN SECOND)
Creates AI provider tables:
- ✅ `llm_usage_logs` - Track every API call
- ✅ `quality_scores` - Auto-rated outputs
- ✅ `provider_health` - Uptime monitoring
- ✅ `response_cache` - Cached responses
- ✅ Budget tracking views

### 3. **002_auth_policies.sql** (RUN THIRD)
Additional RLS policies for security.

---

## 🚀 Quick Deploy

### Option 1: Automated (Recommended)

```bash
# 1. Setup environment
./scripts/setup-env.sh

# 2. Deploy database (runs all 3 migrations in order)
./scripts/deploy-db.sh
```

The script automatically runs migrations in the correct order: 000 → 001 → 002

---

### Option 2: Manual via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order:

**Step 1:** Copy & paste `supabase/migrations/000_base_schema.sql`
- Click **Run**
- Verify: Tables `user_profiles`, `projects`, `inputs`, `outputs` created

**Step 2:** Copy & paste `supabase/migrations/001_ai_provider_schema.sql`
- Click **Run**
- Verify: Tables `llm_usage_logs`, `quality_scores`, etc. created

**Step 3:** Copy & paste `supabase/migrations/002_auth_policies.sql`
- Click **Run**
- Verify: RLS policies active

---

### Option 3: Supabase CLI

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations (automatically in order)
supabase db push

# Verify tables
supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
```

---

## ✅ Verify Installation

After deployment, run:

```bash
./scripts/health-check.sh
```

Should see:
```
✓ Database connection
✓ Auth configuration
✓ user_profiles table exists
✓ projects table exists
✓ inputs table exists
✓ outputs table exists
✓ llm_usage_logs table exists
✓ quality_scores table exists
✓ provider_health table exists
✓ response_cache table exists
```

---

## 📊 Database Schema Overview

```
auth.users (Supabase Auth)
    ↓
user_profiles (extended profile)
    ↓
projects (rebrand projects)
    ↓
    ├── inputs (uploaded files)
    ├── outputs (AI-generated content)
    │       ↓
    │   quality_scores (auto-rated)
    └── llm_usage_logs (API call tracking)
```

---

## 🔐 Security Features

All tables have **Row-Level Security (RLS)** enabled:

- ✅ Users can only see their own projects
- ✅ Users can only see outputs from their projects
- ✅ Users can only see their own usage logs
- ✅ Budget limits enforced at database level
- ✅ Auto-update triggers for timestamps

---

## 🎯 What Each Table Does

### **user_profiles**
Extended user data beyond Supabase Auth:
- Full name, company, role
- Preferences and settings

### **projects**
Core entity - rebrand projects:
- Title, brief, status
- Budget limits
- Created/updated timestamps

### **inputs**
Uploaded files for projects:
- PDFs, images, brand assets
- Stored in Supabase Storage
- Linked to projects

### **outputs**
AI-generated content:
- Research, strategy, critique
- Version history support
- Linked to projects

### **llm_usage_logs**
Every AI API call tracked:
- Provider (Grok only)
- Model, tokens, cost
- Latency, errors
- User and project attribution

### **quality_scores**
Auto-rated outputs:
- Completeness, coherence, actionability
- Auto-flagged if score < 60
- Human review tracking

### **provider_health**
Uptime monitoring:
- Error rates per provider
- Average latency
- Status (healthy/degraded/down)
- Circuit breaker states

### **response_cache**
Cached LLM responses:
- Content-addressed (SHA-256)
- TTL expiration
- Hit tracking for cost savings

---

## 🐛 Troubleshooting

### Error: `relation "projects" does not exist`
**Solution:** Run `000_base_schema.sql` first!

### Error: `foreign key constraint`
**Solution:** Migrations must run in order (000 → 001 → 002)

### Error: `permission denied`
**Solution:** Use service role key or database password

### Tables not visible
**Solution:** Check you're looking at the `public` schema, not `auth`

---

## 📝 Sample Data (Optional)

Want to test with sample data? Uncomment the sample inserts in `000_base_schema.sql`:

```sql
-- Insert sample user profile
-- Insert sample project
```

Replace UUIDs with real user IDs from your Supabase Auth dashboard.

---

## 🎉 Success!

Once deployed, you have:
- ✅ All 8 tables created
- ✅ RLS policies active
- ✅ User isolation working
- ✅ Auto-update triggers
- ✅ Budget tracking
- ✅ Ready for API calls

**Next:** Test with `./scripts/test-api.sh`

---

**Migration order is critical:** 000 → 001 → 002

**Files:**
- `supabase/migrations/000_base_schema.sql` (9.8KB)
- `supabase/migrations/001_ai_provider_schema.sql` (15KB)
- `supabase/migrations/002_auth_policies.sql` (8.7KB)
