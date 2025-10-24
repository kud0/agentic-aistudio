'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProject } from '@/lib/hooks/useProjects';

interface ProjectFormProps {
  onSuccess?: (projectId: string) => void;
  onCancel?: () => void;
}

export default function ProjectForm({ onSuccess, onCancel }: ProjectFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    brief: '',
    budget_limit: 10,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const project = await createProject(formData);
      if (onSuccess) {
        onSuccess(project.id);
      } else {
        router.push(`/projects/${project.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      console.error('Error creating project:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Project Title
        </label>
        <input
          type="text"
          id="title"
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Denon Rebrand for Gen Z"
          disabled={loading}
        />
      </div>

      <div>
        <label htmlFor="brief" className="block text-sm font-medium text-gray-700 mb-2">
          Project Brief
        </label>
        <textarea
          id="brief"
          required
          rows={6}
          value={formData.brief}
          onChange={(e) => setFormData({ ...formData, brief: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          placeholder="Describe your rebrand project, target audience, goals, and any constraints..."
          disabled={loading}
        />
        <p className="mt-1 text-sm text-gray-500">
          Provide as much detail as possible to help the AI agents generate better insights.
        </p>
      </div>

      <div>
        <label htmlFor="budget_limit" className="block text-sm font-medium text-gray-700 mb-2">
          Budget Limit (USD)
        </label>
        <input
          type="number"
          id="budget_limit"
          min="1"
          step="0.01"
          required
          value={formData.budget_limit}
          onChange={(e) => setFormData({ ...formData, budget_limit: parseFloat(e.target.value) })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
        <p className="mt-1 text-sm text-gray-500">
          Set a maximum budget for AI processing costs. Default is $10.
        </p>
      </div>

      <div className="flex gap-4 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating...' : 'Create Project'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
