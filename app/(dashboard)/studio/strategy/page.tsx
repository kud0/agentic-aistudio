import { AgentInterface } from '@/app/components/studio/AgentInterface';

export default function StrategyPage() {
  return (
    <AgentInterface
      title="Strategy Agent"
      description="Generate strategic recommendations, business plans, and growth strategies for your projects"
      endpoint="/api/ai/strategy"
      placeholder="Describe your strategic challenge... For example: 'Create a go-to-market strategy for a SaaS product targeting enterprise customers'"
      icon={
        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-purple-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
      }
    />
  );
}
