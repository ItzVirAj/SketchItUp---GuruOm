import React from 'react';
import { ActivityItem } from '../types/dashboard';
import { X, Bell, Trash2 } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activities: ActivityItem[];
  onClearNotifications: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  activities,
  onClearNotifications,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/60"
      />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 z-10"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Notifications & Activity Feed</h4>
              <p className="text-[10px] text-slate-400">{activities.length} total activity items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-3">
          {activities.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No new unread notifications.
            </div>
          ) : (
            activities.map((act) => (
              <div
                key={act.id}
                className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 hover:border-slate-200"
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                    {act.type}
                  </span>
                  <span className="text-[9px] text-slate-400">{act.timestamp}</span>
                </div>
                <h5 className="font-bold text-slate-800 text-xs">{act.title}</h5>
                <p className="text-slate-600 text-[11px]">{act.description}</p>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClearNotifications}
            className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-semibold cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
