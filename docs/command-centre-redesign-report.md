# Owner OS Command Centre redesign report

## Scope

Redesigned the existing Command Centre route on branch `feat/command-centre-redesign`. The shell, authentication/session flow, permissions, routing, order workflow, QC/PDI gatekeeper, dispatch flow, invoice flow, approval handlers, and neighboring module views were left in place.

The installed design skill was `design-taste-frontend` from `Leonxlnx/taste-skill`. Its neutral, restrained direction was adapted for an operational dashboard: no fake telemetry, no reference-brand content, no decorative gradients, and no AI-generated insight copy.

## Files added or changed

### Added

- `docs/command-centre-redesign-plan.md`
- `docs/command-centre-widgets.md`
- `docs/command-centre-redesign-report.md`
- `src/features/command-centre/types.ts`
- `src/features/command-centre/api/commandCentreApi.ts`
- `src/features/command-centre/hooks/useCommandCentreData.ts`
- `src/features/command-centre/utils/formatters.ts`
- `src/features/command-centre/components/CommandCentrePage.tsx`
- `src/features/command-centre/components/command-centre.css`
- `src/features/command-centre/components/WidgetState.tsx`
- `src/features/command-centre/components/KpiCard.tsx`
- `src/features/command-centre/components/TrendChart.tsx`
- `src/features/command-centre/components/OperationsCharts.tsx`
- `src/features/command-centre/components/FeedWidgets.tsx`
- `backend/src/modules/command-centre/command-centre.routes.ts`
- `backend/src/modules/command-centre/command-centre.controller.ts`
- `backend/src/modules/command-centre/command-centre.service.ts`
- `backend/src/modules/command-centre/command-centre.schema.ts`
- `backend/src/modules/command-centre/command-centre.types.ts`
- `backend/src/modules/command-centre/command-centre.aggregations.ts`
- `tests/command-centre.test.ts`
- `tests/command-centre-widgets.test.ts`

### Changed

- `src/components/console/views/CommandCentreView.tsx` is now a compatibility adapter to the feature folder.
- `src/components/console/ConsoleContainer.tsx` passes only page navigation/notification context to the redesigned route; old dashboard-only fallback props are no longer used.
- `src/lib/apiClient.ts` accepts an optional `AbortSignal` for cancellable read requests.
- `server.ts` mounts `/api/v1/command-centre`.
- `skills-lock.json` records the installed taste skill.

### Removed from the active Command Centre

The old Command Centre implementation and its synthetic dashboard-only UI are no longer rendered by the route. Legacy widget files remain untouched because they are outside the route adapter's safe removal boundary and may be referenced by historical imports.

## Endpoints

All four endpoints require Bearer JWT authentication and `requirePermission('reports', 'VIEW_ONLY')`. They accept `from`, `to`, `granularity`, `compareFrom`, and `compareTo`; the server validates ISO dates, rejects future dates, and bounds each range to 366 days.

### Summary

`GET /api/v1/command-centre/summary?from=2026-10-01&to=2026-10-16&granularity=day`

Returns current/previous values and server-calculated deltas:

```json
{
  "data": {
    "range": {
      "from": "2026-10-01",
      "to": "2026-10-16",
      "compareFrom": "2026-09-15",
      "compareTo": "2026-09-30",
      "granularity": "day"
    },
    "updatedAt": "2026-10-16T12:00:00.000Z",
    "metrics": {
      "revenue": { "availability": "supported", "current": 0, "previous": 0, "deltaPct": 0, "reason": null },
      "receivables": { "availability": "empty", "current": 0, "previous": 0, "deltaPct": 0, "reason": null },
      "openOrders": { "availability": "empty", "current": 0, "previous": 0, "deltaPct": 0, "reason": null },
      "productionOutput": { "availability": "unsupported", "current": null, "previous": null, "deltaPct": null, "reason": "Required field is absent from production_logs." },
      "dispatches": { "availability": "supported", "current": 0, "previous": 0, "deltaPct": 0, "reason": null },
      "payables": { "availability": "supported", "current": 0, "previous": 0, "deltaPct": 0, "reason": null },
      "lowStock": { "availability": "supported", "current": 0, "previous": null, "deltaPct": null, "reason": "Historical inventory snapshots are not available in the current schema." }
    }
  }
}
```

### Trend

`GET /api/v1/command-centre/trend?from=2026-10-01&to=2026-10-16&granularity=day`

Returns `series.value.selected` and `series.value.comparison`, each containing `{ period, invoiced, collected }` points from `customer_invoices`.

### Operations

`GET /api/v1/command-centre/operations?from=2026-10-01&to=2026-10-16&granularity=day`

Returns funnel, production heatmap, inventory, quality, vendor, customer and pipeline sections. Each section has `{ availability, value, reason }`.

### Feeds

`GET /api/v1/command-centre/feeds?from=2026-10-01&to=2026-10-16&granularity=day`

Returns recent orders, dispatches, approvals, audit activity and deterministic needs-attention insights.

## Widgets built and skipped

### Built

- Range toolbar with custom dates, granularity selector, search, refresh, updated indicator, notification count and responsive controls.
- Six KPI cards with comparison delta, tabular values and real-period sparkline where a real series exists.
- Invoiced versus collected SVG trend with selected/previous overlay, hover crosshair, focus tooltip and reduced-motion support.
- Needs-attention list with deterministic links.
- Order-to-cash funnel with conversion labels and stage deep links.
- Production activity heatmap with legend and hot-cell values.
- QC/PDI ring and breakdown.
- Vendor bill status breakdown.
- Inventory pressure ranked list.
- Operations pipeline strip.
- Recent orders semantic table with search and deep link.
- Dispatch, approvals and audit activity feeds.
- Loading, empty, unsupported, error, retry and refreshing states.

### Not supported by current data

- Historical inventory delta: current schema exposes current stock and reorder levels, but no historical inventory snapshots.
- Meaningful radar chart: no trustworthy multi-axis source with a stable definition was found.
- Customer geography map: customer records do not provide a safe, complete geo aggregation for this route.
- Machine OEE/utilization: the current source has machine masters and job activity, but no complete availability/performance/quality basis; no synthetic OEE is shown.
- Vendor spend category donut: vendor bill status/balance is supported; a category breakdown was not made up where source category coverage is incomplete.

## Verification performed

The following checks were run during implementation:

- `npx tsc --noEmit` — passed.
- `npx tsc -p tsconfig.backend.json --noEmit` — passed.
- `npx vitest run tests/command-centre.test.ts` — 8 tests passed.
- `npx vitest run tests/command-centre.test.ts tests/command-centre-widgets.test.ts` — 12 tests passed.
- `npx vitest run` — not green in the current repository baseline: 42 test files passed and 12 failed; 613 tests passed and 65 failed. The failures are in pre-existing migration-integrity, workflow, service-contract, and provider-wrapped view tests outside this redesign. The focused Command Centre suite passes.
- `npm run build` — passed; Vite and the bundled Express server completed.
- `npx eslint src/features/command-centre src/components/console/views/CommandCentreView.tsx tests/command-centre-widgets.test.ts` — 0 errors; only two unused-import warnings were fixed afterward.
- `node .agents/skills/design-taste-frontend/scripts/lint.mjs src/features/command-centre` — 0 FAILs and 6 justified warnings for dashboard form/card borders required by the existing console visual language.
- `npm run lint:eslint` — not green because the repository already contains a large baseline of unrelated errors/warnings in legacy files. The changed Command Centre paths have no ESLint errors when linted directly.
- `git diff --check` — passed.

## Manual verification checklist

This workspace does not contain an authenticated owner/admin session, and no credentials or Supabase project/data were accessed. The checks below distinguish code evidence from browser checks that require that session.

| Check | Result | Evidence / gap |
| --- | --- | --- |
| 1. Page loads with real data and no console errors | **Blocked** | Requires a local authenticated Owner OS session. Backend and frontend type/build checks pass. |
| 2. KPI matches underlying module page | **Blocked** | Requires live records and hand-check against Orders/Invoices/Inventory. |
| 3. Range selector changes all widgets and deltas | **Partial** | Shared typed range is passed to all four parallel requests and delta is server-side; browser hand-check not run. |
| 4. Empty range has helpful states and no NaN/Infinity | **Pass in component tests** | Widget state tests pass; live empty-range browser check not run. |
| 5. Killing one endpoint isolates its error state | **Partial** | `Promise.allSettled` isolates endpoint state in code; fault-injection browser/network check not run. |
| 6. Role-restricted users do not fetch forbidden data | **Pass for endpoint contract** | Auth and reports `VIEW_ONLY` middleware tests pass; full role matrix network observation not run. |
| 7. Light and dark mode contrast | **Blocked** | CSS includes explicit light/dark tokens; screenshot contrast review requires browser session. |
| 8. 1920/1440/1280/1024/768/390 responsive widths | **Partial** | Responsive breakpoints and no fixed page width are implemented; browser overflow review not run. |
| 9. Keyboard navigation and screen-reader labels | **Pass in code/tests** | SVG chart has role/name/focus support, tables are semantic, controls are buttons/labels; screen-reader run not available. |
| 10. No loading layout shift | **Pass in code/tests** | Fixed skeleton/card geometry and loading render test; browser measurement not run. |
| 11. Real-time refresh behavior | **Partial** | Existing shell SSE remains intact and feature polling pauses when hidden; live event observation not run. |
| 12. Other pages unchanged | **Partial** | Only Command Centre adapter/container wiring and shared API abort support changed; full existing suite has unrelated baseline failures. |
| 13. No duplicate requests or waterfalls | **Partial** | Four endpoint requests are launched in one parallel batch with range cache; authenticated network inspection not run. |

## Bundle-size note

The production build completed with the existing single application bundle. The build output reported approximately `3,090.04 kB` minified JavaScript (`694.96 kB` gzip) and `408.33 kB` CSS (`48.51 kB` gzip). A trustworthy before/after Command Centre-route chunk comparison is **not supported by the current build**, because the existing Vite configuration emits one application chunk and has no route-level bundle baseline. A follow-up should add route-level code splitting before measuring this route in isolation.

## Known limitations and follow-ups

1. The backend module currently reads the contributing aggregate source tables through the backend database client and normalizes/group them in the service. It does not add indexes or migrations. For thousands of rows, add/verify date indexes and move heavy grouped work to a reviewed SQL/RPC path without changing the public response contract.
2. Existing neighboring metrics and legacy Command Centre widget files still contain synthetic fallback behavior, but the redesigned Command Centre route does not consume them. The old Metrics view was intentionally left unchanged.
3. Manual browser verification at all requested widths, light/dark screenshots, console/network inspection and SSE event observation require a running authenticated Owner OS environment. They should be completed with a real owner/admin session without touching production data.
4. The production heatmap uses UTC timestamps to keep server/client bucketing deterministic. If the product's canonical timezone differs, expose that existing timezone setting to the endpoint and label the heatmap accordingly.
5. Audit feed visibility follows the existing `reports` permission used by this dashboard endpoint. If the product wants audit rows for roles that cannot access the audit module, add a separately reviewed permission scope rather than widening this route.
