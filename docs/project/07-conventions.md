# Conventions observed in this codebase

## Naming

| Artifact | Convention | Examples |
|---|---|---|
| Backend module files | `<module>.<layer>.ts` inside `backend/src/modules/<module>/` | `orders.routes.ts`, `orders.controller.ts`, `orders.service.ts`, `orders.schema.ts`, `orders.state-machine.ts` |
| Frontend utility/lib files | kebab-case `.ts` | `orderStateMachine.ts`, `rbacMatrix.ts`, `apiClient.ts`, `useUrlModal.ts` |
| React components | PascalCase `.tsx` matching the exported symbol | `ConsoleContainer.tsx`, `OrdersView.tsx`, `CommandPaletteModal.tsx` |
| Hooks | `useXxx` camelCase, one per file, named + default export | `useOwnerOSData.ts`, `useSmoothScroll.ts` |
| Contexts | `<Name>Context.tsx` exporting Provider + `use<Name>()` | `AuthContext.tsx` (`AuthProvider`, `useAuth`) |
| Types | Domain types centralized in `src/types/console.ts`; engines export their own error-code const (`ORDER_ERROR_CODES`, `PRODUCTION_ERROR_CODES`) | `CustomerOrder`, `ConsoleView`, `UserRole` |
| Env vars | Server: `UPPER_SNAKE`; client-prefixed `VITE_` | `JWT_ACCESS_SECRET`, `VITE_API_BASE_URL` |
| localStorage keys | `stratum_*` (session/data) and `guruom_*` (settings), `sketchitup-accent-color` (theme) | `stratum_access_token`, `guruom_session_security_settings` |
| Audit action strings | `SCREAMING_SNAKE` verbs | `RBAC_ACCESS_DENIED`, `OVERRIDE_MATERIAL_CHECK`, `ORDER_STAGE_GATE_BLOCKED` |

## Repeated state-management pattern (views + container)

All console data flows through **one container hook**, not a global store:

1. `ConsoleContainer` calls `useOwnerOSData(currentUser)`; views receive slices + `handle*`
   props. There is no Redux/Zustand; React state + context only.
2. Every `handle*` in `useOwnerOSData` follows the same optimistic sequence:
   1. mutate local state first (`setOrders(prev => …)`),
   2. `await <service>()` from `src/services/supabaseServices.ts` (which also updates
      `ordersCache` and calls `apiClient`),
   3. `await addAuditLog(entity, action, details)`,
   4. `toast.success/error(...)` from `ToastContext`,
   5. `await loadAllData()` to re-sync from the server (except `handleCreateOrder`, which
      deliberately relies on the SSE `order_created` event instead).
3. Optimistic rollback on create-failure removes the just-added row.
4. Modals are URL-driven (`useUrlModal('create-order')` → `?modal=create-order&orderId=…`)
   so any modal state is deep-linkable; shell-level modals (command palette, security) use
   plain boolean state in `ConsoleContainer`.
5. Cross-tab/client propagation uses SSE (`/api/v1/notifications/stream`) with named events
   (`order_created`, `order_updated`, `order_transitioned`, `job_card_created`, `user_created`, …).

## Business-logic layering

- Pure rule engines live in `src/utils/*` (no framework imports): `orderStateMachine`,
  `rbacMatrix`, `statutoryAccountingEngine`, `procurementEngine`, `productionEngine`,
  `inventoryCategorization`, `masterValidation`. Both frontend (UX gating) and backend
  (authoritative enforcement) import the same code — e.g. `orders.state-machine.ts` imports
  from `../../../../src/utils/orderStateMachine`.
- `tests/*.test.ts` (Vitest, configured via the `test` block in `vite.config.ts`) unit-test
  these engines directly (`orderStateMachine.test.ts`, `strictOrderStateMachine.test.ts`,
  `rbacMatrix.test.ts`, `statutoryAccounting.test.ts`, …).

## Project rules found in config files

- **`tsconfig.json`**: `noEmit`, `allowImportingTsExtensions`, path alias `@/* → src/*`,
  `isolatedModules`, `moduleDetection: force`; `src/backupcomponents` and
  `supabase/functions` are excluded (dead/external code). No `"strict": true` and no ESLint
  config — `"lint": "tsc --noEmit"` is the only static check.
- **`vite.config.ts`**: HMR/watch can be disabled via `DISABLE_HMR` "Do not modify—file
  watching is disabled to prevent flickering during agent edits"; watch ignores
  `**/data/**`, `**/backend/**`, `**/.system_generated/**`, `**/*.log`.
- **`server.ts` comments**: "Step 7: No Deletes on Transactional Records" is a stated API rule
  (`405 ERR_TRANSACTION_DELETE_FORBIDDEN` on transactional modules).
- **`.agents/rules/commands.md`**: `npx` commands are pre-approved for this workspace.
- **`AGENTS.md`** (root): same command permission note.

## Notable inconsistencies (documented, not smoothed over)

- `README.md` is empty; `README-SYSTEM-AND-ORDER-WORKFLOW.md` describes a Python FastAPI +
  Tauri + TanStack Query architecture that does not exist in this repo (`backend/app/` holds
  only empty directories).
- Route guards mix `requirePermission(...)` (matrix-based) and legacy `requireRole([...])`
  (hard-coded role lists) — see 02-backend-modules.md.
- Role vocabulary is dual: legacy 4-5 role union in `src/types/console.ts` vs the 12+ role
  canonical matrix in `rbacMatrix.ts` (bridged by `normalizeRole`).
- `resendEmailService.ts` is an empty stub despite `RESEND_API_KEY` being configured server-side
  (email sending now happens only inside the backend notifications module).
- `orders.controller.ts` caches the orders list under a tenant key but `ordersService.getOrders()`
  returns all orders regardless of tenant — multi-tenancy is partial.
