'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CostByProvider } from '@/lib/hooks/useAnalytics';

interface CostChartProps {
  data: CostByProvider[];
}

export default function CostChart({ data }: CostChartProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Cost by Provider
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="name"
            className="text-xs text-gray-600 dark:text-gray-400"
          />
          <YAxis className="text-xs text-gray-600 dark:text-gray-400" />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--tooltip-bg)',
              border: '1px solid var(--tooltip-border)',
              borderRadius: '0.5rem',
            }}
            formatter={(value: number, name: string) => {
              if (name === 'cost') return [`$${value.toFixed(2)}`, 'Cost'];
              return [value.toLocaleString(), 'Requests'];
            }}
          />
          <Legend />
          <Bar
            dataKey="cost"
            fill="#3b82f6"
            name="Cost ($)"
            radius={[8, 8, 0, 0]}
          />
          <Bar
            dataKey="requests"
            fill="#8b5cf6"
            name="Requests"
            radius={[8, 8, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
