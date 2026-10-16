# Owner OS Command Centre redesign plan

## Phase 0 audit

The repository is a React 19 + Vite + TypeScript frontend with a custom Express + TypeScript backend. The authenticated console is mounted by `src/components/console/ConsoleContainer.tsx`; `/command-center` is the canonical Command Centre route and `/command-centre` redirects to it. The shell, auth/session flow, sidebar, top bar, and other console views remain outside this redesign.

The reference folder contains **8** PNGs (the brief says 7). All 8 were opened. They are being treated as component references only: KPI cards, trend charts, heatmaps, funnel, rings, ranked lists, activity tables, delivery cards, and a toolbar. No reference copy, logos, people, products, or brand styling will be reused.

Taste direction: a live operating ledger. The page should feel like one calm, precise record of the factory's current state rather than a collection of promotional cards. The data itself supplies the visual rhythm: neutral surfaces, one restrained accent, semantic colors only, tabular figures, and one planned dark operations band. Gradients, decorative glows, fake telemetry, and ornamental badges are excluded even where they appear in the references.

## Existing inventory (path -> purpose)

### Routing and shell

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Authenticated app entry; delegates operational paths to `ConsoleContainer`. |
| `src/components/console/ConsoleContainer.tsx` | Shared sidebar/top bar shell, URL synchronization, auth/role checks, global data loading, view switching. |
| `src/components/console/ConsoleSidebar.tsx` | Desktop navigation and shell controls. |
| `src/components/console/ConsoleTopBar.tsx` | Shared breadcrumb, sync, notifications, theme, account controls. |
| `src/components/console/MobileDrawer.tsx` / `MobileBottomTabBar.tsx` | Tablet/mobile shell navigation. |
| `src/utils/navigationConfig.ts` | Canonical view-to-path mapping. |
| `src/context/AccentThemeContext.tsx` | User-selected accent theme. |
| `src/index.css` | Tailwind v4 import, slate/carbon/accent tokens, dark mode, shared transitions and table rules. |

### Current Command Centre

| Path | Purpose |
| --- | --- |
| `src/components/console/views/CommandCentreView.tsx` | Current oversized cockpit view. It mixes layout, attendance, calendar, meeting, task, AI and analytics widgets; it contains hardcoded fallbacks and several `any` props. It will become a thin compatibility adapter to the feature folder. |
| `src/components/console/widgets/ExecutiveCommandWidgets.tsx` | Existing KPI, cashflow, monthly progress, history and gate widgets; includes synthetic fallback events and values. |
| `src/components/console/widgets/CommandCentreLayouts.tsx` | Existing executive, operations, quality and financial layouts; includes hardcoded machine/throughput/OEE fallbacks. |
| `src/components/console/charts/OrderBookRevenueChart.tsx` | Existing order-book chart used by the current view. |
| `src/components/console/AgentBentoGrid.tsx` | Imported by the old view but not rendered; dead Command Centre-specific UI. |
| `src/hooks/useOwnerOSData.ts` | Parallel REST data loading, SSE notification updates, existing workflow handlers, and three-minute reconciliation. Despite legacy service names, frontend calls go through the backend REST client. |
| `src/services/consoleApiServices.ts` | Typed REST wrappers for existing `/api/v1` endpoints. Several legacy fallbacks return cached/local/mock-like values and will not be used by new widgets. |
| `src/lib/apiClient.ts` | Authenticated REST client with in-memory bearer token, refresh-cookie retry, and common error mapping. |
| `src/types/console.ts` | Existing shared entity types: orders, stock, job cards, QC/PDI, dispatch, invoices, bills, approvals and audit logs. |

### Backend and endpoint conventions

| Path | Purpose |
| --- | --- |
| `server.ts` | Express app and `/api/v1` route mounts. |
| `backend/src/middleware/auth.middleware.ts` | Bearer JWT authentication; rejects missing/invalid sessions. |
| `backend/src/middleware/rbac.middleware.ts` | `requirePermission(module, access)` enforcement and role/override context. |
| `backend/src/config/database.ts` | Backend-only Supabase service client. No frontend Supabase calls will be added. |
| `backend/src/modules/metrics/*` | Existing authenticated metrics endpoints; currently synthesize fallback values and are not reused for the new page. |
| `backend/src/modules/orders/*`, `inventory/*`, `production/*`, `qc/*`, `dispatch/*`, `invoices/*`, `vendor-bills/*`, `approvals/*`, `audit/*`, `notifications/*` | Existing domain REST routers/controllers/services and response conventions. |

### Existing primitives and charting

The repo has shared UI primitives under `src/components/ui/` (including buttons, cards, badges, skeletons, tooltips, tables and chart primitives), but the current Command Centre mostly uses local Tailwind markup. Reusable feature primitives will live under `src/features/command-centre/components/` to avoid changing unrelated pages. Recharts `^3.10.1` is already installed and will be reused only for the hero/stacked charts; sparklines, funnel, heatmap, rings and progress lists will be SVG/CSS.

## Component plan

Feature folder: `src/features/command-centre/`

- `types.ts`: typed response contracts and range/view models.
- `api/commandCentreApi.ts`: authenticated typed client for the new read-only endpoints.
- `hooks/useCommandCentreData.ts`: parallel requests, AbortController, per-section status, cached last good response, SSE-triggered refresh bridge and hidden-tab polling fallback.
- `utils/formatters.ts`: locale-aware INR, count, percent, date and relative-time helpers.
- `utils/aggregations.ts`: deterministic client-safe display helpers only; no invented fallback numbers.
- `components/CommandCentrePage.tsx`: responsive composition and toolbar.
- `components/CommandCentreToolbar.tsx`: range, granularity, search, refresh and notification affordances.
- `components/KpiCard.tsx`, `Sparkline.tsx`, `DeltaChip.tsx`, `StatusPill.tsx`.
- `components/TrendChart.tsx`, `Funnel.tsx`, `Heatmap.tsx`, `RingChart.tsx`, `RankedBarList.tsx`, `PipelineChart.tsx`.
- `components/DataTableCard.tsx`, `FeedList.tsx`, `InsightCard.tsx`, `WidgetState.tsx`.

The old Command Centre entry point will retain its existing props and workflow callbacks, but render the new feature page with the already-loaded real entity collections available from the shell. No approval, dispatch, PDI, invoice, or order logic will be reimplemented.

## Data-source map

| Widget | Source | Formula / supported behavior |
| --- | --- | --- |
| Revenue / receivables / open orders / production / dispatch / payables / low stock | `command-centre/summary` | Server-side sums/counts over the selected range and equal-length comparison range. Missing source fields produce `null`/empty state, never a made-up number. |
| Invoiced vs collected trend | `command-centre/trend` | Group invoice totals and paid amounts by requested day/week/month; comparison series is returned by the server. |
| Order-to-cash funnel | `command-centre/operations` | Counts by existing order stage/status. Stages unsupported by current rows are shown as empty, not inferred. |
| Production throughput heatmap | `command-centre/operations` | Job-card operation completion/log timestamps by weekday and time bucket. If operation timestamps are absent, the widget explains that the current data does not support it. |
| Inventory rank / reorder view | `command-centre/operations` | Existing inventory `current_stock`/`on_hand` versus `reorder_level`, grouped by item/category. |
| QC/PDI ring | `command-centre/operations` | Existing QC statuses (`PASS`, `QC_HOLD`, `REJECTED`, pending) and PDI statuses. |
| Vendor bills breakdown | `command-centre/operations` | Vendor bill status and balance totals. |
| Top customers | `command-centre/operations` | Order/invoice value grouped by customer name, with share of selected-period total. |
| Operations pipeline | `command-centre/operations` | Existing order stage counts by selected period. |
| Recent orders / dispatches / approvals / audit feed | `command-centre/feeds` | Read-only, role-filtered records with links into existing views and approval handlers. |
| Needs attention / Insight of the day | `command-centre/feeds` | Deterministic rules for overdue receivables, blocked QC/PDI, due/late deliveries, and low stock. No AI and no invented thresholds beyond explicit rule constants. |
| Notification count | Existing `/notifications` hook/channel | Existing in-app notification data and unread count; no duplicate notification API. |

## New read-only endpoints

All endpoints are mounted at `/api/v1/command-centre`, require JWT authentication, and require the existing module-level `VIEW_ONLY` permissions. Query parameters are `from`, `to`, `granularity` (`day|week|month`) and `compareFrom`/`compareTo`; dates are ISO calendar dates, range is bounded to 366 days, and invalid ranges return the existing validation error shape.

- `GET /summary` -> KPI values, previous-period values/deltas, selected range and `updatedAt`.
- `GET /trend` -> invoiced/collected and comparison time-series points.
- `GET /operations` -> funnel, production heatmap, inventory, quality, vendor, customer and pipeline sections.
- `GET /feeds` -> recent orders, dispatches, pending approvals visible to the user, activity records and deterministic insights.

The service uses existing tables and indexes only. No migrations, tables, writes, or schema changes are planned. If current schema fields cannot support a widget, the endpoint returns an explicit unsupported marker and the UI renders an empty state.

## Risks and mitigations

1. The current view has multiple synthetic fallbacks (customers, finance, machine telemetry, chart series, events). The redesign removes those from the new route and labels unsupported widgets instead of presenting sample data as live.
2. Some existing schemas use different names for dates/amounts across modules. Backend adapters will normalize known fields and tests will cover seeded fixture rows; unknown/missing fields remain empty.
3. Existing `useOwnerOSData` loads broad collections for other pages. The new typed command-centre calls are isolated to the feature and will be kept parallel; a later optimization can consolidate shared collection loads without changing workflows.
4. Role restrictions differ by module. Each endpoint checks all contributing modules and omits restricted sections rather than fetching them; the frontend does not infer permissions from the local user-switcher state.
5. Existing metrics endpoints synthesize fallbacks. They are not used by the redesigned page; the old Metrics view remains unchanged to honor the scope guardrail.
6. Existing audit POST middleware is missing permission protection. This redesign only reads audit data and does not widen or alter that existing route.
7. Mobile density is a real constraint. The 12-column desktop layout collapses to one column, tables become horizontally scrollable only inside their card, and all controls retain 44px touch targets.

## Verification plan

- Add pure aggregation/validation fixture tests plus endpoint contract tests for auth/role/params and each new route.
- Add render tests for loading, empty, error and populated states for the key widgets.
- Run `tsc --noEmit`, backend typecheck, ESLint, Vitest, production build, the taste lint/inspection where browser tooling permits, and record actual results in the final report.
- Manually verify light/dark mode, range changes, isolated widget failure, keyboard focus, responsive widths, SSE/poll refresh, and unchanged neighboring views.
