import React from 'react';
import { 
  X, 
  Bell, 
  Trash2, 
  CheckCheck, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  ShieldAlert, 
  Wrench, 
  ShoppingCart, 
  CheckCircle2, 
  Volume2, 
  VolumeX,
  Clock,
  Sparkles
} from 'lucide-react';
import { InAppNotification } from '../services/notificationService';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  isSoundEnabled?: boolean;
  onToggleSound?: () => void;
  isDarkMode?: boolean;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  isSoundEnabled = true,
  onToggleSound,
  isDarkMode = true,
}) => {
  if (!isOpen) return null;

  const getSeverityStyle = (severity: InAppNotification['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
          card: 'border-l-4 border-l-rose-500 bg-rose-500/5 dark:bg-rose-950/20',
          icon: ShieldAlert,
          iconColor: 'text-rose-500'
        };
      case 'HIGH':
        return {
          badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
          card: 'border-l-4 border-l-amber-500 bg-amber-500/5 dark:bg-amber-950/20',
          icon: AlertTriangle,
          iconColor: 'text-amber-500'
        };
      case 'MEDIUM':
        return {
          badge: 'bg-sky-500/15 text-sky-500 border-sky-500/30',
          card: 'border-l-4 border-l-sky-500 bg-sky-500/5 dark:bg-sky-950/20',
          icon: AlertCircle,
          iconColor: 'text-sky-500'
        };
      case 'LOW':
      case 'INFO':
      default:
        return {
          badge: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/30',
          card: 'border-l-4 border-l-indigo-500 bg-indigo-500/5 dark:bg-indigo-950/20',
          icon: Info,
          iconColor: 'text-indigo-500'
        };
    }
  };

  const formatTimestamp = (dateStr: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex justify-end select-none animate-in fade-in duration-100">
      {/* Dim Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
      />

      {/* Slide-over Drawer Panel */}
      <div
        className={`relative w-full max-w-md h-full shadow-2xl flex flex-col justify-between border-l z-10 transition-all ${
          isDarkMode 
            ? 'bg-[#16171B] border-[#262832] text-slate-200' 
            : 'bg-white border-[#d8dde8] text-slate-900'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#d8dde8] dark:border-[#262832] flex items-center justify-between bg-slate-50/50 dark:bg-[#121316]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#5B75F8]/10 text-[#5B75F8] dark:text-[#7B92FF] border border-[#5B75F8]/20 relative">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
              )}
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                Operations Alerts
                {unreadCount > 0 ? (
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    {unreadCount} Unread
                  </span>
                ) : (
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    All Caught Up
                  </span>
                )}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Live push alerts for QC, machine downtime & orders
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleSound && (
              <button
                type="button"
                onClick={onToggleSound}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isSoundEnabled 
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' 
                    : 'border-slate-300 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-white'
                }`}
                title={isSoundEnabled ? 'Sound alerts active (Click to mute)' : 'Sound alerts muted (Click to enable)'}
              >
                {isSoundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Notifications List */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5 no-scrollbar">
          {notifications.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No active alerts</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                  Quality inspections, shopfloor machine breakdowns, and dispatch delays will appear here in real-time.
                </p>
              </div>
            </div>
          ) : (
            notifications.map((notif) => {
              const style = getSeverityStyle(notif.severity);
              const SeverityIcon = style.icon;

              return (
                <div
                  key={notif.id}
                  onClick={() => onMarkAsRead(notif.id)}
                  className={`group relative p-3.5 rounded-xl border transition-all cursor-pointer ${style.card} ${
                    notif.is_read
                      ? 'border-slate-200/60 dark:border-slate-800/60 opacity-70 hover:opacity-100'
                      : 'border-slate-300 dark:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <SeverityIcon className={`w-4 h-4 shrink-0 ${style.iconColor}`} />
                      <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.2 rounded border ${style.badge}`}>
                        {notif.severity}
                      </span>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] shadow-xs" title="Unread" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(notif.created_at)}
                    </span>
                  </div>

                  <h5 className="font-bold text-xs text-slate-900 dark:text-white mt-1.5 leading-snug">
                    {notif.title}
                  </h5>

                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {notif.message}
                  </p>

                  {notif.entity_type && (
                    <div className="mt-2 pt-2 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Ref: {notif.entity_type} {notif.entity_id ? `(#${notif.entity_id})` : ''}</span>
                      {!notif.is_read && (
                        <span className="text-[var(--accent-primary)] font-bold group-hover:underline">
                          Click to mark read
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-[#d8dde8] dark:border-[#262832] bg-slate-50/60 dark:bg-[#121316] flex items-center justify-between">
          <button
            type="button"
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0}
            className={`flex items-center gap-1.5 text-xs font-bold transition-opacity cursor-pointer ${
              unreadCount > 0
                ? 'text-[#5B75F8] dark:text-[#7B92FF] hover:underline'
                : 'text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <CheckCheck className="w-4 h-4" /> Mark All as Read
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#5B75F8] hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDrawer;
