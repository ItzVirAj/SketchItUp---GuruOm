# Codebase Audit — Bugs & Errors

**Repository:** ItzVirAj/SketchItUp---GuruOm
**Date:** 2026-09-10
**Scope:** `/src` (109 files), `/backend` (126 files), `/supabase` (36 migrations), `server.ts`, root configs (`tsconfig.json`, `vite.config.ts`, `package.json`)

## Methodology
`npm install` was run and `tsc --noEmit` was executed (0 errors — but see F-07, tsconfig only covers `/src`). The codebase was then swept with targeted `grep` passes for known bug-prone patterns (`as any`, hardcoded secrets, `Math.random()` in ID generation, CORS/RLS logic, etc.), and the highest-risk modules were read in full: server bootstrap (`server.ts`), auth (`jwt.ts`, `password.ts`, `auth.middleware.ts`, `auth.controller.ts`), authorization (`rbac.middleware.ts`, `permission.middleware.ts`), env config, the frontend API/session layer (`apiClient.ts`, `lib/supabase.ts`), the main data hook (`useOwnerOSData.ts`), the invoice numbering path, and the Supabase RLS policies across all 36 migrations. This is not a literal line-by-line review of all ~270 files; it is a risk-prioritized audit. Treat this as a strong starting map, not a certified complete list.

## Summary

| Severity | Count |
|---|---|
| Critical | 5 |
| High | 7 |
| Medium | 6 |
| Low | 2 |
| **Total** | **20** |

---

## Critical

### C-01. Client-supplied invoice number bypasses the atomic sequence
**File:** `backend/src/modules/invoices/invoices.service.ts:286`
```ts
const invoiceNo = validated.invoiceNo || (await this.getNextDocumentNumber('INV', 'INV'));
```
**Problem:** If the request body already contains `invoiceNo`, the server trusts it outright instead of always minting it from the DB-side atomic sequence. Since several frontend code paths (see C-02) pre-populate `invoiceNo` with a random value before calling the API, a client can cause the server to persist a duplicate, out-of-sequence, or attacker-chosen GST invoice number.
**Why it matters:** Invoice numbers are a statutory (GST) requirement in India — they must be unique and effectively sequential. Accepting a client-provided value defeats the purpose of the "concurrency-safe sequence" work visible elsewhere in the migrations (`028_concurrency_safe_master_sequences.sql`, `034_job_number_concurrency.sql`).
**Fix:** Always generate `invoiceNo` server-side; ignore/validate-and-reject any client-supplied value for this field.

### C-02. Statutory/compliance document numbers generated with `Math.random()` (collision-prone)
**Files (examples):**
- `src/hooks/useOwnerOSData.ts:919, 1126`
- `src/services/supabaseServices.ts:1619, 1674, 1736`
- `src/utils/productionEngine.ts:209`
- `src/utils/orderStateMachine.ts:444`
- `backend/src/modules/qc/qc.service.ts:219, 317`
- `backend/src/modules/outwork/outwork.service.ts:90, 164`
```ts
const invNo = invoiceData.invoiceNo || `INV-26-${Math.floor(1000 + Math.random() * 9000)}`;
const certNo = payload.certificateNo || `PDI-COC-${Math.floor(10000 + Math.random() * 90000)}`;
```
**Problem:** These generate 4–5 digit random suffixes for invoice numbers, PDI certificates, NCR numbers, and gate passes with no uniqueness check. With only ~9,000 possible values, collisions become likely well before 1,000 records exist (birthday-paradox effect).
**Why it matters:** Combined with C-01, a random client-generated number can be written straight to the database as the permanent, legally-relevant document number, producing duplicate invoices/certificates.
**Fix:** Remove these client-side fallback generators entirely; require the server's atomic sequence for every statutory document number, and treat any client-provided value as untrusted input to validate against, not accept as-is.

### C-03. Hardcoded Supabase URL and API key committed to the repository
**File:** `scratch/add_1000_stock.ts:6-7`
```ts
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://txztwjvjqjczxwskzjjx.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```
**Problem:** A real Supabase project URL and a JWT-format key are hardcoded as fallback values in a script committed to a **public** GitHub repository. (The JWT payload decodes to `"role":"anon"`, so it is the public anon key rather than the service-role key despite the variable name — but hardcoding any project-specific credential in source, and mislabeling it, is still a real exposure and a maintenance trap.)
**Fix:** Remove the hardcoded fallback entirely; fail loudly if the env var is missing. Rotate the key if there's any chance it actually carries elevated privileges. Add a pre-commit secret scanner.

### C-04. CORS fails open unless `NODE_ENV` is explicitly `'production'`
**File:** `server.ts:63`
```ts
if (allowedOrigins.includes(origin) || allowedOrigins.includes('*') || process.env.NODE_ENV !== 'production') {
  return callback(null, true);
}
```
**Problem:** Any request whose `NODE_ENV` is not the exact string `'production'` (unset, `'staging'`, a typo, a misconfigured host) is allowed regardless of origin. This is a fail-open design on a credentialed CORS policy (`credentials: true` is set a few lines below), which is the riskier failure direction — a misconfigured/forgotten env var silently opens cross-origin credentialed requests to the whole API.
**Fix:** Fail closed — only allow origins present in `allowedOrigins`; never key security behavior off an "is it production" heuristic with an insecure default.

### C-05. Wide-open Row Level Security policies across most tables
**Location:** `supabase/migrations/*.sql`
**Finding:** 67 policies across the migrations use `USING (true)` (and 3 more use `WITH CHECK (true)`), out of 131 `CREATE TABLE` statements, while RLS is only explicitly enabled on 17 tables.
**Problem:** `USING (true)` policies grant unrestricted row access to anyone who can authenticate to Supabase with the public anon key — the key that is, by design, shipped to every browser. Today this is partially mitigated because the only file that constructs a raw Supabase client (`src/lib/supabase.ts`, anon key) is not imported anywhere in the app (see dead-code report, D-08), so the key likely isn't even present in the shipped bundle. But this is a fragile safety net: the moment any developer wires up `lib/supabase.ts` (or copies the anon key from `.env` into a new script), these policies provide effectively no protection, independent of the custom JWT/RBAC system built into the Express backend.
**Fix:** Audit every `USING (true)` policy and replace with real ownership/role checks, or confirm+document that direct client access to Supabase is intentionally disabled and enforce it (e.g., don't ship a `VITE_SUPABASE_ANON_KEY` to the frontend at all if the REST backend is the only sanctioned access path).

---

## High

### H-01. Access token stored in `localStorage` despite comments claiming in-memory storage
**File:** `src/lib/apiClient.ts:24-46`
```ts
// In-memory access token storage with safe 15-minute session persistence
let inMemoryAccessToken: string | null = (() => { ... localStorage.getItem('stratum_access_token') ... })();
...
export function setAccessToken(token: string | null) {
  inMemoryAccessToken = token;
  try {
    if (token) { localStorage.setItem('stratum_access_token', token); }
    ...
```
**Problem:** The comment and variable name (`inMemoryAccessToken`) claim in-memory-only storage, but the token is also always written to and read from `localStorage`, which is readable by any JavaScript on the page (i.e., exposed to XSS). This is inconsistent with the refresh token, which is correctly kept `httpOnly` (see `auth.controller.ts`).
**Fix:** Decide on one model. If in-memory is the intent, drop the `localStorage` read/write and accept that a hard refresh requires a silent-refresh call using the httpOnly cookie. If persistence across reloads is required, understand and accept the XSS tradeoff, or move to a short-lived httpOnly cookie for the access token too.

### H-02. Auth token passed as a URL query parameter for the SSE stream
**File:** `src/hooks/useOwnerOSData.ts:257-263`
```ts
const token = getAccessToken();
const streamUrl = `${apiBaseUrl}/notifications/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;
eventSource = new EventSource(streamUrl, { withCredentials: true });
```
**Problem:** Bearer tokens in URLs get written to server access logs, browser history, and any intermediate proxy logs, and can leak via the `Referer` header. This is a known anti-pattern (OWASP).
**Fix:** Use the httpOnly refresh-token cookie (already sent via `withCredentials: true`) for SSE auth, and have the server derive identity from the cookie/session rather than a query-string token.

### H-03. Admin API router double-mounted, one path unauthenticated-by-convention
**File:** `server.ts:115-116`
```ts
app.use('/api/v1/admin', adminRoutes);
app.use('/admin', adminRoutes);
```
**Problem:** The same router is mounted at both `/api/v1/admin` and bare `/admin`. The frontend's client-side router also owns `/admin/*` for the `ServerAdminVault` SPA screen (`src/App.tsx:66`). Because the bare `/admin` Express mount is registered before the production catch-all SPA handler, any GET request under `/admin/*` is checked against the admin API router first — this is fragile: it can silently 404 or intercept requests that were meant to fall through to the SPA `index.html`, and it doubles the exposed surface for whatever auth guard is (or isn't) applied inside `adminRoutes`.
**Fix:** Mount the admin API under `/api/v1/admin` only; remove the bare `/admin` mount.

### H-04. Two parallel, independently-maintained authorization systems
**Files:** `backend/src/middleware/rbac.middleware.ts` (`requirePermission`, `requireRole`, `requireCtaPermission`) vs. `backend/src/middleware/permission.middleware.ts` (`verifySessionActor`, DB-re-verified actor + `effectivePermissions`)
**Problem:** Both are live (used across different route modules, e.g. `admin.routes.ts` and `dispatch.routes.ts` use `permission.middleware.ts`; most other modules use `rbac.middleware.ts`). They compute overlapping but not identical things (role normalization, permission overrides) from different code paths. A permission fix applied to one system will not apply to routes guarded by the other, and a reviewer checking "is this route protected?" has to know which of two systems is in play.
**Fix:** Consolidate into a single authorization pipeline, or clearly document which system is canonical and migrate the other module's routes onto it.

### H-05. `requireRole()` gives ServerAdmin/Owner/Admin an unconditional bypass
**File:** `backend/src/middleware/rbac.middleware.ts:395`
```ts
if (!isMatch && normRole !== 'ServerAdmin' && normRole !== 'Owner' && normRole !== 'Admin (System)') {
  return res.status(403)...
}
```
**Problem:** Every call site of `requireRole([...])` implicitly also allows these three roles, regardless of what was passed in `allowedRoles`. This may be intentional "superadmin can do anything," but it is a hardcoded, invisible exception baked into shared middleware rather than an explicit per-route decision — easy to forget, and impossible to opt out of route-by-route (e.g. a route that should exclude even Owner, such as a maker-checker control where Owner must not self-approve).
**Fix:** Make the bypass explicit and opt-out-able per route, or move the exception to the route definitions instead of the shared middleware.

### H-06. `tsconfig.json` excludes the entire backend from type checking
**File:** `tsconfig.json:28-29`
```json
"include": ["src/**/*"],
"exclude": ["node_modules", "dist", "supabase/functions", "src/backupcomponents"]
```
**Problem:** `"include"` only covers `/src`. `npm run lint` is literally `tsc --noEmit`, so `/backend` (126 files), `server.ts`, `/scripts`, `/scratch`, and `/tests` never get type-checked by the project's own lint step — despite the backend being written in TypeScript and containing the auth/RBAC/finance logic. Note also `exclude` references `src/backupcomponents`, a directory that does not exist in the current tree (stale config, see also D-11 in the dead-code report).
**Fix:** Add a second `tsconfig` (or broaden this one) covering `/backend` and `server.ts`, and wire it into `npm run lint`/CI.

### H-07. `strict` mode is not enabled
**File:** `tsconfig.json`
**Problem:** `compilerOptions` has no `"strict": true` (nor `strictNullChecks`, `noImplicitAny`, etc.). Consistent with this, the codebase contains 194 `as any` casts and 695 `: any` type annotations across `/src` and `/backend`. Without strict null checks, `tsc --noEmit` returning 0 errors (as it did in this audit) provides much weaker guarantees than it would in a strict project — many of the runtime null/undefined issues a strict compiler would catch are invisible to the current lint step.
**Fix:** Turn on `strict` incrementally (start with `noImplicitAny` and `strictNullChecks`), and treat the current `any` usages as a backlog to burn down, prioritizing the auth/RBAC/finance modules first.

---

## Medium

### M-01. `SUPABASE_SERVICE_ROLE_KEY` silently falls back to the public anon key
**File:** `backend/src/config/env.ts:11`
```ts
SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY,
```
**Problem:** If the server-only service-role secret isn't set, the backend silently substitutes the public, RLS-restricted anon key instead of failing immediately with a clear error. Combined with the wide-open RLS policies in C-05, a misconfigured deployment could end up behaving inconsistently (some backend operations that expect to bypass RLS would just get filtered/empty results) rather than failing loudly.
**Fix:** Don't fall back across the public/private boundary. If `SUPABASE_SERVICE_ROLE_KEY` is missing, treat it as missing (the file's own validation block below already does this for other secrets) rather than quietly substituting a differently-scoped key.

### M-02. 415 `console.log` calls left in backend source
**Location:** `backend/**/*.ts` (415 occurrences; 3 more in `/src`)
**Problem:** No structured/leveled logger is in use in most of the backend; debugging `console.log`s are mixed in with real operational logging. This makes production log output noisy, harder to filter/alert on, and risks accidentally logging sensitive request data.
**Fix:** Adopt a logging library (pino/winston) with levels, and sweep the existing `console.log` calls into `logger.debug`/`logger.info` or remove them.

### M-03. Misleading module name: `supabaseServices.ts` does not use Supabase
**File:** `src/services/supabaseServices.ts`
**Problem:** Despite the name, this 1,921-line file only calls the REST backend via `apiClient` (`import { apiClient } from '../lib/apiClient'`) — it never touches the Supabase client. The name strongly implies direct DB access, which is misleading for anyone navigating the codebase and increases the odds a future change wires this file (or a copy of it) to the raw Supabase client instead of the authenticated backend API, reintroducing the RLS exposure discussed in C-05.
**Fix:** Rename to something like `consoleApiServices.ts`, and/or remove `src/lib/supabase.ts` if direct Supabase access from the frontend is not meant to be supported (see D-08).

### M-04. Fragile, hidden data-patching logic based on string matching
**File:** `src/services/supabaseServices.ts` (`fetchCompanyProfile`, ~lines 40-60)
```ts
if (
  data.address?.includes('Metoda') ||
  data.address?.includes('Rajkot') ||
  data.address?.includes('Bhosari') ||
  data.address?.includes('123 Test St') ||
  data.legalName === 'Test Tech Ltd'
) {
  data = { ...data, legalName: 'GuruOm Industries LLP', address: '...', ... };
}
```
**Problem:** Production company-profile data fetched from the API is silently overwritten client-side if it happens to match a hardcoded list of known "bad"/test values. This kind of override belongs in a data-migration/seed script, not in a read path that runs on every load — it masks the real bug (stale/test data reaching production) instead of fixing it at the source, and will keep firing (or silently stop firing) as test strings drift.
**Fix:** Fix the underlying seed/migration so the API never returns the placeholder data, and remove this client-side patch.

### M-05. Two coexisting, unpinned lockfiles
**Files:** `package-lock.json`, `bun.lock`
**Problem:** Both an npm lockfile and a Bun lockfile are committed, and `package.json` has no `"packageManager"` field. Depending on which tool a contributor or CI runs, dependency resolution can diverge between the two lockfiles over time, leading to "works on my machine" bugs.
**Fix:** Pick one package manager, commit only its lockfile, delete the other, and set `"packageManager"` in `package.json` to enforce it.

### M-06. Fragile `__dirname` resolution in an ESM project
**File:** `server.ts:32`
```ts
const __dirname = path.dirname(process.argv[1] || __filename || '.');
```
**Problem:** The project is `"type": "module"` (native ESM), where `__dirname`/`__filename` are not defined globals. This line only works because `process.argv[1]` is truthy in practice (short-circuiting before `__filename` — which doesn't exist in ESM — would ever be evaluated) and because the production build step (`esbuild ... --format=cjs`) converts the file to CommonJS before it runs. It happens to work today under both the `tsx` dev path and the bundled `dist/server.cjs` path, but it's a confusing, easy-to-break pattern that will throw a `ReferenceError` for `__filename` if `process.argv[1]` is ever falsy in an unbundled ESM run.
**Fix:** Use `import.meta.url` + `fileURLToPath` for a standards-based ESM equivalent, or keep a single, clearly-commented CJS-only helper that's only relied on in the bundled path.

---

## Low

### L-01. No ESLint configuration
**Finding:** No `.eslintrc*`/`eslint.config.*` exists anywhere in the repo, and `"lint"` in `package.json` is only `tsc --noEmit`. There is no enforcement of React Hooks rules (`react-hooks/exhaustive-deps`), unused-variable detection, or general style/bug-pattern linting anywhere in the 3.2 MB `/src` tree.
**Fix:** Add ESLint with `eslint-plugin-react-hooks` and `@typescript-eslint`, and wire it into CI alongside `tsc`.

### L-02. Duplicated CORS/health-check surface between `/health` and `/api/health`
**File:** `server.ts:42-52`
**Problem:** Two separate health endpoints are defined with slightly different response shapes (`/health` returns plain text, `/api/health` returns JSON with uptime). Not a functional bug, but duplicated, drift-prone surface for what should be one canonical health check.
**Fix:** Keep one canonical health endpoint (JSON, with uptime) and have the other path redirect/alias to it if both are needed for different infra probes.

---

## Notes on what was *not* found
- `tsc --noEmit` over `/src` reported **zero** type errors (though see H-06/H-07 for why this guarantees less than it sounds like).
- No `@ts-ignore`/`@ts-nocheck` suppressions were found anywhere in `/src` or `/backend`.
- No genuine `TODO`/`FIXME`/`HACK` markers were found (two `grep` hits were false positives on the literal string `XXXX` used as a placeholder in UI copy/schema comments).
- Password hashing (`argon2id`) and refresh-token handling (hashed at rest, httpOnly+sameSite cookie, rotation via `familyId`) in `backend/src/utils/password.ts` / `auth.controller.ts` / `auth.service.ts` look sound and were not flagged.