import React, { useState, useMemo } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Search,
  Calendar,
  User,
  Clock,
  Sparkles,
  Radio,
  Share2,
  Pin
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { useUrlModal } from '../../../hooks/useUrlModal';
import { Announcement } from '../../../services/consoleApiServices';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  isLoadingAnnouncements: boolean;
  canPostAnnouncements: boolean;
  isDarkMode: boolean;
  onCreateAnnouncement: (payload: { title: string; body: string; pinned?: boolean; expiresAt?: string }) => Promise<Announcement>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
}

function formatAnnouncementDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  announcements,
  isLoadingAnnouncements,
  canPostAnnouncements,
  isDarkMode,
  onCreateAnnouncement,
  onDeleteAnnouncement
}) => {
  const formModal = useUrlModal('announcement-form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState('');

  // Filter State
  const [filterTab, setFilterTab] = useState<'ALL' | 'RECENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const cardBase = isDarkMode
    ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : 'bg-white border-slate-200/80 shadow-sm text-slate-900';

  const inputCls = `w-full mt-1.5 p-3 rounded-xl border text-sm font-sans transition-ui focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 ${
    isDarkMode
      ? 'bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600'
      : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
  }`;

  // Metrics
  const recentCount = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return announcements.filter((a) => new Date(a.createdAt).getTime() >= oneWeekAgo).length;
  }, [announcements]);

  // Filtered list with pinned notices sorted first
  const filteredAnnouncements = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const list = announcements.filter((a) => {
      if (filterTab === 'RECENT' && new Date(a.createdAt).getTime() < oneWeekAgo) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (a.title || '').toLowerCase().includes(q);
        const matchesBody = (a.body || '').toLowerCase().includes(q);
        const matchesAuthor = (a.authorName || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesBody && !matchesAuthor) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      const pinA = a.pinned ? 1 : 0;
      const pinB = b.pinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [announcements, filterTab, searchQuery]);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateAnnouncement({
        title: title.trim(),
        body: body.trim(),
        pinned,
        expiresAt: expiresAt || undefined
      });
      formModal.close();
      setTitle('');
      setBody('');
      setPinned(false);
      setExpiresAt('');
    } catch {
      // handled
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteAnnouncement(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans">
      {/* ========================================================================= */}
      {/* ── TOP HERO HEADER (Apple HIG Banner) ──                                */}
      {/* ========================================================================= */}
      <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${cardBase}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 pb-6 border-b border-white/10 dark:border-white/10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)] shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]">
                  HR Module
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
                  <span>Company Broadcasts Active</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Announcements & Broadcasts
              </h1>
              <p className={`text-xs max-w-2xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Company-wide circulars, administrative alerts, and policy updates published to all signed-in users instantly.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            {/* Live Announcements Count */}
            <div
              className={`p-3 sm:px-4 sm:py-2.5 rounded-2xl border font-mono text-right w-full sm:w-auto ${
                isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200/80 shadow-2xs'
              }`}
            >
              <div className="flex sm:flex-col justify-between items-center sm:items-end">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Published
                </span>
                <span className="text-xl sm:text-2xl font-bold text-[var(--accent-text-dark)] tabular-nums">
                  {announcements.length}
                </span>
              </div>
            </div>

            {canPostAnnouncements && (
              <button
                type="button"
                onClick={() => formModal.open()}
                className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 text-xs font-extrabold text-white shadow-[0_8px_20px_var(--accent-shadow)] transition-ui hover:bg-[var(--accent-hover)] active:scale-[0.96] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Post Announcement</span>
              </button>
            )}
          </div>
        </div>

        {/* Apple 3-Column Metric Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
          {[
            {
              label: 'Total Broadcasts',
              value: announcements.length,
              sub: 'Lifetime company circulars',
              icon: Megaphone,
              iconBg: 'bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]'
            },
            {
              label: 'Recent (7 Days)',
              value: recentCount,
              sub: 'Issued in the past week',
              icon: Clock,
              iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            },
            {
              label: 'Audience Reach',
              value: 'All Staff',
              sub: 'Global enterprise visibility',
              icon: Share2,
              iconBg: 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
            }
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.label}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  isDarkMode ? 'bg-black/40 border-white/10 hover:border-white/20' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`p-2.5 rounded-xl ${m.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono uppercase font-semibold text-slate-400 tracking-wider">
                    {m.label}
                  </span>
                </div>
                <div className={`text-xl sm:text-2xl font-bold tracking-tight font-mono ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                  {m.value}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium truncate">
                  {m.sub}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── APPLE SEGMENTED FILTER BAR ──                                        */}
      {/* ========================================================================= */}
      <div className={`p-2.5 sm:p-3 rounded-3xl border transition-ui flex flex-col md:flex-row md:items-center justify-between gap-3 ${cardBase}`}>
        <div
          className={`p-1 rounded-2xl border flex items-center overflow-x-auto scrollbar-none w-full md:w-auto ${
            isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-100 border-slate-200'
          }`}
        >
          {[
            { id: 'ALL', label: 'All Broadcasts' },
            { id: 'RECENT', label: `Recent (${recentCount})` }
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as typeof filterTab)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-ui cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--accent-primary)] text-white shadow-sm'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72 shrink-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search headline or message…"
            className={`w-full pl-9.5 pr-4 py-2 rounded-xl text-xs font-sans border transition-ui focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 ${
              isDarkMode
                ? 'bg-black/40 border-white/10 text-white placeholder:text-slate-500'
                : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400'
            }`}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── ANNOUNCEMENT BULLETIN CARDS ──                                       */}
      {/* ========================================================================= */}
      <div className="space-y-3.5">
        {isLoadingAnnouncements ? (
          <div className={`p-12 rounded-3xl border text-center font-mono ${isDarkMode ? 'bg-[#09090B] border-white/10 text-slate-400' : 'bg-white border-slate-200 text-slate-500'}`}>
            <div className="inline-block animate-spin mb-3">
              <Megaphone className="w-6 h-6 text-[var(--accent-primary)]" />
            </div>
            <p className="text-xs">Loading company announcements…</p>
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <div className={`p-12 rounded-3xl border text-center ${cardBase}`}>
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] flex items-center justify-center border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold tracking-tight">No announcements posted</h3>
            <p className={`text-xs mt-1 max-w-sm mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {searchQuery || filterTab !== 'ALL'
                ? 'No circulars match your search query.'
                : 'Keep all team members informed by broadcasting important announcements.'}
            </p>
            {(!searchQuery && filterTab === 'ALL' && canPostAnnouncements) && (
              <button
                type="button"
                onClick={() => formModal.open()}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent-primary)] text-white text-xs font-bold shadow-[0_8px_20px_var(--accent-shadow)] hover:bg-[var(--accent-hover)] transition-ui active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Post Announcement</span>
              </button>
            )}
          </div>
        ) : (
          filteredAnnouncements.map((a) => (
            <div
              key={a.id}
              className={`p-6 rounded-2xl border transition-all ${
                a.pinned
                  ? isDarkMode
                    ? 'border-amber-500/40 bg-amber-500/[0.04] shadow-[0_0_24px_rgba(245,158,11,0.12)]'
                    : 'border-amber-400/60 bg-amber-50/50 shadow-sm'
                  : 'hover:border-[var(--accent-primary)]/40 ' + cardBase
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="p-1.5 rounded-lg bg-[var(--accent-soft-light)] dark:bg-[var(--accent-soft-dark)] text-[var(--accent-text-light)] dark:text-[var(--accent-text-dark)] border border-[var(--accent-border-light)] dark:border-[var(--accent-border-dark)]">
                      <Megaphone className="w-3.5 h-3.5" />
                    </span>
                    {a.pinned && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                        <Pin className="w-3 h-3 fill-amber-500" />
                        <span>Pinned</span>
                      </span>
                    )}
                    <h3 className="text-base sm:text-lg font-bold tracking-tight">
                      {a.title}
                    </h3>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      <span>{a.authorName || 'Executive Broadcast'}</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatAnnouncementDate(a.createdAt)}</span>
                    </span>
                    {a.expiresAt && (
                      <>
                        <span>·</span>
                        <span className="text-amber-500">
                          Expires: {a.expiresAt}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete Action */}
                {canPostAnnouncements && (
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    disabled={deletingId === a.id}
                    className={`shrink-0 p-2.5 rounded-xl border cursor-pointer transition-ui active:scale-95 ${
                      isDarkMode
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                        : 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                    }`}
                    title="Delete Announcement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className={`mt-3.5 text-sm leading-relaxed whitespace-pre-wrap ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {a.body}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* ── POST ANNOUNCEMENT MODAL (Apple Style) ──                            */}
      {/* ========================================================================= */}
      {canPostAnnouncements && (
        <Modal
          isOpen={formModal.isOpen}
          onClose={() => formModal.close()}
          isDarkMode={isDarkMode}
          maxWidth="lg"
          icon={<Megaphone className="w-5 h-5 text-[var(--accent-primary)]" />}
          title="Post Announcement"
          subtitle="Publish a notice to all registered users across the system."
          footer={
            <div className="flex items-center justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => formModal.close()}
                className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold transition-ui cursor-pointer ${
                  isDarkMode
                    ? 'text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10'
                    : 'border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!title.trim() || !body.trim() || isSubmitting}
                className="min-h-[42px] px-6 py-2 rounded-xl bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-extrabold text-xs shadow-[0_8px_20px_var(--accent-shadow)] cursor-pointer transition-ui active:scale-[0.96] disabled:opacity-50"
              >
                {isSubmitting ? 'Publishing…' : 'Post to Everyone'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Headline / Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Annual Factory Shutdown & Maintenance Schedule"
                className={inputCls}
              />
            </div>

            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Announcement Body
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Write the full message details or instructions for the team…"
                className={`${inputCls} resize-none`}
              />
            </div>

            <div>
              <label className={`text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Expiration Date (optional)
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]/40 cursor-pointer"
                />
                <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Pin to top of bulletin feed & surface on Command Centre
                </span>
              </label>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AnnouncementsView;
