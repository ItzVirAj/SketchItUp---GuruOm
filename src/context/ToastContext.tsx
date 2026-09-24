import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Ban, AlertTriangle, Check, Info, X } from 'lucide-react';

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

// Expose on window for runtime testing — DEV BUILDS ONLY. In production this
// handle let any injected or third-party script fabricate convincing "success"
// toasts, which is a cheap social-engineering primitive (e.g. faking a
// "Payment recorded" confirmation). import.meta.env.DEV is statically replaced
// at build time, so this block is dead-code-eliminated from prod bundles.
if (import.meta.env.DEV && typeof window !== 'undefined') {
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

  const contextValue = useMemo(() => ({
    toasts,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info
  }), [toasts, showToast, removeToast, success, error, warning, info]);

  return (
    <ToastContext.Provider value={contextValue}>
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
      case 'error':
        return {
          icon: <Ban className="w-5 h-5 text-white stroke-[2.5]" />,
          badgeBg: 'bg-[#E53935]',
          containerBg: 'bg-[#2A1214] border-[#571B20]',
          progressColor: 'bg-[#E53935]'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-white stroke-[2.5]" />,
          badgeBg: 'bg-[#F59E0B]',
          containerBg: 'bg-[#2D1E0B] border-[#5E3D12]',
          progressColor: 'bg-[#F59E0B]'
        };
      case 'success':
        return {
          icon: <Check className="w-5 h-5 text-white stroke-[3]" />,
          badgeBg: 'bg-[#22C55E]',
          containerBg: 'bg-[#112718] border-[#1C532E]',
          progressColor: 'bg-[#22C55E]'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-white stroke-[2.5]" />,
          badgeBg: 'bg-[#0284C7]',
          containerBg: 'bg-[#0B2035] border-[#154773]',
          progressColor: 'bg-[#0284C7]'
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div
      role="alert"
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-2xl transition-[color,background-color,border-color,outline-color,box-shadow,opacity,transform,translate,scale,rotate,filter,backdrop-filter] duration-300 transform translate-y-0 opacity-100 p-2.5 sm:p-3 flex items-center gap-3.5 shadow-2xl shadow-black/60 animate-in slide-in-from-bottom-4 fade-in duration-200 text-white ${theme.containerBg}`}
    >
      {/* Solid Vibrant Squircle Icon Badge */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${theme.badgeBg}`}>
        {theme.icon}
      </div>

      {/* Message & Optional Title */}
      <div className="flex-1 min-w-0 pr-1">
        {item.title && item.title !== 'Operation Failed' && item.title !== 'Created Successfully' && item.title !== 'Warning' && item.title !== 'Info' && (
          <div className="text-xs font-bold text-white/80 font-mono uppercase tracking-wider mb-0.5 truncate">
            {item.title}
          </div>
        )}
        <div className="text-sm font-medium text-white leading-normal break-words">
          {item.message}
        </div>
      </div>

      {/* Dismiss Button with Subdued Hover Container */}
      <button
        type="button"
        onClick={onDismiss}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0"
        title="Dismiss alert"
      >
        <X className="w-4 h-4 stroke-[2.2]" />
      </button>

      {/* Subtle Countdown Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 overflow-hidden">
          <div
            className={`h-full ${theme.progressColor} origin-left opacity-90`}
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
