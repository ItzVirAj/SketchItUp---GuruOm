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
  const isMouseDownOnBackdrop = useRef<boolean>(false);

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
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/60 backdrop-blur-xl animate-in fade-in duration-200 font-sans ${containerClassName}`}
      data-lenis-prevent="true"
      onMouseDown={(e) => {
        isMouseDownOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (closeOnBackdropClick && e.target === e.currentTarget && isMouseDownOnBackdrop.current) {
          onClose();
        }
        isMouseDownOnBackdrop.current = false;
      }}
    >
      <div
        ref={modalContentRef}
        data-lenis-prevent="true"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidthClass} max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-t-[32px] sm:rounded-[26px] border shadow-[0_32px_100px_rgba(0,0,0,0.5),0_10px_40px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_120px_rgba(0,0,0,0.9),0_12px_48px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-all overflow-hidden overscroll-contain modal-animate-enter ${
          isDarkMode
            ? 'bg-[#141416]/98 border-white/[0.14] text-white ring-1 ring-white/[0.08]'
            : 'bg-[#FCFCFD]/98 border-slate-200/90 text-slate-900 ring-1 ring-black/[0.04]'
        } ${className}`}
      >
        {/* Apple Top Specular Highlight Line */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/25 dark:via-white/15 to-transparent absolute top-0 inset-x-0 pointer-events-none z-10" />

        {/* Mobile Grab Handle */}
        <div className="pt-3 pb-1 block sm:hidden">
          <div className="w-10 h-1.2 bg-slate-300 dark:bg-white/20 rounded-full mx-auto" />
        </div>

        {/* Region 1: Apple Sheet Header */}
        {(title || icon || !hideCloseButton || headerRight) && (
          <div
            className={`shrink-0 px-5 sm:px-6 py-4.5 border-b flex items-center justify-between gap-4 select-none ${
              isDarkMode
                ? 'border-white/[0.08] bg-white/[0.02] text-white'
                : 'border-slate-200/80 bg-slate-50/60 text-slate-900'
            } ${headerClassName}`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {icon && (
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-primary)]/25 shadow-xs shrink-0"
                >
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h3
                    className={`font-extrabold text-[15px] sm:text-base tracking-tight truncate ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p
                    className={`text-xs truncate mt-0.5 font-normal ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              {headerRight}
              {!hideCloseButton && (
                <button
                  type="button"
                  onClick={onClose}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                    isDarkMode 
                      ? 'bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white border border-white/10 shadow-xs' 
                      : 'bg-black/5 hover:bg-black/10 text-slate-500 hover:text-slate-800 border border-black/5 shadow-2xs'
                  }`}
                  aria-label="Close modal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Region 2: Scrollable Body */}
        <div
          data-lenis-prevent="true"
          className={`flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 overscroll-contain space-y-4.5 text-xs font-sans ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Region 3: Apple Sheet Footer */}
        {footer && (
          <div
            className={`shrink-0 px-5 sm:px-6 py-4 border-t flex flex-wrap items-center justify-between gap-3 select-none ${
              isDarkMode
                ? 'border-white/[0.08] bg-[#111114]/90 text-slate-300 backdrop-blur-md'
                : 'border-slate-200/80 bg-slate-50/80 text-slate-700 backdrop-blur-md'
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
