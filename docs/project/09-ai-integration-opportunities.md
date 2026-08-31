# AI Integration Opportunities (scout only — nothing implemented)

**Premise correction (stated up front, per audit honesty):** the repo is *not* entirely AI-free.
`@google/genai` is a runtime dependency, `server.ts` mounts an unauthenticated
`POST /api/gemini/analyze` copilot endpoint (lines 118–143, "Stratum AI Executive Copilot",
model `gemini-2.5-flash`), and legacy `src/components/AiStudioView.tsx` calls it (line 70) —
but that component is unreferenced by the live console, so the integration is **dormant**, not
active. There are no openai/anthropic/embedding/vector usages anywhere. The map below is
written from scratch and ordered by realistic near-term value; item 1 is the cheapest because
the server-side plumbing partially exists.

---

## 1. Executive Q&A over live operational data (Command Centre)

- **Where:** `CommandCentreView.tsx` / `AgentBentoGrid.tsx` (frontend), `POST /api/gemini/analyze`
  in `server.ts` (backend, already present but caller-less and unauthenticated).
- **What AI would do there:** answer natural-language questions ("which orders are blocked at
  QC and why", "top 5 overdue receivables") by summarizing context passed from the server —
  classify intent, summarize, and flag anomalies in metrics.
- **How it would plug in:** a new authenticated, permission-gated route (e.g. under
  `requirePermission('reports', 'VIEW_ONLY')`) that assembles context server-side from
  `ordersService.getOrders()` + `invoicesService` + `approvalsService`, sends it as the
  `context` field the existing handler already accepts, and streams the markdown answer back.
  In: question + aggregated context object. Out: markdown answer + cited record ids.
- **Data available for it:** everything the console already loads — `customer_orders` (status,
  gates, payment), `customer_invoices`, `pending_approvals`, audit logs.
- **Complexity:** small — the endpoint and prompt scaffold exist; the work is auth/RBAC,
  context assembly, and UI wiring. Prerequisite: decide retention/logging of prompts.

## 2. Client PO document → pre-filled order draft

- **Where:** `attachments` module (upload/storage) + the create-order form in
  `OrdersView.tsx` (lines 250–293 build `orderPayload` manually today).
- **What AI would do there:** extract structured data from an uploaded client PO
  (PDF/scan/email text): PO number, customer, line items (part code, description, qty, unit,
  rate), delivery date — turning free-form documents into a reviewable draft.
- **How it would plug in:** after `POST /api/v1/attachments` saves the file, an async step
  extracts fields and returns a draft `Partial<CustomerOrder>`; the UI opens the existing
  create-order modal pre-filled for human confirmation before `onCreateOrder` runs. In: file
  reference + OCR/text. Out: JSON matching `CustomerOrderSchema` (zod-validated, low-confidence
  fields flagged for review).
- **Data available for it:** `customer_orders.client_po_file` column already exists (migration
  014-era fields; mapped in `ordersService.getOrders` line 147), plus `items`/`customers`
  masters to fuzzy-match part codes and customer names against.
- **Complexity:** medium–large. Prerequisite: human review step before any state transition —
  the state machine's drawing-revision gate (`validateDrawingRevision`) should stay the
  authority, not the extraction.

## 3. QC/PDI remark classification & NCR drafting

- **Where:** `qc.service.ts` — `inspector_notes` and `defect_category` fields (lines 32–33,
  86–87, 120); the defect-description fallback chain at line 225; `production.routes.ts`
  `POST /ncrs`.
- **What AI would do there:** classify free-text inspector notes into a defect taxonomy
  (dimensional, surface, material, process), standardize wording, and draft the NCR
  `defect_description` instead of the current fallback string ('Dimensional out-of-tolerance…').
- **How it would plug in:** inside `qc.service.ts` after `ReviewQCSchema.parse` (line 120) — a
  classification call that proposes `defect_category` when the inspector left it generic; and a
  draft step before `production`'s NCR insert. In: `inspectorNotes` + inspection result. Out:
  category label + suggested NCR text + confidence. Human confirms; suggestion never
  auto-creates the NCR.
- **Data available for it:** historical `qc_inspections` rows with notes/categories, `ncrs`
  table with `defect_description`, job card linkage — enough for few-shot prompting from day
  one; fine-tuning would need more history.
- **Complexity:** medium. Prerequisite: QC inspector confirmation UI before category is
  persisted (it drives dispatch eligibility via the open-NCR gate).

## 4. GST spreadsheet import mapping & cleansing (Masters)

- **Where:** `handleImportOMGST` in `src/hooks/useOwnerOSData.ts` (lines 1528–1540) and the
  Masters import UI in `MastersView.tsx`; validation helpers already in
  `src/utils/masterValidation.ts` (GSTIN/state codes) and `statutoryAccountingEngine.ts`
  (GSTIN format).
- **What AI would do there:** map arbitrary supplier/customer spreadsheet columns to canonical
  fields (code, GSTIN, address, state), normalize formatting, and flag rows whose GSTIN fails
  the existing validators — replacing today's "insert as-is" behavior.
- **How it would plug in:** a parse step between file read and the `insertCustomer`/
  `insertVendor` loops: in, raw sheet rows; out, mapped records + per-row warnings shown for
  confirmation before import (which itself should become batched — see 08-issues).
- **Data available for it:** existing masters (`customers`, `vendors`, `machines` via
  `masters.service.ts`) as match targets; no new schema needed.
- **Complexity:** small–medium. Prerequisite: confirm-before-import UI (rows currently insert
  immediately).

## 5. Notification message drafting (rules → human-readable alerts)

- **Where:** `notifications.service.ts` — `broadcastEvent(eventName, payload)` (line 180), the
  default message `'System notification triggered.'` (line 240), and the inline HTML email
  template (line 289).
- **What AI would do there:** turn raw event payloads (order delayed, approval escalated, GRN
  mismatch) into role-specific plain-language summaries for the SSE toast and email body
  instead of one generic string.
- **How it would plug in:** a drafting step inside the trigger/recipient pipeline — in, event
  name + payload + recipient role; out, title + message (≤2 sentences) + severity suggestion.
  The severity-based sound/UX (`useInAppNotifications`, `notificationSound.ts`) stays
  unchanged.
- **Data available for it:** full event payloads already broadcast (`order_updated`,
  `order_transitioned`, job-card events), plus `notification_rules`/`notification_recipients`
  tables (migrations 005/018).
- **Complexity:** small. Prerequisite: fall back to the current static message when the model
  call fails — notifications must never block the business flow.

## 6. 3-way-match variance explanation (procurement)

- **Where:** `purchasing.routes.ts` `POST /three-way-match` →
  `purchasingController.evaluateThreeWayMatch`; the `vendor-bills` module (bill descriptions);
  `procurementEngine.ts` variance rules.
- **What AI would do there:** extract structured quantities/rates from free-text vendor bill
  descriptions and write a human explanation of variances (price vs PO, qty vs GRN) for the
  approver — complementing, not replacing, the deterministic match.
- **How it would plug in:** after the deterministic match result, before the bill is queued
  for approval — in, PO + GRN + bill rows; out, variance narrative + suggested disposition
  note. Escalation still goes through `pending_approvals` / `isWithinApprovalLimit` as today.
- **Data available for it:** `purchase_orders`, GRN items, `vendor_bills`, vendor scorecards
  (`vendor-scorecard.service.ts`) all exist; call-out: bills are mostly header-level today, so
  line-item extraction is a prerequisite.
- **Complexity:** medium. Prerequisite: Accountant review before payment (already gated by
  approval limits).


## 7. Anomaly flags on the Command Centre / Reports

- **Where:** `CommandCentreView.tsx`, `ReportsView.tsx`, backed by the same aggregations the
  copilot context would use.
- **What AI would do there:** flag statistical anomalies in daily metrics (dispatch delays
  spiking, an order stuck in one stage far longer than its history, margin dropping per
  customer) and surface them as dismissible cards.
- **How it would plug in:** a scheduled async job (the repo already ships `bullmq` +
  `backend/src/lib/queues.ts`) computing flags nightly; results persisted (new small table)
  and read by the views. In, historical aggregates; out, list of
  `{ entity, metric, deviation, summary }`.
- **Data available for it:** `customer_orders` history with timestamps, `dispatch_challans`
  dates, `audit_logs`, movements ledger — sufficient for simple baselines now, richer after
  months of data.
- **Complexity:** medium–large. Prerequisite: accumulated history; needs a storage table that
  does not exist yet.

## 8. Login/session risk anomaly detection

- **Where:** `auth/risk.service.ts` — currently a hand-weighted additive score (lines 49–165:
  +20/+40/+60 increments mapped to CRITICAL/HIGH/MEDIUM at lines 150–156).
- **What AI would do there:** supplement the rule score with per-user behavioral baselines
  (unusual hour, new device+geo vs that user's own history) rather than global thresholds.
- **How it would plug in:** a scoring step inside `RiskService` at login — in, current login
  signals + the user's `security_events` history (table exists, migration 008); out, an
  adjusted score + reason string appended to the existing `risk_info` login response.
- **Data available for it:** `security_events` and `sessions` tables (ip, user_agent,
  timestamps) already populated by the auth service.
- **Complexity:** medium. Prerequisite: per-user history (weeks of logins); must fail open to
  the rule-based score if the model is unavailable.

## 9. Natural-language command palette search

- **Where:** `CommandPaletteModal.tsx` (currently literal substring matching over orders, job
  cards, stock, masters, invoices, dispatches).
- **What AI would do there:** semantic matching — "unpaid TATA invoices" or "job cards stuck
  in rework" resolve to records without exact text overlap.
- **How it would plug in:** embeddings over existing record summaries, computed after each
  data load or server-side; in, query text; out, ranked record ids the palette already
  navigates to via `onSelectOrder`/`onNavigate`.
- **Data available for it:** everything the palette already indexes client-side; vector
  storage does **not** exist yet — needs an embedding-cache table or a hosted vector service.
- **Complexity:** medium. Prerequisite: vector storage decision; keep literal search as the
  fallback path.

## 10. Delivery-date / quantity forecasting for procurement

- **Where:** `procurementEngine.ts` (requisitions, lead times), `inventory.service.ts`
  shortages, `purchase_requisitions` table (auto-generated by the state machine since
  migration 014).
- **What AI would do there:** forecast per-item demand from order history to suggest reorder
  points before a shortage gate fires — shifting procurement from reactive
  (`MATERIAL_SHORT → PROCUREMENT_PENDING`) to proactive.
- **How it would plug in:** scheduled job writing suggested reorder quantities into the
  inventory/reconciliation screens, advisory only. In, order-line history + movements ledger;
  out, per-item forecast + confidence.
- **Data available for it:** `order_line_items` (item codes, qty, dates),
  `inventory_movements` ledger, `purchase_requisitions` history — good inputs, but forecasts
  need accumulated cycles.
- **Complexity:** large. Prerequisite: 6+ months of history; advisory-only until accuracy is
  proven.

## Cross-cutting prerequisites (apply to all items)

- Every AI call must sit behind `requireAuth` + `requirePermission` — the current
  `/api/gemini/analyze` endpoint has neither (logged in 08-issues).
- Treat all model output as advisory: the deterministic gates in `orderStateMachine.ts`,
  `statutoryAccountingEngine.ts`, and `rbacMatrix.ts` remain the enforcement layer.
- Log prompts/outputs to the append-only `audit_logs` table via `audit.service.ts` whenever
  output influences a business decision.

