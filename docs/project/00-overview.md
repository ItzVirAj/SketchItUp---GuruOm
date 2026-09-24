# Owner OS — Project Overview

## What this product is

GuruOm **Owner OS** (internally also branded "Stratum") is a full-stack, single-tenant
manufacturing ERP web application for a precision job-shop (GuruOm Industries). It tracks the
complete customer-order lifecycle — PO entry, drawing-revision verification, credit control,
material availability, procurement/GRN, job cards, QC/PDI, dispatch, GST invoicing, payments,
and closure — behind a hard-gated order state machine and a role-based permission matrix
(Owner, Sales/Order Desk, Production Planner, Store Keeper, Accountant, etc.). The same repo
contains the React frontend, the Express REST API, the SQL migrations, and unit tests for the
business engines.

## Tech stack (as declared in root `package.json`)

### Frontend

| Concern | Library | Notes |
|---|---|---|
| UI framework | `react` / `react-dom` ^19 | Function components + hooks only |
| Routing | `react-router-dom` ^7 | Single catch-all route renders `ConsoleContainer` (see `src/App.tsx`) |
| Styling | `tailwindcss` ^4 via `@tailwindcss/vite` | Utility classes + dark mode + accent CSS variables |
| Icons | `lucide-react`, `@phosphor-icons/react`, `react-icons` | Lucide is dominant |
| Charts | `recharts` ^3 | Dashboard/reports views |
| Animation | `motion` ^12 | Marketing pages & console polish |
| Scroll | `lenis` ^1 | Smooth scrolling via `src/hooks/useSmoothScroll.ts` |
| Supabase JS | `@supabase/supabase-js` ^2 | Client exists (`src/lib/supabase.ts`); app data flows through REST instead |
| Utilities | `clsx`, `tailwind-merge` | Class-name merging in `src/lib/utils.ts` |

### Backend (runs in the same Node process as Vite)

| Concern | Library | Notes |
|---|---|---|
| HTTP server | `express` ^4 | Mounted in root `server.ts` |
| Auth | `jsonwebtoken`, `argon2`, `cookie-parser` | Custom JWT auth, no Supabase Auth |
| Validation | `zod` ^4 | Per-module `*.schema.ts` files |
| Cache / locks / queues | `ioredis`, `redlock`, `bullmq` | Optional fast layer, fail-open (`backend/src/lib/*`) |
| Rate limiting | `rate-limiter-flexible` | `backend/src/middleware/rateLimit.ts` |
| File uploads | `multer`, `file-type` | Attachments module |
| Email | `resend` (via `RESEND_API_KEY`) | Notifications module |
| AI copilot | `@google/genai` | `POST /api/gemini/analyze` in `server.ts` |
| Database | Supabase (Postgres) | Service-role client in `backend/src/config/database.ts` |

### Tooling

- `tsx` (dev runner), `vite` ^6 (dev server + build), `esbuild` (server bundle),
  `typescript` ~5.8, `xlsx` (Excel import), `vitest` config inside `vite.config.ts`.

## How to run it locally

```bash
npm install
npm run dev      # tsx watch server.ts  → single port (default 3000), Vite middleware mode
npm run build    # vite build + esbuild server.ts → dist/ + dist/server.cjs
npm start        # node dist/server.cjs
npm run lint     # tsc --noEmit (type check only; there is no ESLint config)
```

- Dev mode serves the SPA and the REST API from one origin: `server.ts` creates the Express app,
  mounts `/api/v1/*` routers, then adds Vite middleware (`NODE_ENV !== 'production'`).
- `GET /health` and `GET /api/health` are unauthenticated liveness probes.

### Environment variables (names only — see `.env.example`)

Server-side: `PORT`, `NODE_ENV`, `FRONTEND_ORIGIN`, `JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`,
`REDIS_URL`, `REDIS_ENABLED`, `REDIS_FAIL_CLOSED`, `RATE_LIMIT_LOGIN_MAX`,
`RATE_LIMIT_LOGIN_WINDOW_SEC`, `RATE_LIMIT_LOGIN_IP_MAX`, `RATE_LIMIT_REFRESH_MAX`,
`RATE_LIMIT_REFRESH_WINDOW_SEC`, `RATE_LIMIT_PASSWORD_CHANGE_MAX`,
`RATE_LIMIT_PASSWORD_CHANGE_WINDOW_SEC`, `RATE_LIMIT_SESSION_REVOKE_MAX`,
`RATE_LIMIT_SESSION_REVOKE_WINDOW_SEC`, `GEMINI_API_KEY`, `ALLOW_DEV_AUTH_BYPASS`.

Client-side (`VITE_`-prefixed, baked into the bundle): `VITE_API_BASE_URL`,
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

Vite behavior flag: `DISABLE_HMR` (used by AI Studio agents, see `vite.config.ts`).

## Repository facts

- Entry: `server.ts` (API + SPA), `src/main.tsx` → `src/App.tsx` (React).
- DB schema history: `supabase/migrations/001_*` … `020_*` (21 SQL files).
- Tests: `tests/*.test.ts` (Vitest, `test.include: ['tests/**/*.test.ts']` in `vite.config.ts`).
- Note: `README-SYSTEM-AND-ORDER-WORKFLOW.md` describes an older FastAPI/Tauri architecture that
  does **not** match this repo; `backend/app/` contains only empty folders. Trust the code, not that file.
