'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { StreamingText } from './StreamingText';
import { Button } from '@/app/components/ui/Button';
import { Card } from '@/app/components/ui/Card';

interface ResponseDisplayProps {
  content: string;
  isStreaming?: boolean;
  tokens?: number;
  cost?: number;
  model?: string;
  error?: string | null;
}

export function ResponseDisplay({
  content,
  isStreaming = false,
  tokens,
  cost,
  model,
  error,
}: ResponseDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (error) {
    return (
      <Card className="p-4 bg-red-50 border-red-200">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!content && !isStreaming) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Response</h3>
        <div className="flex items-center gap-3">
          {tokens !== undefined && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">{tokens.toLocaleString()}</span> tokens
            </div>
          )}
          {cost !== undefined && cost > 0 && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">${cost.toFixed(4)}</span>
            </div>
          )}
          {model && (
            <div className="text-sm text-gray-500">
              {model}
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!content}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="prose prose-sm max-w-none">
        {isStreaming ? (
          <StreamingText content={content} isStreaming={isStreaming} />
        ) : (
          <ReactMarkdown
            components={{
              code: ({ node, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                return match ? (
                  <code className={`${className} block bg-gray-100 p-3 rounded-md overflow-x-auto`} {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="bg-gray-100 px-1 py-0.5 rounded" {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto my-3">{children}</pre>,
              h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
              ul: ({ children }) => <ul className="list-disc pl-6 my-3 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-6 my-3 space-y-1">{children}</ol>,
              p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-gray-300 pl-4 italic my-3 text-gray-700">
                  {children}
                </blockquote>
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        )}
      </div>
    </Card>
  );
}
