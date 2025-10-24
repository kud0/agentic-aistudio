'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { UsageDataPoint } from '@/lib/hooks/useAnalytics';

interface UsageChartProps {
  data: UsageDataPoint[];
}

export default function UsageChart({ data }: UsageChartProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Usage Over Time
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            className="text-xs text-gray-600 dark:text-gray-400"
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
          />
          <YAxis className="text-xs text-gray-600 dark:text-gray-400" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg)',
              border: '1px solid var(--tooltip-border)',
              borderRadius: '0.5rem',
            }}
            labelFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString();
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="requests"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6' }}
            name="API Requests"
          />
          <Line
            type="monotone"
            dataKey="cost"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981' }}
            name="Cost ($)"
          />
          <Line
            type="monotone"
            dataKey="errors"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444' }}
            name="Errors"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
