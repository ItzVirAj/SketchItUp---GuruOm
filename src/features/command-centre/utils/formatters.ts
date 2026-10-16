const INDIA_LOCALE = 'en-IN';

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat(INDIA_LOCALE, {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
    notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard'
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return new Intl.NumberFormat(INDIA_LOCALE, { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat(INDIA_LOCALE, { day: 'numeric', month: 'short' }).format(date);
}

export function formatDateRange(from: string, to: string): string {
  return `${formatShortDate(from)} – ${formatShortDate(to)}`;
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return '-';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '-';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatPeriodLabel(period: string, granularity: 'day' | 'week' | 'month'): string {
  if (granularity === 'month') {
    const date = new Date(`${period}-01T00:00:00`);
    return Number.isNaN(date.getTime())
      ? period
      : new Intl.DateTimeFormat(INDIA_LOCALE, { month: 'short' }).format(date);
  }
  const date = new Date(`${period}T00:00:00`);
  if (Number.isNaN(date.getTime())) return period;
  return new Intl.DateTimeFormat(INDIA_LOCALE, { day: 'numeric', month: 'short' }).format(date);
}
