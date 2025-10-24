'use client';

import { useEffect, useState } from 'react';

interface StreamingTextProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function StreamingText({ content, isStreaming = false, className = '' }: StreamingTextProps) {
  const [displayedContent, setDisplayedContent] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    if (isStreaming) {
      setDisplayedContent(content);
    } else {
      setDisplayedContent(content);
    }
  }, [content, isStreaming]);

  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        setCursorVisible(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setCursorVisible(false);
    }
  }, [isStreaming]);

  return (
    <div className={className}>
      {displayedContent}
      {isStreaming && (
        <span className={`inline-block w-2 h-4 ml-1 bg-blue-500 ${cursorVisible ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </div>
  );
}
