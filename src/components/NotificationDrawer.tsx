import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Check, 
  Bell, 
  Volume2, 
  VolumeX, 
  AlertTriangle, 
  AlertOctagon,
  Info, 
  Trash2, 
  Cpu, 
  ShieldCheck, 
  Truck, 
  Receipt, 
  Layers, 
  Sparkles,
  CheckCheck
} from 'lucide-react';
import { InAppNotification } from '../services/notificationService';

export type NotificationSectionKey = 'all' | 'critical' | 'production' | 'quality' | 'logistics' | 'finance';

interface SectionConfig {
  key: NotificationSectionKey;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  colorLight?: string;
  badgeBg: string;
  badgeBgLight?: string;
}

const SECTIONS_CONFIG: SectionConfig[] = [
  { 
    key: 'all', 
    label: 'All Updates', 
    shortLabel: 'All', 
    icon: Layers, 
    color: 'text-slate-300', 
    colorLight: 'text-slate-600',
    badgeBg: 'bg-white/[0.08] text-slate-300 border-white/15',
    badgeBgLight: 'bg-slate-100 text-slate-700 border-slate-200'
  },
  { 
    key: 'critical', 
    label: 'Critical & High Alerts', 
    shortLabel: 'Critical', 
    icon: AlertOctagon, 
    color: 'text-rose-400', 
    colorLight: 'text-rose-600',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    badgeBgLight: 'bg-rose-50 text-rose-700 border-rose-200'
  },
  { 
    key: 'production', 
    label: 'Production & Shopfloor', 
    shortLabel: 'Production', 
    icon: Cpu, 
    color: 'text-amber-400', 
    colorLight: 'text-amber-700',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    badgeBgLight: 'bg-amber-50 text-amber-800 border-amber-200'
  },
  { 
    key: 'quality', 
    label: 'Quality (QC & PDI)', 
    shortLabel: 'Quality', 
    icon: ShieldCheck, 
    color: 'text-emerald-400', 
    colorLight: 'text-emerald-700',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    badgeBgLight: 'bg-emerald-50 text-emerald-800 border-emerald-200'
  },
  { 
    key: 'logistics', 
    label: 'Orders & Logistics', 
    shortLabel: 'Logistics', 
    icon: Truck, 
    color: 'text-blue-400', 
    colorLight: 'text-blue-700',
    badgeBg: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    badgeBgLight: 'bg-blue-50 text-blue-700 border-blue-200'
  },
  { 
    key: 'finance', 
    label: 'Finance & Billing', 
    shortLabel: 'Finance', 
    icon: Receipt, 
    color: 'text-purple-400', 
    colorLight: 'text-purple-700',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    badgeBgLight: 'bg-purple-50 text-purple-700 border-purple-200'
  },
];

function classifyNotification(notif: InAppNotification): 'critical' | 'production' | 'quality' | 'logistics' | 'finance' | 'system' {
  const type = (notif.type || '').toLowerCase();
  const title = (notif.title || '').toLowerCase();
  const entity = (notif.entity_type || '').toLowerCase();
  const sev = notif.severity;

  if (sev === 'CRITICAL' || sev === 'HIGH' || type.includes('critical') || type.includes('breakdown') || title.includes('breakdown')) {
    return 'critical';
  }
  if (type.includes('qc') || type.includes('pdi') || entity.includes('qc') || entity.includes('pdi') || title.includes('qc') || title.includes('pdi') || title.includes('quality') || title.includes('defect')) {
    return 'quality';
  }
  if (type.includes('prod') || type.includes('machine') || type.includes('job') || type.includes('shortage') || entity.includes('job') || entity.includes('machine') || title.includes('production') || title.includes('machine') || title.includes('stock')) {
    return 'production';
  }
  if (type.includes('order') || type.includes('dispatch') || type.includes('challan') || type.includes('delivery') || entity.includes('order') || entity.includes('dispatch') || title.includes('challan') || title.includes('delivery') || title.includes('dispatch')) {
    return 'logistics';
  }
  if (type.includes('invoice') || type.includes('payment') || type.includes('bill') || entity.includes('invoice') || title.includes('invoice') || title.includes('payment') || title.includes('overdue')) {
    return 'finance';
  }
  return 'system';
}

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
  isDarkMode
}) => {
  const [activeTab, setActiveTab] = useState<NotificationSectionKey>('all');
  const tabsContainerRef = React.useRef<HTMLDivElement>(null);

  // Enable mouse wheel horizontal scrolling when hovering over section tabs
  useEffect(() => {
    if (!isOpen) return;
    const el = tabsContainerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        e.stopPropagation();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Section Grouping & Counts Computed Realtime from live notification stream
  const { grouped, sectionCounts } = useMemo(() => {
    const groups: Record<string, InAppNotification[]> = {
      critical: [],
      production: [],
      quality: [],
      logistics: [],
      finance: [],
      system: []
    };

    const counts: Record<NotificationSectionKey, number> = {
      all: notifications.length,
      critical: 0,
      production: 0,
      quality: 0,
      logistics: 0,
      finance: 0
    };

    notifications.forEach((notif) => {
      const section = classifyNotification(notif);
      groups[section].push(notif);
      if (section in counts) {
        counts[section as NotificationSectionKey]++;
      }
    });

    return { grouped: groups, sectionCounts: counts };
  }, [notifications]);

  if (!isOpen) return null;

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 shrink-0 shadow-2xs">
            <AlertOctagon className="h-4 w-4" />
          </div>
        );
      case 'HIGH':
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0 shadow-2xs">
            <AlertTriangle className="h-4 w-4" />
          </div>
        );
      case 'MEDIUM':
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 shrink-0 shadow-2xs">
            <AlertTriangle className="h-4 w-4" />
          </div>
        );
      default:
        return (
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/15 border border-blue-500/30 text-[#5B75F8] shrink-0 shadow-2xs">
            <Info className="h-4 w-4" />
          </div>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
      }).format(d);
    } catch (_) {
      return dateStr;
    }
  };

  // Filter list based on selected section tab
  const displayedNotifications = activeTab === 'all' 
    ? notifications 
    : grouped[activeTab] || [];

  const drawerContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Operations Notifications Drawer"
      data-lenis-prevent="true"
      className="fixed inset-0 z-[9999] font-sans"
    >
      {/* Apple Frosted Backdrop */}
      <div 
        data-lenis-prevent="true"
        className="fixed inset-0 bg-black/70 backdrop-blur-2xl transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Apple Floating Glass Drawer Panel */}
      <div 
        data-lenis-prevent="true"
        className={`fixed inset-y-0 right-0 z-[10000] w-full max-w-[460px] h-full shadow-[inset_0_1px_0_0_rgba(255,255,255,0.14),-16px_0_50px_rgba(0,0,0,0.8)] flex flex-col border-l transition-transform duration-200 ease-out animate-in slide-in-from-right overflow-hidden ${
          isDarkMode 
            ? 'bg-[#131317]/95 border-white/15 text-white backdrop-blur-3xl' 
            : 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur-3xl shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Specular Ambient Glows */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(0,122,255,0.2),transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute top-1/2 -left-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(147,51,234,0.12),transparent_70%)] blur-3xl" />

        {/* ── Apple HIG Drawer Header ── */}
        <div className={`relative px-5 sm:px-6 py-4.5 flex items-center justify-between border-b shrink-0 ${
          isDarkMode ? 'border-white/10' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white shadow-md shadow-[var(--accent-shadow)]">
              <Bell className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className={`text-sm font-bold tracking-tight truncate ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  Operations Alerts
                </h2>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow-xs animate-pulse">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <p className={`text-xs font-medium truncate ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Real-time factory & shopfloor event stream
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onToggleSound}
              className={`flex h-8.5 w-8.5 items-center justify-center rounded-full border active:scale-95 cursor-pointer transition-all shadow-2xs ${
                isDarkMode 
                  ? 'border-white/15 bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.12] hover:border-white/25' 
                  : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 hover:border-slate-300'
              }`}
              title={isSoundEnabled ? 'Audio alerts active (Click to mute)' : 'Audio alerts muted (Click to enable)'}
            >
              {isSoundEnabled ? <Volume2 className="h-4 w-4 text-[#5B75F8] dark:text-[#7B92FF]" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex h-8.5 w-8.5 items-center justify-center rounded-full border active:scale-95 cursor-pointer transition-all shadow-2xs ${
                isDarkMode 
                  ? 'border-white/15 bg-white/[0.06] text-slate-300 hover:text-white hover:bg-white/[0.12] hover:border-white/25' 
                  : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 hover:border-slate-300'
              }`}
              title="Close drawer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Apple Inset Section Tabs Filter ── */}
        <div 
          ref={tabsContainerRef}
          data-lenis-prevent="true"
          className={`relative px-4 py-2.5 border-b shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth cursor-grab active:cursor-grabbing ${
            isDarkMode ? 'border-white/10' : 'border-slate-200'
          }`}
        >
          {SECTIONS_CONFIG.map((sec) => {
            const count = sectionCounts[sec.key] || 0;
            const isActive = activeTab === sec.key;
            const Icon = sec.icon;

            return (
              <button
                key={sec.key}
                type="button"
                onClick={() => setActiveTab(sec.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? 'bg-[#5B75F8] text-white shadow-sm shadow-blue-500/30'
                    : isDarkMode
                      ? 'border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] hover:border-white/20'
                      : 'border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : (isDarkMode ? sec.color : sec.colorLight || sec.color)}`} />
                <span>{sec.shortLabel}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/25 text-white' : (isDarkMode ? 'bg-white/[0.08] text-slate-300' : 'bg-slate-200 text-slate-800')
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Action Deck Bar ── */}
        {notifications.length > 0 && (
          <div className={`relative px-5 py-2.5 border-b shrink-0 flex items-center justify-between ${
            isDarkMode ? 'border-white/10' : 'border-slate-200'
          }`}>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="px-3 py-1 rounded-full border border-[#5B75F8]/30 bg-[#5B75F8]/15 text-[#5B75F8] hover:bg-[#5B75F8]/25 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              {onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="px-3 py-1 rounded-full border border-rose-500/30 bg-rose-500/15 text-rose-500 hover:bg-rose-500/25 text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs"
                  title="Clear all notifications in database"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Clear all</span>
                </button>
              )}
            </div>
            <span className={`text-[11px] font-mono ${
              isDarkMode ? 'text-slate-400' : 'text-slate-500'
            }`}>
              {displayedNotifications.length} alerts
            </span>
          </div>
        )}

        {/* ── Scrollable Notifications Feed ── */}
        <div 
          data-lenis-prevent="true"
          className="flex-1 min-h-0 relative overflow-hidden"
        >
          <div 
            data-lenis-prevent="true"
            className="absolute inset-0 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-3"
          >
            {displayedNotifications.length === 0 ? (
              <div className={`flex flex-col items-center justify-center h-full min-h-[320px] p-8 text-center ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <div className={`flex h-14 w-14 items-center justify-center rounded-3xl border mb-3.5 shadow-2xs ${
                  isDarkMode ? 'border-white/15 bg-white/[0.04]' : 'border-slate-200 bg-slate-100'
                }`}>
                  <Sparkles className="h-6 w-6 text-[#5B75F8] opacity-80" />
                </div>
                <p className={`text-sm font-bold tracking-tight ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {activeTab === 'all' ? 'All Clear — No Notifications' : `No ${SECTIONS_CONFIG.find(s => s.key === activeTab)?.label || 'Section'} Alerts`}
                </p>
                <p className={`text-xs mt-1 max-w-[260px] leading-relaxed ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>
                  Real-time shopfloor events will stream in automatically as production runs.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedNotifications.map((notif) => {
                  const section = classifyNotification(notif);
                  const secConfig = SECTIONS_CONFIG.find(s => s.key === section);

                  return (
                    <div 
                      key={notif.id}
                      className={`p-4 rounded-3xl border transition-all backdrop-blur-2xl ${
                        notif.is_read 
                          ? isDarkMode
                            ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/20 shadow-2xs' 
                            : 'bg-slate-50/90 border-slate-200/90 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                          : isDarkMode
                            ? 'bg-white/[0.07] border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1),0_8px_20px_rgba(0,0,0,0.4)] hover:bg-white/[0.1] hover:border-white/25' 
                            : 'bg-white border-[#5B75F8]/30 shadow-sm ring-1 ring-[#5B75F8]/20'
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="mt-0.5">
                          {getSeverityBadge(notif.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                              secConfig 
                                ? (isDarkMode ? secConfig.badgeBg : secConfig.badgeBgLight || secConfig.badgeBg)
                                : (isDarkMode ? 'bg-white/[0.06] text-slate-300 border-white/15' : 'bg-slate-100 text-slate-700 border-slate-200')
                            }`}>
                              {secConfig?.shortLabel || 'Update'}
                            </span>
                            {!notif.is_read && (
                              <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5B75F8] opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#5B75F8]" />
                              </span>
                            )}
                          </div>

                          <p className={`text-xs font-bold leading-snug tracking-tight ${
                            isDarkMode ? 'text-white' : 'text-slate-900'
                          }`}>
                            {notif.title}
                          </p>
                          <p className={`text-xs mt-1 leading-relaxed ${
                            isDarkMode ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {notif.message}
                          </p>

                          <div className={`mt-3 flex items-center justify-between pt-2 border-t ${
                            isDarkMode ? 'border-white/10' : 'border-slate-100'
                          }`}>
                            <span className={`text-[10.5px] font-mono ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              {formatDate(notif.created_at)}
                            </span>
                            {!notif.is_read && (
                              <button
                                type="button"
                                onClick={() => onMarkAsRead(notif.id)}
                                className={`text-[10.5px] font-semibold px-3 py-1 rounded-full border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                                  isDarkMode
                                    ? 'border-white/15 bg-white/[0.06] hover:bg-white/[0.14] hover:border-white/25 text-slate-200'
                                    : 'border-slate-200 bg-slate-100 hover:bg-slate-200 hover:border-slate-300 text-slate-700'
                                }`}
                              >
                                Mark read
                              </button>
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
        </div>
      </div>
    </div>
  );

  return createPortal(drawerContent, document.body);
};

export default NotificationDrawer;
