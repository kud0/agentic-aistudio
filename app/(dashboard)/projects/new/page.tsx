'use client';

import Link from 'next/link';
import ProjectForm from '@/app/components/projects/ProjectForm';

export default function NewProjectPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
          <Link href="/projects" className="hover:text-blue-600">
            Projects
          </Link>
          <span>/</span>
          <span className="text-gray-900">New Project</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Project</h1>
        <p className="mt-2 text-gray-600">
          Define your rebrand project and let AI agents generate strategic insights
        </p>
      </div>

      {/* Form Card */}
      <div className="bg-white shadow rounded-lg p-8">
        <ProjectForm />
      </div>

      {/* Help Section */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Tips for a great project brief</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Include your target audience demographics and psychographics</li>
          <li>Describe your current brand positioning and desired positioning</li>
          <li>Mention any constraints (budget, timeline, brand guidelines)</li>
          <li>Specify key competitors and market context</li>
          <li>Include any existing research or data you have</li>
        </ul>
      </div>
    </div>
  );
}
