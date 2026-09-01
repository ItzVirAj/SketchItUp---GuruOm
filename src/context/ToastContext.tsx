import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // default: 3000ms
  createdAt: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (toast: Omit<ToastItem, 'id' | 'createdAt'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone toast helper callable from anywhere
type ToastHandler = (toast: Omit<ToastItem, 'id' | 'createdAt'>) => string;
let globalToastHandler: ToastHandler | null = null;

export const toast = {
  show: (t: Omit<ToastItem, 'id' | 'createdAt'>) => {
    if (globalToastHandler) {
      return globalToastHandler(t);
    }
    // Fallback via DOM event
    window.dispatchEvent(new CustomEvent('app:toast', { detail: t }));
    return '';
  },
  success: (message: string, title: string = 'Created Successfully', duration: number = 3000) => {
    return toast.show({ type: 'success', title, message, duration });
  },
  error: (message: string, title: string = 'Operation Failed', duration: number = 3500) => {
    return toast.show({ type: 'error', title, message, duration });
  },
  warning: (message: string, title: string = 'Warning', duration: number = 3000) => {
    return toast.show({ type: 'warning', title, message, duration });
  },
  info: (message: string, title: string = 'Info', duration: number = 3000) => {
    return toast.show({ type: 'info', title, message, duration });
  }
};

// Expose on window for runtime testing
if (typeof window !== 'undefined') {
  (window as any).appToast = toast;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((t: Omit<ToastItem, 'id' | 'createdAt'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const duration = t.duration ?? 3000;
    const newToast: ToastItem = {
      ...t,
      id,
      duration,
      createdAt: Date.now()
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // max 5 concurrent toasts

    // Auto dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const success = useCallback((message: string, title: string = 'Created Successfully', duration: number = 3000) => {
    return showToast({ type: 'success', title, message, duration });
  }, [showToast]);

  const error = useCallback((message: string, title: string = 'Operation Failed', duration: number = 3500) => {
    return showToast({ type: 'error', title, message, duration });
  }, [showToast]);

  const warning = useCallback((message: string, title: string = 'Warning', duration: number = 3000) => {
    return showToast({ type: 'warning', title, message, duration });
  }, [showToast]);

  const info = useCallback((message: string, title: string = 'Info', duration: number = 3000) => {
    return showToast({ type: 'info', title, message, duration });
  }, [showToast]);

  useEffect(() => {
    globalToastHandler = showToast;

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Omit<ToastItem, 'id' | 'createdAt'>>;
      if (customEvent.detail && customEvent.detail.message) {
        showToast(customEvent.detail);
      }
    };

    window.addEventListener('app:toast', handleCustomEvent);
    return () => {
      globalToastHandler = null;
      window.removeEventListener('app:toast', handleCustomEvent);
    };
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, warning, info }}>
      {children}

      {/* ========================================================================= */}
      {/* LEFT CORNER FLOATING TOAST ALERTS CONTAINER (3 SEC AUTO-DISMISS)          */}
      {/* ========================================================================= */}
      <div 
        aria-live="polite"
        className="fixed bottom-5 left-5 z-[99999] flex flex-col gap-2.5 max-w-[360px] sm:max-w-[400px] w-full pointer-events-none select-none font-sans"
      >
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onDismiss={() => removeToast(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

const ToastCard: React.FC<{ item: ToastItem; onDismiss: () => void }> = ({ item, onDismiss }) => {
  const duration = item.duration ?? 3000;

  const getThemeStyles = () => {
    switch (item.type) {
      case 'success':
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />,
          containerBg: 'bg-white/95 dark:bg-slate-900/95 border-emerald-300/80 dark:border-emerald-500/30 text-slate-900 dark:text-slate-100 shadow-[0_8px_30px_rgba(16,185,129,0.15)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)]',
          barColor: 'bg-emerald-500',
          dotGlow: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />,
          containerBg: 'bg-white/95 dark:bg-slate-900/95 border-rose-300/80 dark:border-rose-500/30 text-slate-900 dark:text-slate-100 shadow-[0_8px_30px_rgba(244,63,94,0.15)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)]',
          barColor: 'bg-rose-500',
          dotGlow: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />,
          containerBg: 'bg-white/95 dark:bg-slate-900/95 border-amber-300/80 dark:border-amber-500/30 text-slate-900 dark:text-slate-100 shadow-[0_8px_30px_rgba(245,158,11,0.15)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)]',
          barColor: 'bg-amber-500',
          dotGlow: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-[#5B75F8] dark:text-[#7B92FF] shrink-0" />,
          containerBg: 'bg-white/95 dark:bg-slate-900/95 border-indigo-200 dark:border-indigo-500/30 text-slate-900 dark:text-slate-100 shadow-[0_8px_30px_rgba(91,117,248,0.15)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.6)]',
          barColor: 'bg-[#5B75F8]',
          dotGlow: 'bg-[#5B75F8] shadow-[0_0_8px_rgba(91,117,248,0.8)]'
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-md transition-[color,background-color,border-color,outline-color,box-shadow,opacity,transform,translate,scale,rotate,filter,backdrop-filter] duration-300 transform translate-y-0 opacity-100 p-3.5 flex items-start gap-3 animate-in slide-in-from-bottom-4 fade-in duration-200 ${theme.containerBg}`}
    >
      {/* Icon & Pulse Beacon */}
      <div className="relative mt-0.5 shrink-0 flex items-center justify-center">
        {theme.icon}
        <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${theme.dotGlow}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-2 mb-0.5">
          {item.title && (
            <h4 className="text-xs font-bold tracking-tight text-slate-900 dark:text-white truncate font-mono uppercase">
              {item.title}
            </h4>
          )}
          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 ml-auto">
            now
          </span>
        </div>
        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed break-words font-sans">
          {item.message}
        </p>
      </div>

      {/* Manual Dismiss */}
      <button
        type="button"
        onClick={onDismiss}
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
        title="Dismiss alert"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Subtle 3-Second Countdown Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-slate-200/80 dark:bg-slate-800/80 overflow-hidden">
          <div
            className={`h-full ${theme.barColor} origin-left`}
            style={{
              animation: `shrinkWidth ${duration}ms linear forwards`
            }}
          />
        </div>
      )}
    </div>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
