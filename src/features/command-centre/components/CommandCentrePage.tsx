import React, { useMemo, useState } from 'react';
import {
  Bell,
  Boxes,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Factory,
  FileCheck2,
  PackageCheck,
  PanelTop,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  WalletCards
} from 'lucide-react';
import { ConsoleView, SystemUser } from '../../../types/console';
import { useCommandCentreData } from '../hooks/useCommandCentreData';
import { CommandCentreGranularity, CommandCentreRangeInput, InsightFeedItem } from '../types';
import { formatDateRange, formatRelativeTime, formatNumber } from '../utils/formatters';
import { Funnel, Heatmap, PipelineStrip, QualityRing, RankedList, VendorList } from './OperationsCharts';
import { ApprovalList, ActivityList, DispatchList, InsightList, RecentOrders } from './FeedWidgets';
import { KpiCard } from './KpiCard';
import { TrendChart } from './TrendChart';
import { WidgetState } from './WidgetState';
import './command-centre.css';

interface CommandCentrePageProps {
  isDarkMode?: boolean;
  onNavigate?: (view: ConsoleView) => void;
  onSelectOrder?: (orderId: string) => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  currentUser?: SystemUser | null;
}

type Preset = 'today' | '7D' | '30D' | 'quarter' | 'FY' | 'custom';

export function CommandCentrePage({
  onNavigate,
  onSelectOrder,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  currentUser
}: CommandCentrePageProps) {
  const today = toIsoDate(new Date());
  const [preset, setPreset] = useState<Preset>('30D');
  const [granularity, setGranularity] = useState<CommandCentreGranularity>('day');
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);
  const [search, setSearch] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);
  const range = useMemo(() => buildRange(preset, today, customFrom, customTo, granularity), [customFrom, customTo, granularity, preset, today]);
  const { data, states, refresh, retry, isRefreshing } = useCommandCentreData(range);
  const updatedAt = data.summary?.updatedAt || data.trend?.updatedAt || data.operations?.updatedAt || data.feeds?.updatedAt;
  const firstName = currentUser?.name?.split(' ')[0] || 'Owner';

  const openView = (view: ConsoleView) => onNavigate?.(view);
  const openInsight = (item: InsightFeedItem) => {
    if (item.source === 'customer_orders' && item.entityId) onSelectOrder?.(item.entityId);
    else if (item.source === 'customer_invoices') openView('invoices');
    else if (item.source === 'stock_items') openView('inventory');
    else if (item.source === 'qc_inspections') openView('qc');
    else if (item.source === 'pdi_inspections') openView('pdi');
  };

  return (
    <div className="command-centre-page" data-theme={undefined}>
      <header className="cc-page-header">
        <div>
          <h1>Good morning, {firstName}. Here is the live operating picture.</h1>
        </div>
        <div className="cc-header-actions">
          <button type="button" className="cc-icon-button" aria-label="Search Command Centre" title="Search Command Centre" onClick={() => document.getElementById('cc-search')?.focus()}><Search size={17} /></button>
          <button type="button" className="cc-icon-button cc-notification-button" aria-label={`${unreadNotificationsCount} unread notifications`} title="Notifications" onClick={onOpenNotifications}><Bell size={17} />{unreadNotificationsCount > 0 && <span>{unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}</span>}</button>
          <button type="button" className="cc-refresh-button" onClick={() => void refresh()} disabled={isRefreshing}><RefreshCw size={15} className={isRefreshing ? 'cc-spin' : ''} />{isRefreshing ? 'Refreshing' : 'Refresh'}</button>
        </div>
      </header>

      <section className="cc-toolbar" aria-label="Command Centre controls">
        <div className="cc-range-switcher" role="group" aria-label="Date range">
          {(['today', '7D', '30D', 'quarter', 'FY', 'custom'] as Preset[]).map(item => <button key={item} type="button" className={preset === item ? 'is-active' : ''} onClick={() => { setPreset(item); setShowCustomRange(item === 'custom'); }}>{rangeLabel(item)}</button>)}
        </div>
        {showCustomRange && <div className="cc-custom-range"><label>From <input type="date" value={customFrom} max={today} onChange={event => setCustomFrom(event.target.value)} /></label><label>To <input type="date" value={customTo} max={today} onChange={event => setCustomTo(event.target.value)} /></label></div>}
        <span className="cc-date-chip"><CalendarDays size={14} />{formatDateRange(range.from, range.to)}</span>
        <div className="cc-toolbar-spacer" />
        <label className="cc-search"><Search size={15} aria-hidden="true" /><input id="cc-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Find an order or customer" aria-label="Find an order or customer" /><kbd>⌘K</kbd></label>
        <label className="cc-select"><span className="sr-only">Chart granularity</span><select value={granularity} onChange={event => setGranularity(event.target.value as CommandCentreGranularity)}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option></select><ChevronDown size={14} aria-hidden="true" /></label>
        <span className="cc-updated">{updatedAt ? `Updated ${formatRelativeTime(updatedAt)}` : 'Waiting for data'}</span>
      </section>

      <section className="cc-kpi-grid" aria-label="Key operating metrics">
        <KpiCard label="Invoiced revenue" metric={data.summary?.metrics.revenue} kind="currency" icon={<WalletCards size={16} />} sparkline={data.trend?.series.value?.selected.map(point => point.invoiced)} onOpen={() => openView('invoices')} href="/finance/invoices-payments" />
        <KpiCard label="Outstanding receivables" metric={data.summary?.metrics.receivables} kind="currency" icon={<CreditCard size={16} />} onOpen={() => openView('invoices')} href="/finance/invoices-payments" />
        <KpiCard label="Open orders" metric={data.summary?.metrics.openOrders} kind="number" icon={<PanelTop size={16} />} onOpen={() => openView('orders')} href="/operations/orders" />
        <KpiCard label="Production output" metric={data.summary?.metrics.productionOutput} kind="number" icon={<Factory size={16} />} onOpen={() => openView('production')} href="/operations/production" />
        <KpiCard label="Dispatched" metric={data.summary?.metrics.dispatches} kind="number" icon={<Truck size={16} />} onOpen={() => openView('dispatch')} href="/quality-dispatch/dispatch-logistics" />
        <KpiCard label="Low-stock items" metric={data.summary?.metrics.lowStock} kind="number" icon={<Boxes size={16} />} onOpen={() => openView('inventory')} href="/operations/inventory" />
      </section>

      <section className="cc-primary-grid">
        <article className="cc-card cc-trend-card">
          <div className="cc-card-header"><div><h2>Cash conversion</h2><p>Invoiced against collected value for the selected period.</p></div><span className="cc-period-label">{granularity === 'day' ? 'Daily' : granularity === 'week' ? 'Weekly' : 'Monthly'}</span></div>
          <WidgetState status={states.trend.status} error={states.trend.error} availability={data.trend?.series.availability} reason={data.trend?.series.reason} onRetry={() => void retry('trend')} emptyMessage="No invoices have been recorded in this range.">
            {data.trend?.series.value && <TrendChart selected={data.trend.series.value.selected} comparison={data.trend.series.value.comparison} granularity={granularity} />}
          </WidgetState>
        </article>
        <article className="cc-card cc-attention-card">
          <div className="cc-card-header"><div><h2>Needs attention</h2><p>Deterministic signals from the live records.</p></div><ShieldCheck size={18} aria-hidden="true" /></div>
          <WidgetState status={states.feeds.status} error={states.feeds.error} availability={data.feeds?.insights.availability} reason={data.feeds?.insights.reason} onRetry={() => void retry('feeds')} emptyMessage="Nothing needs attention in this range.">
            {data.feeds?.insights.value && <InsightList items={data.feeds.insights.value} onOpen={openInsight} />}
          </WidgetState>
        </article>
      </section>

      <section className="cc-secondary-grid">
        <article className="cc-card cc-funnel-card"><div className="cc-card-header"><div><h2>Order to cash</h2><p>Where work is moving through the operating pipeline.</p></div><button type="button" className="cc-inline-link" onClick={() => openView('orders')}>Open orders <ArrowIcon /></button></div><WidgetState status={states.operations.status} error={states.operations.error} availability={data.operations?.funnel.availability} reason={data.operations?.funnel.reason} onRetry={() => void retry('operations')} emptyMessage="No orders entered this range.">{data.operations?.funnel.value && <Funnel stages={data.operations.funnel.value} onStage={stage => openStage(stage.key, openView)} />}</WidgetState></article>
        <article className="cc-card cc-heatmap-card"><div className="cc-card-header"><div><h2>Production tempo</h2><p>Completed operations by weekday and time bucket.</p></div><Factory size={18} aria-hidden="true" /></div><WidgetState status={states.operations.status} error={states.operations.error} availability={data.operations?.productionHeatmap.availability} reason={data.operations?.productionHeatmap.reason} onRetry={() => void retry('operations')} emptyMessage="No completed operation timestamps in this range.">{data.operations?.productionHeatmap.value && <Heatmap cells={data.operations.productionHeatmap.value} />}</WidgetState></article>
      </section>

      <section className="cc-insight-band"><div><span className="cc-band-mark"><ClipboardCheck size={16} /></span><div><h2>Operational pulse</h2><p>Every stage is anchored to Owner OS records. Open a stage to continue the existing workflow.</p></div></div><div className="cc-band-stat"><strong className="tabular-nums">{formatNumber(data.operations?.pipeline.value?.reduce((sum, stage) => sum + stage.count, 0))}</strong><span>records in pipeline</span></div></section>

      <section className="cc-breakdown-grid">
        <article className="cc-card"><div className="cc-card-header"><div><h2>Quality gate</h2><p>QC and PDI outcomes, no inferred pass rates.</p></div><FileCheck2 size={18} aria-hidden="true" /></div><WidgetState status={states.operations.status} error={states.operations.error} availability={data.operations?.quality.availability} reason={data.operations?.quality.reason} onRetry={() => void retry('operations')} emptyMessage="No QC or PDI records in this range.">{data.operations?.quality.value && <QualityRing quality={data.operations.quality.value} />}</WidgetState></article>
        <article className="cc-card"><div className="cc-card-header"><div><h2>Vendor bills</h2><p>Outstanding balance by current status.</p></div><CreditCard size={18} aria-hidden="true" /></div><WidgetState status={states.operations.status} error={states.operations.error} availability={data.operations?.vendors.availability} reason={data.operations?.vendors.reason} onRetry={() => void retry('operations')} emptyMessage="No vendor bills in this range.">{data.operations?.vendors.value && <VendorList items={data.operations.vendors.value} />}</WidgetState></article>
        <article className="cc-card"><div className="cc-card-header"><div><h2>Inventory pressure</h2><p>Items at or below their reorder level.</p></div><Boxes size={18} aria-hidden="true" /></div><WidgetState status={states.operations.status} error={states.operations.error} availability={data.operations?.inventory.availability} reason={data.operations?.inventory.reason} onRetry={() => void retry('operations')} emptyMessage="No items are below reorder level.">{data.operations?.inventory.value && <RankedList items={data.operations.inventory.value} />}</WidgetState></article>
      </section>

      <section className="cc-card cc-pipeline-card"><div className="cc-card-header"><div><h2>Operations pipeline</h2><p>Stage counts for orders received in this range.</p></div><button type="button" className="cc-inline-link" onClick={() => openView('metrics')}>View metrics <ArrowIcon /></button></div><WidgetState status={states.operations.status} error={states.operations.error} availability={data.operations?.pipeline.availability} reason={data.operations?.pipeline.reason} onRetry={() => void retry('operations')} emptyMessage="No pipeline records in this range.">{data.operations?.pipeline.value && <PipelineStrip stages={data.operations.pipeline.value} />}</WidgetState></section>

      <section className="cc-card cc-table-card"><div className="cc-card-header"><div><h2>Recent orders</h2><p>{search ? `Filtering by “${search}”` : 'Latest order records from the selected range.'}</p></div><button type="button" className="cc-inline-link" onClick={() => openView('orders')}>All orders <ArrowIcon /></button></div><WidgetState status={states.feeds.status} error={states.feeds.error} availability={data.feeds?.orders.availability} reason={data.feeds?.orders.reason} onRetry={() => void retry('feeds')} emptyMessage="No orders have been recorded in this range.">{data.feeds?.orders.value && <RecentOrders items={data.feeds.orders.value.filter(item => !search || `${item.poNo} ${item.customer}`.toLowerCase().includes(search.toLowerCase()))} onOpen={onSelectOrder} />}</WidgetState></section>

      <section className="cc-live-grid"><article className="cc-card"><div className="cc-card-header"><div><h2>Dispatches</h2><p>Latest delivery records.</p></div><Truck size={18} aria-hidden="true" /></div><WidgetState status={states.feeds.status} error={states.feeds.error} availability={data.feeds?.dispatches.availability} reason={data.feeds?.dispatches.reason} onRetry={() => void retry('feeds')} emptyMessage="No dispatches in this range.">{data.feeds?.dispatches.value && <DispatchList items={data.feeds.dispatches.value} onOpen={() => openView('dispatch')} />}</WidgetState></article><article className="cc-card"><div className="cc-card-header"><div><h2>Approvals waiting</h2><p>Continue with the existing approval flow.</p></div><PackageCheck size={18} aria-hidden="true" /></div><WidgetState status={states.feeds.status} error={states.feeds.error} availability={data.feeds?.approvals.availability} reason={data.feeds?.approvals.reason} onRetry={() => void retry('feeds')} emptyMessage="No approvals are waiting in this range.">{data.feeds?.approvals.value && <ApprovalList items={data.feeds.approvals.value} onOpen={() => openView('approvals')} />}</WidgetState></article><article className="cc-card"><div className="cc-card-header"><div><h2>Activity</h2><p>Recent audit events visible to this role.</p></div><PanelTop size={18} aria-hidden="true" /></div><WidgetState status={states.feeds.status} error={states.feeds.error} availability={data.feeds?.activity.availability} reason={data.feeds?.activity.reason} onRetry={() => void retry('feeds')} emptyMessage="No audit activity in this range.">{data.feeds?.activity.value && <ActivityList items={data.feeds.activity.value} />}</WidgetState></article></section>
    </div>
  );
}

function rangeLabel(preset: Preset): string {
  return preset === 'today' ? 'Today' : preset === 'quarter' ? 'Quarter' : preset === 'custom' ? 'Custom' : preset;
}

function buildRange(preset: Preset, today: string, customFrom: string, customTo: string, granularity: CommandCentreGranularity): CommandCentreRangeInput {
  if (preset === 'custom') return { from: customFrom, to: customTo, granularity };
  const end = new Date(`${today}T00:00:00`);
  if (preset === 'today') return { from: today, to: today, granularity };
  if (preset === 'quarter') return { from: toIsoDate(new Date(end.getFullYear(), end.getMonth() - 2, 1)), to: today, granularity };
  if (preset === 'FY') return { from: toIsoDate(new Date(end.getFullYear() - (end.getMonth() < 3 ? 1 : 0), 3, 1)), to: today, granularity };
  const days = preset === '7D' ? 6 : 29;
  return { from: toIsoDate(new Date(end.getTime() - days * 86_400_000)), to: today, granularity };
}

function toIsoDate(date: Date): string { return date.toISOString().slice(0, 10); }

function openStage(key: string, openView: (view: ConsoleView) => void) {
  if (key === 'in_qc') openView('qc');
  else if (key === 'ready_for_dispatch' || key === 'dispatched') openView('dispatch');
  else openView('orders');
}

function ArrowIcon() { return <span aria-hidden="true">→</span>; }
