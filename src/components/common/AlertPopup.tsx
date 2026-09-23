import React from 'react';
import { Ban, AlertTriangle, Check, Info, X } from 'lucide-react';

export type AlertType = 'error' | 'warning' | 'success' | 'info';

export interface AlertPopupProps {
  type: AlertType;
  message: string;
  title?: string;
  onDismiss?: () => void;
  className?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const AlertPopup: React.FC<AlertPopupProps> = ({
  type,
  message,
  title,
  onDismiss,
  className = '',
  action
}) => {
  const getThemeStyles = () => {
    switch (type) {
      case 'error':
        return {
          icon: <Ban className="w-5 h-5 text-white stroke-[2.5]" />,
          badgeBg: 'bg-[#E53935]',
          containerBg: 'bg-[#2A1214] border-[#571B20]'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-white stroke-[2.5]" />,
          badgeBg: 'bg-[#F59E0B]',
          containerBg: 'bg-[#2D1E0B] border-[#5E3D12]'
        };
      case 'success':
        return {
          icon: <Check className="w-5 h-5 text-white stroke-[3]" />,
          badgeBg: 'bg-[#22C55E]',
          containerBg: 'bg-[#112718] border-[#1C532E]'
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-5 h-5 text-white stroke-[2.5]" />,
          badgeBg: 'bg-[#0284C7]',
          containerBg: 'bg-[#0B2035] border-[#154773]'
        };
    }
  };

  const theme = getThemeStyles();

  return (
    <div
      role="alert"
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-2xl transition-all duration-200 p-2.5 sm:p-3 flex items-center gap-3.5 shadow-xl shadow-black/40 text-white ${theme.containerBg} ${className}`}
    >
      {/* Solid Vibrant Squircle Icon Badge */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${theme.badgeBg}`}>
        {theme.icon}
      </div>

      {/* Message & Optional Title */}
      <div className="flex-1 min-w-0 pr-1">
        {title && (
          <div className="text-xs font-bold text-white/80 font-mono uppercase tracking-wider mb-0.5 truncate">
            {title}
          </div>
        )}
        <div className="text-sm font-medium text-white leading-normal break-words">
          {message}
        </div>
      </div>

      {/* Optional action */}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all shrink-0 cursor-pointer"
        >
          {action.label}
        </button>
      )}

      {/* Dismiss Button with Subdued Hover Container */}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0"
          title="Dismiss alert"
        >
          <X className="w-4 h-4 stroke-[2.2]" />
        </button>
      )}
    </div>
  );
};
