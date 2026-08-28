import { useEffect, useState, useRef, RefObject } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh(
  containerRef: RefObject<HTMLElement | null>,
  { onRefresh, threshold = 65, maxPull = 100 }: UsePullToRefreshOptions
) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0) {
        startY.current = e.touches[0].clientY;
        isPulling.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && el.scrollTop <= 0) {
        // Apply resistance dampening curve
        const dampened = Math.min(diff * 0.45, maxPull);
        setPullDistance(dampened);
        if (e.cancelable && dampened > 10) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling.current) return;
      isPulling.current = false;

      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(threshold);
        try {
          await onRefresh();
        } catch (err) {
          console.warn('Pull-to-refresh failed:', err);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef, onRefresh, threshold, maxPull, pullDistance, isRefreshing]);

  return {
    pullDistance,
    isRefreshing,
    isTriggered: pullDistance >= threshold
  };
}
