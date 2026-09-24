import { useMemo, useState } from 'react';

/**
 * Paginate-on-demand for a list that's too long to render all at once.
 *
 * Shows `pageSize` items initially and grows by `pageSize` each time
 * `showMore()` is called. Resets back to `pageSize` whenever `resetKey`
 * changes (e.g. a filter or search term changed), so switching filters
 * doesn't leave you stuck scrolled deep into a stale page.
 *
 * The reset uses the render-time "derived state" pattern (comparing
 * resetKey to a stored previous value and adjusting state during render)
 * rather than setState-in-a-useEffect, which avoids an extra render pass.
 */
export function useRevealMore<T>(items: T[], pageSize: number, resetKey?: string | number) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [prevResetKey, setPrevResetKey] = useState(resetKey);

  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setVisibleCount(pageSize);
  }

  const shown = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;
  const remaining = Math.max(0, items.length - visibleCount);

  const showMore = () => setVisibleCount(prev => Math.min(prev + pageSize, items.length));
  const reset = () => setVisibleCount(pageSize);

  return { shown, hasMore, remaining, showMore, reset, visibleCount, total: items.length };
}

export default useRevealMore;
