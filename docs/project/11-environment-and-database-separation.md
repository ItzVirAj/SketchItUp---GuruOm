# Environment & Database Separation Guide

This document establishes the architecture, credential management, and dual-database configuration for **GuruOm Owner OS** across **Local Development** and **Render Production**.

---

## 1. Dual-Environment Architecture

To ensure total isolation between local development experimentation and live client operations, the project uses two distinct Supabase projects managed under separate configurations:

```
┌────────────────────────────────────────────────────────┐     ┌────────────────────────────────────────────────────────┐
│                   LOCAL ENVIRONMENT                    │     │                   RENDER PRODUCTION                    │
├────────────────────────────────────────────────────────┤     ├────────────────────────────────────────────────────────┤
│ Host: http://localhost:3000                            │     │ Host: Render Web Service URL                           │
│ Database: Supabase (Local Project)                     │     │ Database: Supabase (Production Project)                │
│ Project Ref: txztwjvjqjczxwskzjjx                      │     │ Project Ref: utbzbsafipenbjrbkoax                      │
│ Config: .env file                                      │     │ Config: Render Dashboard -> Environment Settings       │
└────────────────────────────────────────────────────────┘     └────────────────────────────────────────────────────────┘
```

---

## 2. Project Details & Access Matrix

| Property | Local Environment | Render (Staging / Production) |
| :--- | :--- | :--- |
| **Supabase URL** | `https://txztwjvjqjczxwskzjjx.supabase.co` | `https://utbzbsafipenbjrbkoax.supabase.co` |
| **Dashboard URL** | [txztwjvjqjczxwskzjjx Dashboard](https://supabase.com/dashboard/project/txztwjvjqjczxwskzjjx) | [utbzbsafipenbjrbkoax Dashboard](https://supabase.com/dashboard/project/utbzbsafipenbjrbkoax) |
| **API Settings** | [Local Project API Settings](https://supabase.com/dashboard/project/txztwjvjqjczxwskzjjx/settings/api) | [Render Project API Settings](https://supabase.com/dashboard/project/utbzbsafipenbjrbkoax/settings/api) |
| **Config Location** | Local `.env` file | Render Web Service -> Environment Variables |

---

## 3. Database Role Security (`anon` vs `service_role`)

Supabase provisions two distinct keys for each project:

### 1. Public Anonymous Key (`anon`)
- **Assigned to:** `VITE_SUPABASE_ANON_KEY`
- **Exposure:** Publicly bundled in client frontend JavaScript. Visible to anyone inspecting browser network calls.
- **Privileges:** Strictly read-only or scoped to client-authenticated Supabase Auth users. Under migration `037_enforce_backend_service_role_policy.sql`, **direct table mutations (`INSERT`, `UPDATE`, `DELETE`) are revoked from `anon`** to prevent client-side bypass of backend validation and audit logging.

### 2. Secret Service Role Key (`service_role`)
- **Assigned to:** `SUPABASE_SERVICE_ROLE_KEY`
- **Exposure:** **Server-only secret**. Must **NEVER** be prefixed with `VITE_` or sent to the browser.
- **Privileges:** Full database administrator privileges. Bypasses Row Level Security (RLS) to allow the Express backend to:
  - Transition order stages (`transitionOrderStage`).
  - Reserve and consume stock in the inventory ledger.
  - Create job cards, route cards, and dispatch challans.
  - Write append-only immutable audit logs.

> [!WARNING]
> Never put the public `anon` key into `SUPABASE_SERVICE_ROLE_KEY`. If `anon` is used by the backend, PostgreSQL will reject state transitions and table updates with:
> `code: '42501', message: 'permission denied for table customer_orders' (hint: Grant the required privileges to the current role with: GRANT UPDATE ON public.customer_orders TO anon;)`.

---

## 4. Environment Variables Checklist

### Local Environment ([.env](file:///c:/proj/guruomosv2/.env))
```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000
JWT_ACCESS_SECRET=stratum_owner_os_jwt_access_secret_2026_precision_32chars
JWT_REFRESH_SECRET=stratum_owner_os_jwt_refresh_secret_2026_precision_32chars

# Local Database - Must use secret service_role key for backend
SUPABASE_URL=https://txztwjvjqjczxwskzjjx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<local_project_service_role_secret_key>

# Public Client Configuration
VITE_API_BASE_URL=/api/v1
VITE_SUPABASE_URL=https://txztwjvjqjczxwskzjjx.supabase.co
VITE_SUPABASE_ANON_KEY=<local_project_anon_public_key>
```

### Render Production Environment (Render Dashboard)
```env
NODE_ENV=production
PORT=10000
FRONTEND_ORIGIN=https://<your-render-app-name>.onrender.com
JWT_ACCESS_SECRET=<production_jwt_access_secret_32chars>
JWT_REFRESH_SECRET=<production_jwt_refresh_secret_32chars>

# Production Database - Must use secret service_role key for backend
SUPABASE_URL=https://utbzbsafipenbjrbkoax.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<render_project_service_role_secret_key>

# Public Client Configuration
VITE_API_BASE_URL=/api/v1
VITE_SUPABASE_URL=https://utbzbsafipenbjrbkoax.supabase.co
VITE_SUPABASE_ANON_KEY=<render_project_anon_public_key>
```

---

## 5. Verification & Health Checks

1. **Verify Local Backend Connection**:
   - Restart the local dev server: `npm run dev`.
   - The backend startup logger verifies the Supabase token:
     ```
     🔌 [Database] Connected to Supabase Host: https://txztwjvjqjczxwskzjjx.supabase.co (Key: eyJhbGci...wiG0)
     ```
   - If the token is valid `service_role`, no warning is emitted.
   - If an `anon` key is accidentally supplied, the backend warns:
     `⚠️ [Database] SUPABASE_SERVICE_ROLE_KEY in .env contains an "anon" token instead of the secret "service_role" key.`

2. **Verify Database Mutations**:
   - Log in as `owner@guruom.in`.
   - Update an order status or transition an order stage.
   - Confirm the operation succeeds with HTTP `200` and no `42501 permission denied` database errors in server console.

3. **Applying Migrations to Both Databases**:
   - Whenever a new SQL migration is added in `supabase/migrations/`, apply it to:
     1. Local project `txztwjvjqjczxwskzjjx` SQL Editor.
     2. Render project `utbzbsafipenbjrbkoax` SQL Editor.
