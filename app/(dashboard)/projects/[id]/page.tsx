'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useProject, deleteProject, updateProject } from '@/lib/hooks/useProjects';
import OutputList from '@/app/components/projects/OutputList';

const statusColors = {
  pending: 'bg-gray-100 text-gray-800 border-gray-300',
  running: 'bg-blue-100 text-blue-800 border-blue-300',
  complete: 'bg-green-100 text-green-800 border-green-300',
  error: 'bg-red-100 text-red-800 border-red-300',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-300',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { project, loading, error, refetch } = useProject(projectId);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteProject(projectId);
      router.push('/projects');
    } catch (err) {
      console.error('Error deleting project:', err);
      alert('Failed to delete project');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-red-800 font-medium mb-2">Error loading project</h3>
          <p className="text-red-600 text-sm">{error || 'Project not found'}</p>
          <Link
            href="/projects"
            className="inline-block mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const budgetUsedPercentage = project.total_cost
    ? (project.total_cost / project.budget_limit) * 100
    : 0;
  const isOverBudget = budgetUsedPercentage > 100;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
        <Link href="/projects" className="hover:text-blue-600">
          Projects
        </Link>
        <span>/</span>
        <span className="text-gray-900 truncate">{project.title}</span>
      </div>

      {/* Header */}
      <div className="bg-white shadow rounded-lg p-8 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{project.title}</h1>
              <span
                className={`px-3 py-1 text-xs font-medium rounded-full border ${
                  statusColors[project.status]
                }`}
              >
                {project.status}
              </span>
            </div>
            <p className="text-gray-600 text-sm">
              Created {new Date(project.created_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/projects/${projectId}/edit`)}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Project Brief */}
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-700 mb-2">Project Brief</h2>
          <p className="text-gray-800 whitespace-pre-wrap">{project.brief}</p>
        </div>

        {/* Budget Progress */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-gray-700">Budget Usage</h2>
            <span className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-gray-900'}`}>
              ${project.total_cost?.toFixed(2) || '0.00'} / ${project.budget_limit.toFixed(2)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${
                isOverBudget ? 'bg-red-600' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(budgetUsedPercentage, 100)}%` }}
            />
          </div>
          {isOverBudget && (
            <p className="text-red-600 text-xs mt-1">Budget exceeded</p>
          )}
        </div>

        {/* Output Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg">
            <div className="text-2xl font-bold text-purple-900">
              {project.research_count || 0}
            </div>
            <div className="text-sm text-purple-700">Research Outputs</div>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">
              {project.strategy_count || 0}
            </div>
            <div className="text-sm text-blue-700">Strategy Outputs</div>
          </div>
          <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
            <div className="text-2xl font-bold text-green-900">
              {project.critique_count || 0}
            </div>
            <div className="text-sm text-green-700">Critique Outputs</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg hover:bg-purple-100 transition-colors text-left">
            <div className="text-2xl mb-2">🔍</div>
            <div className="font-medium text-purple-900">Run Research</div>
            <div className="text-sm text-purple-700">Market analysis and insights</div>
          </button>
          <button className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left">
            <div className="text-2xl mb-2">🎯</div>
            <div className="font-medium text-blue-900">Generate Strategy</div>
            <div className="text-sm text-blue-700">Brand positioning strategy</div>
          </button>
          <button className="p-4 bg-green-50 border-2 border-green-200 rounded-lg hover:bg-green-100 transition-colors text-left">
            <div className="text-2xl mb-2">✨</div>
            <div className="font-medium text-green-900">Request Critique</div>
            <div className="text-sm text-green-700">Quality assessment</div>
          </button>
        </div>
      </div>

      {/* Outputs List */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Outputs</h2>
        <OutputList outputs={project.outputs || []} projectId={projectId} />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Project?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete this project and all its outputs. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
