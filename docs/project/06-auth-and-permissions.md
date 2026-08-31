# Auth & Permissions — how it actually works

## Token issuance → storage → refresh → session handling

### Backend (`backend/src/modules/auth/*`)

- **Login** `POST /api/v1/auth/login` (`auth.routes.ts`, behind `loginRateLimiter`):
  `auth.controller.login` → `auth.service.login(email, password, ip, userAgent, headers)`.
  Passwords are argon2 hashes (`backend/src/utils/password.ts`); users live in the
  `public.users` table and refresh tokens (hashed) in `public.sessions`, created by
  `supabase/migrations/007_custom_auth_users_and_sessions.sql` + `008_*`.
  On success: an **access JWT** (`backend/src/utils/jwt.ts`, 15 min per
  `config/env.ts::ACCESS_TOKEN_EXPIRES_IN`) is returned in the JSON body with `user` and
  `risk_info` (risk scoring in `auth/risk.service.ts`); a **refresh JWT** (7 days,
  `REFRESH_TOKEN_EXPIRES_IN_DAYS`) is set as an **httpOnly cookie** `owner_os_refresh_token`
  (`secure` / `sameSite=strict` in production). Failures are counted by
  `recordFailedLogin` (`middleware/rateLimit.ts`).
- **Refresh** `POST /auth/refresh` (`refreshRateLimiter`): the controller reads the cookie
  (body fallback), `authService.refreshSession` rotates the token, re-sets the cookie, and
  returns a fresh access token.
- **Verification**: `middleware/auth.middleware.ts::requireAuth` validates the Bearer token on
  every protected router and puts the payload on `req.user` (`userId`, `email`, `role`,
  `tenantId`). A dev bypass (`ALLOW_DEV_AUTH_BYPASS === 'true'`, non-production only) injects a
  SUPER ADMIN user — explicitly warned against in code comments.
- **Sessions & security**: `GET /auth/sessions`, `DELETE /auth/sessions/:id`,
  `POST /auth/sessions/revoke-others|revoke-all`, `GET /auth/security-events[/admin]` manage the
  session registry and login history. Password flows (`/change-password`, `/forgot-password`,
  `/reset-password`) are separately rate-limited.

### Frontend (`src/lib/apiClient.ts` + `src/context/AuthContext.tsx`)

- Access token lives **in memory** in `apiClient` and is mirrored to
  `localStorage['stratum_access_token']` with expiry `stratum_session_expires_at` (a ~15-minute
  persistence window). Every request sends `credentials: 'include'` so the refresh cookie rides along.
- On any 401 (except login/refresh calls) the client performs one silent refresh, queues
  concurrent requests (`refreshSubscribers`), retries the original call, and on failure fires
  `onAuthFailure` listeners — AuthContext uses this to purge the session.
- `AuthContext.persistSession` stores the user under `stratum_user`, session start / last
  activity timestamps, and computes the absolute expiry from `maxSessionMinutes` (default 30).
  Idle tracking (default 15 min, configurable) shows a 60-second countdown modal; inactivity
  triggers `signOut()` → `POST /auth/logout` + `purgeSession()`.
- `AuthContext.refreshProfile()` re-reads `GET /auth/me` to keep role changes fresh.

## The permission stack

| Layer | File | Role |
|---|---|---|
| Role normalization | `src/utils/rbacMatrix.ts::normalizeRole` | Maps ~40 raw/legacy role strings (`SUPER ADMIN`, `OPERATOR`, `FINANCE_MANAGER`, `Purchase Executive`, …) onto canonical roles (`Owner`, `Admin (System)`, `Sales/Order Desk`, `Production Planner`, `Store Keeper`, `Purchase Manager`, `Dispatch Executive`, `Accountant`, `HR/Admin`, `Machine Operator`, `Client`, `Shop Floor Supervisor`…). Unknown roles fall back to `Shop Floor Supervisor`. |
| Module matrix | `rbacMatrix.ts::RBAC_ROLE_MATRIX` + `getRoleModulePermission` | Per `SystemModule` (`orders`, `inventory`, `procurement`, `accounting`, `masters`, …): `accessLevel` (`NO_ACCESS < VIEW_ONLY < CREATE_EDIT < FULL_APPROVE`), optional `approvalLimit` (₹), `scopeRule` (`ALL`, `OWN_RECORDS_ONLY`, `EMPLOYEE_MASTER_ONLY`, `NO_COMMERCIAL_EDIT`, …). |
| CTA table | `rbacMatrix.ts::CTA_PERMISSION_TABLE` + `isRoleAuthorizedForCta` | Maps 24 workflow CTAs (`CONFIRM_ORDER`, `CREATE_JOB_CARD`, `GENERATE_INVOICE`, `MARK_DELIVERED`, `RECORD_PAYMENT`, …) to authorized roles + stage + hard gate. Owner/Admin always allowed. |
| View gating | `src/utils/permissions.ts::ROLE_PERMISSIONS` + `isViewAllowedForRole` | Which console views each role can open (e.g. `Machine Operator` sees only `command-centre` + `production`). |
| Navigation | `src/utils/navigationConfig.ts::getFilteredNavigation` | Builds sidebar sections filtered through `isViewAllowedForRole`. |
| Backend enforcement | `backend/src/middleware/rbac.middleware.ts::requirePermission(module, level, opts)` | Re-normalizes the JWT role against the SAME shared matrix (`../../../src/utils/rbacMatrix`), attaches `req.rbacScope`, 403s with an `RBAC_ACCESS_DENIED` audit log, optionally enforces monetary approval limits (auto-inserts a `pending_approvals` row → `202 ESCALATED_TO_OWNER`) and scope rules. |

### Concrete call sites

1. **Route guard (backend):** `orders.routes.ts` line 13 —
   `router.post('/', requirePermission('orders', 'CREATE_EDIT', { commercialCheck: true }), …)`.
   A `Store Keeper` (only `VIEW_ONLY` on orders in `RBAC_ROLE_MATRIX`) gets
   `403 { error: 'Forbidden', message: 'Access denied. Role "Store Keeper" has VIEW_ONLY access…' }`
   plus an `RBAC_ACCESS_DENIED` audit row.
2. **CTA gating (frontend):** `OrderDetailView.tsx::getNextAction` (line ~1096) —
   `const allowed = isRoleAuthorizedForCta(currentRole, 'CONFIRM_ORDER')` disables the Confirm
   button with `disabledReason: 'Only Sales/Order Desk or Owner can confirm order'`.
3. **View gating (shell):** `useOwnerOSData.ts::loadAllData` (line ~174) — each fetch is wrapped
   in `isAllowed('orders') ? fetchOrders() : Promise.resolve([])`; `ConsoleContainer` wraps
   views with `AccessRestrictedGate` using the same `isViewAllowedForRole`.
4. **Approval limits (backend):** `rbac.middleware.ts` — if `amount > perm.approvalLimit`, the
   middleware inserts a `pending_approvals` row (`target_approver_role: 'Owner'`) and returns
   `202 { status: 'ESCALATED_TO_OWNER', approvalId, … }` instead of executing the action.

### Known inconsistency (explicit)

`src/types/console.ts` still declares the legacy `UserRole` union
(`'SUPER ADMIN' | 'OPERATOR' | 'QC_MANAGER' | 'DISPATCH_CLERK' | 'FINANCE_MANAGER'`), while the
live permission model in `rbacMatrix.ts` uses 12+ business roles. `normalizeRole` bridges the
two and `permissions.ts` keeps legacy keys as "compatibility" entries — but the two vocabularies
coexist across the codebase (backend `auth` module even stores legacy roles in `users.role`).

