import { AgentInterface } from '@/app/components/studio/AgentInterface';

export default function ResearchPage() {
  return (
    <AgentInterface
      title="Research Agent"
      description="Get comprehensive market research, competitor analysis, and insights for your projects"
      endpoint="/api/ai/research"
      placeholder="Describe what you want to research... For example: 'Analyze the market for AI-powered productivity tools targeting small businesses in 2025'"
      icon={
        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      }
    />
  );
}
