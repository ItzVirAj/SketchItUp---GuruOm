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
  Sparkles
} from 'lucide-react';
import { InAppNotification } from '../services/notificationService';

export type NotificationSectionKey = 'all' | 'critical' | 'production' | 'quality' | 'logistics' | 'finance';

interface SectionConfig {
  key: NotificationSectionKey;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  badgeBg: string;
}

const SECTIONS_CONFIG: SectionConfig[] = [
  { key: 'all', label: 'All Updates', shortLabel: 'All', icon: Layers, color: 'text-slate-400', badgeBg: 'bg-slate-500/20 text-slate-300' },
  { key: 'critical', label: 'Critical & High Alerts', shortLabel: 'Critical', icon: AlertOctagon, color: 'text-rose-500', badgeBg: 'bg-rose-500/20 text-rose-400' },
  { key: 'production', label: 'Production & Shopfloor', shortLabel: 'Production', icon: Cpu, color: 'text-amber-500', badgeBg: 'bg-amber-500/20 text-amber-400' },
  { key: 'quality', label: 'Quality (QC & PDI)', shortLabel: 'Quality', icon: ShieldCheck, color: 'text-emerald-500', badgeBg: 'bg-emerald-500/20 text-emerald-400' },
  { key: 'logistics', label: 'Orders & Logistics', shortLabel: 'Logistics', icon: Truck, color: 'text-blue-500', badgeBg: 'bg-blue-500/20 text-blue-400' },
  { key: 'finance', label: 'Finance & Billing', shortLabel: 'Finance', icon: Receipt, color: 'text-indigo-500', badgeBg: 'bg-indigo-500/20 text-indigo-400' },
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

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertOctagon className="h-4 w-4 text-rose-500 shrink-0" />;
      case 'HIGH':
        return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
      case 'MEDIUM':
        return <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />;
      default:
        return <Info className="h-4 w-4 text-blue-500 shrink-0" />;
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
      {/* Backdrop */}
      <div 
        data-lenis-prevent="true"
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Drawer Panel */}
      <div 
        data-lenis-prevent="true"
        className={`fixed inset-y-0 right-0 z-[10000] w-full max-w-md h-full shadow-2xl flex flex-col border-l transition-transform duration-200 ease-out animate-in slide-in-from-right ${
          isDarkMode 
            ? 'bg-[#18181B] border-white/[0.08] text-white' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between border-b shrink-0 ${
          isDarkMode ? 'border-white/[0.08] bg-[#09090B]/70' : 'border-slate-100 bg-slate-50/70'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-[var(--accent-gradient-from)] to-[var(--accent-gradient-to)] text-white shadow-xs">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight flex items-center gap-2">
                Operations Alerts
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
                    {unreadCount} NEW
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400 font-medium">Real-time shopfloor & factory event stream</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={onToggleSound}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDarkMode ? 'hover:bg-white/[0.06] text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
              title={isSoundEnabled ? 'Audio alerts active (Click to mute)' : 'Audio alerts muted (Click to enable)'}
            >
              {isSoundEnabled ? <Volume2 className="h-4 w-4 text-[var(--accent-primary)]" /> : <VolumeX className="h-4 w-4 text-slate-500" />}
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                isDarkMode ? 'hover:bg-white/[0.06] text-slate-400' : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Section Tabs (Realtime Filters with Mouse Wheel Horizontal Scrolling) */}
        <div 
          ref={tabsContainerRef}
          data-lenis-prevent="true"
          className={`px-3 py-2 border-b shrink-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth cursor-grab active:cursor-grabbing ${
            isDarkMode ? 'border-white/[0.06] bg-[#09090B]/40' : 'border-slate-100 bg-slate-50/40'
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
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-ui cursor-pointer ${
                  isActive
                    ? (isDarkMode 
                        ? 'bg-white/[0.12] text-white shadow-xs ring-1 ring-white/10' 
                        : 'bg-slate-900 text-white shadow-xs')
                    : (isDarkMode 
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100')
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : sec.color}`} />
                <span>{sec.shortLabel}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : (isDarkMode ? 'bg-white/[0.08] text-slate-400' : 'bg-slate-200 text-slate-700')
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Actions Bar */}
        {notifications.length > 0 && (
          <div className={`px-4 py-2 border-b shrink-0 flex items-center justify-between ${
            isDarkMode ? 'border-white/[0.06] bg-[#09090B]/20' : 'border-slate-100 bg-slate-50/20'
          }`}>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
              {onClearAll && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className={`text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    isDarkMode ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-700'
                  }`}
                  title="Clear all notifications in database"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all
                </button>
              )}
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Showing {displayedNotifications.length} items
            </span>
          </div>
        )}

        {/* Scrollable Notifications Feed */}
        <div 
          data-lenis-prevent="true"
          className="flex-1 min-h-0 relative overflow-hidden"
        >
          <div 
            data-lenis-prevent="true"
            className="absolute inset-0 overflow-y-auto overscroll-contain p-3 space-y-3"
          >
            {displayedNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-slate-400 p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] mb-3">
                  <Sparkles className="h-6 w-6 opacity-30 text-[var(--accent-primary)]" />
                </div>
                <p className="text-sm font-bold text-slate-300">
                  {activeTab === 'all' ? 'All Clear — No Notifications' : `No ${SECTIONS_CONFIG.find(s => s.key === activeTab)?.label || 'Section'} Alerts`}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                  Real-time events will automatically stream into this section when triggered.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedNotifications.map((notif) => {
                  const section = classifyNotification(notif);
                  const secConfig = SECTIONS_CONFIG.find(s => s.key === section);

                  return (
                    <div 
                      key={notif.id}
                      className={`p-3.5 rounded-xl border transition-ui ${
                        notif.is_read 
                          ? (isDarkMode ? 'bg-white/[0.015] border-white/[0.04]' : 'bg-slate-50/60 border-slate-100')
                          : (isDarkMode ? 'bg-[#121215] border-white/[0.12] shadow-sm' : 'bg-white border-slate-200 shadow-xs')
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {getSeverityIcon(notif.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-md ${
                              secConfig ? secConfig.badgeBg : 'bg-slate-500/20 text-slate-400'
                            }`}>
                              {secConfig?.shortLabel || 'Update'}
                            </span>
                            {!notif.is_read && (
                              <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)] shrink-0 animate-pulse" />
                            )}
                          </div>
                          <p className={`text-xs font-bold leading-snug ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                            {notif.title}
                          </p>
                          <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            {notif.message}
                          </p>
                          <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-dashed border-slate-500/10">
                            <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                              {formatDate(notif.created_at)}
                            </span>
                            {!notif.is_read && (
                              <button
                                type="button"
                                onClick={() => onMarkAsRead(notif.id)}
                                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                                  isDarkMode 
                                    ? 'bg-white/[0.08] hover:bg-white/[0.14] text-slate-200' 
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
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
