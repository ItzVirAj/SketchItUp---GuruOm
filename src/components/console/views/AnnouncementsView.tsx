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
      {/* 1. Luminous Dual-Mode Hero & Integrated Mini Dashboard */}
      <div className={`relative overflow-hidden rounded-[28px] border transition-all duration-300 p-6 sm:p-8 ${
        isDarkMode
          ? 'bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] border-white/10 shadow-[0_24px_50px_rgba(0,0,0,0.7)] text-white'
          : 'bg-gradient-to-r from-[#1b64ff] via-[#155dfc] to-[#0f52dc] border-blue-400/30 shadow-[0_16px_36px_rgba(21,93,252,0.28)] text-white'
      }`}>
        {/* Ambient Top Glow */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -top-24 -right-10 w-96 h-96 rounded-full blur-3xl transition-opacity duration-500 ${
            isDarkMode ? 'bg-blue-500/10' : 'bg-white/20'
          }`}
        />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide backdrop-blur-md border bg-white/15 text-white border-white/20 shadow-sm">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>HR Module • Enterprise Broadcasts &amp; Administrative Circulars</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-inner">
                <Megaphone className="h-5 w-5" />
              </div>
              Announcements &amp; Broadcasts
            </h1>
            <p className={`text-xs sm:text-sm max-w-2xl font-normal leading-relaxed ${
              isDarkMode ? 'text-white/60' : 'text-blue-100'
            }`}>
              Company-wide notices, policy circulars, and executive updates synchronized instantaneously to all enterprise users.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0 self-start lg:self-center">
            {canPostAnnouncements && (
              <button
                type="button"
                onClick={() => formModal.open()}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-xs font-bold transition-all active:scale-[0.96] cursor-pointer shadow-lg ${
                  isDarkMode
                    ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
                    : 'bg-white hover:bg-blue-50 text-blue-700 shadow-blue-900/30'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>Post Announcement</span>
              </button>
            )}
          </div>
        </div>

        {/* Mini Metric Dashboard Strip with SOLID VIBRANT ICON SQUIRCLES */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Card 1: Total Broadcasts */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-md shadow-black/10">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Total Broadcasts
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {announcements.length}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Lifetime notices
              </span>
            </div>
          </div>

          {/* Card 2: Recent (7 Days) */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Recent (7 Days)
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {recentCount}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Past week updates
              </span>
            </div>
          </div>

          {/* Card 3: Pinned Notices */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <Radio className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Pinned Notices
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block tabular-nums">
                {announcements.filter(a => a.isPinned).length}
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                High priority alerts
              </span>
            </div>
          </div>

          {/* Card 4: Audience Reach */}
          <div className={`p-4 rounded-2xl border backdrop-blur-md flex items-center gap-3.5 transition-colors ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-white/15 border-white/25'
          }`}>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md shadow-purple-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDarkMode ? 'text-white/50' : 'text-blue-100'}`}>
                Audience Reach
              </span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-white block truncate">
                All Staff
              </span>
              <span className={`text-[10px] truncate block ${isDarkMode ? 'text-white/40' : 'text-blue-100/80'}`}>
                Global factory reach
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── APPLE SEGMENTED FILTER BAR ──                                        */}
      {/* ========================================================================= */}
      <div className={`p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl border transition-ui flex flex-col md:flex-row md:items-center justify-between gap-3 ${cardBase}`}>
        <div
          className={`p-1 rounded-full border flex items-center gap-1 overflow-x-auto scrollbar-none w-full md:w-auto ${
            isDarkMode ? 'bg-white/[0.04] border-white/10' : 'bg-slate-100/80 border-slate-200/80'
          }`}
        >
          {[
            { id: 'ALL', label: 'All Broadcasts', count: announcements.length },
            { id: 'RECENT', label: 'Recent', count: recentCount }
          ].map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as typeof filterTab)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  isActive
                    ? isDarkMode ? 'bg-white text-slate-950 shadow-sm' : 'bg-[#155dfc] text-white shadow-sm'
                    : isDarkMode
                      ? 'text-slate-400 hover:text-white hover:bg-white/[0.06]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums font-bold ${
                  isActive
                    ? isDarkMode ? 'bg-slate-900 text-white' : 'bg-white/20 text-white'
                    : isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
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
