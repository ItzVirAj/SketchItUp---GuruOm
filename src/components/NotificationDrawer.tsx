import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  Cpu,
  Info,
  Layers,
  Radio,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

import { InAppNotification } from '../services/notificationService';

// ── Styles (Transitions.dev — Panel reveal) ──────────────
const __TRANSITION_STYLES = `
:root {
  --panel-open-dur: 400ms;
  --panel-close-dur: 350ms;
  --panel-translate-y: calc(187px * 0.5);
  --panel-blur: 2px;
  --panel-ease: cubic-bezier(0.22, 1, 0.36, 1);
}

.t-panel-slide {
  transform: translateY(var(--panel-translate-y));
  opacity: 0;
  filter: blur(var(--panel-blur));
  pointer-events: none;
  transition:
    transform var(--panel-close-dur) var(--panel-ease),
    opacity   var(--panel-close-dur) var(--panel-ease),
    filter    var(--panel-close-dur) var(--panel-ease);
  will-change: transform, opacity, filter;
}
.t-panel-slide[data-open="true"] {
  transform: translateY(0);
  opacity: 1;
  filter: blur(0);
  pointer-events: auto;
  transition:
    transform var(--panel-open-dur) var(--panel-ease),
    opacity   var(--panel-open-dur) var(--panel-ease),
    filter    var(--panel-open-dur) var(--panel-ease);
}

@media (prefers-reduced-motion: reduce) {
  .t-panel-slide { transition: none !important; }
}
`;
if (typeof document !== 'undefined' && !document.getElementById('transitions-p3')) {
  const __style = document.createElement('style');
  __style.id = 'transitions-p3';
  __style.textContent = __TRANSITION_STYLES;
  document.head.appendChild(__style);
}

export type NotificationSectionKey =
  | 'all'
  | 'critical'
  | 'production'
  | 'quality'
  | 'logistics'
  | 'finance';

type NotificationCategory =
  | Exclude<NotificationSectionKey, 'all'>
  | 'system';

interface IconProps {
  className?: string;
  strokeWidth?: number;
}

interface SectionConfig {
  key: NotificationSectionKey;
  label: string;
  shortLabel: string;
  icon: ComponentType<IconProps>;
  darkIconClass: string;
  lightIconClass: string;
  darkBadgeClass: string;
  lightBadgeClass: string;
}

const SECTIONS_CONFIG: SectionConfig[] = [
  {
    key: 'all',
    label: 'All notifications',
    shortLabel: 'All',
    icon: Layers,
    darkIconClass: 'text-slate-300',
    lightIconClass: 'text-slate-600',
    darkBadgeClass:
      'border-white/10 bg-white/[0.06] text-slate-300',
    lightBadgeClass:
      'border-slate-200 bg-slate-100 text-slate-700',
  },
  {
    key: 'critical',
    label: 'Critical and high-priority alerts',
    shortLabel: 'Critical',
    icon: AlertOctagon,
    darkIconClass: 'text-rose-400',
    lightIconClass: 'text-rose-600',
    darkBadgeClass:
      'border-rose-400/20 bg-rose-400/10 text-rose-300',
    lightBadgeClass:
      'border-rose-200 bg-rose-50 text-rose-700',
  },
  {
    key: 'production',
    label: 'Production and shopfloor',
    shortLabel: 'Production',
    icon: Cpu,
    darkIconClass: 'text-amber-400',
    lightIconClass: 'text-amber-700',
    darkBadgeClass:
      'border-amber-400/20 bg-amber-400/10 text-amber-300',
    lightBadgeClass:
      'border-amber-200 bg-amber-50 text-amber-800',
  },
  {
    key: 'quality',
    label: 'Quality, QC and PDI',
    shortLabel: 'Quality',
    icon: ShieldCheck,
    darkIconClass: 'text-emerald-400',
    lightIconClass: 'text-emerald-700',
    darkBadgeClass:
      'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    lightBadgeClass:
      'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  {
    key: 'logistics',
    label: 'Orders and logistics',
    shortLabel: 'Logistics',
    icon: Truck,
    darkIconClass: 'text-sky-400',
    lightIconClass: 'text-sky-700',
    darkBadgeClass:
      'border-sky-400/20 bg-sky-400/10 text-sky-300',
    lightBadgeClass:
      'border-sky-200 bg-sky-50 text-sky-700',
  },
  {
    key: 'finance',
    label: 'Finance and billing',
    shortLabel: 'Finance',
    icon: Receipt,
    darkIconClass: 'text-violet-400',
    lightIconClass: 'text-violet-700',
    darkBadgeClass:
      'border-violet-400/20 bg-violet-400/10 text-violet-300',
    lightBadgeClass:
      'border-violet-200 bg-violet-50 text-violet-700',
  },
];

const SECTION_CONFIG_MAP = Object.fromEntries(
  SECTIONS_CONFIG.map((section) => [section.key, section]),
) as Record<NotificationSectionKey, SectionConfig>;

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll?: () => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
  isDarkMode: boolean;
}

interface SeverityConfig {
  label: string;
  icon: ComponentType<IconProps>;
  iconClass: string;
  containerClass: string;
  accentClass: string;
}

function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function classifyNotification(
  notification: InAppNotification,
): NotificationCategory {
  const type = normalizeValue(notification.type);
  const title = normalizeValue(notification.title);
  const entity = normalizeValue(notification.entity_type);
  const severity = normalizeValue(notification.severity);

  if (
    severity === 'critical' ||
    severity === 'high' ||
    type.includes('critical') ||
    type.includes('breakdown') ||
    title.includes('critical') ||
    title.includes('breakdown')
  ) {
    return 'critical';
  }

  if (
    type.includes('qc') ||
    type.includes('pdi') ||
    type.includes('quality') ||
    entity.includes('qc') ||
    entity.includes('pdi') ||
    entity.includes('quality') ||
    title.includes('qc') ||
    title.includes('pdi') ||
    title.includes('quality') ||
    title.includes('defect') ||
    title.includes('inspection')
  ) {
    return 'quality';
  }

  if (
    type.includes('prod') ||
    type.includes('machine') ||
    type.includes('job') ||
    type.includes('shortage') ||
    entity.includes('job') ||
    entity.includes('machine') ||
    entity.includes('production') ||
    title.includes('production') ||
    title.includes('machine') ||
    title.includes('shopfloor') ||
    title.includes('stock') ||
    title.includes('shortage')
  ) {
    return 'production';
  }

  if (
    type.includes('order') ||
    type.includes('dispatch') ||
    type.includes('challan') ||
    type.includes('delivery') ||
    type.includes('shipment') ||
    entity.includes('order') ||
    entity.includes('dispatch') ||
    entity.includes('shipment') ||
    title.includes('challan') ||
    title.includes('delivery') ||
    title.includes('dispatch') ||
    title.includes('shipment')
  ) {
    return 'logistics';
  }

  if (
    type.includes('invoice') ||
    type.includes('payment') ||
    type.includes('bill') ||
    type.includes('finance') ||
    entity.includes('invoice') ||
    entity.includes('payment') ||
    title.includes('invoice') ||
    title.includes('payment') ||
    title.includes('billing') ||
    title.includes('overdue')
  ) {
    return 'finance';
  }

  return 'system';
}

function getSeverityConfig(severityValue: unknown): SeverityConfig {
  const severity = normalizeValue(severityValue);

  switch (severity) {
    case 'critical':
      return {
        label: 'Critical',
        icon: AlertOctagon,
        iconClass: 'text-rose-500',
        containerClass:
          'border-rose-500/25 bg-rose-500/10',
        accentClass: 'bg-rose-500',
      };

    case 'high':
      return {
        label: 'High',
        icon: AlertTriangle,
        iconClass: 'text-orange-500',
        containerClass:
          'border-orange-500/25 bg-orange-500/10',
        accentClass: 'bg-orange-500',
      };

    case 'medium':
      return {
        label: 'Medium',
        icon: AlertTriangle,
        iconClass: 'text-amber-500',
        containerClass:
          'border-amber-500/25 bg-amber-500/10',
        accentClass: 'bg-amber-500',
      };

    case 'low':
      return {
        label: 'Low',
        icon: Info,
        iconClass: 'text-sky-500',
        containerClass:
          'border-sky-500/25 bg-sky-500/10',
        accentClass: 'bg-sky-500',
      };

    default:
      return {
        label: 'Information',
        icon: Info,
        iconClass: 'text-indigo-500',
        containerClass:
          'border-indigo-500/25 bg-indigo-500/10',
        accentClass: 'bg-indigo-500',
      };
  }
}

function getSectionConfig(
  category: NotificationCategory,
): SectionConfig | null {
  if (category === 'system') {
    return null;
  }

  return SECTION_CONFIG_MAP[category];
}

function formatNotificationDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  const now = new Date();
  const differenceInMilliseconds = now.getTime() - date.getTime();
  const differenceInMinutes = Math.floor(
    differenceInMilliseconds / 60_000,
  );
  const differenceInHours = Math.floor(
    differenceInMilliseconds / 3_600_000,
  );
  const differenceInDays = Math.floor(
    differenceInMilliseconds / 86_400_000,
  );

  if (differenceInMinutes >= 0 && differenceInMinutes < 1) {
    return 'Just now';
  }

  if (differenceInMinutes >= 1 && differenceInMinutes < 60) {
    return `${differenceInMinutes}m ago`;
  }

  if (differenceInHours >= 1 && differenceInHours < 24) {
    return `${differenceInHours}h ago`;
  }

  if (differenceInDays === 1) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year:
      date.getFullYear() !== now.getFullYear()
        ? 'numeric'
        : undefined,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function getSearchableText(notification: InAppNotification): string {
  return [
    notification.title,
    notification.message,
    notification.type,
    notification.entity_type,
    notification.severity,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export const NotificationDrawer: React.FC<
  NotificationDrawerProps
> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  isSoundEnabled,
  onToggleSound,
  isDarkMode,
}) => {
    const [mounted, setMounted] = useState(false);
    const [isRendered, setIsRendered] = useState(isOpen);
    const [openState, setOpenState] = useState(false);
    const [activeTab, setActiveTab] =
      useState<NotificationSectionKey>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const drawerRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const tabsContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    useEffect(() => {
      if (isOpen) {
        setIsRendered(true);
        const frame = requestAnimationFrame(() => {
          setOpenState(true);
        });
        return () => cancelAnimationFrame(frame);
      } else {
        setOpenState(false);
        setSearchQuery('');
        const timer = setTimeout(() => {
          setIsRendered(false);
        }, 360);
        return () => clearTimeout(timer);
      }
    }, [isOpen]);

    // Lock page scrolling and manage dialog focus.
    useEffect(() => {
      if (!isOpen || typeof document === 'undefined') {
        return;
      }

      const previouslyFocusedElement =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      const previousOverflow = document.body.style.overflow;
      const previousPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';

      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      const focusTimer = window.setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      return () => {
        window.clearTimeout(focusTimer);
        document.body.style.overflow = previousOverflow;
        document.body.style.paddingRight = previousPaddingRight;
        previouslyFocusedElement?.focus();
      };
    }, [isOpen]);

    // Escape key and keyboard focus trap.
    useEffect(() => {
      if (!isOpen) {
        return;
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
          return;
        }

        if (event.key !== 'Tab' || !drawerRef.current) {
          return;
        }

        const focusableElements =
          drawerRef.current.querySelectorAll<HTMLElement>(
            [
              'button:not([disabled])',
              'input:not([disabled])',
              'select:not([disabled])',
              'textarea:not([disabled])',
              'a[href]',
              '[tabindex]:not([tabindex="-1"])',
            ].join(','),
          );

        if (focusableElements.length === 0) {
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement =
          focusableElements[focusableElements.length - 1];

        if (
          event.shiftKey &&
          document.activeElement === firstElement
        ) {
          event.preventDefault();
          lastElement.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === lastElement
        ) {
          event.preventDefault();
          firstElement.focus();
        }
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [isOpen, onClose]);

    // Convert vertical mouse-wheel movement into horizontal tab scrolling.
    useEffect(() => {
      if (!isOpen) {
        return;
      }

      const tabsElement = tabsContainerRef.current;

      if (!tabsElement) {
        return;
      }

      const handleWheel = (event: WheelEvent) => {
        if (
          Math.abs(event.deltaY) <= Math.abs(event.deltaX) ||
          event.deltaY === 0
        ) {
          return;
        }

        event.preventDefault();
        tabsElement.scrollLeft += event.deltaY;
      };

      tabsElement.addEventListener('wheel', handleWheel, {
        passive: false,
      });

      return () => {
        tabsElement.removeEventListener('wheel', handleWheel);
      };
    }, [isOpen]);

    const { groupedNotifications, sectionCounts } = useMemo(() => {
      const groups: Record<
        NotificationCategory,
        InAppNotification[]
      > = {
        critical: [],
        production: [],
        quality: [],
        logistics: [],
        finance: [],
        system: [],
      };

      const counts: Record<NotificationSectionKey, number> = {
        all: notifications.length,
        critical: 0,
        production: 0,
        quality: 0,
        logistics: 0,
        finance: 0,
      };

      notifications.forEach((notification) => {
        const category = classifyNotification(notification);

        groups[category].push(notification);

        if (category !== 'system') {
          counts[category] += 1;
        }
      });

      return {
        groupedNotifications: groups,
        sectionCounts: counts,
      };
    }, [notifications]);

    const filteredNotifications = useMemo(() => {
      const sectionNotifications =
        activeTab === 'all'
          ? notifications
          : groupedNotifications[activeTab];

      const normalizedQuery = searchQuery.trim().toLowerCase();

      if (!normalizedQuery) {
        return sectionNotifications;
      }

      return sectionNotifications.filter((notification) =>
        getSearchableText(notification).includes(normalizedQuery),
      );
    }, [
      activeTab,
      groupedNotifications,
      notifications,
      searchQuery,
    ]);

    const selectedSection = SECTION_CONFIG_MAP[activeTab];

    if (!mounted || !isRendered) {
      return null;
    }

    const drawerContent = (
      <div
        className="fixed inset-0 z-[9999] font-sans flex flex-col justify-end items-center pointer-events-none overflow-hidden"
        data-lenis-prevent="true"
      >
        {/* Backdrop */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close notifications"
          onClick={onClose}
          className={`fixed inset-0 h-full w-full cursor-default bg-slate-950/65 backdrop-blur-md transition-opacity duration-300 pointer-events-auto ${
            openState ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Bottom Sheet Travel Wrapper (clips travel area) */}
        <div className="w-full flex justify-center overflow-hidden pointer-events-none px-2 sm:px-4 pb-2 sm:pb-4 z-10">
          <div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="notification-drawer-title"
            aria-describedby="notification-drawer-description"
            data-lenis-prevent="true"
            data-open={openState}
            onClick={(event) => event.stopPropagation()}
            className={[
              't-panel-slide pointer-events-auto relative flex flex-col w-full max-w-2xl max-h-[82vh] overflow-hidden',
              'rounded-[28px] sm:rounded-[32px] border shadow-[0_-24px_70px_-15px_rgba(0,0,0,0.75)] backdrop-blur-3xl transition-all',
              isDarkMode
                ? 'border-white/15 bg-gradient-to-b from-[#14161F]/98 via-[#0C0D12]/98 to-[#050608]/98 text-white'
                : 'border-slate-200/90 bg-white/95 text-slate-950 shadow-[0_-20px_50px_-15px_rgba(15,23,42,0.22)]',
            ].join(' ')}
          >
            {/* Ambient subtle decoration */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
            >
              <div className="absolute -right-28 -top-36 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="absolute -left-28 bottom-0 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
            </div>

            {/* Apple Sheet Pull Handle Grabber */}
            <div className="pt-2.5 pb-1 flex justify-center shrink-0 cursor-pointer" onClick={onClose} title="Dismiss">
              <div
                className={[
                  'w-11 h-1.25 rounded-full transition-colors',
                  isDarkMode ? 'bg-white/25 hover:bg-white/45' : 'bg-slate-300 hover:bg-slate-400',
                ].join(' ')}
              />
            </div>

            {/* Header */}
            <header
              className={[
                'relative z-10 shrink-0 border-b px-5 pb-3.5 pt-1 sm:px-6',
                isDarkMode ? 'border-white/[0.08]' : 'border-slate-200/80',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/25">
                    <Bell className="h-5 w-5" strokeWidth={2.2} />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-rose-500 px-1 text-[9px] font-bold leading-none text-white dark:border-[#0C0D12]">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2
                        id="notification-drawer-title"
                        className={[
                          'text-base font-bold tracking-tight',
                          isDarkMode ? 'text-white' : 'text-slate-950',
                        ].join(' ')}
                      >
                        Operations Center
                      </h2>

                      <span
                        className={[
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                          isDarkMode
                            ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                        ].join(' ')}
                      >
                        <Radio className="h-2.5 w-2.5" />
                        Live
                      </span>
                    </div>

                    <p
                      id="notification-drawer-description"
                      className={[
                        'mt-0.5 text-xs truncate',
                        isDarkMode ? 'text-slate-400' : 'text-slate-500',
                      ].join(' ')}
                    >
                      Real-time factory telemetry, orders, QC & production alerts
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onToggleSound}
                    aria-label={
                      isSoundEnabled
                        ? 'Mute notification sounds'
                        : 'Enable notification sounds'
                    }
                    aria-pressed={isSoundEnabled}
                    title={
                      isSoundEnabled
                        ? 'Notification sounds enabled'
                        : 'Notification sounds muted'
                    }
                    className={[
                      'flex h-8 w-8 items-center justify-center rounded-full border transition-all',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      'active:scale-95',
                      isDarkMode
                        ? 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-white/20 hover:bg-white/[0.10] hover:text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900',
                    ].join(' ')}
                  >
                    {isSoundEnabled ? (
                      <Volume2 className="h-4 w-4 text-indigo-400" />
                    ) : (
                      <VolumeX className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onClose}
                    aria-label="Close notifications"
                    title="Close"
                    className={[
                      'flex h-8 w-8 items-center justify-center rounded-full border transition-all',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      'active:scale-95',
                      isDarkMode
                        ? 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-white/20 hover:bg-white/[0.10] hover:text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900',
                    ].join(' ')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Quick Stat Pill Bar */}
              <div className="mt-3 flex items-center gap-2">
                <div
                  className={[
                    'flex items-center gap-2 px-3 py-1 rounded-xl border text-xs',
                    isDarkMode
                      ? 'border-white/[0.08] bg-white/[0.04]'
                      : 'border-slate-200 bg-slate-50/80',
                  ].join(' ')}
                >
                  <span className="text-slate-400 text-[11px] font-medium">Unread:</span>
                  <span className="font-bold text-indigo-400 tabular-nums">{unreadCount}</span>
                </div>
                <div
                  className={[
                    'flex items-center gap-2 px-3 py-1 rounded-xl border text-xs',
                    isDarkMode
                      ? 'border-white/[0.08] bg-white/[0.04]'
                      : 'border-slate-200 bg-slate-50/80',
                  ].join(' ')}
                >
                  <span className="text-slate-400 text-[11px] font-medium">Critical:</span>
                  <span className="font-bold text-rose-400 tabular-nums">{sectionCounts.critical}</span>
                </div>
                <div
                  className={[
                    'flex items-center gap-2 px-3 py-1 rounded-xl border text-xs',
                    isDarkMode
                      ? 'border-white/[0.08] bg-white/[0.04]'
                      : 'border-slate-200 bg-slate-50/80',
                  ].join(' ')}
                >
                  <span className="text-slate-400 text-[11px] font-medium">Total:</span>
                  <span className="font-bold text-slate-300 tabular-nums">{notifications.length}</span>
                </div>
              </div>
            </header>

          {/* Search */}
          <div
            className={[
              'relative z-10 shrink-0 border-b px-4 py-3 sm:px-5',
              isDarkMode
                ? 'border-white/[0.08]'
                : 'border-slate-200/80',
            ].join(' ')}
          >
            <div className="relative">
              <Search
                className={[
                  'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2',
                  isDarkMode
                    ? 'text-slate-500'
                    : 'text-slate-400',
                ].join(' ')}
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(event.target.value)
                }
                placeholder="Search notifications..."
                aria-label="Search notifications"
                className={[
                  'h-10 w-full rounded-xl border pl-10 pr-10 text-sm outline-none transition-all',
                  'focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10',
                  isDarkMode
                    ? 'border-white/10 bg-white/[0.05] text-white placeholder:text-slate-500'
                    : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400',
                ].join(' ')}
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className={[
                    'absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full transition-colors',
                    isDarkMode
                      ? 'text-slate-500 hover:bg-white/10 hover:text-white'
                      : 'text-slate-400 hover:bg-slate-200 hover:text-slate-700',
                  ].join(' ')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Category tabs */}
          <div
            ref={tabsContainerRef}
            role="tablist"
            aria-label="Notification categories"
            data-lenis-prevent="true"
            className={[
              'relative z-10 flex shrink-0 items-center gap-2 overflow-x-auto border-b px-4 py-3 scroll-smooth sm:px-5',
              '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
              isDarkMode
                ? 'border-white/[0.08]'
                : 'border-slate-200/80',
            ].join(' ')}
          >
            {SECTIONS_CONFIG.map((section) => {
              const Icon = section.icon;
              const isActive = activeTab === section.key;
              const count = sectionCounts[section.key];

              return (
                <button
                  key={section.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`${section.label}: ${count}`}
                  onClick={() => setActiveTab(section.key)}
                  className={[
                    'flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                    'active:scale-[0.98]',
                    isActive
                      ? isDarkMode
                        ? 'border-white bg-white text-black shadow-md shadow-white/10 font-bold'
                        : 'border-slate-900 bg-slate-900 text-white shadow-md font-bold'
                      : isDarkMode
                        ? 'border-white/[0.08] bg-white/[0.04] text-slate-300 hover:border-white/15 hover:bg-white/[0.08] hover:text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900',
                  ].join(' ')}
                >
                  <Icon
                    className={[
                      'h-3.5 w-3.5',
                      isActive
                        ? isDarkMode ? 'text-black' : 'text-white'
                        : isDarkMode
                          ? section.darkIconClass
                          : section.lightIconClass,
                    ].join(' ')}
                  />

                  <span>{section.shortLabel}</span>

                  <span
                    className={[
                      'ml-0.5 rounded-md px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums',
                      isActive
                        ? isDarkMode ? 'bg-black/15 text-black' : 'bg-white/20 text-white'
                        : isDarkMode
                          ? 'bg-white/[0.07] text-slate-400'
                          : 'bg-slate-200/80 text-slate-600',
                    ].join(' ')}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action bar */}
          {notifications.length > 0 && (
            <div
              className={[
                'relative z-10 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2.5 sm:px-5',
                isDarkMode
                  ? 'border-white/[0.08] bg-white/[0.015]'
                  : 'border-slate-200/80 bg-slate-50/50',
              ].join(' ')}
            >
              <div className="flex min-w-0 items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllAsRead}
                    className={[
                      'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-all',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      'active:scale-[0.98]',
                      isDarkMode
                        ? 'border-indigo-400/20 bg-indigo-400/10 text-indigo-300 hover:bg-indigo-400/15'
                        : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100',
                    ].join(' ')}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}

                {onClearAll && (
                  <button
                    type="button"
                    onClick={onClearAll}
                    className={[
                      'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition-all',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500',
                      'active:scale-[0.98]',
                      isDarkMode
                        ? 'border-rose-400/20 bg-rose-400/10 text-rose-300 hover:bg-rose-400/15'
                        : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100',
                    ].join(' ')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
              </div>

              <span
                aria-live="polite"
                className={[
                  'shrink-0 text-[10px] font-medium tabular-nums',
                  isDarkMode
                    ? 'text-slate-500'
                    : 'text-slate-500',
                ].join(' ')}
              >
                {filteredNotifications.length}{' '}
                {filteredNotifications.length === 1
                  ? 'result'
                  : 'results'}
              </span>
            </div>
          )}

          {/* Notification feed */}
          <main
            data-lenis-prevent="true"
            className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            {filteredNotifications.length === 0 ? (
              <div className="flex min-h-full items-center justify-center px-8 py-14">
                <div className="max-w-[300px] text-center">
                  <div
                    className={[
                      'mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] border shadow-sm',
                      isDarkMode
                        ? 'border-white/10 bg-white/[0.05]'
                        : 'border-slate-200 bg-slate-50',
                    ].join(' ')}
                  >
                    {searchQuery ? (
                      <Search className="h-6 w-6 text-indigo-500" />
                    ) : (
                      <Sparkles className="h-6 w-6 text-indigo-500" />
                    )}
                  </div>

                  <h3
                    className={[
                      'mt-4 text-sm font-bold',
                      isDarkMode
                        ? 'text-white'
                        : 'text-slate-950',
                    ].join(' ')}
                  >
                    {searchQuery
                      ? 'No matching notifications'
                      : activeTab === 'all'
                        ? 'You’re all caught up'
                        : `No ${selectedSection.shortLabel.toLowerCase()} alerts`}
                  </h3>

                  <p
                    className={[
                      'mt-1.5 text-xs leading-relaxed',
                      isDarkMode
                        ? 'text-slate-400'
                        : 'text-slate-500',
                    ].join(' ')}
                  >
                    {searchQuery
                      ? 'Try another keyword or switch to a different notification category.'
                      : 'New shopfloor and operations events will appear here automatically.'}
                  </p>

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="mt-4 rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-600 active:scale-[0.98]"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3 p-4 sm:p-5">
                {filteredNotifications.map((notification) => {
                  const category =
                    classifyNotification(notification);
                  const sectionConfig =
                    getSectionConfig(category);
                  const severityConfig = getSeverityConfig(
                    notification.severity,
                  );

                  const SeverityIcon = severityConfig.icon;
                  const CategoryIcon =
                    sectionConfig?.icon ?? Info;

                  return (
                    <article
                      key={notification.id}
                      className={[
                        'group relative overflow-hidden rounded-2xl border transition-all duration-200',
                        notification.is_read
                          ? isDarkMode
                            ? 'border-white/[0.08] bg-gradient-to-b from-[#181A22] to-[#101217] hover:border-white/15 hover:from-[#1D1F29] hover:to-[#14161C]'
                            : 'border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-white hover:shadow-md'
                          : isDarkMode
                            ? 'border-indigo-400/25 bg-gradient-to-b from-[#1E2230] to-[#131620] shadow-[0_8px_25px_rgba(0,0,0,0.35)] hover:border-indigo-400/40 hover:from-[#242838] hover:to-[#181B26]'
                            : 'border-indigo-200 bg-white shadow-[0_12px_35px_rgba(79,70,229,0.10)] ring-1 ring-indigo-500/5 hover:border-indigo-300',
                      ].join(' ')}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            title={severityConfig.label}
                            className={[
                              'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                              severityConfig.containerClass,
                            ].join(' ')}
                          >
                            <SeverityIcon
                              className={[
                                'h-4 w-4',
                                severityConfig.iconClass,
                              ].join(' ')}
                              strokeWidth={2.2}
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                                <span
                                  className={[
                                    'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                                    sectionConfig
                                      ? isDarkMode
                                        ? sectionConfig.darkBadgeClass
                                        : sectionConfig.lightBadgeClass
                                      : isDarkMode
                                        ? 'border-white/10 bg-white/[0.06] text-slate-300'
                                        : 'border-slate-200 bg-slate-100 text-slate-700',
                                  ].join(' ')}
                                >
                                  <CategoryIcon className="h-2.5 w-2.5" />
                                  {sectionConfig?.shortLabel ??
                                    'System'}
                                </span>

                                <span
                                  className={[
                                    'text-[9px] font-semibold uppercase tracking-wider',
                                    severityConfig.iconClass,
                                  ].join(' ')}
                                >
                                  {severityConfig.label}
                                </span>
                              </div>

                              {!notification.is_read && (
                                <span
                                  aria-label="Unread notification"
                                  className="relative mt-1 flex h-2.5 w-2.5 shrink-0"
                                >
                                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-50" />
                                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-500 dark:border-[#15171D]" />
                                </span>
                              )}
                            </div>

                            <h3
                              className={[
                                'mt-2 text-[13px] font-bold leading-snug tracking-tight',
                                isDarkMode
                                  ? 'text-white'
                                  : 'text-slate-950',
                              ].join(' ')}
                            >
                              {notification.title}
                            </h3>

                            <p
                              className={[
                                'mt-1 text-xs leading-relaxed',
                                isDarkMode
                                  ? 'text-slate-300'
                                  : 'text-slate-600',
                              ].join(' ')}
                            >
                              {notification.message}
                            </p>

                            <div
                              className={[
                                'mt-3 flex items-center justify-between gap-3 border-t pt-3',
                                isDarkMode
                                  ? 'border-white/[0.07]'
                                  : 'border-slate-200/70',
                              ].join(' ')}
                            >
                              <time
                                dateTime={notification.created_at}
                                title={new Date(
                                  notification.created_at,
                                ).toLocaleString()}
                                className={[
                                  'text-[10px] font-medium tabular-nums',
                                  isDarkMode
                                    ? 'text-slate-500'
                                    : 'text-slate-500',
                                ].join(' ')}
                              >
                                {formatNotificationDate(
                                  notification.created_at,
                                )}
                              </time>

                              {!notification.is_read ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onMarkAsRead(notification.id)
                                  }
                                  className={[
                                    'inline-flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-semibold transition-all',
                                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                                    'active:scale-[0.98]',
                                    isDarkMode
                                      ? 'border-white/10 bg-white/[0.05] text-slate-300 hover:border-indigo-400/30 hover:bg-indigo-400/10 hover:text-indigo-300'
                                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700',
                                  ].join(' ')}
                                >
                                  <Check className="h-3 w-3" />
                                  Mark read
                                </button>
                              ) : (
                                <span
                                  className={[
                                    'inline-flex items-center gap-1 text-[10px] font-medium',
                                    isDarkMode
                                      ? 'text-emerald-400/70'
                                      : 'text-emerald-600',
                                  ].join(' ')}
                                >
                                  <Check className="h-3 w-3" />
                                  Read
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>

          {/* Footer */}
          <footer
            className={[
              'relative z-10 flex shrink-0 items-center justify-between border-t px-5 py-3',
              isDarkMode
                ? 'border-white/[0.08] bg-black/10'
                : 'border-slate-200/80 bg-slate-50/70',
            ].join(' ')}
          >
            <div
              className={[
                'flex items-center gap-1.5 text-[10px] font-medium',
                isDarkMode
                  ? 'text-slate-500'
                  : 'text-slate-500',
              ].join(' ')}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              Live updates connected
            </div>

            <span
              className={[
                'text-[10px] font-medium tabular-nums',
                isDarkMode
                  ? 'text-slate-500'
                  : 'text-slate-500',
              ].join(' ')}
            >
              {notifications.length} total
            </span>
          </footer>
        </div>
      </div>
    </div>
    );

    return createPortal(drawerContent, document.body);
  };

export default NotificationDrawer;
