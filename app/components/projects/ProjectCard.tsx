'use client';

import Link from 'next/link';
import type { Tables } from '@/types/supabase';

interface ProjectCardProps {
  project: Tables<'projects'> & {
    research_count?: number;
    strategy_count?: number;
    critique_count?: number;
  };
}

const statusColors = {
  pending: 'bg-gray-100 text-gray-800 border-gray-300',
  running: 'bg-blue-100 text-blue-800 border-blue-300',
  complete: 'bg-green-100 text-green-800 border-green-300',
  error: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-300',
};

export default function ProjectCard({ project }: ProjectCardProps) {
  const totalOutputs = (project.research_count || 0) + (project.strategy_count || 0) + (project.critique_count || 0);
  const createdDate = new Date(project.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="block p-6 bg-white border border-gray-200 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold text-gray-900 line-clamp-1">
            {project.title}
          </h3>
          <span
            className={`px-3 py-1 text-xs font-medium rounded-full border ${
              statusColors[project.status]
            }`}
          >
            {project.status}
          </span>
        </div>

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {project.brief}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="font-medium">{project.research_count || 0}</span>
              <span>Research</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">{project.strategy_count || 0}</span>
              <span>Strategy</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">{project.critique_count || 0}</span>
              <span>Critique</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Created {createdDate}
          </div>
          <div className="text-xs text-gray-700 font-medium">
            Budget: ${project.budget_limit.toFixed(2)}
          </div>
        </div>

        {totalOutputs > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min((totalOutputs / 3) * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-600">
              {totalOutputs}/3 outputs
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
