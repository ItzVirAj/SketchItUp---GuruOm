# Issues & Suggestions (audit only — nothing here has been changed in code)

Every item points at code read for this audit. Fixes are described on paper only.

## `auth` module

### Critical

- **Issue:** `POST /api/v1/auth/register` is unauthenticated (`auth.routes.ts` line 21) and
  `authService.register` accepts an arbitrary `role` string (`auth.service.ts` line 1459,
  default `'OPERATOR'`). The `users.role` CHECK constraint (migration 007 line 12) *permits*
  `'SUPER ADMIN'`, so an anonymous caller can self-provision a SUPER ADMIN. The protected
  variant `POST /auth/users` exists on the next line but the open one stays mounted.
  **Why it matters:** full privilege escalation from the public internet; all RBAC, approval
  limits and audit attribution key off this role.
  **Suggested fix:** remove/gate the public `/register` mount (`requireAuth` + `requireRole`),
  and validate `role` against the canonical role list from `rbacMatrix.ts` inside
  `authService.register` before insert.
  **Effort:** small.

- **Issue:** default password `'1234567890'` when none supplied — `auth.service.ts` line 1445
  (`params.password || '1234567890'`) and `AuthContext.signUp` (`src/context/AuthContext.tsx`
  line 368, same literal as default argument).
  **Why it matters:** accounts provisioned without an explicit password are known-credential
  accounts; combined with the open `/register` this is an immediate takeover path.
  **Suggested fix:** make `password` mandatory in `register`; let `is_temporary_password` remain
  the only "temporary" mechanism; have the frontend always send one.
  **Effort:** small.

- **Issue:** `AuthContext.signIn` falls back to a cached "demo user" from
  `localStorage['stratum_demo_users']` with a fabricated token `'local_session_' + Date.now()`
  when the API fails (`src/context/AuthContext.tsx` lines 344–361) — no password verified.
  **Why it matters:** client-side sessions the server never issued; UI acts with the cached
  user's role while API calls 401 (or succeed under the dev bypass). Local XSS can mint a
  session for any previously-cached user.
  **Suggested fix:** delete the fallback branch in `signIn`; return the error and keep `user`
  null on API failure.
  **Effort:** small.

- **Issue:** default JWT secrets baked into `backend/src/config/env.ts` (lines 16–17) — server
  boots with publicly-known constants if the env vars are unset. Related: `config/database.ts`
  line 13 falls back to a dummy Supabase key; `env.ts` line 12 falls back to a hardcoded
  project URL.
  **Why it matters:** tokens can be forged against any misconfigured deployment; fail-open
  startup masks the misconfiguration until it is exploited.
  **Suggested fix:** throw at startup in `env.ts` when secrets are missing and
  `NODE_ENV === 'production'`; loud single warning in dev, no fallbacks.
  **Effort:** small.

### Moderate

- **Issue:** `auth.service.ts` keeps a module-level `SEED_USERS` array as a second source of
  truth beside the `users` table (`register` pushes at line 1468; `updateUserRole` mutates it
  at line 1701). `updateUserRole` also swallows DB errors with `console.warn(...)` and still
  returns success (lines 1696–1700).
  **Why it matters:** role changes can silently fail to persist while the API reports success;
  a restart reverts them; audit rows record changes that never landed.
  **Suggested fix:** make the DB the only store (remove `SEED_USERS` reads/writes from CRUD
  paths); re-throw on update failure so the controller returns an error status.
  **Effort:** medium.

- **Issue:** `AuthController.updateUser` fabricates actor identity when the JWT payload is
  incomplete: `email: req.user?.email || 'owner@guruom.in'`, `role: ... || 'Owner'`
  (`auth.controller.ts` lines 349–354); these defaults flow into audit records.
  **Why it matters:** audit trails can attribute actions to the Owner that the Owner never did.
  **Suggested fix:** 401 when `req.user` is absent; record only real payload values.
  **Effort:** small.

- **Issue:** notifications SSE passes the access token as a query parameter:
  `src/hooks/useInAppNotifications.ts` line 43 and `src/hooks/useOwnerOSData.ts` line 234
  (`?token=...` on `/notifications/stream`).
  **Why it matters:** bearer tokens leak into proxy/access logs and history; `EventSource`
  cannot send headers, but the refresh cookie is already sent via `withCredentials`.
  **Suggested fix:** authenticate the stream by cookie, or issue a short-lived one-time stream
  ticket via POST and redeem it.
  **Effort:** small.

## `orders` module + order state machine

### Critical

- **Issue:** the Owner-override check for the customer credit gate authorizes by display-name
  substring: `overrideBy.toLowerCase().includes('owner') || ...includes('admin') ||
  ...includes('viraj')` (`src/utils/orderStateMachine.ts` lines 396–402). The override value is
  client-supplied free text (credit-override field in `OrdersView.tsx`, passed through
  `CustomerOrderSchema`).
  **Why it matters:** any user can type "Owner" into a form field to bypass a financial control
  (90-day credit hold); a personal name is hardcoded into a shared engine used by both client
  and server.
  **Suggested fix:** thread the authenticated actor's real role (`req.rbacScope.role`) into
  `StateMachineContext` and check against `Owner`/`Admin (System)` — never free text.
  **Effort:** small.

### Moderate

- **Issue:** `OrdersService.getOrders` selects `*` from five tables unfiltered —
  `order_line_items`, `job_cards`, `dispatch_challans`, `customer_invoices`, `ncrs`
  (`orders.service.ts` lines 67–72) — then joins them in JS per order.
  **Why it matters:** O(entire DB) per request regardless of page size; the 30s Redis cache
  (`orders.controller.ts` line 5) hides it, then every client pays it simultaneously on
  invalidation.
  **Suggested fix:** filter child queries by the fetched order ids (`.in('order_id', ids)`) or
  move assembly into a Postgres view/RPC; add pagination.
  **Effort:** medium.

- **Issue:** order creation performs two independent inserts — `customer_orders` then
  `order_line_items` — with no transaction (`orders.service.ts` lines 618–640); a line failure
  leaves a header with zero lines.
  **Why it matters:** partial writes create orders that pass header gates but have no
  billable/dispatchable lines — a state the downstream state machine assumes impossible.
  **Suggested fix:** wrap both inserts in a Postgres function (RPC) called from `createOrder`.
  **Effort:** medium.

- **Issue:** `isTestOrderPo` hides "test" orders via hardcoded substrings including numeric
  magic values `poNo.includes('615144') || poNo.includes('678480')` (`orders.service.ts`
  lines 24–35), mirrored as SQL `.not('po_no','like',…)` filters (lines 51–58).
  **Why it matters:** real POs containing those substrings silently vanish from lists; the JS
  filter and SQL filter can drift apart.
  **Suggested fix:** add an `is_test` boolean set at creation; filter in SQL only; delete the JS
  mirror.
  **Effort:** small.

- **Issue:** auto-generated purchase requisitions use `id: \`pr-${Date.now()}\`` as primary key
  (`orders.state-machine.ts` line 100) and `PR-${Date.now()...}` as requisition number
  (`orderStateMachine.ts` line 435) — millisecond timestamps collide under concurrency.
  **Why it matters:** duplicate-key failures on the auto-action path are swallowed by the
  `catch` (`orders.state-machine.ts` line 112), silently losing a material-shortage PR.
  **Suggested fix:** use `crypto.randomUUID()` for the id and the `formatDocumentNumber` series
  (`statutoryAccountingEngine.ts`) for the human-readable number.
  **Effort:** small.

### Minor

- **Issue:** `'PAYMENT_PENDING': ['COMPLETED', 'CLOSED' as any]` (`src/utils/orderStateMachine.ts`
  line 98) — a `CLOSED` state that exists only via a type assertion, while
  `normalizeOrderState` maps `CLOSED → COMPLETED` (lines 139–141).
  **Why it matters:** two spellings of the terminal state in the adjacency list; the `as any`
  disables exactly the check that would flag it.
  **Suggested fix:** remove the `'CLOSED'` entry; `COMPLETED` stays the single terminal state.
  **Effort:** small.

- **Issue:** `orders.controller.ts` builds tenant-scoped cache keys via `extractTenantId(req)`
  and invalidates `cache:<tenant>:orders:*` (lines 9–10, 48–51), but `OrdersService.getOrders`
  never filters by tenant.
  **Why it matters:** cache correctness and any future tenant isolation depend on a parameter
  the query ignores.
  **Suggested fix:** thread tenant into `getOrders` (`.eq('org_id', tenant)`) or drop the tenant
  prefix from the key until multi-tenancy is real.
  **Effort:** medium.


## RBAC & permissions

### Moderate

- **Issue:** `isViewAllowedForRole` is default-allow: a role with no entry in
  `ROLE_PERMISSIONS` gets every view (`src/utils/permissions.ts` lines 216–221 —
  `if (!allowed) return true`). Frontend CTA gating in `rbacMatrix.isRoleAuthorizedForCta` is
  default-deny (line 130), so the two UI layers disagree on unknown roles.
  **Why it matters:** a new or misspelled role silently receives the full console in the UI;
  users discover the real boundary only when the API 403s.
  **Suggested fix:** make `isViewAllowedForRole` default-deny for unknown roles and add
  explicit entries for any role that genuinely needs broad access.
  **Effort:** small.

- **Issue:** `normalizeRole` maps any unrecognized role to `'Shop Floor Supervisor'`
  (`src/utils/rbacMatrix.ts` line 571) instead of failing.
  **Why it matters:** a typo'd role in `users.role` becomes a real (if limited) permission set
  rather than an error — permission drift is invisible.
  **Suggested fix:** return `null`/throw for unknown roles at the auth boundary; surface a
  setup error instead of a silent downgrade.
  **Effort:** small.

- **Issue:** the DB `users.role` CHECK still enumerates only the five legacy roles (migration
  007 line 12; re-created in `018_persistence_convergence.sql` line 838), while
  `authService.updateUserRole` writes whatever string it receives (line 1697) — canonical
  roles like `Owner` violate the constraint, hit the `catch`, and (per the SEED_USERS issue)
  still return success.
  **Why it matters:** schema and application disagree on the role vocabulary; writes fail at
  the DB with no user-visible error.
  **Suggested fix:** one migration relaxing the CHECK to the canonical role list (or a lookup
  table), plus validation in `updateUserRole` before the write.
  **Effort:** medium.

### Minor

- **Issue:** two migrations share number 018 (`018_master_tables_complete.sql` and
  `018_persistence_convergence.sql`).
  **Why it matters:** tools ordering migrations by filename can apply them in the wrong
  sequence; the dependency between them is undocumented.
  **Suggested fix:** renumber one (e.g. `018b_…`) with an ordering note, or merge them.
  **Effort:** small.

- **Issue:** legacy `requireRole([...])` guards compare raw strings against the JWT role
  (`backend/src/middleware/rbac.middleware.ts` lines 241–263) while newer routes use
  `requirePermission(module, level)` — two enforcement models in one codebase.
  **Why it matters:** permission changes in `RBAC_ROLE_MATRIX` never affect legacy-guarded
  endpoints; reviewers must check two places.
  **Suggested fix:** migrate legacy `requireRole` call sites to `requirePermission` with the
  appropriate module/access level (bom, grn, qc, dispatch, finished-goods, invoices, masters).
  **Effort:** large (mechanical per file).


## Frontend state, services, error handling

### Moderate

- **Issue:** `src/services/supabaseServices.ts` contains two verbatim copies of the helpers
  `parseDateToTimestamp` and `getOrderTime` — inside `fetchOrders` (lines 292–333) and again at
  module scope (lines 348–396). The module-level `ordersCache` is also mutated independently of
  React state.
  **Why it matters:** sort/parse fixes must be applied twice (the copies can drift); the hidden
  cache can disagree with `useOwnerOSData` state after failures.
  **Suggested fix:** extract one module-level helper and delete the in-function copy; document
  `ordersCache` as a write-through mirror owned only by the exported service functions.
  **Effort:** small.

- **Issue:** `updateOrder` and `updateOrderStatus` swallow backend failures with
  `console.warn` (`src/services/supabaseServices.ts` lines 470–474 and 489–493); callers treat
  the promise as resolved (only `handleConfirmOrder` re-syncs on failure).
  **Why it matters:** a state-machine rejection still leaves the UI showing the new status
  until the next full `loadAllData()`, and success flows continue as if the write landed.
  **Suggested fix:** re-throw from these service functions; let the `handle*` callers own
  rollback + `toast.error` (pattern already used by `handleCreateOrder`).
  **Effort:** small.

### Minor

- **Issue:** `useOwnerOSData.ts` is ~1,636 lines exporting ~60 handlers and ~21 state slices;
  `OrdersView.tsx` and `OrderDetailView.tsx` are each >1,200 lines.
  **Why it matters:** every subscribed view re-renders on any slice change through one hook;
  the file is the repo's merge-conflict and regression hotspot.
  **Suggested fix:** split per-domain hooks (`useOrdersData`, `useInventoryData`, …) composed
  inside `useOwnerOSData`, or extract section components from the big views.
  **Effort:** large.

- **Issue:** `ToastContext` exposes `window.appToast` in all builds
  (`src/context/ToastContext.tsx` lines 54–57).
  **Why it matters:** any injected or third-party script can fabricate UI "success" toasts.
  **Suggested fix:** gate behind `import.meta.env.DEV`.
  **Effort:** small.

- **Issue:** loose typing at trust boundaries: `user: any | null` (`AuthContext.tsx` line 49),
  `paymentData?: any` (`useOwnerOSData.ts` line 953), `data: any` in service methods
  (`masters.service.ts` line 104 and similar).
  **Why it matters:** the compiler cannot catch field renames between API and UI — the bug
  class the `types/console.ts` layer exists to prevent.
  **Suggested fix:** substitute the existing domain types (`SystemUser`, a new payment-payload
  type, per-service DTOs).
  **Effort:** medium.

## Dead code & structural leftovers

### Minor

- **Issue:** unreferenced legacy components remain in the live tree — `AiStudioView.tsx`,
  `DashboardView.tsx`, `AnalyticsView.tsx`, `TeamView.tsx`, `ProjectsView.tsx`,
  `SettingsView.tsx`, `UpgradeModal.tsx`, `NotificationDrawer.tsx`, `Header.tsx`,
  `Sidebar.tsx` (a repo-wide import search matches only their own definitions, not
  `App.tsx`/`ConsoleContainer.tsx`). `AiStudioView.tsx` line 70 still calls
  `POST /api/gemini/analyze`, making that server endpoint (`server.ts` lines 118–143,
  unauthenticated) caller-less in the live console. Plus `src/backupcomponents/`
  (tsconfig-excluded), empty `backend/app/` folders, and the empty stub
  `src/services/resendEmailService.ts`.
  **Why it matters:** dead UI hides live security surface (the unauthenticated Gemini proxy);
  deleted-feature stubs mislead contributors.
  **Suggested fix:** either re-wire the AI copilot into the console or remove the endpoint and
  component together; move legacy components out of the live tree; delete the empty
  `backend/app` tree and the stub.
  **Effort:** small (deletion) / medium (re-wiring).

- **Issue:** `handleImportOMGST` inserts imported masters one-by-one in a sequential loop
  (`src/hooks/useOwnerOSData.ts` lines 1528–1540 — `await insertCustomer(c)` per row).
  **Why it matters:** a large spreadsheet becomes N sequential HTTP round-trips with no
  per-row failure report; a mid-loop failure leaves a partial import.
  **Suggested fix:** add a batch import endpoint or use `Promise.allSettled` and surface a
  per-row result summary.
  **Effort:** medium.

