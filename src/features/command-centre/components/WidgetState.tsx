import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { SectionAvailability } from '../types';

interface WidgetStateProps {
  status: 'idle' | 'loading' | 'refreshing' | 'success' | 'error';
  error?: string | null;
  availability?: SectionAvailability;
  reason?: string | null;
  emptyMessage?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

export function WidgetState({
  status,
  error,
  availability,
  reason,
  emptyMessage = 'No data is available for this range.',
  onRetry,
  children
}: WidgetStateProps) {
  if (status === 'loading' || status === 'idle') {
    return <div className="cc-widget-skeleton" aria-label="Loading widget" />;
  }

  if (status === 'error') {
    return (
      <div className="cc-state cc-state-error" role="alert">
        <AlertCircle size={17} aria-hidden="true" />
        <div>
          <strong>Couldn’t load this widget</strong>
          <p>{error || 'The data service returned an error.'}</p>
        </div>
        {onRetry && (
          <button type="button" className="cc-text-button" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    );
  }

  if (availability === 'unsupported') {
    return (
      <div className="cc-state cc-state-empty">
        <span className="cc-state-mark" aria-hidden="true">-</span>
        <p>{reason || 'This metric is not supported by the current data.'}</p>
      </div>
    );
  }

  if (availability === 'empty') {
    return (
      <div className="cc-state cc-state-empty">
        <span className="cc-state-mark" aria-hidden="true">0</span>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      {status === 'refreshing' && <span className="cc-refreshing"><RefreshCw size={12} aria-hidden="true" /> Refreshing</span>}
      {children}
    </>
  );
}

export function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="cc-loading-rows" aria-label="Loading rows">
      {Array.from({ length: count }, (_, index) => <span key={index} />)}
    </div>
  );
}
