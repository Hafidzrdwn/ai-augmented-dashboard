import { useState, useCallback, useRef } from 'react';

export function useStreamingText() {
  const [text, setText]         = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError]       = useState(null);
  const abortRef                = useRef(false);

  const startStream = useCallback(() => {
    abortRef.current = false;
    setText('');
    setError(null);
    setIsStreaming(true);
  }, []);

  const onChunk = useCallback((delta, full) => {
    if (abortRef.current) return;
    setText(full);
  }, []);

  const onComplete = useCallback((full) => {
    if (abortRef.current) return;
    setText(full);
    setIsStreaming(false);
  }, []);

  const onError = useCallback((msg) => {
    setError(msg);
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current = true;
    setText('');
    setError(null);
    setIsStreaming(false);
  }, []);

  return { text, isStreaming, error, startStream, onChunk, onComplete, onError, reset };
}
