# SketchItUp Owner OS — Complete System & Order Workflow Reference

> **Purpose of this document.** This is a complete, self-contained description of how the
> SketchItUp Owner OS (GuruOm SaaS) works today — the product, the architecture, every step
> of the order lifecycle from creation to the last step, and exactly what happens in the
> frontend and the backend at each step. It is written so that an AI (or developer) can use
> it as the single input to **redesign the system** without access to the original code.
> Source of truth: the `SketchItUp-OwnerOSWebsite` repository (FastAPI backend + React/Tauri
> desktop app) and its `docs/` (WORKFLOW.md, PRODUCT.md, module specs).

---

## 1. Product context

**The business.** GuruOm Industries LLP — a Pune job-shop precision machining supplier
(customers include Liebherr). Work arrives as customer POs for machined parts; each part has
a route card (operation sequence) that travels through the shop floor: cutting → machining →
QC → PDI → dispatch. The legacy system is a Visual FoxPro 6 ERP (OMGST) plus WhatsApp for
status-chasing.

**What this product does.** Digitises the **order-to-dispatch flow** (order → job card →
production → QC → PDI → dispatch → invoice/payment status) and gives the owner a real-time
command centre. It replaces operational tracking only — **OMGST/Tally remains the financial
book of record**; the new system pushes documents to it and tracks status.

**Success criterion:** the team stops asking each other for status; shortages are visible
before they bite; the owner reads business health at a glance.

**Design principles (must carry into any redesign):**
1. **Status is the interface** — every screen answers "where is this order/job now and what's next".
2. **Glanceable, then drillable** — aggregates first, one click to the rows; no dead-end numbers.
3. **Money is a privilege** — rates/margins/receivables render only for finance roles; layouts must not break when money fields are stripped.
4. **Fast entry beats pretty entry** — ops/QC forms optimize keystrokes and defaults.
5. **Terse professional copy** — workshop vocabulary verbatim (challan, GRN, PDI, route card). No emojis, no consumer styling.

---

## 2. Architecture

| Layer | Technology | Notes |
|---|---|---|
| Backend | **Python FastAPI** (`backend/app`), uvicorn, **SQLAlchemy + Alembic migrations**, **PostgreSQL** | Routers in `app/api/routers/`, models in `app/models/`, business services in `app/services/`, cross-cutting in `app/core/` (rbac, security, db, features, lookups, search) |
| Desktop app (main UI) | **React + TypeScript + Vite + Tauri 2** (`desktop/`), React Router, **TanStack Query** for data fetching/caching | 36 pages in `desktop/src/pages`, shared components in `desktop/src/components`, API/auth/theme/toast helpers in `desktop/src/lib` |
| Admin UI | Separate React app (`admin-ui/`) — Overview, Activity, Team, Tenants, Prospects, Billing | SaaS-operator console (tenant management), not the shop-floor app |
| Auth | JWT **access + refresh token pair** (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/logout-all`); sessions are tracked and revocable per-device (`/users/sessions`) | `tenant_id` is **always derived from the token**, never accepted from the client |
| Multi-tenancy | Every tenant-scoped table has `tenant_id`; **Postgres Row-Level Security** enforces isolation (checked by `scripts/rls_check.py`) | Same codebase resold per company; branding = tenant config |
| Local-first / sync | Entities carry sync-state fields (`SyncState` mixin); SyncButton component per page | Work offline, sync when online |
| Numbering | Per-financial-year series: job cards `JC/NNNN/FY`, challans `CHL/NNNN/FY`, GRN auto-series, invoices gapless per FY | Allocated at create time (`models/numbering.py`) |
| Audit | **Append-only `audit_log`** row on every transition (user, ts, entity, action, before/after) | View/filter/export in Users & Audit |
| Features | Feature flags (`core/features.py`) gate optional modules — e.g. `finished_goods_store`, `outwork` — including nav visibility | |
| Exports | Async export jobs (`/exports`): enqueue → poll job → download | |
| Attachments | Per-entity file attachments (`/attachments/{entity_type}/{entity_id}`) with upload/download/delete | Order PO PDFs, QC reports, etc. |
| MCP | An MCP tool server is embedded (`app/mcp/`) exposing the API to AI agents with token verification | |

**No websockets/SSE in this version:** the desktop app uses **TanStack Query with polling**
(Command Centre polls every 30 s + manual Refresh) and query invalidation after mutations.
Realtime push is a redesign opportunity, not an existing constraint.

---

## 3. Roles & RBAC (server-enforced)

Nine roles (`core/rbac.py::Role`):

| Role | Purpose |
|---|---|
| `SUPER_ADMIN` | The owner (Sachin). Everything: money, approvals, command centre, users |
| `SALES_EXEC` | Creates orders |
| `OPS_ADMIN` | Job cards, production logging, consumption, inventory, dispatch authorisation |
| `ACCOUNTS_ADMIN` | Invoices, receivables/payables, masters, GRN entry |
| `QC_ADMIN` | In-process QC inspect, rework, scrap |
| `DISPATCH_QC` (QA3) | PDI reporting |
| `DISPATCH_STORE` | Challan creation, delivery confirmation |
| `PURCHASE_EXEC` | Purchase orders |
| `MANAGEMENT_VIEWER` | Read-only "owner's dashboard" role |

**Two enforcement mechanisms (both must survive a redesign):**
1. **Endpoint role gates** — every write endpoint declares `require_roles(...)`; a
   wrong-role call gets **403 Forbidden** regardless of the UI. Status-machine violations
   get **409 Conflict**.
2. **Money stripping (`strip_money`)** — each role holds money *scopes* (SELL / COST);
   any response field whose scope the caller lacks is **removed server-side**
   (`basic_amount`, `tax_amount`, `gross_amount`, margins, receivables…). The UI must look
   correct with money columns absent.

Changing a user's role takes effect on their next request; deactivating a user kills their
session on the next call.

---

## 4. The order workflow — creation to the last step

This is the spine. Each step lists: **who** (role), **gate** (pre-condition), **what the user
does in the UI**, **which endpoint fires**, **status transition**, **side effects**, and
**what it unlocks**. Approval points are marked ⭐.

### Status maps (the guard rails)

```
Order:     DRAFT → CONFIRMED → IN_PRODUCTION → PARTIALLY_DISPATCHED → DISPATCHED → CLOSED
                ↘ CANCELLED        ↘ CANCELLED           ↘ DISPATCHED ↗
Job card:  PLANNED → RELEASED → IN_PROGRESS → COMPLETED
                                  ↕ ON_QC_HOLD          (PLANNED/RELEASED/IN_PROGRESS → CANCELLED)
QC insp.:  PENDING → PASS | HOLD → (REWORK → PENDING) | SCRAP
PDI:       PENDING → PASS | FAIL
Dispatch:  DRAFT → DISPATCHED → DELIVERED        (DRAFT → CANCELLED)
```
All transitions are enforced by status-machine guards; illegal jumps return `409 CONFLICT`.

### Step 1 — Capture the order
- **Who:** `SALES_EXEC` / `OPS_ADMIN` / `SUPER_ADMIN`
- **UI:** Orders → **New Order** (`OrderNew.tsx`): header (customer, PO no, dates) + lines
  (item, qty, rate). Item picker pulls from the Items master.
- **API:** `POST /orders` → status **DRAFT**.
- **Backend:** amounts computed server-side; a **credit-limit check runs and warns** (does
  not block — team decision); the warning is audited. Non-finance roles never receive
  money fields in the response.
- **Unlocks:** the order appears in the **Approvals** queue for the Super Admin.

### Step 2 — Confirm the order ⭐ (approval point)
- **Who:** `SUPER_ADMIN` only.
- **UI:** Approvals queue shows "Confirm order …" with **Confirm / Reject**; also available
  on Order Detail.
- **API:** `POST /orders/{id}/confirm` → **DRAFT → CONFIRMED**.
- **Reject path:** `POST /orders/{id}/cancel` with reason → **CANCELLED**.
- **Amendments after confirmation:** `POST /orders/{id}/amend` (versioned change, Super Admin).
- **Unlocks:** the order is eligible for job-card planning.

### Step 3 — Plan the job / route card
- **Who:** `OPS_ADMIN` / `SUPER_ADMIN`. **Gate:** order is CONFIRMED (or IN_PRODUCTION).
- **UI:** Production → **Plan** (`ProductionPlan.tsx`, `GET /production/orders/{order_id}/plan`)
  suggests job cards per order line; **New Job Card** (`JobCardNew.tsx`).
- **API:** `POST /jobcards` — **clones the item's route template** (or takes explicit steps)
  → job card status **PLANNED**. (`PUT /route-templates` maintains the templates; `GET
  /processes` lists machining processes.)
- **Backend:** job card no allocated from the `JC/NNNN/FY` series; material **reservations**
  can be viewed per card (`GET /jobcards/{id}/reservations`).

### Step 4 — Release the job card ⭐ (approval point)
- **Who:** `OPS_ADMIN` / `SUPER_ADMIN`.
- **API:** `POST /jobcards/{id}/release` → **PLANNED → RELEASED**.
- **Side effect:** the first release of any card moves the order **CONFIRMED → IN_PRODUCTION**.
- **Reject path:** `POST /jobcards/{id}/cancel` with reason.
- **Surfaced in Approvals** as "Release job card …".

### Step 5 — Log production (route-card execution)
- **Who:** `OPS_ADMIN` / `SUPER_ADMIN` (operators do not log in v1 — Ops enters for them).
- **Gate:** job card RELEASED / IN_PROGRESS / ON_QC_HOLD.
- **UI:** Job Card Detail (`JobCardDetail.tsx`) — per route step, log qty done with optional
  start/stop timestamps; production board (`ProductionBoard.tsx`) shows all live cards.
- **API:** `POST /jobcards/{id}/production-log` (list: `GET /jobcards/{id}/production-logs`).
  - First log: **RELEASED → IN_PROGRESS**.
  - When **every** route step's cumulative qty ≥ job qty: **IN_PROGRESS → COMPLETED**
    (auto-derived, no manual button).
- Start/stop yields `duration_min` — captured for finance-side costing only.

### Step 6 — Book material consumption
- **Who:** `OPS_ADMIN` / `SUPER_ADMIN`.
- **API:** `POST /jobcards/{id}/consumption` — records planned/actual/scrap **and immediately
  posts a `CONSUMPTION` stock movement** (ref `job:<id>`), so on-hand drops on save.
  (v1 simplification: deducts on save, no UOM-ratio conversion.)
- **UI:** Job Card Detail consumption panel; consumption history `GET /jobcards/{id}/consumption`.

### Step 7 — In-process QC
- **Who:** `QC_ADMIN` / `SUPER_ADMIN`.
- **UI:** **QC queue** (`QcQueue.tsx`, `GET /qc/queue`) lists cards ready for inspection.
- **API:** `POST /qc/{job_id}/inspect` with inspected / passed / **held** quantities.
  - Any held qty → inspection **HOLD**; an in-progress card moves **IN_PROGRESS → ON_QC_HOLD**.
  - Otherwise inspection **PASS**.
- **A hold blocks dispatch for the whole order** (see Step 9 gate).

### Step 7a — Resolve a hold ⭐ (approval point)
- **Release hold:** `OPS_ADMIN` / `SUPER_ADMIN` — `POST /qc/{inspection_id}/release` with a
  release note (records Super Admin concurrence + client communication). HOLD → PASS; the
  ON_QC_HOLD card returns to IN_PROGRESS. Surfaced in **Approvals**.
- **Rework:** `QC_ADMIN` / `SUPER_ADMIN` — `POST /qc/{inspection_id}/rework` (qty + reason)
  → writes a `RejectionLog` row; inspection returns to PENDING for re-inspection.
- **Scrap:** `POST /qc/{inspection_id}/scrap` (qty + reason).
- **UI:** rework/scrap are done on the QC screen (qty+reason decision, not a one-tap action);
  rejection history at `GET /qc/rejections`.

### Step 8 — Pre-Dispatch Inspection (PDI)
- **Who:** `DISPATCH_QC` / `SUPER_ADMIN`. **Gate:** job card **COMPLETED**.
- **UI:** **PDI queue** (`Pdi.tsx`, `GET /pdi/queue`; procured-items PDI at `/pdi/procured`).
- **API:** `POST /pdi/report` with PASS/FAIL and qty offered/passed.
- **Key rule:** **only PDI-PASS quantity becomes dispatchable** for that (order, item).

### Step 9 — Create the delivery challan
- **Who:** `DISPATCH_STORE` / `OPS_ADMIN` / `SUPER_ADMIN`.
- **Gate:** order is IN_PRODUCTION / PARTIALLY_DISPATCHED **and has no active QC hold**.
- **UI:** Dispatch page (`Dispatch.tsx`): `GET /dispatch/orders/{order_id}/dispatchable`
  shows each line's **dispatchable qty = min(line pending, PDI-passed pool for the item)**.
- **API:** `POST /dispatch` creates the challan **DRAFT** with chosen quantities
  (validated against the dispatchable amount). Challan no from `CHL/NNNN/FY` series.

### Step 10 — Authorise dispatch ⭐ (approval point)
- **Who:** `OPS_ADMIN` / `SUPER_ADMIN`.
- **API:** `POST /dispatch/{id}/dispatch` → challan **DRAFT → DISPATCHED**.
- **Side effects:** each order line's `qty_dispatched` increments; the order moves to
  **PARTIALLY_DISPATCHED** (some left) or **DISPATCHED** (all sent).
- **Reject path:** `POST /dispatch/{id}/cancel`. Surfaced in **Approvals**.

### Step 11 — Confirm delivery
- **Who:** `DISPATCH_STORE` / `OPS_ADMIN` / `SUPER_ADMIN`.
- **API:** `POST /dispatch/{id}/deliver` → **DISPATCHED → DELIVERED**.
- Printing: `GET /dispatch/{id}/print` (challan template; e-way data captured here but the
  JSON is generated by OMGST, not rebuilt).

### Step 12 — Invoice & payment
- **Deferred in v1** (team decision 2026-06-24) — the Command Centre cards read
  "Available with Invoice & Payment (deferred in v1)". The backend module **already
  exists** (`/invoices`: create → issue → payments → cancel → print/print.pdf;
  `GET /invoices/invoiceable`) plus **Payables** (`/vendor-bills` + payments) — wire the UI
  when un-deferred.
- Order closure: `POST /orders/{id}/close` → **CLOSED** (after dispatch/delivery).

### Cross-cutting, every step
- **Command Centre** (`SUPER_ADMIN`, `Dashboard.tsx`, `GET /dashboard/summary`): open orders
  + value, RM shortages (demand vs on-hand), QC holds, pending dispatches, overdue
  deliveries. Polls every 30 s + manual Refresh; every card drills through to its filtered list.
- **Audit:** every transition writes an append-only `audit_log` row (user, ts, entity,
  action, before/after). View/filter/export at **Users & Audit → Audit Log** (`GET /audit`).
- **Attachments** hang off orders (`POST/GET /orders/{id}/attachment`) and any entity.

---

## 5. Backend reference — every router

| Prefix | Router file | Key endpoints | Purpose |
|---|---|---|---|
| `/auth` | auth.py | `POST /login`, `/refresh`, `/logout`, `/logout-all` | JWT token pairs, session revoke |
| `/users` | users.py | `GET /me`, `GET ""`, `POST ""`, `PATCH /{id}`, `GET/DELETE /sessions…`, role-suggestions | User directory, roles, sessions |
| `/orders` | orders.py | `GET ""`, `POST ""`, `GET /{id}`, `GET /{id}/lines`, `PATCH /{id}`, `POST /{id}/confirm|cancel|close|amend|attachment` | Order lifecycle |
| `/production` | production.py | `GET /processes`, `GET/PUT /route-templates`, `GET/POST /jobcards`, `GET/PATCH /jobcards/{id}`, `POST /jobcards/{id}/release|cancel|production-log|consumption`, `GET /orders/{id}/plan`, reservations, reports (production/consumption/scrap-by-item) | Route templates, job cards, logging, consumption, reports |
| `/qc` + `/pdi` | qc.py | `GET /qc/queue`, `GET /qc/jobcards/{id}/inspections`, `POST /qc/{job_id}/inspect`, `POST /qc/{inspection_id}/release|rework|scrap`, `GET /qc/rejections`, `GET /pdi/queue|procured|reports`, `POST /pdi/report` | Quality control & PDI |
| `/dispatch` | dispatch.py | `GET /orders/{order_id}/dispatchable`, `GET /schedule`, `GET/POST ""`, `GET/PATCH /{id}`, `POST /{id}/dispatch|deliver|cancel`, `GET /{id}/print` | Challans |
| `/stock` + `/grn` | inventory.py | `GET /stock`, `GET /stock/shortages`, `GET /stock/movements`, `POST /stock/adjustment`, `POST /grn` | Stock view (ledger movements), shortages, adjustments, goods receipt |
| `/purchases` | purchases.py | `GET ""`, `POST ""`, `GET /{po_id}`, `POST /{po_id}/cancel` | Purchase orders |
| `/finished-goods` | finished_goods.py | `GET ""` (reconciliation), `GET /movements`, `POST /receipt`, `POST /adjustment` | FG store (feature-flagged) |
| `/outwork` | outwork.py | `GET ""`, `POST ""`, `GET /{ow_id}`, `POST /{ow_id}/receive|cancel` | Plating/subcontract send-out & receive-back (feature-flagged) |
| `/invoices` | invoices.py | `GET /invoiceable`, `GET/POST ""`, `GET/PATCH /{id}`, `POST /{id}/issue|cancel|payments`, `GET /{id}/print`, `print.pdf` | Customer invoices (module built, UI deferred) |
| `/vendor-bills` | vendor_bills.py | `GET/POST ""`, `POST /{bill_id}/payments|cancel` | Payables |
| `/bom` | bom.py | `GET ""`, `GET /{item_id}`, `PUT /{item_id}` | Bill of materials per item |
| `/masters` | masters.py | `GET/POST/PATCH /items`, `GET/POST/PATCH /parties`, `GET/POST/PATCH /machines`, `GET /lookups[/{name}]` | Items, parties (customers+vendors), machines, dropdown lookups |
| `/approvals` | approvals.py | `GET ""` | Unified approvals queue (role-filtered contents) |
| `/dashboard` | dashboard.py | `GET /summary` | Command Centre aggregates |
| `/audit` | audit.py | `GET ""` | Append-only audit trail |
| `/attachments` | attachments.py | `GET /file/{id}`, `GET/POST /{entity}/{id}`, `DELETE /{id}` | File attachments |
| `/exports` | exports.py | `POST ""`, `GET ""`, `GET /{job_id}`, `GET /{job_id}/download` | Async CSV/JSON exports |
| `/admin/import` + `/admin/tenant-profile` + `/admin/features` | admin.py | OMGST upload/preview/diff/import; tenant profile; feature flags | One-time master import from legacy DBFs, tenant config |
| `/demo` | demo.py | reset, ref-hits | Demo tooling |
| `/oauth`, `/.well-known` | oauth.py, well_known.py | OAuth client register/authorize/token | OAuth2 for MCP/agent access |

**Status codes as contract:** `403` wrong role · `409` illegal status transition ·
`404` not found · `422` validation. Money fields silently stripped, never errored.

---

## 6. Data model (SQLAlchemy → Postgres)

All tenant-scoped tables carry `tenant_id` (+ RLS); sync-able entities carry `SyncState`.

| Domain | Tables / models |
|---|---|
| Orders | `Order`, `OrderLine` |
| Production | `Process`, `RouteTemplate`, `RouteStep`, `JobCard`, `ProductionLog`, `MaterialConsumption` |
| Quality | QC inspections, `RejectionLog`, PDI reports |
| Dispatch | Delivery challan + lines |
| Inventory | `GRN`, `StockMovement` (append-only ledger; stock = derived) |
| Purchasing | Purchase orders |
| Finished goods | FG movements/reconciliation (feature-flagged) |
| Outwork | Outwork send-outs (feature-flagged) |
| Finance | `Invoice` (+ payments), `VendorBill` (+ payments) |
| Masters | Items, Parties (customers/vendors), Machines, Lookups |
| BOM | BOM headers + components per item |
| Platform | `Tenant`, `Subscription`, `User`, `Session`, `AuditLog`, `Attachment`, `ExportJob`, Numbering series, MCP auth, Demo refs |

**Stock is a ledger, not a column:** on-hand = sum of movements (GRN in, CONSUMPTION out,
DISPATCH out, adjustments). Shortages = demand (open orders' BOM-explosion) vs on-hand.

---

## 7. Frontend reference (desktop app)

**Navigation shell** (`config/nav.ts`, `AppShell` + `Sidebar`), grouped per role:
- Owner group: Command Centre
- Sales: Orders
- Operations: Production (Job/Route Cards), QC, PDI
- Inventory: Stock, Shortages, Purchases, GRN (Goods In)
- Dispatch: Dispatch
- Finance: Invoices, Payments & Receivables, Payables
- Governance: Approvals, Reports, Users & Audit, Company Profile
- Optional (feature-flagged): Finished Goods, Plating/Outwork

**Pages (36):** `Dashboard` (command centre), `Orders` / `OrderNew` / `OrderEdit` /
`OrderDetail`, `ProductionPlan` / `ProductionBoard` / `JobCardNew` / `JobCardDetail`,
`RouteTemplates`, `QcQueue`, `Pdi`, `Dispatch`, `Stock`, `Shortages`, `Purchases`,
`GoodsIn` (GRN), `FinishedGoods`, `Outwork`, `Invoices` / `Receivables` / `Payables`,
`Bom`, `Items` / `ItemDetail`, `Parties`, `Machines`, `MastersImport` / `MastersLayout`,
`Approvals`, `Reports`, `UsersAudit`, `Settings`, `Login`, `Placeholder`.

**Shared components:** `DataTable`, `Modal`, `StatusBadge` (status words drive colour),
`LifecycleTrack` (horizontal status stepper), `ListFrame`/`Field`/`inputCls` (design system),
`ItemPicker` / `PartyPicker` / `MachinePicker` / `OperationPicker` / `Combobox` /
`LookupSelect`, `AttachmentPanel`, `ExportDialog`, `ReasonModal` (cancel/hold reasons),
`SyncButton`, `ToastHost`, `ThemeToggle`, charts.

**Data layer (`lib/`):** `api.ts` (fetch wrapper w/ auth + ApiError), `auth.tsx` (login /
refresh / logout, session context), TanStack Query hooks per page (invalidation after
mutations), `lookups.ts` (dropdown options from `/masters/lookups`), `fy.tsx` (financial
year context for numbering), `format.ts` (INR, dates), `types.ts`, `exports.ts`,
`refBeacon.ts` (demo telemetry).

**Admin UI (`admin-ui/`)** — separate SaaS console: Overview, Activity, Team, Tenants,
Prospects, Billing. Not part of shop-floor flow.

---

## 8. Behaviour rules a redesign must preserve

1. **Status machines with 409s** — no client-trusted transitions; the server owns status.
2. **Approval points as first-class queue items** — order confirm, job-card release, QC-hold
   release, dispatch authorisation all appear in the unified Approvals view, scoped by role.
3. **QC hold blocks the whole order's dispatch**; release requires OPS/SUPER + note.
4. **Only PDI-passed qty is dispatchable**; challan lines validated against
   `min(pending, PDI pool)`.
5. **Partial dispatch:** multiple challans per order; order is PARTIALLY_DISPATCHED until
   every line's qty is dispatched.
6. **Money stripping server-side**; UI must degrade gracefully without money columns.
7. **Audit on every transition** (append-only, before/after states).
8. **Ledger-based inventory** (movements append-only; stock derived; shortages vs demand).
9. **Multi-tenancy via token-derived tenant_id + RLS.**
10. **FY-scoped document numbering** (JC/CHL/GRN/INV series).
11. **Route templates cloned into job cards at planning** (template edits never mutate live jobs).
12. **Feature flags** gate optional modules (finished goods store, outwork) incl. navigation.

## 9. Known gaps / deferred (input for the redesign)

- **Invoice & payment UI deferred to v1.1** (backend exists, incl. print + payments).
- **Operator self-logging deferred** — Ops Admin enters production logs on their behalf.
- **Quotation module out of scope** (3–4 custom quotes/month; work arrives as POs).
- Credit-limit check on confirm **warns but does not block** (explicit team decision).
- Consumption deducts on save with **no UOM-ratio conversion** (flagged `[CONFIRM]`).
- No push-based realtime (polling only) — SSE/WebSocket is an obvious upgrade.
- Multi-vendor procurement depth, bank reconciliation, WhatsApp API — all v1.1+.
- Pilot go-live is a **parallel run on selected orders**, not the whole book.

---

## 10. Repo layout (source)

```
backend/    FastAPI app (app/api/routers, app/models, app/services, app/core, alembic/)
desktop/    React+Tauri shop-floor app (src/pages, src/components, src/lib, src/config)
admin-ui/   SaaS operator console (tenants, billing, team)
docs/       WORKFLOW.md (lifecycle), PRODUCT.md, README.md, modules/*.md (per-module specs),
            plan/01-05 (architecture, navigation, data model, multitenancy, sync),
            OPEN-DECISIONS.md, PROGRESS.md, DEMO-GUIDE.md, DEPLOY.md
platform/   Deployment/infra scaffolding
```
