import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Drives a single modal's open/closed state from the `modal` (or custom `paramKey`) query param.
 * Any additional params passed to open() are also written to the URL and
 * returned back out, so the modal component can read e.g. itemId/orderId/challanNo
 * straight from the hook instead of prop-drilling or duplicating state.
 */
export function useUrlModal<TParams extends Record<string, string> = Record<string, string>>(
  modalId: string,
  paramKey: string = 'modal'
) {
  const [searchParams, setSearchParams] = useSearchParams();

  const isOpen = searchParams.get(paramKey) === modalId;

  const params = useMemo(() => {
    if (!isOpen) return {} as TParams;
    const out: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== 'modal' && key !== 'modal2') {
        out[key] = value;
      }
    });
    return out as TParams;
  }, [isOpen, searchParams]);

  const open = useCallback((newParams?: Record<string, string | number | boolean | undefined | null>) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (paramKey === 'modal') {
        // Clear secondary modal if opening a primary modal
        next.delete('modal2');
        // Clear previous modal query params
        Array.from(next.keys()).forEach(k => {
          if (k !== 'modal' && k !== 'modal2') {
            next.delete(k);
          }
        });
      }
      next.set(paramKey, modalId);
      if (newParams) {
        Object.entries(newParams).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') {
            next.set(k, String(v));
          }
        });
      }
      return next;
    }, { replace: true });
  }, [modalId, paramKey, setSearchParams]);

  const close = useCallback(() => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(paramKey);
      if (paramKey === 'modal') {
        next.delete('modal2');
        // Read extra keys fresh from prev (not from stale params closure)
        // to avoid identity-change-driven effect loops auto-closing the modal.
        prev.forEach((_, key) => {
          if (key !== 'modal' && key !== 'modal2') {
            next.delete(key);
          }
        });
      }
      return next;
    }, { replace: true }); // replace:true prevents history stack pollution that causes back-button loops
  }, [paramKey, setSearchParams]); // ← params removed from deps; close() is now stable

  return { isOpen, params, open, close };
}

export default useUrlModal;
