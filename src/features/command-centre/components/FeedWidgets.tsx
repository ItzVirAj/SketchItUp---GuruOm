import React from 'react';
import { ArrowUpRight, CheckCircle2, CircleAlert, Clock3, ExternalLink, Package, ShieldAlert } from 'lucide-react';
import { ActivityFeedItem, ApprovalFeedItem, DispatchFeedItem, InsightFeedItem, OrderFeedItem } from '../types';
import { formatCurrency, formatRelativeTime, formatShortDate } from '../utils/formatters';

export function InsightList({ items, onOpen }: { items: InsightFeedItem[]; onOpen?: (item: InsightFeedItem) => void }) {
  return (
    <div className="cc-insight-list">
      {items.slice(0, 4).map(item => (
        <button type="button" key={`${item.source}-${item.entityId}-${item.title}`} className="cc-insight-row" onClick={() => onOpen?.(item)}>
          <span className={`cc-insight-icon is-${item.severity}`} aria-hidden="true">{item.severity === 'critical' ? <ShieldAlert size={16} /> : item.severity === 'warning' ? <CircleAlert size={16} /> : <CheckCircle2 size={16} />}</span>
          <span className="cc-insight-copy"><strong>{item.title}</strong><small>{item.detail}</small></span>
          <ArrowUpRight size={15} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export function RecentOrders({ items, onOpen }: { items: OrderFeedItem[]; onOpen?: (id: string) => void }) {
  return (
    <div className="cc-table-scroll">
      <table className="cc-data-table">
        <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th>Value</th><th>Due</th><th><span className="sr-only">Open</span></th></tr></thead>
        <tbody>
          {items.slice(0, 8).map(item => <tr key={item.id || item.poNo}>
            <td><button type="button" className="cc-table-link" onClick={() => item.id && onOpen?.(item.id)}>{item.poNo || item.id || '—'}</button></td>
            <td>{item.customer || '—'}</td>
            <td><StatusPill status={item.status} /></td>
            <td className="tabular-nums">{formatCurrency(item.amount)}</td>
            <td className="tabular-nums">{formatShortDate(item.date)}</td>
            <td><ExternalLink size={14} aria-hidden="true" className="cc-table-action" /></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function DispatchList({ items, onOpen }: { items: DispatchFeedItem[]; onOpen?: () => void }) {
  return <div className="cc-feed-list">{items.slice(0, 5).map(item => <button type="button" className="cc-feed-row" key={item.id || item.challanNo} onClick={onOpen}>
    <span className="cc-feed-icon"><Package size={15} /></span>
    <span className="cc-feed-copy"><strong>{item.challanNo || item.id || 'Dispatch'}</strong><small>{item.orderPo || 'Order reference unavailable'}</small></span>
    <span className="cc-feed-meta"><StatusPill status={item.status} /><small>{formatShortDate(item.date)}</small></span>
  </button>)}</div>;
}

export function ApprovalList({ items, onOpen }: { items: ApprovalFeedItem[]; onOpen?: () => void }) {
  return <div className="cc-feed-list">{items.slice(0, 5).map(item => <button type="button" className="cc-feed-row" key={item.id || item.title} onClick={onOpen}>
    <span className="cc-feed-icon is-approval"><Clock3 size={15} /></span>
    <span className="cc-feed-copy"><strong>{item.title || item.type || 'Approval request'}</strong><small>{item.requestedBy || 'Requester unavailable'}</small></span>
    <span className="cc-feed-meta"><strong className="tabular-nums">{formatCurrency(item.amount)}</strong><small>{formatRelativeTime(item.createdAt)}</small></span>
  </button>)}</div>;
}

export function ActivityList({ items }: { items: ActivityFeedItem[] }) {
  return <div className="cc-feed-list">{items.slice(0, 6).map(item => <div className="cc-feed-row is-static" key={item.id || `${item.action}-${item.createdAt}`}>
    <span className="cc-avatar" aria-hidden="true">{(item.actor || 'S').slice(0, 1).toUpperCase()}</span>
    <span className="cc-feed-copy"><strong>{item.action || 'Activity'}</strong><small>{item.details || `${item.entity || 'Record'} updated`}</small></span>
    <span className="cc-feed-meta"><small>{formatRelativeTime(item.createdAt)}</small></span>
  </div>)}</div>;
}

function StatusPill({ status }: { status: string | null }) {
  const label = status ? status.replaceAll('_', ' ') : 'Unknown';
  return <span className={`cc-status-pill is-${status?.toLowerCase() || 'unknown'}`}>{label}</span>;
}
