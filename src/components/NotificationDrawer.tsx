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
  Receipt,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';

import { InAppNotification } from '../services/notificationService';

// ─────────────────────────────────────────────────────────────────────
// Types & config
// ─────────────────────────────────────────────────────────────────────

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
  dotColor: string;
}

const SECTIONS_CONFIG: SectionConfig[] = [
  { key: 'all',        label: 'All notifications',           shortLabel: 'All',        icon: Layers,      dotColor: 'bg-neutral-400' },
  { key: 'critical',   label: 'Critical and high-priority',  shortLabel: 'Critical',   icon: AlertOctagon, dotColor: 'bg-rose-500' },
  { key: 'production', label: 'Production and shopfloor',    shortLabel: 'Production', icon: Cpu,          dotColor: 'bg-amber-500' },
  { key: 'quality',    label: 'Quality, QC and PDI',         shortLabel: 'Quality',    icon: ShieldCheck,  dotColor: 'bg-emerald-500' },
  { key: 'logistics',  label: 'Orders and logistics',        shortLabel: 'Logistics',  icon: Truck,        dotColor: 'bg-sky-500' },
  { key: 'finance',    label: 'Finance and billing',         shortLabel: 'Finance',    icon: Receipt,      dotColor: 'bg-violet-500' },
];

const SECTION_CONFIG_MAP = Object.fromEntries(
  SECTIONS_CONFIG.map((s) => [s.key, s]),
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

// ─────────────────────────────────────────────────────────────────────
// Classification helpers (unchanged logic)
// ─────────────────────────────────────────────────────────────────────

function normalizeValue(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function classifyNotification(n: InAppNotification): NotificationCategory {
  const type = normalizeValue(n.type);
  const title = normalizeValue(n.title);
  const entity = normalizeValue(n.entity_type);
  const severity = normalizeValue(n.severity);

  if (severity === 'critical' || severity === 'high' || type.includes('critical') || type.includes('breakdown') || title.includes('critical') || title.includes('breakdown'))
    return 'critical';

  if (type.includes('qc') || type.includes('pdi') || type.includes('quality') || entity.includes('qc') || entity.includes('pdi') || entity.includes('quality') || title.includes('qc') || title.includes('pdi') || title.includes('quality') || title.includes('defect') || title.includes('inspection'))
    return 'quality';

  if (type.includes('prod') || type.includes('machine') || type.includes('job') || type.includes('shortage') || entity.includes('job') || entity.includes('machine') || entity.includes('production') || title.includes('production') || title.includes('machine') || title.includes('shopfloor') || title.includes('stock') || title.includes('shortage'))
    return 'production';

  if (type.includes('order') || type.includes('dispatch') || type.includes('challan') || type.includes('delivery') || type.includes('shipment') || entity.includes('order') || entity.includes('dispatch') || entity.includes('shipment') || title.includes('challan') || title.includes('delivery') || title.includes('dispatch') || title.includes('shipment'))
    return 'logistics';

  if (type.includes('invoice') || type.includes('payment') || type.includes('bill') || type.includes('finance') || entity.includes('invoice') || entity.includes('payment') || title.includes('invoice') || title.includes('payment') || title.includes('billing') || title.includes('overdue'))
    return 'finance';

  return 'system';
}

interface SeverityStyle {
  label: string;
  color: string;
  bg: string;
}

function getSeverityStyle(severityValue: unknown): SeverityStyle {
  const s = normalizeValue(severityValue);
  switch (s) {
    case 'critical': return { label: 'Critical', color: 'text-rose-500',   bg: 'bg-rose-500' };
    case 'high':     return { label: 'High',     color: 'text-orange-500', bg: 'bg-orange-500' };
    case 'medium':   return { label: 'Medium',   color: 'text-amber-500',  bg: 'bg-amber-500' };
    case 'low':      return { label: 'Low',      color: 'text-sky-500',    bg: 'bg-sky-500' };
    default:         return { label: 'Info',      color: 'text-neutral-400', bg: 'bg-neutral-400' };
  }
}

function formatNotificationDate(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin >= 0 && diffMin < 1) return 'Just now';
  if (diffMin >= 1 && diffMin < 60) return `${diffMin}m ago`;
  if (diffHrs >= 1 && diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
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
  const [activeTab, setActiveTab] = useState<NotificationSectionKey>('all');
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // delay so the opening click doesn't immediately close
    const timer = setTimeout(() => document.addEventListener('mousedown', onClick), 10);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', onClick); };
  }, [isOpen, onClose]);

  // Grouping & counts
  const { groupedNotifications, sectionCounts } = useMemo(() => {
    const groups: Record<NotificationCategory, InAppNotification[]> = {
      critical: [], production: [], quality: [], logistics: [], finance: [], system: [],
    };
    const counts: Record<NotificationSectionKey, number> = {
      all: notifications.length, critical: 0, production: 0, quality: 0, logistics: 0, finance: 0,
    };
    notifications.forEach((n) => {
      const cat = classifyNotification(n);
      groups[cat].push(n);
      if (cat !== 'system') counts[cat] += 1;
    });
    return { groupedNotifications: groups, sectionCounts: counts };
  }, [notifications]);

  const filtered = useMemo(() => {
    return activeTab === 'all' ? notifications : (groupedNotifications[activeTab] || []);
  }, [activeTab, groupedNotifications, notifications]);

  if (!isOpen) return null;

  // Shared style tokens
  const bg = isDarkMode ? 'bg-[#18191F]' : 'bg-white';
  const border = isDarkMode ? 'border-neutral-800' : 'border-neutral-200';
  const textPrimary = isDarkMode ? 'text-neutral-100' : 'text-neutral-900';
  const textSecondary = isDarkMode ? 'text-neutral-400' : 'text-neutral-500';
  const textTertiary = isDarkMode ? 'text-neutral-500' : 'text-neutral-400';
  const divider = isDarkMode ? 'border-neutral-800' : 'border-neutral-100';
  const hoverBg = isDarkMode ? 'hover:bg-white/[0.04]' : 'hover:bg-neutral-50';
  const iconBtn = `flex h-7 w-7 items-center justify-center rounded-md transition-colors cursor-pointer active:scale-95 ${textSecondary} ${hoverBg}`;

  const panelContent = (
    <div className="fixed inset-0 z-[9999] pointer-events-none" data-lenis-prevent="true">
      {/* Subtle click-away overlay — no visible backdrop */}
      <div className="absolute inset-0 pointer-events-auto" onClick={onClose} />

      {/* Popover panel: anchored top-right, below the top bar */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className={[
          'pointer-events-auto absolute right-4 top-[56px] w-[400px] max-h-[min(580px,calc(100vh-72px))] flex flex-col',
          'rounded-xl border shadow-lg font-sans select-none overflow-hidden',
          isDarkMode ? 'shadow-black/40' : 'shadow-black/[0.08]',
          bg, border, textPrimary,
          // entrance animation
          'animate-[notif-in_0.15s_ease-out]',
        ].join(' ')}
        style={{ animationFillMode: 'both' }}
      >
        {/* ─── Header ─── */}
        <div className={`shrink-0 px-4 pt-3 pb-2 border-b ${divider}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`text-[13px] font-semibold ${textPrimary}`}>Notifications</span>
              {unreadCount > 0 && (
                <span className={`text-[10px] font-medium tabular-nums px-1.5 py-0.5 rounded-md ${isDarkMode ? 'bg-white/[0.06] text-neutral-300' : 'bg-neutral-100 text-neutral-600'}`}>
                  {unreadCount} unread
                </span>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              <button type="button" onClick={onToggleSound} className={iconBtn} title={isSoundEnabled ? 'Mute sounds' : 'Enable sounds'} aria-label={isSoundEnabled ? 'Mute notification sounds' : 'Enable notification sounds'}>
                {isSoundEnabled ? <Volume2 className="h-3.5 w-3.5 text-blue-500" /> : <VolumeX className="h-3.5 w-3.5" />}
              </button>
              <button type="button" onClick={onClose} className={iconBtn} aria-label="Close notifications">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Category filter — compact pill row */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SECTIONS_CONFIG.map((sec) => {
              const active = activeTab === sec.key;
              const count = sectionCounts[sec.key];
              return (
                <button
                  key={sec.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(sec.key)}
                  className={[
                    'shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                    active
                      ? isDarkMode
                        ? 'bg-white/[0.1] text-white'
                        : 'bg-neutral-900 text-white'
                      : isDarkMode
                        ? 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.05]'
                        : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100',
                  ].join(' ')}
                >
                  {sec.key !== 'all' && <span className={`h-1.5 w-1.5 rounded-full ${sec.dotColor}`} />}
                  {sec.shortLabel}
                  {count > 0 && (
                    <span className={`text-[9px] font-semibold tabular-nums ${active ? 'opacity-70' : 'opacity-50'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Action row ─── */}
        {(unreadCount > 0 || onClearAll) && notifications.length > 0 && (
          <div className={`shrink-0 flex items-center gap-2 px-4 py-1.5 border-b ${divider}`}>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllAsRead}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer active:scale-[0.98] ${isDarkMode ? 'text-blue-400 hover:bg-blue-500/10' : 'text-blue-600 hover:bg-blue-50'}`}
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
            {onClearAll && (
              <button
                type="button"
                onClick={onClearAll}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium transition-colors cursor-pointer active:scale-[0.98] ${isDarkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50'}`}
              >
                <Trash2 className="h-3 w-3" />
                Clear all
              </button>
            )}
            <span className={`ml-auto text-[10px] font-medium tabular-nums ${textTertiary}`}>
              {filtered.length} {filtered.length === 1 ? 'item' : 'items'}
            </span>
          </div>
        )}

        {/* ─── Notification feed ─── */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" data-lenis-prevent="true">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${isDarkMode ? 'bg-white/[0.05]' : 'bg-neutral-50'}`}>
                <Sparkles className={`h-5 w-5 ${textTertiary}`} />
              </div>
              <p className={`mt-3 text-[13px] font-semibold ${textPrimary}`}>
                {activeTab === 'all' ? "You're all caught up" : `No ${SECTION_CONFIG_MAP[activeTab].shortLabel.toLowerCase()} alerts`}
              </p>
              <p className={`mt-1 text-[11px] text-center leading-relaxed ${textSecondary}`}>
                New events will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="py-1">
              {filtered.map((n) => {
                const category = classifyNotification(n);
                const sectionCfg = category !== 'system' ? SECTION_CONFIG_MAP[category] : null;
                const severity = getSeverityStyle(n.severity);

                return (
                  <div
                    key={n.id}
                    className={[
                      'group px-4 py-3 border-b last:border-b-0 transition-colors',
                      divider,
                      !n.is_read
                        ? isDarkMode ? 'bg-blue-500/[0.04]' : 'bg-blue-50/50'
                        : '',
                      isDarkMode ? 'hover:bg-white/[0.03]' : 'hover:bg-neutral-50',
                    ].join(' ')}
                  >
                    <div className="flex gap-3">
                      {/* Severity dot */}
                      <div className="pt-1 shrink-0">
                        <span className={`block h-2 w-2 rounded-full ${severity.bg}`} title={severity.label} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className={`text-[12px] font-semibold leading-snug ${n.is_read ? textSecondary : textPrimary}`}>
                            {n.title}
                          </h3>
                          <time
                            dateTime={n.created_at}
                            title={new Date(n.created_at).toLocaleString()}
                            className={`shrink-0 text-[10px] tabular-nums ${textTertiary}`}
                          >
                            {formatNotificationDate(n.created_at)}
                          </time>
                        </div>

                        <p className={`mt-0.5 text-[11px] leading-relaxed line-clamp-2 ${isDarkMode ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {n.message}
                        </p>

                        <div className="mt-1.5 flex items-center gap-2">
                          {/* Category tag */}
                          {sectionCfg && (
                            <span className={`inline-flex items-center gap-1 text-[9px] font-medium ${textTertiary}`}>
                              <span className={`h-1 w-1 rounded-full ${sectionCfg.dotColor}`} />
                              {sectionCfg.shortLabel}
                            </span>
                          )}

                          {/* Severity label */}
                          <span className={`text-[9px] font-medium ${severity.color}`}>
                            {severity.label}
                          </span>

                          {/* Mark read action */}
                          {!n.is_read && (
                            <button
                              type="button"
                              onClick={() => onMarkAsRead(n.id)}
                              className={`ml-auto opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer active:scale-95 ${isDarkMode ? 'text-neutral-300 hover:bg-white/[0.06]' : 'text-neutral-600 hover:bg-neutral-100'}`}
                            >
                              <Check className="h-2.5 w-2.5" />
                              Read
                            </button>
                          )}
                          {n.is_read && (
                            <span className={`ml-auto text-[9px] font-medium text-emerald-500`}>
                              <Check className="h-2.5 w-2.5 inline -mt-px mr-0.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Footer ─── */}
        <div className={`shrink-0 flex items-center justify-between px-4 py-2 border-t ${divider}`}>
          <div className={`flex items-center gap-1.5 text-[10px] font-medium ${textTertiary}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
          <span className={`text-[10px] font-medium tabular-nums ${textTertiary}`}>
            {notifications.length} total
          </span>
        </div>
      </div>

      {/* Keyframe for entrance animation */}
      <style>{`
        @keyframes notif-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-\\[notif-in_0\\.15s_ease-out\\] { animation: none !important; }
        }
      `}</style>
    </div>
  );

  return createPortal(panelContent, document.body);
};

export default NotificationDrawer;
