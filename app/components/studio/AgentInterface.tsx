'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';
import { Label } from '@/app/components/ui/Label';
import { Textarea } from '@/app/components/ui/Textarea';
import { SelectSimple as Select } from '@/app/components/ui/SelectSimple';
import { Slider } from '@/app/components/ui/Slider';
import { ResponseDisplay } from './ResponseDisplay';
import { useAIAgent } from '@/lib/hooks/useAIAgent';

interface Project {
  id: string;
  name: string;
}

interface AgentInterfaceProps {
  title: string;
  description: string;
  endpoint: string;
  placeholder: string;
  icon?: React.ReactNode;
  additionalFields?: React.ReactNode;
}

const GROK_MODELS = [
  { value: 'grok-beta', label: 'Grok Beta' },
  { value: 'grok-2-1212', label: 'Grok 2 (Dec 2024)' },
  { value: 'grok-2-latest', label: 'Grok 2 Latest' },
];

export function AgentInterface({
  title,
  description,
  endpoint,
  placeholder,
  icon,
  additionalFields,
}: AgentInterfaceProps) {
  const [prompt, setPrompt] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedModel, setSelectedModel] = useState('grok-beta');
  const [temperature, setTemperature] = useState(0.7);
  const [projects, setProjects] = useState<Project[]>([]);
  const [useStreaming, setUseStreaming] = useState(true);
  const [streamingContent, setStreamingContent] = useState('');

  const { isLoading, error, response, submitPrompt, submitStream, reset } = useAIAgent({
    endpoint,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    reset();
    setStreamingContent('');

    const config = {
      temperature,
      model: selectedModel,
      projectId: selectedProject || undefined,
    };

    if (useStreaming) {
      await submitStream(prompt, config, (chunk) => {
        setStreamingContent(prev => prev + chunk);
      });
    } else {
      await submitPrompt(prompt, config);
    }
  };

  const handleReset = () => {
    setPrompt('');
    setStreamingContent('');
    reset();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="prompt">Input</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              rows={8}
              className="mt-2"
              required
            />
          </div>

          {additionalFields}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="project">Project (Optional)</Label>
              <Select
                id="project"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="mt-2"
              >
                <option value="">No project selected</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="model">Model</Label>
              <Select
                id="model"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="mt-2"
              >
                {GROK_MODELS.map((model) => (
                  <option key={model.value} value={model.value}>
                    {model.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="temperature">Temperature: {temperature.toFixed(2)}</Label>
              <span className="text-xs text-gray-500">
                {temperature < 0.3 ? 'Focused' : temperature < 0.7 ? 'Balanced' : 'Creative'}
              </span>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={1}
              step={0.05}
              value={[temperature]}
              onValueChange={(values) => setTemperature(values[0])}
              className="mt-2"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="streaming"
              checked={useStreaming}
              onChange={(e) => setUseStreaming(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="streaming" className="cursor-pointer">
              Enable streaming response
            </Label>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isLoading || !prompt.trim()}>
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                'Submit'
              )}
            </Button>
            {(response || error || streamingContent) && (
              <Button type="button" variant="outline" onClick={handleReset}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </Card>

      {(response || error || streamingContent || isLoading) && (
        <ResponseDisplay
          content={useStreaming ? streamingContent : response?.content || ''}
          isStreaming={isLoading && useStreaming}
          tokens={response?.tokens}
          cost={response?.cost}
          model={response?.model || selectedModel}
          error={error}
        />
      )}
    </div>
  );
}
