# Owner OS Command Centre widget contract

Every widget is read-only. The backend returns `supported`, `partial`, `empty`, or `unsupported` for each section. `unsupported` is rendered as an explanation; zero is never used as a substitute for missing source data.

| Widget | Endpoint / source | Formula | Loading / empty / error behavior |
| --- | --- | --- | --- |
| Date range toolbar | Shared query used by all four endpoints | Presets resolve to ISO `from`/`to`; backend derives equal-length previous period. | Controls remain usable while requests refresh. Invalid custom ranges are shown by the endpoint state instead of crashing the page. |
| Invoiced revenue KPI | `/command-centre/summary` → `customer_invoices` | Sum `total_amount` for invoice `date`/`created_at` inside the selected range; delta versus previous equal-length range. | Skeleton; no comparison when the prior period is zero/unavailable; retry is isolated to summary. |
| Outstanding receivables KPI | `/command-centre/summary` → `customer_invoices` | Sum `balance_amount` for invoices in range; delta versus previous range. | Empty state when no invoices exist; no synthetic balance. |
| Open orders KPI | `/command-centre/summary` → `customer_orders` | Count rows whose `status`/`stage` is not `CLOSED` or `CANCELLED`, dated by `po_date`/`created_at`. | Explicit empty or unsupported state if order dates/status fields are unavailable. |
| Production output KPI | `/command-centre/summary` → `production_logs` | Sum `qty_done` by `logged_timestamp`/`created_at`. | Empty when there are no production logs; unsupported if quantity/timestamp fields are absent. |
| Dispatched KPI | `/command-centre/summary` → `dispatch_challans` | Count dispatch rows dated by `date`/`created_at`. | Empty state when no dispatches are in range. |
| Low-stock KPI | `/command-centre/summary` → `stock_items` | Count rows with `SHORTAGE`/`CRITICAL` or `on_hand/current_stock <= reorder_level`. | Previous-period comparison is intentionally unavailable because the current schema has no historical stock snapshot. |
| Cash conversion chart | `/command-centre/trend` → `customer_invoices` | Group `total_amount` and `paid_amount` by selected day/week/month. Overlay the equal-length comparison series. | SVG chart has keyboard focus, hover/focus crosshair and multi-value tooltip. No invoices renders a useful empty message. |
| Needs attention | `/command-centre/feeds` | Deterministic rules: past delivery date on open orders, overdue invoice with positive balance, low stock, QC hold/rejection/rework, PDI failure/hold. | Each signal links to the existing order, invoice, inventory, QC or PDI view. |
| Order-to-cash funnel | `/command-centre/operations` → `customer_orders` | Counts orders by existing stages: PO received, confirmed, in production, QC, ready for dispatch, dispatched. Stage conversion is `current / prior * 100`; no prior base shows `No base`. | Clickable stages deep-link to existing list views. |
| Production tempo heatmap | `/command-centre/operations` → `job_card_operations` | Count operations by UTC weekday and 3-hour bucket using `actual_end_time` or `actual_start_time`. | If operation timestamps are absent, the UI states that this metric is not supported by current data. |
| Quality gate ring | `/command-centre/operations` → `qc_inspections`, `pdi_inspections` | QC pass rate is `PASS / all status rows * 100`; PDI pass count is shown separately. | Partial state when only one source is available; no inferred pass rate. |
| Vendor bills | `/command-centre/operations` → `vendor_bills` | Group by bill `status`; show amount, balance and share of total balance. | Empty when no bills are recorded; unsupported if amount/balance fields are missing. |
| Inventory pressure list | `/command-centre/operations` → `stock_items` | `shortage = max(reorder_level - on_hand/current_stock, 0)`; order descending by shortage. | Empty when all items are above reorder level. |
| Operations pipeline | `/command-centre/operations` → `customer_orders` | Same real stage counts as the funnel, shown as an operations strip. | Empty or unsupported state follows the funnel source. |
| Recent orders | `/command-centre/feeds` → `customer_orders` | Latest 20 rows in range, searchable by PO/customer on the client. | Semantic table; order number opens existing Order Detail. |
| Recent dispatches | `/command-centre/feeds` → `dispatch_challans` | Latest 20 rows by `date`/`created_at`. | Empty state and link to existing dispatch view. |
| Approvals waiting | `/command-centre/feeds` → `pending_approvals` | Rows with no status or `PENDING_OWNER_APPROVAL`, dated by `created_at`/`timestamp`. | Opens existing Approvals view; approval logic is not duplicated. |
| Audit activity | `/command-centre/feeds` → `audit_logs` | Latest 30 visible audit rows by `created_at`/`when_time`. | Empty/unsupported state respects the server role permission. |
| Vendor / finance drilldowns | Existing module routes | No mutation or new business rule; links only. | The existing module remains the source of truth. |

## Shared state behavior

- All four requests run in parallel on range change.
- Request results are isolated by endpoint; one error leaves the other widgets rendered.
- Results are cached by `from:to:granularity` in the feature hook to avoid duplicate range requests.
- An `AbortController` cancels stale range requests.
- A 75-second refresh timer runs only while the document is visible; returning to the tab triggers a refresh.
- Number formatting uses `en-IN` and tabular figures. Full values remain in tooltips or the source module.
- The page uses existing Owner OS authentication and notification shell behavior. No frontend Supabase client is introduced.
