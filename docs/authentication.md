# Authentication Documentation

## Overview

This application uses **Supabase Auth** for authentication and authorization. All API routes are protected with proper authentication middleware, and database access is secured using Row-Level Security (RLS) policies.

## Architecture

### Authentication Flow

1. **User Authentication**: Users authenticate via Supabase Auth (email/password, OAuth, etc.)
2. **Session Management**: Sessions are stored in HTTP-only cookies (secure, not accessible to JavaScript)
3. **API Protection**: All API routes verify authentication before processing requests
4. **Data Isolation**: RLS policies ensure users can only access their own data

### Components

```
lib/
├── supabase/
│   ├── server.ts     # Server-side Supabase client (API routes)
│   └── client.ts     # Client-side Supabase client (browser)
├── auth/
│   ├── middleware.ts # Auth middleware functions
│   └── helpers.ts    # Auth helper functions (budgets, logging)
└── types/
    └── supabase.ts   # TypeScript types from database schema
```

## Server-Side Authentication (API Routes)

### Using the Supabase Client

Always use `createClient(cookies())` in API routes:

```typescript
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const supabase = createClient(cookies());
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // User is authenticated
  return Response.json({ userId: user.id });
}
```

### Auth Middleware Functions

#### `requireAuth()`

Simplest way to protect an API route:

```typescript
import { requireAuth } from '@/lib/auth/middleware';

export async function POST(request: Request) {
  const { user, error } = await requireAuth();
  if (error) return error; // Returns 401 response

  // User is authenticated, proceed with logic
  console.log('User ID:', user.id);
}
```

#### `getAuthUser()`

Get authenticated user or throw error:

```typescript
import { getAuthUser } from '@/lib/auth/middleware';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    // User is authenticated
  } catch (error) {
    // Handle auth error
  }
}
```

#### `requireProjectOwnership(projectId)`

Verify user owns a project:

```typescript
import { requireProjectOwnership } from '@/lib/auth/middleware';

export async function POST(request: Request) {
  const { projectId } = await request.json();

  const { user, project, error } = await requireProjectOwnership(projectId);
  if (error) return error; // Returns 401 or 403 response

  // User owns the project, proceed
  console.log('Project owner:', user.id);
}
```

#### `verifyProjectOwnership(projectId, userId)`

Manual ownership verification:

```typescript
import { getAuthUser, verifyProjectOwnership } from '@/lib/auth/middleware';

export async function POST(request: Request) {
  const user = await getAuthUser();
  const { projectId } = await request.json();

  await verifyProjectOwnership(projectId, user.id);
  // Throws ForbiddenError if user doesn't own project
}
```

## Auth Helper Functions

### Budget Checking

```typescript
import { checkBudgets } from '@/lib/auth/helpers';

const budgetCheck = await checkBudgets(projectId, userId);
if (!budgetCheck.allowed) {
  return NextResponse.json(
    { error: budgetCheck.message },
    { status: 429 }
  );
}
```

### Usage Logging

```typescript
import { logLLMUsage } from '@/lib/auth/helpers';

await logLLMUsage({
  project_id: projectId,
  user_id: userId,
  agent_type: 'research',
  provider: 'claude',
  model: 'claude-3-5-sonnet-20241022',
  prompt_tokens: 1500,
  completion_tokens: 800,
  cost_usd: 0.012,
  finish_reason: 'stop',
  latency_ms: 2500,
});
```

### Saving Outputs

```typescript
import { saveLLMOutput } from '@/lib/auth/helpers';

const output = await saveLLMOutput({
  projectId,
  section: 'research',
  content: 'AI-generated research content...',
});

console.log('Output ID:', output.id);
```

### Usage Statistics

```typescript
import { getUserUsageStats } from '@/lib/auth/helpers';

const stats = await getUserUsageStats(userId, '30d');
console.log('Total cost:', stats.totalCost);
console.log('Total tokens:', stats.totalTokens);
console.log('By provider:', stats.byProvider);
console.log('By agent type:', stats.byAgent);
```

## Client-Side Authentication

### Using the Supabase Client

For Client Components:

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';

export function UserProfile() {
  const [user, setUser] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  if (!user) return <div>Not logged in</div>;

  return <div>Welcome, {user.email}</div>;
}
```

### Authentication Events

Listen for auth state changes:

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';

export function AuthListener() {
  const supabase = createClient();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth event:', event);
        console.log('Session:', session);

        if (event === 'SIGNED_IN') {
          // User signed in
        } else if (event === 'SIGNED_OUT') {
          // User signed out
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
```

## Row-Level Security (RLS)

### How RLS Works

RLS policies automatically filter database queries based on the authenticated user:

```sql
-- Users can only see their own projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT
  USING (auth.uid() = user_id);
```

When you query the database:

```typescript
// This automatically filters to only the user's projects
const { data: projects } = await supabase
  .from('projects')
  .select('*');
// Returns only projects where user_id = auth.uid()
```

### RLS Policies in This App

#### Projects Table
- Users can only view/create/update/delete their own projects
- Enforced by `user_id = auth.uid()`

#### Outputs Table
- Users can only view/create/update/delete outputs from their projects
- Enforced by checking project ownership

#### LLM Usage Logs
- Users can only view their own usage logs
- System can insert logs for authenticated user

#### Quality Scores
- Users can only view/update scores for their projects
- Enforced by checking project ownership

## Error Handling

### Auth Errors

```typescript
import { handleAuthError, UnauthorizedError, ForbiddenError } from '@/lib/auth/middleware';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    // Your logic here
  } catch (error) {
    return handleAuthError(error);
    // Returns proper JSON response with status code
  }
}
```

### Error Types

- `UnauthorizedError` (401): User not authenticated
- `ForbiddenError` (403): User authenticated but not authorized
- `AuthError` (custom status): Base error class

## Environment Variables

Required environment variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these from your Supabase project settings:
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings > API
4. Copy the URL and anon/public key

## Testing Authentication Locally

### 1. Set up Supabase

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 2. Create Test User

Via Supabase Dashboard:
1. Go to Authentication > Users
2. Click "Add User"
3. Enter email and password
4. Copy the user ID for testing

### 3. Test API Routes

```bash
# Sign in to get access token
curl -X POST 'https://your-project.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "your-password"
  }'

# Use the access_token in API requests
curl -X POST 'http://localhost:3000/api/ai/research' \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "project-uuid",
    "brief": "Test brief"
  }'
```

### 4. Test RLS Policies

```sql
-- Connect to your database
-- Try to access data as a specific user
SET request.jwt.claims = '{"sub": "user-uuid"}';

-- This should only return projects for that user
SELECT * FROM projects;
```

## Common Patterns

### Protecting an API Route

```typescript
import { requireAuth, handleAuthError } from '@/lib/auth/middleware';

export async function POST(request: Request) {
  try {
    const { user, error } = await requireAuth();
    if (error) return error;

    // Your protected logic here
    return Response.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
```

### Verifying Project Access

```typescript
import { requireProjectOwnership } from '@/lib/auth/middleware';

export async function POST(request: Request) {
  const { projectId } = await request.json();

  const { user, project, error } = await requireProjectOwnership(projectId);
  if (error) return error;

  // User owns the project, proceed
}
```

### Budget-Aware API Route

```typescript
import { requireProjectOwnership, handleAuthError } from '@/lib/auth/middleware';
import { checkBudgets } from '@/lib/auth/helpers';

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();

    // Authenticate and verify ownership
    const { user, error } = await requireProjectOwnership(projectId);
    if (error) return error;

    // Check budgets
    const budgetCheck = await checkBudgets(projectId, user.id);
    if (!budgetCheck.allowed) {
      return Response.json(
        { error: budgetCheck.message },
        { status: 429 }
      );
    }

    // Process request...
    return Response.json({ success: true });
  } catch (error) {
    return handleAuthError(error);
  }
}
```

## Security Best Practices

1. **Never disable RLS**: Always keep RLS enabled on tables
2. **Use service role carefully**: Only use service role key for admin operations
3. **Validate all inputs**: Auth doesn't replace input validation
4. **Log security events**: Log failed auth attempts and suspicious activity
5. **Use HTTPS**: Always use HTTPS in production
6. **Rotate keys**: Rotate Supabase keys periodically
7. **Limit token lifetime**: Configure short-lived access tokens
8. **Monitor usage**: Track auth failures and unusual patterns

## Troubleshooting

### "Missing Supabase environment variables"

Make sure you have `.env.local` with:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### "Unauthorized" errors in API routes

- Check if user is signed in: `supabase.auth.getUser()`
- Verify cookies are being passed to the server
- Check browser console for auth errors

### RLS policy errors

- Verify user is authenticated: `auth.uid()` returns non-null
- Check policy logic matches your query
- Test policies in SQL editor with `SET request.jwt.claims`

### "Project not found" errors

- Verify project exists in database
- Check user_id matches authenticated user
- Ensure RLS policies are correct

## Migration Guide

### From Placeholder Auth to Real Auth

1. ✅ Install Supabase dependencies
2. ✅ Update `lib/supabase/server.ts` and `lib/supabase/client.ts`
3. ✅ Create auth middleware in `lib/auth/middleware.ts`
4. ✅ Create auth helpers in `lib/auth/helpers.ts`
5. ✅ Update all API routes to use real auth
6. ✅ Run RLS migration: `supabase db push`
7. ✅ Add environment variables to `.env.local`
8. Test authentication flow end-to-end
9. Test budget enforcement
10. Test RLS policies

## Next Steps

- Implement OAuth providers (Google, GitHub, etc.)
- Add email verification workflow
- Implement password reset flow
- Add MFA (Multi-Factor Authentication)
- Set up auth webhooks for user events
- Implement rate limiting per user
- Add audit logging for sensitive operations
