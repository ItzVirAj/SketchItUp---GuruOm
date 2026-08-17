import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

let activeModalsCount = 0;
let originalBodyOverflow = '';
let originalHtmlOverflow = '';

/**
 * Global hook to lock background scrolling whenever a modal/dialog is mounted or open.
 * Uses reference counting so nested/stacked dialogs don't prematurely unlock scrolling.
 */
export function useBodyScrollLock(isOpen: boolean = true) {
  useEffect(() => {
    if (!isOpen) return;

    if (activeModalsCount === 0) {
      originalBodyOverflow = document.body.style.overflow;
      originalHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }
    activeModalsCount++;

    return () => {
      activeModalsCount = Math.max(0, activeModalsCount - 1);
      if (activeModalsCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.body.classList.remove('modal-open');
      }
    };
  }, [isOpen]);
}

export type ModalMaxWidth = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';

const MAX_WIDTH_MAP: Record<ModalMaxWidth, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-full'
};

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  headerRight?: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: ModalMaxWidth;
  isDarkMode?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEsc?: boolean;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  containerClassName?: string;
  hideCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  headerRight,
  footer,
  maxWidth = '2xl',
  isDarkMode = true,
  closeOnBackdropClick = true,
  closeOnEsc = true,
  children,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  footerClassName = '',
  containerClassName = '',
  hideCloseButton = false
}) => {
  useBodyScrollLock(isOpen);
  const modalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEsc, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = MAX_WIDTH_MAP[maxWidth] || 'max-w-2xl';

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-150 font-sans ${containerClassName}`}
      data-lenis-prevent="true"
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalContentRef}
        data-lenis-prevent="true"
        className={`relative w-full ${maxWidthClass} max-h-[90vh] sm:max-h-[88vh] flex flex-col rounded-3xl border shadow-2xl transition-all overflow-hidden overscroll-contain ${
          isDarkMode
            ? 'bg-slate-900/95 border-slate-800 text-white backdrop-blur-2xl'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
        } ${className}`}
      >
        {/* Region 1: Fixed Header */}
        {(title || icon || !hideCloseButton || headerRight) && (
          <div
            className={`shrink-0 px-6 py-4 border-b flex items-center justify-between gap-4 select-none ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900/95 text-white'
                : 'border-slate-200 bg-slate-50/80 text-slate-900'
            } ${headerClassName}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div
                  className={`p-2.5 rounded-2xl border shrink-0 ${
                    isDarkMode
                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                      : 'bg-indigo-50 text-indigo-600 border-indigo-200'
                  }`}
                >
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3
                    className={`font-bold text-base truncate ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p
                    className={`text-xs truncate ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {headerRight}
              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                    isDarkMode
                      ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900 hover:bg-slate-100 shadow-xs'
                  }`}
                  aria-label="Close modal"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Region 2: Scrollable Body */}
        <div
          data-lenis-prevent="true"
          className={`flex-1 overflow-y-auto p-6 overscroll-contain space-y-4 text-xs font-sans ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Region 3: Fixed Footer */}
        {footer && (
          <div
            className={`shrink-0 px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 select-none ${
              isDarkMode
                ? 'border-slate-800 bg-slate-900/95 text-slate-300'
                : 'border-slate-200 bg-slate-50/80 text-slate-700'
            } ${footerClassName}`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
