import { useState, useCallback } from 'react';

export interface AIAgentConfig {
  endpoint: string;
  temperature?: number;
  model?: string;
  projectId?: string;
}

export interface AIAgentResponse {
  content: string;
  tokens?: number;
  cost?: number;
  model?: string;
}

export interface UseAIAgentReturn {
  isLoading: boolean;
  error: string | null;
  response: AIAgentResponse | null;
  submitPrompt: (prompt: string, config?: Partial<AIAgentConfig>) => Promise<void>;
  submitStream: (prompt: string, config?: Partial<AIAgentConfig>, onChunk?: (chunk: string) => void) => Promise<void>;
  reset: () => void;
}

export function useAIAgent(defaultConfig: AIAgentConfig): UseAIAgentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AIAgentResponse | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setResponse(null);
  }, []);

  const submitPrompt = useCallback(async (
    prompt: string,
    config?: Partial<AIAgentConfig>
  ) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const finalConfig = { ...defaultConfig, ...config };

    try {
      const response = await fetch(finalConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          temperature: finalConfig.temperature,
          model: finalConfig.model,
          projectId: finalConfig.projectId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      const data = await response.json();
      setResponse({
        content: data.content || data.response,
        tokens: data.tokens,
        cost: data.cost,
        model: data.model,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [defaultConfig]);

  const submitStream = useCallback(async (
    prompt: string,
    config?: Partial<AIAgentConfig>,
    onChunk?: (chunk: string) => void
  ) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    const finalConfig = { ...defaultConfig, ...config };
    let fullContent = '';

    try {
      const response = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          temperature: finalConfig.temperature,
          model: finalConfig.model,
          projectId: finalConfig.projectId,
          agentType: finalConfig.endpoint.split('/').pop(), // Extract agent type from endpoint
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is not readable');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullContent += parsed.content;
                onChunk?.(parsed.content);
              }
              if (parsed.tokens !== undefined) {
                setResponse(prev => ({
                  content: fullContent,
                  tokens: parsed.tokens,
                  cost: parsed.cost,
                  model: parsed.model,
                }));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      setResponse({
        content: fullContent,
        tokens: 0,
        cost: 0,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [defaultConfig]);

  return {
    isLoading,
    error,
    response,
    submitPrompt,
    submitStream,
    reset,
  };
}
