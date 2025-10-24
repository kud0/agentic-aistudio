'use client';

import type { Tables } from '@/types/supabase';

interface OutputListProps {
  outputs: Tables<'outputs'>[];
  projectId: string;
}

const sectionIcons = {
  research: '🔍',
  strategy: '🎯',
  critique: '✨',
};

const sectionColors = {
  research: 'bg-purple-100 text-purple-800 border-purple-300',
  strategy: 'bg-blue-100 text-blue-800 border-blue-300',
  critique: 'bg-green-100 text-green-800 border-green-300',
};

export default function OutputList({ outputs, projectId }: OutputListProps) {
  if (outputs.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500 text-sm">No outputs yet</p>
        <p className="text-gray-400 text-xs mt-1">
          Use the quick actions above to generate research, strategy, or critique
        </p>
      </div>
    );
  }

  // Sort outputs by creation date (newest first)
  const sortedOutputs = [...outputs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-4">
      {sortedOutputs.map((output) => (
        <div
          key={output.id}
          className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{sectionIcons[output.section]}</span>
              <div>
                <span
                  className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${
                    sectionColors[output.section]
                  }`}
                >
                  {output.section.charAt(0).toUpperCase() + output.section.slice(1)}
                </span>
                {output.version > 1 && (
                  <span className="ml-2 text-xs text-gray-500">
                    v{output.version}
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {new Date(output.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            <div className="text-gray-700 whitespace-pre-wrap">
              {output.content.length > 500 ? (
                <>
                  {output.content.substring(0, 500)}
                  <span className="text-gray-400">... </span>
                  <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                    Read more
                  </button>
                </>
              ) : (
                output.content
              )}
            </div>
          </div>

          {output.parent_id && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Updated version of previous output
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
