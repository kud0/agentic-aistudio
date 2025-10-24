/**
 * Supabase Browser Client
 *
 * Creates a Supabase client for client-side operations (Client Components, browser)
 * Uses localStorage for session persistence.
 */

import { createBrowserClient as createSupabaseBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

let client: ReturnType<typeof createSupabaseBrowserClient<Database>> | null = null;

/**
 * Create a Supabase client for browser/client-side operations
 * Singleton pattern to avoid multiple instances
 */
export function createClient() {
  if (client) {
    return client;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.'
    );
  }

  client = createSupabaseBrowserClient<Database>(supabaseUrl, supabaseAnonKey);

  return client;
}
