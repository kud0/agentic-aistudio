'use client';

import { ProviderHealth } from '@/lib/hooks/useAnalytics';

interface ProviderHealthStatusProps {
  providers: ProviderHealth[];
}

const statusColors = {
  healthy: {
    bg: 'bg-green-100 dark:bg-green-900/20',
    text: 'text-green-800 dark:text-green-200',
    dot: 'bg-green-500',
  },
  degraded: {
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    text: 'text-yellow-800 dark:text-yellow-200',
    dot: 'bg-yellow-500',
  },
  down: {
    bg: 'bg-red-100 dark:bg-red-900/20',
    text: 'text-red-800 dark:text-red-200',
    dot: 'bg-red-500',
  },
};

export default function ProviderHealthStatus({ providers }: ProviderHealthStatusProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Provider Health Status
      </h3>
      <div className="space-y-4">
        {providers.map((provider) => {
          const colors = statusColors[provider.status];
          return (
            <div
              key={provider.name}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${colors.dot} animate-pulse`} />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {provider.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Uptime: {provider.uptime}% • Latency: {provider.avgLatency}ms
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {provider.errorRate}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Error Rate
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                >
                  {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
