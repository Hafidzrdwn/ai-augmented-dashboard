import { useEffect, useState } from 'react';

export function useChartResize(ref) {
  const [resizeToken, setResizeToken] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(() => {
      setResizeToken(t => t + 1);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return resizeToken;
}
