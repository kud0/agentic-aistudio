/**
 * Supabase Database Types
 *
 * These types are auto-generated from your Supabase schema.
 * Run `npx supabase gen types typescript --project-id <project-id> > types/supabase.ts`
 * to regenerate when schema changes.
 *
 * For now, we define them manually based on the migration files.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          brief: string;
          status: 'pending' | 'running' | 'complete' | 'error' | 'cancelled';
          created_at: string;
          updated_at: string;
          completed_at: string | null;
          budget_limit: number;
          metadata: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          brief: string;
          status?: 'pending' | 'running' | 'complete' | 'error' | 'cancelled';
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          budget_limit?: number;
          metadata?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          brief?: string;
          status?: 'pending' | 'running' | 'complete' | 'error' | 'cancelled';
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
          budget_limit?: number;
          metadata?: Json;
        };
      };
      outputs: {
        Row: {
          id: string;
          project_id: string;
          section: 'research' | 'strategy' | 'critique';
          content: string;
          version: number;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          project_id: string;
          section: 'research' | 'strategy' | 'critique';
          content: string;
          version?: number;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          project_id?: string;
          section?: 'research' | 'strategy' | 'critique';
          content?: string;
          version?: number;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
          metadata?: Json;
        };
      };
      llm_usage_logs: {
        Row: {
          id: string;
          created_at: string;
          project_id: string;
          user_id: string;
          output_id: string | null;
          agent_type: 'research' | 'strategy' | 'critique' | 'custom';
          provider: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          cost_usd: number;
          latency_ms: number | null;
          finish_reason: 'stop' | 'length' | 'tool_call' | 'error' | null;
          cached: boolean;
          error_message: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          project_id: string;
          user_id: string;
          output_id?: string | null;
          agent_type: 'research' | 'strategy' | 'critique' | 'custom';
          provider: string;
          model: string;
          prompt_tokens: number;
          completion_tokens: number;
          cost_usd: number;
          latency_ms?: number | null;
          finish_reason: 'stop' | 'length' | 'tool_call' | 'error' | null;
          cached?: boolean;
          error_message?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          project_id?: string;
          user_id?: string;
          output_id?: string | null;
          agent_type?: 'research' | 'strategy' | 'critique' | 'custom';
          provider?: string;
          model?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          cost_usd?: number;
          latency_ms?: number | null;
          finish_reason?: 'stop' | 'length' | 'tool_call' | 'error' | null;
          cached?: boolean;
          error_message?: string | null;
          metadata?: Json;
        };
      };
      quality_scores: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          output_id: string;
          project_id: string;
          completeness_score: number;
          coherence_score: number;
          actionability_score: number;
          overall_score: number;
          flag_for_review: boolean;
          reviewed_by: string | null;
          reviewed_at: string | null;
          reasoning: string | null;
          improvement_suggestions: string[] | null;
          scoring_model: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          output_id: string;
          project_id: string;
          completeness_score: number;
          coherence_score: number;
          actionability_score: number;
          flag_for_review?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reasoning?: string | null;
          improvement_suggestions?: string[] | null;
          scoring_model?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          output_id?: string;
          project_id?: string;
          completeness_score?: number;
          coherence_score?: number;
          actionability_score?: number;
          flag_for_review?: boolean;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reasoning?: string | null;
          improvement_suggestions?: string[] | null;
          scoring_model?: string | null;
          metadata?: Json;
        };
      };
      provider_health: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          provider: string;
          status: 'healthy' | 'degraded' | 'down';
          error_rate: number;
          avg_latency_ms: number;
          success_count: number;
          failure_count: number;
          total_requests: number;
          circuit_state: 'closed' | 'open' | 'half-open';
          circuit_opened_at: string | null;
          last_error: string | null;
          last_error_at: string | null;
          last_success_at: string | null;
          last_checked_at: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          provider: string;
          status?: 'healthy' | 'degraded' | 'down';
          error_rate?: number;
          avg_latency_ms?: number;
          success_count?: number;
          failure_count?: number;
          circuit_state?: 'closed' | 'open' | 'half-open';
          circuit_opened_at?: string | null;
          last_error?: string | null;
          last_error_at?: string | null;
          last_success_at?: string | null;
          last_checked_at?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          provider?: string;
          status?: 'healthy' | 'degraded' | 'down';
          error_rate?: number;
          avg_latency_ms?: number;
          success_count?: number;
          failure_count?: number;
          circuit_state?: 'closed' | 'open' | 'half-open';
          circuit_opened_at?: string | null;
          last_error?: string | null;
          last_error_at?: string | null;
          last_success_at?: string | null;
          last_checked_at?: string;
        };
      };
      response_cache: {
        Row: {
          id: string;
          created_at: string;
          expires_at: string;
          cache_key: string;
          prompt_hash: string;
          provider: string;
          model: string;
          temperature: number | null;
          content: string;
          tokens_used: number;
          cost_usd: number;
          hit_count: number;
          last_hit_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          created_at?: string;
          expires_at: string;
          cache_key: string;
          prompt_hash: string;
          provider: string;
          model: string;
          temperature?: number | null;
          content: string;
          tokens_used: number;
          cost_usd: number;
          hit_count?: number;
          last_hit_at?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: string;
          created_at?: string;
          expires_at?: string;
          cache_key?: string;
          prompt_hash?: string;
          provider?: string;
          model?: string;
          temperature?: number | null;
          content?: string;
          tokens_used?: number;
          cost_usd?: number;
          hit_count?: number;
          last_hit_at?: string | null;
          metadata?: Json;
        };
      };
    };
    Views: {
      project_budgets: {
        Row: {
          project_id: string;
          project_name: string;
          user_id: string;
          total_requests: number;
          total_cost: number;
          total_tokens: number;
          last_request_at: string | null;
          grok_cost: number;
          claude_cost: number;
          openai_cost: number;
          research_cost: number;
          strategy_cost: number;
          critique_cost: number;
        };
      };
      user_budgets: {
        Row: {
          user_id: string;
          email: string;
          total_requests: number;
          total_cost_30d: number;
          total_tokens_30d: number;
          last_request_at: string | null;
          avg_daily_cost: number;
        };
      };
      expensive_prompts: {
        Row: {
          id: string;
          created_at: string;
          project_id: string;
          project_name: string;
          agent_type: string;
          provider: string;
          model: string;
          cost_usd: number;
          total_tokens: number;
          latency_ms: number | null;
          cached: boolean;
        };
      };
    };
    Functions: {
      update_provider_health: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      cleanup_expired_cache: {
        Args: Record<string, never>;
        Returns: number;
      };
    };
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Inserts<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];
export type Updates<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
