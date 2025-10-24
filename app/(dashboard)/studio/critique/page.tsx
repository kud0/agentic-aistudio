'use client';

import { useState, useEffect } from 'react';
import { AgentInterface } from '@/app/components/studio/AgentInterface';
import { Label } from '@/app/components/ui/Label';
import { SelectSimple as Select } from '@/app/components/ui/SelectSimple';

interface Strategy {
  id: string;
  title: string;
  created_at: string;
}

export default function CritiquePage() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [inputMode, setInputMode] = useState<'text' | 'strategy'>('text');

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/strategies');
      if (response.ok) {
        const data = await response.json();
        setStrategies(data.strategies || []);
      }
    } catch (err) {
      console.error('Failed to fetch strategies:', err);
    }
  };

  const additionalFields = (
    <div className="space-y-4 border-t pt-4">
      <div>
        <Label>Critique Mode</Label>
        <div className="flex gap-4 mt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="inputMode"
              value="text"
              checked={inputMode === 'text'}
              onChange={() => setInputMode('text')}
              className="w-4 h-4"
            />
            <span>Critique custom content</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="inputMode"
              value="strategy"
              checked={inputMode === 'strategy'}
              onChange={() => setInputMode('strategy')}
              className="w-4 h-4"
            />
            <span>Critique existing strategy</span>
          </label>
        </div>
      </div>

      {inputMode === 'strategy' && (
        <div>
          <Label htmlFor="strategy">Select Strategy</Label>
          <Select
            id="strategy"
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="mt-2"
          >
            <option value="">Choose a strategy to critique...</option>
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.title} ({new Date(strategy.created_at).toLocaleDateString()})
              </option>
            ))}
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            The selected strategy will be automatically included in your critique request
          </p>
        </div>
      )}
    </div>
  );

  return (
    <AgentInterface
      title="Critique Agent"
      description="Get detailed, constructive feedback on your strategies, content, and ideas"
      endpoint="/api/ai/critique"
      placeholder={
        inputMode === 'text'
          ? "Paste the content you want critiqued... For example: 'Our strategy is to launch in Q1 with a focus on SMBs...'"
          : 'Describe what aspects you want critiqued... For example: "Focus on market fit and competitive positioning"'
      }
      icon={
        <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
      }
      additionalFields={additionalFields}
    />
  );
}
