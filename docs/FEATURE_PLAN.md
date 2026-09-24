# Owner OS (GuruOm SaaS) — Feature Plan & Roadmap (DRAFT)

> **Status:** Planning document only. **No code, schema, migration, or data changes** were made
> for this document. Every item below needs its own design + review before implementation.
>
> **Date:** 2026-09-08 · **Repo:** `guruomosv2` — GuruOm "Owner OS" (internal name: *Stratum*)
> **Sources:** live code (`src/`, `backend/src/`, `supabase/migrations/001–036`),
> internal audits (`docs/project/08-issues-and-suggestions.md`, `docs/project/09-ai-integration-opportunities.md`),
> and the legacy-system reference (`docs/README-SYSTEM-AND-ORDER-WORKFLOW.md` §9 "Known gaps / deferred").

---

## 1. How this plan was derived

1. Inventoried the **live console** — 18 views in `src/components/console/views/` and the shell
   (`ConsoleContainer`, `ConsoleHeader` with NotificationDrawer, `CommandPaletteModal` on Ctrl+K).
2. Inventoried the **21 backend modules** in `backend/src/modules/` and their endpoints.
3. Compared what the **marketing site sells** (`src/data/modulesData.ts` — 13 modules) against
   what the console actually implements → several sold modules have no console implementation.
4. Mined the **internal audits**: open security/code issues (08) and 10 scoped AI opportunities (09).
5. Re-checked the legacy system's explicit **"deferred to v1.1+"** list (quotations, operator
   self-logging, WhatsApp API, bank reconciliation, deeper procurement, credit-limit blocking,
   UOM conversion in consumption).

---

## 2. Current state snapshot (what exists today)

| Area | Live today |
|---|---|
| Console views | Command Centre, Orders + Order Detail, Production (list + 3-column Kanban), QC, PDI, Dispatch, Inventory (stock / shortages / movements ledger / reconciliation), Invoices, Payables, Finished Goods, Plating & Outwork, Masters, Approvals inbox, Reports (production logs + CSV export), Users & Audit, Company Profile, Workflow Testing (dev-only) |
| Shell & shared | Route-mapped console (`/orders`, `/qc`, …), Ctrl+K command palette (literal substring search over orders/jobs/stock/invoices/dispatch), SSE notification drawer + unread counts (`useInAppNotifications`), RBAC gating (`AccessRestrictedGate`, `rbacMatrix`), URL-driven deep-linkable modals (`useUrlModal`), dark/light + accent theming |
| Backend modules | `auth` (JWT + sessions + security events + risk scoring), `orders` (state machine + gates + amendments), `production` (route cards, job cards, op start/complete, logs, NCRs, telemetry), `qc`, `dispatch`, `inventory` (append-only ledger + reversal), `grn`, `bom`, `purchasing` (requisition → PO → GRN → incoming QC → vendor returns → 3-way match → scorecards), `outwork`, `finished-goods`, `invoices` (GST, e-invoice retry, payments), `vendor-bills`, `approvals`, `notifications` (SSE + rules + recipients), `attachments` (Supabase Storage), `audit` (append-only + export), `masters`, `admin`, `testing` (golden-path simulator, dev only) |
| Infra | Express API + Vite SPA on one origin, Supabase Postgres, optional Redis (cache / redlock / BullMQ), rate limiting, Resend email (server-side), Gemini endpoint (`POST /api/gemini/analyze` — **dormant & unauthenticated**, see SEC-2) |
| Marketing site | Sells 13 modules incl. Task Management, CRM, HR & Payroll, Machine & Maintenance, Reporting & Analytics, AI Copilot — **most of these have no console implementation yet** |

---

## 3. Constraints every feature must respect (product design rules)

1. **Server owns state** — no client-trusted transitions; the state machine stays the enforcement layer.
2. **Money is a privilege** — rates/margins/receivables render only for finance roles; UI must degrade when money fields are stripped.
3. **Audit on every transition** (append-only).
4. **FY-scoped numbering** for any new document type (quote, RFQ, complaint, etc.).
5. **AI is advisory-only** and must sit behind `requireAuth` + `requirePermission`.
6. **Fast entry beats pretty entry** — ops/QC forms optimize keystrokes.
7. **Tally/OMGST remains the financial book of record** — we push documents, we don't replace it.

---

## 4. Feature backlog

Effort: **S** < 3 days · **M** ≈ 1–2 weeks · **L** > 2 weeks (rough, single-dev).
"Migration: yes" = will need new tables/columns **at implementation time** (explicitly **not** done in this planning task).

### 4.1 Board & navigation UX (the "board app" itself)

- **UX-1 · Production Kanban v2** — the current board (`ProductionView.tsx`, `viewMode === 'board'`)
  is 3 static columns (SCHEDULED / RUNNING / COMPLETED), no drag-and-drop, no WIP limits. Add
  drag-to-transition with **server-validated** transitions, machine/operator swimlanes, per-column
  WIP limits, ageing/SLA badges, compact card mode. · *Effort M · Migration: No*
- **UX-2 · Saved views / user preferences** — persist per-user filters, sort, column sets, density
  per list view. · *Effort S–M · Migration: Yes (small)*
- **UX-3 · Orders pipeline board** — a second Kanban across order stages/gates ("status is the
  interface"), one click → OrderDetailView. · *Effort M · Migration: No*
- **UX-4 · Command palette upgrades** — fuzzy matching, recent items, role-aware quick actions
  (create order, start op), RBAC-scoped. · *Effort S · Migration: No*
- **UX-5 · Bulk actions** — multi-select rows → bulk approve / transition / export / print, with a
  per-row results summary. · *Effort M · Migration: No*
- **UX-6 · Notification deep-links** — SSE + drawer are live; make each notification open the exact
  record (order/job/NCR/challan) with highlight. · *Effort S · Migration: No*
- **UX-7 · Mobile shop-floor mode** — responsive op start/complete + QC pass/fail screens with
  job-card QR/barcode scan; pull-to-refresh hook already exists. · *Effort M–L · Migration: No*
- **UX-8 · Print/CSS polish for documents** — challan, invoice, GRN, NCR print layouts with
  consistent branding. · *Effort S · Migration: No*

### 4.2 Close the marketing–product gap (sold on the site, missing in the console)

The website sells 13 modules (`src/data/modulesData.ts`); the console implements roughly half.
Each gap below is a shippable feature **and** closes a promise made to prospects.

- **GAP-1 · Task Management module** (marketed: `task-management`) — departmental task boards
  (Kanban + list), assignments, SLA deadlines with automated nudges (notifications module +
  BullMQ scheduling exist), accountability metrics; MOM→task converter later.
  *Effort M–L · Migration: Yes (tasks, assignments).*
- **GAP-2 · CRM lead pipeline** (marketed: `crm`) — visual lead Kanban + table stages, instant
  quote generator with margin guardrails, Customer 360 (orders/invoices/complaints can already
  be aggregated from existing masters). *Effort L · Migration: Yes (leads, quotes, activities).*
- **GAP-3 · Reporting & Analytics** (marketed: `reporting-analytics`) — today `ReportsView` is
  production logs + CSV only. Add: receivables/payables ageing, on-time dispatch %, QC first-pass
  yield, inventory turns, machine utilisation, revenue by customer/part. `recharts` is already a
  dependency; serve aggregates from new endpoints with the existing Redis cache pattern.
  *Effort M–L · Migration: Mostly No (views over existing tables).*
- **GAP-4 · Machine & Maintenance** (marketed: `machine-maintenance`) — machine masters exist;
  add maintenance schedules, breakdown/downtime logs, spares consumption, maintenance compliance
  %, feeding OEE (PF-3). *Effort M · Migration: Yes.*
- **GAP-5 · HR & Payroll (lite)** (marketed: `hr-payroll`) — employees, attendance, contractor /
  job-work payouts; statutory payroll stays out (Tally remains book of record).
  *Effort L · Migration: Yes · Suggest Phase 3.*
- **GAP-6 · AI Business Copilot** (marketed: `ai-copilot`; dormant in code) — see §4.9 (AI-1).

### 4.3 Order-to-cash depth

- **O2C-1 · Quotation module** — explicitly deferred in the legacy plan; quote → order conversion
  with the state machine staying authoritative. Overlaps GAP-2 quotes; can ship standalone first.
  *Effort M · Migration: Yes.*
- **O2C-2 · Proforma invoices & advance receipts** — common in job-shop machinery; feed into the
  existing invoice/payment records. *Effort S–M · Migration: Maybe.*
- **O2C-3 · Payment reminders & receivables workflow** — dunning ladder (reminder → escalation →
  hold) using Resend + BullMQ schedules; template per customer; ageing view drives it.
  *Effort M · Migration: Maybe (reminder log).*
- **O2C-4 · E-invoice / e-way-bill status surface** — the invoices module already has
  `POST /:invoiceNo/retry-processing`; expose IRN/EWB status, bulk retry, and plain-language
  error explanations. *Effort S–M · Migration: No.*
- **O2C-5 · Credit-limit enforcement mode** — today confirm warns but doesn't block (legacy doc,
  explicit team decision). Make blocking a tenant setting with an Approvals-based override path.
  *Effort S · Migration: Maybe (setting).*
- **O2C-6 · Bank reconciliation (lite)** — statement upload (`xlsx` already a dependency), match
  to recorded payments, unmatched-items report. *Effort M–L · Migration: Yes.*
- **O2C-7 · Tally/OMGST push hardening** — structured export package per document type, re-push
  on failure, mapping report; replaces ad-hoc exports. *Effort M · Migration: No.*

### 4.4 Procurement & inventory depth

- **PR-1 · Forward-looking MRP run** — purchase requisitions are auto-generated today only when
  the MATERIAL_SHORT gate fires (reactive). Add a scheduled job: open orders × BOM − stock −
  on-order → suggested requisitions before shortages bite; advisory list in Inventory.
  *Effort M–L · Migration: No (writes to existing requisition tables).*
- **PR-2 · RFQ / multi-vendor quote comparison** — purchasing already has requisitions, POs and
  vendor scorecards; add an RFQ round, side-by-side comparison sheet, convert-to-PO.
  *Effort M · Migration: Yes.*
- **PR-3 · UOM conversion in consumption** — flagged `[CONFIRM]` gap in the legacy doc: material
  consumption has no UOM-ratio conversion. Needs a conversion-factor master + validation at
  consumption time. *Effort M · Migration: Yes.*
- **PR-4 · Batch/lot traceability** — lot numbers on GRN/movements; trace customer part → lot →
  vendor lot; recall query. *Effort L · Migration: Yes.*
- **PR-5 · Reorder points & stock alerts** — min/max per item; wire into the existing notification
  rules engine (no new plumbing). *Effort S · Migration: Maybe (min/max columns).*
- **PR-6 · Vendor read-only portal** — vendors see their own POs / GRNs / bills / pending returns
  via a scoped role (RBAC matrix already supports granular roles).
  *Effort M · Migration: Maybe.*
- **PR-7 · Subcontracting depth** — outwork module handles gate-out/gate-in; add subcontract PO
  linkage, pending-at-vendor ageing report, per-process rate cards.
  *Effort M · Migration: Maybe.*

### 4.5 Shop-floor & production depth

- **PF-1 · Operator self-logging (kiosk mode)** — explicitly deferred in the legacy plan (Ops
  Admin logs on operators' behalf today). PIN-based station login, start/stop/qty with server
  validation, supervisor correction flow, offline-tolerant queue.
  *Effort M–L · Migration: Maybe (stations).*
- **PF-2 · Capacity planning & schedule Gantt** — job cards + machines + standard times → weekly
  load view per machine; drag to reschedule (writes planned dates only; state machine untouched).
  *Effort L · Migration: Maybe.*
- **PF-3 · Downtime & OEE capture** — production module already exposes `GET /telemetry`; add
  machine-state capture + manual downtime reasons → OEE widget on Command Centre; feeds GAP-4.
  *Effort M · Migration: Yes (downtime log).*
- **PF-4 · Shifts & shop calendar** — shifts, holidays, machine calendars; consumed by PF-2
  scheduling and SLA/ageing math. *Effort M · Migration: Yes.*
- **PF-5 · Job-card QR labels & scan-to-open** — print QR per job card; scan → deep link into
  `JobCardDetailModal`. *Effort S · Migration: No.*
- **PF-6 · Route-card template library v2** — better template management, standard-time
  benchmarks per operation, operator skill matrix vs. required skills.
  *Effort M · Migration: Maybe.*
- **PF-7 · Tooling & consumables tracking** — feature-flagged like finished-goods/outwork.
  *Effort M–L · Migration: Yes.*

### 4.6 Quality management depth

- **QM-1 · NCR analytics + CAPA loop** — NCR lifecycle exists (`POST /ncrs`,
  `dispose-ncr`); add CAPA tasks with owners/due dates/effectiveness check, and NCR Pareto by
  part/operation/vendor. *Effort M · Migration: Yes (CAPA).*
- **QM-2 · Customer complaint register** — complaints linked to orders/NCRs/challans; feeds
  credit-note flow and Customer 360 (GAP-2). *Effort S–M · Migration: Yes.*
- **QM-3 · SPC-lite** — dimension-wise measurement capture on QC/PDI + control charts
  (`recharts`); start with a few critical dimensions. *Effort M · Migration: Yes (measurements).*
- **QM-4 · Inspection plan templates** — per item/route checklist; auto-create the QC checklist
  when a job card is released. *Effort M · Migration: Yes.*

### 4.7 SaaS platform operations (currently effectively single-tenant)

`docs/project/00-overview.md` describes this repo as a **single-tenant** ERP; the legacy design
envisioned token-derived `tenant_id` + RLS multi-tenancy with a separate admin console. The
`ServerAdminVault` (`/admin`) exists — these items turn it into a real SaaS control plane.

- **SaaS-1 · Multi-tenancy + tenant onboarding wizard** — provision tenant (company profile,
  roles, seeded masters, admin user), tenant hardening across tables, server-admin tenant
  switching. Biggest platform item; needs its own design doc.
  *Effort L · Migration: Yes (extensive).*
- **SaaS-2 · Plans, subscriptions & entitlements** — plan definitions, seat counts, per-tenant
  module entitlements via the existing feature-flag pattern (finished-goods/outwork are already
  flag-gated), usage metering, self-serve billing for the SaaS itself.
  *Effort L · Migration: Yes.*
- **SaaS-3 · Operator console enrichment** — activity feed across tenants, impersonate-with-audit
  for support, tenant health KPIs in `ServerAdminVault`. *Effort M · Migration: Maybe.*
- **SaaS-4 · Public API + API keys + webhooks** — versioned key auth, per-key rate limits,
  outbound webhooks on state transitions (the notifications SSE broadcast service is the natural
  hook point). *Effort L · Migration: Yes (keys, deliveries).*
- **SaaS-5 · Data export & backup UX** — tenant-scoped export bundles (CSV/JSON) + scheduled
  audit exports (audit module already has `POST /export`). *Effort S–M · Migration: No.*
- **SaaS-6 · White-labeling** — per-tenant logo, accent theme, login copy (company profile +
  `AccentThemeContext` already exist). *Effort S–M · Migration: Maybe.*

### 4.8 Collaboration & communication

- **COL-1 · WhatsApp notifications (official API)** — legacy v1.1 item; status pings on order/job/
  dispatch events to customers and staff. External dependency (BSP / WhatsApp Business API account).
  *Effort M · Migration: Maybe (delivery log).*
- **COL-2 · Record comments & @mentions** — activity feed per order/job card; mentions create
  in-app notifications via the existing rules engine. *Effort M · Migration: Yes (comments).*
- **COL-3 · Daily/weekly email digests** — Resend is wired server-side; digest of approvals
  waiting, overdue outwork/challans, shortages, receivables. *Effort S · Migration: No.*
- **COL-4 · Customer-facing status portal (read-only)** — tokenised link showing order status +
  challan/invoice PDFs; removes most "where is my order?" WhatsApp traffic.
  *Effort M–L · Migration: Maybe (tokens).*

### 4.9 AI capabilities (scoped in `docs/project/09-ai-integration-opportunities.md`)

**Prerequisite for all:** the Gemini endpoint must first get auth + RBAC (see SEC-2).
Summarized from the audit doc (items 1–4 are nearest-term):

- **AI-1 · Executive Q&A over live data** — natural-language questions ("which orders are blocked
  at QC and why") answered from server-assembled context; endpoint scaffold already exists.
  *Effort M.*
- **AI-2 · Client PO → pre-filled order draft** — extract PO number, lines, dates from uploaded
  PDF/scan (`attachments` module + `client_po_file` column exist); always a human-review step
  before the state machine sees it. *Effort M–L.*
- **AI-3 · QC remark classification & NCR drafting** — classify free-text inspector notes into
  defect categories; draft NCR text. *Effort M.*
- **AI-4 · Anomaly flags** — dispatch/challan and payment-pattern anomalies surfaced as advisory
  notifications. *Effort S–M.*
- **AI-5…AI-10 (later, need 6+ months of history):** cash-flow prediction, delivery-date /
  demand forecasting for procurement, per-user login anomaly baselines (extends `risk.service.ts`),
  semantic command palette (embeddings), receivables narrative reports.

### 4.10 Security & code-hygiene prerequisites (open items from audit 08)

Not features — but these should **gate** the roadmap above; SEC-1/SEC-2 are urgent.

- **SEC-1 · Close public `POST /auth/register`** — unauthenticated and accepts an arbitrary
  `role` string; anonymous self-provisioning of SUPER ADMIN is possible. *Effort S.*
- **SEC-2 · Auth-gate `POST /api/gemini/analyze`** — unauthenticated AI proxy mounted in
  `server.ts`; caller-less in the live UI. *Effort S.*
- **SEC-3 · Stop swallowing write failures** in `updateOrder` / `updateOrderStatus` — UI shows
  success while the write failed; re-throw and let callers own rollback + toast. *Effort S.*
- **SEC-4 · Split `useOwnerOSData`** (~1.6k lines, ~60 handlers, one state atom) into per-domain
  hooks; extract section components from the >1,200-line views. *Effort L — do opportunistically
  per touched view.*
- **SEC-5 · Tighten types at trust boundaries** — `user: any`, `paymentData?: any`, `data: any`
  in services. *Effort M.*
- **SEC-6 · Remove or re-wire dead legacy components** (AiStudioView, DashboardView, AnalyticsView,
  TeamView, ProjectsView, SettingsView, UpgradeModal, empty `backend/app/`, resend stub).
  *Effort S.*
- **SEC-7 · Batch the OMGST import** — currently one sequential HTTP round-trip per row with no
  per-row failure report. *Effort S–M.*

---

## 5. Prioritization snapshot

**P0 — do first (small, high-value, some urgent):**
`SEC-1`, `SEC-2`, `SEC-3` (security) · `UX-6`, `UX-4`, `UX-8`, `PF-5` (quick UX wins) ·
`PR-5` (stock alerts) · `O2C-4`, `O2C-5` (compliance/credit) · `GAP-3` core reports (ageing,
on-time %, yield) · `COL-3` (digests).

**P1 — next quarter:**
`UX-1` (Kanban v2), `UX-3` (orders pipeline board), `UX-5`, `UX-7` · `PF-1` (operator kiosk),
`PF-3` (OEE) · `O2C-3` (reminders) · `QM-1` (CAPA) · `AI-1` (copilot Q&A) · `SaaS-6`
(white-label) · `SaaS-5`.

**P2 — platform & growth (need design docs first):**
`SaaS-1` (multi-tenancy), `SaaS-2` (billing), `SaaS-4` (public API/webhooks) · `GAP-1` (tasks),
`GAP-2` (CRM), `GAP-4` (maintenance), `GAP-5` (HR lite) · `PR-4` (lots), `PF-2` (Gantt) ·
`COL-4` (customer portal) · `AI-2`, `AI-5…10`.

**Continuous:** `SEC-4` refactor opportunistically whenever a view is touched; `SEC-5/6/7` in
slow sprints.

## 6. Suggested sequencing

| Phase | Window | Theme | Contents |
|---|---|---|---|
| 1 | Weeks 1–4 | **Harden + quick wins** | SEC-1/2/3, UX-4/6/8, PF-5, PR-5, O2C-4/5, COL-3, first GAP-3 reports |
| 2 | Weeks 5–10 | **Shop floor & money** | UX-1/3/5/7, PF-1/3, O2C-3, QM-1, QM-2, AI-1, SaaS-6 |
| 3 | Quarter 2+ | **Platform & growth** | SaaS-1/2/4, GAP-1/2/4, PR-2/3/4, PF-2, COL-4, AI-2+ |

Rule of thumb: nothing in Phase 2/3 starts until its "Migration: yes" items have a reviewed
design and a rollback story; no AI item starts before SEC-2 lands.

## 7. Explicitly out of scope of this document

- **No code changes, no schema/migration work, no data edits** were made or are assumed done —
  every "Migration: yes/maybe" item requires its own design + review before touching
  `supabase/migrations/`.
- The financial book of record stays in Tally/OMGST; all money features push documents and track
  status only.
- Replacements for the deterministic engines (`orderStateMachine.ts`, `statutoryAccountingEngine.ts`,
  `rbacMatrix.ts`) are non-goals — features compose around them.

---

### Appendix A — Traceability

| Plan area | Evidence in repo |
|---|---|
| Live views | `src/components/console/views/*` (18 files) |
| Shell features | `ConsoleContainer.tsx` (routes, Ctrl+K palette), `ConsoleHeader.tsx` (NotificationDrawer), `src/hooks/useInAppNotifications.ts`, `usePullToRefresh.ts`, `useUrlModal.ts` |
| Backend modules | `backend/src/modules/*` (21 modules; endpoint map in `docs/project/02-backend-modules.md`) |
| Kanban today | `ProductionView.tsx` lines ~1770–2090 (`viewMode === 'board'`, 3 columns) |
| Thin reports today | `ReportsView.tsx` (production logs + CSV only) |
| Marketed vs built | `src/data/modulesData.ts` (13 modules) vs live views list |
| Open issues | `docs/project/08-issues-and-suggestions.md` (SEC items) |
| AI opportunities | `docs/project/09-ai-integration-opportunities.md` (AI items) |
| Legacy deferred list | `docs/README-SYSTEM-AND-ORDER-WORKFLOW.md` §9 (O2C-1, PF-1, PR-3, COL-1, O2C-6, PR-2) |






