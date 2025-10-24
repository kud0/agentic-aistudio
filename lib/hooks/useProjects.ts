'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Tables } from '@/types/supabase';

type Project = Tables<'projects'>;
type Output = Tables<'outputs'>;

interface ProjectWithOutputs extends Project {
  outputs?: Output[];
  research_count?: number;
  strategy_count?: number;
  critique_count?: number;
  total_cost?: number;
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectWithOutputs[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('projects')
        .select(`
          *,
          outputs (
            id,
            section,
            created_at
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Calculate output counts and costs for each project
      const projectsWithStats = data?.map((project) => {
        const outputs = project.outputs as Output[] || [];
        return {
          ...project,
          research_count: outputs.filter((o) => o.section === 'research').length,
          strategy_count: outputs.filter((o) => o.section === 'strategy').length,
          critique_count: outputs.filter((o) => o.section === 'critique').length,
        };
      }) || [];

      setProjects(projectsWithStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    loading,
    error,
    refetch: fetchProjects,
  };
}

export function useProject(id: string) {
  const [project, setProject] = useState<ProjectWithOutputs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('projects')
        .select(`
          *,
          outputs (
            id,
            section,
            content,
            version,
            created_at,
            updated_at
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Get cost data from llm_usage_logs
      const { data: costData } = await supabase
        .from('llm_usage_logs')
        .select('cost_usd')
        .eq('project_id', id);

      const totalCost = costData?.reduce((sum, log) => sum + log.cost_usd, 0) || 0;

      const outputs = data.outputs as Output[] || [];
      setProject({
        ...data,
        outputs,
        research_count: outputs.filter((o) => o.section === 'research').length,
        strategy_count: outputs.filter((o) => o.section === 'strategy').length,
        critique_count: outputs.filter((o) => o.section === 'critique').length,
        total_cost: totalCost,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch project');
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  return {
    project,
    loading,
    error,
    refetch: fetchProject,
  };
}

interface CreateProjectInput {
  title: string;
  brief: string;
  budget_limit?: number;
}

export async function createProject(input: CreateProjectInput) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: input.title,
      brief: input.brief,
      budget_limit: input.budget_limit || 10.00,
      status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

interface UpdateProjectInput {
  id: string;
  title?: string;
  brief?: string;
  status?: Project['status'];
  budget_limit?: number;
}

export async function updateProject(input: UpdateProjectInput) {
  const supabase = createClient();

  const { id, ...updates } = input;
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteProject(id: string) {
  const supabase = createClient();

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
