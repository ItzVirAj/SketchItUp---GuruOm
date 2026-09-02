# Render Deployment Guide — GuruOm Owner OS

This guide provides an end-to-end, production-ready operational manual for deploying the **GuruOm Owner OS** (Stratum) full-stack manufacturing ERP application to [Render](https://render.com).

---

## 1. Architecture on Render

GuruOm Owner OS is built with a unified single-service architecture:

```
                  ┌────────────────────────────────────────────────────────┐
                  │                 Render Web Service                     │
                  │             (Node.js Runtime Container)                │
                  │                                                        │
                  │   ┌──────────────────────┐  ┌──────────────────────┐   │
   HTTPS Requests │   │    Vite SPA Bundle   │  │   Express REST API   │   │
─────────────────┼──>│       (dist/*)       │  │   (dist/server.cjs)  │   │
                  │   │  React 19 Frontend   │  │   Node.js / ESM-CJS  │   │
                  │   └──────────────────────┘  └──────────┬───────────┘   │
                  └────────────────────────────────────────┼───────────────┘
                                                           │
                                ┌──────────────────────────┼──────────────────────────┐
                                │                          │                          │
                                ▼                          ▼                          ▼
                     ┌────────────────────┐     ┌────────────────────┐     ┌────────────────────┐
                     │ Supabase (Postgres)│     │  Redis Fast-Layer  │     │   External APIs    │
                     │  Relational Data,  │     │  Session Locks,    │     │  • Resend (Email)  │
                     │  RLS, Audit Trails │     │  SSE & Cache       │     │  • Gemini (AI)     │
                     └────────────────────┘     └────────────────────┘     └────────────────────┘
```

- **Unified Web Service**: A single Render Web Service builds the React SPA (`vite build`) and bundles the backend server (`esbuild server.ts -> dist/server.cjs`).
- **Production Server (`node dist/server.cjs`)**: Express serves static frontend assets from `dist/`, routes client-side SPA navigation to `dist/index.html`, and mounts all `/api/v1/*` REST micro-modules, auth endpoints, and SSE streams on the same origin.
- **Port Binding**: Express binds dynamically to `process.env.PORT` on host `0.0.0.0`, with health check endpoints exposed at `/health` and `/api/health`.

---

## 2. Prerequisites & Third-Party Services

Before deploying to Render, ensure you have:

1. **GitHub Repository**: Access to [Sketch-It-up/GuruomOS](https://github.com/Sketch-It-up/GuruomOS.git) on branch `main`.
2. **Render Account**: An active account on [render.com](https://render.com).
3. **Supabase PostgreSQL Database**:
   - A Supabase project with PostgreSQL.
   - Project URL (e.g. `https://xyzcompany.supabase.co`).
   - Database Service Role Key (secret, for backend bypass) and Public Anon Key.
4. **(Optional) Redis Instance**:
   - Render Redis (Key-Value), Upstash Redis, or Redis Cloud.
   - *Note: GuruOm OS includes graceful fallback (fail-open mode) if Redis is not configured, but Redis is recommended for distributed locks and SSE notification scaling.*
5. **(Optional) API Keys**:
   - **Resend**: API Key (`re_...`) for automated notification emails and dispatch alerts.
   - **Google Gemini**: API Key for Stratum Executive Copilot (`/api/gemini/analyze`).

---

## 3. Database Preparation (Supabase)

Before launching the web service, prepare the database tables and functions:

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open the **SQL Editor**.
3. Execute the consolidated schema script located at:
   - [`supabase/apply_all_migrations.sql`](file:///c:/proj/GuruOmOS-devbuild1.0/supabase/apply_all_migrations.sql)
   *(Or sequentially run migration files `001_initial_schema.sql` through `020_*.sql` in [`supabase/migrations/`](file:///c:/proj/GuruOmOS-devbuild1.0/supabase/migrations/)).*
4. Ensure default users/roles are seeded so administrative users can log in upon deployment.

---

## 4. Step-by-Step Deployment via Render Dashboard

### Step 1: Create a New Web Service
1. Log in to the [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top navigation bar and select **Web Service**.
3. Under **Connect a repository**, select **GitHub** and connect `Sketch-It-up/GuruomOS` (or search for `GuruomOS`).

---

### Step 2: Configure Service Settings

Fill in the service details with the following parameters:

| Field | Configuration Value | Notes |
|---|---|---|
| **Name** | `guruom-os` *(or your company name)* | Generates `https://guruom-os.onrender.com` |
| **Region** | `Singapore (Southeast Asia)` or closest region | Select region closest to your Supabase instance & users |
| **Branch** | `main` | Production deployment branch |
| **Root Directory** | *(Leave blank)* | Uses repository root |
| **Runtime** | `Node` | Node.js runtime environment |
| **Build Command** | `npm install && npm run build` | Builds Vite SPA and bundles Express server |
| **Start Command** | `npm start` | Executes `node dist/server.cjs` |
| **Instance Type** | `Starter` ($7/mo) or `Standard` ($25/mo) | *Free tier works for testing; Starter+ recommended to avoid cold starts* |

---

### Step 3: Configure Health Check
Under **Advanced Settings**:
- **Health Check Path**: `/health` *(or `/api/health`)*
- Render automatically probes this path to confirm successful zero-downtime deployment before routing traffic.

---

### Step 4: Configure Environment Variables

Under the **Environment Variables** section in Render, click **Add Environment Variable** for each of the following:

#### A. Critical Server Secrets (Required for Boot)

| Key | Example Value | Description |
|---|---|---|
| `NODE_ENV` | `production` | Enables production asset serving & fail-close security checks |
| `PORT` | `10000` *(Render sets this automatically)* | Port the Express server listens on (default Render port: 10000) |
| `SUPABASE_URL` | `https://your-project.supabase.co` | Supabase endpoint URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` *(secret key)* | Privileged service-role key for backend DB operations |
| `JWT_ACCESS_SECRET` | *(64-char random hex)* | Secret key for signing 15-minute access tokens |
| `JWT_REFRESH_SECRET` | *(64-char random hex)* | Secret key for signing 7-day refresh token cookies |
| `FRONTEND_ORIGIN` | `https://guruom-os.onrender.com` | Allowed CORS origin (add custom domains comma-separated) |

> [!TIP]
> **Generating Cryptographically Secure JWT Secrets:**
> Run the following in your terminal to generate 256-bit keys:
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

#### B. Public Client Variables (Vite Build Parameters)

> [!IMPORTANT]
> `VITE_` prefixed variables are embedded into client JavaScript files during the **build step** (`npm run build`). Always configure these before triggering a build.

| Key | Example Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | Base REST path for same-origin API calls |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | Public Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` *(anon key)* | Public Supabase anon key |

#### C. Optional Integrations & Fast-Layer

| Key | Example Value | Description |
|---|---|---|
| `REDIS_URL` | `rediss://default:password@host:6379` | Redis connection string (Render Redis / Upstash / Redis Cloud) |
| `REDIS_ENABLED` | `true` | `true` to enable distributed locks & cache (defaults to `true`) |
| `RESEND_API_KEY` | `re_123456789...` | API key for transactional emails & notifications |
| `GEMINI_API_KEY` | `AIzaSy...` | Google Gemini API key for Stratum AI Executive Copilot |
| `RATE_LIMIT_LOGIN_MAX` | `5` | Max login attempts per 15-minute window |

---

### Step 5: Deploy the Service
1. Click **Create Web Service**.
2. Render will clone the repository, run `npm install`, execute `npm run build`, start the server via `node dist/server.cjs`, and verify the `/health` endpoint.
3. Once live, the service status indicator will turn **Live** with your Render URL (e.g. `https://guruom-os.onrender.com`).

---

## 5. Alternative: Deploy via `render.yaml` (Blueprint)

You can also deploy GuruOm OS automatically using Render's Infrastructure-as-Code Blueprint.

Create a `render.yaml` file in the root of your repository:

```yaml
services:
  - type: web
    name: guruom-os
    runtime: node
    plan: starter
    region: singapore
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: FRONTEND_ORIGIN
        sync: false # Set in dashboard or provide domain
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: JWT_ACCESS_SECRET
        generateValue: true
      - key: JWT_REFRESH_SECRET
        generateValue: true
      - key: VITE_API_BASE_URL
        value: /api/v1
      - key: VITE_SUPABASE_URL
        sync: false
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
      - key: RESEND_API_KEY
        sync: false
      - key: GEMINI_API_KEY
        sync: false
      - key: REDIS_URL
        fromService:
          type: redis
          name: guruom-redis
          property: connectionString

  - type: redis
    name: guruom-redis
    plan: starter
    region: singapore
    ipAllowList: [] # Internal access only from same Render account
```

To deploy via Blueprint:
1. In the Render Dashboard, click **New +** -> **Blueprint**.
2. Connect your repository and Render will configure both the Web Service and the Redis instance automatically.

---

## 6. Post-Deployment Verification Checklist

After the service status shows **Live**, perform the following validation checks:

- [ ] **1. Liveness & Health Probe**:
  Navigate to `https://<your-app>.onrender.com/health` and verify HTTP 200 `OK`.
  Navigate to `https://<your-app>.onrender.com/api/health` and verify JSON response:
  ```json
  { "status": "ok", "service": "guruom-owner-os", "uptime": 12.34, "timestamp": "..." }
  ```
- [ ] **2. Single Page Application (SPA) Routing**:
  - Open `https://<your-app>.onrender.com` in your browser and confirm the landing/login view loads cleanly.
  - Test deep links (e.g. `https://<your-app>.onrender.com/console`) and refresh the page to verify that Express static fallback serves `index.html` properly.
- [ ] **3. Authentication & JWT Cookie Flow**:
  - Log in with valid credentials.
  - Verify that the `httpOnly` refreshToken cookie is set securely over HTTPS.
  - Verify that the 15-minute access token is issued and stored in memory.
- [ ] **4. REST Micro-Module Data Flow**:
  - Open the **Orders** view (`/console/orders`) and verify data fetches from `/api/v1/orders`.
  - Open the **Inventory** view and verify item availability queries.
- [ ] **5. Realtime Notification Stream (SSE)**:
  - Check developer network tools for an open EventStream connection to `/api/v1/notifications/stream`.
- [ ] **6. Gemini AI Copilot (If Enabled)**:
  - Submit a query to the AI Executive Copilot and verify response from `/api/gemini/analyze`.

---

## 7. Custom Domains & SSL Setup

To attach your production domain (e.g. `erp.guruomindustries.com`):

1. Go to the **Settings** tab of your Render Web Service.
2. Scroll to **Custom Domains** and click **Add Custom Domain**.
3. Enter your domain (e.g. `erp.guruomindustries.com`).
4. In your DNS provider (Cloudflare, GoDaddy, Route 53, etc.), configure:
   - **CNAME Record**: Host `erp` -> Value `<your-app>.onrender.com`
5. Render will automatically issue and renew a free Let's Encrypt SSL certificate.
6. **Update Environment Variables**:
   - Update `FRONTEND_ORIGIN` in Render to include your custom domain:
     ```
     FRONTEND_ORIGIN=https://erp.guruomindustries.com,https://guruom-os.onrender.com
     ```
   - Click **Save Changes** (triggers automatic restart).

---

## 8. Common Issues & Troubleshooting

### Issue 1: `CRITICAL: Missing required environment variables`
- **Symptom**: Service crashes immediately on boot with `Fatal Server Startup Error`.
- **Cause**: In `NODE_ENV=production`, `backend/src/config/env.ts` enforces fail-close security if any of `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_ACCESS_SECRET`, or `JWT_REFRESH_SECRET` are missing.
- **Fix**: Verify in the Render Dashboard under **Environment** that all 4 variables are present with non-empty values.

### Issue 2: SPA Routes Return 404 on Refresh
- **Symptom**: Navigating to `https://<app>.onrender.com/console` works via in-app links, but refreshing results in 404 or blank screen.
- **Cause**: Static file routing is not catching fallback paths.
- **Fix**: The root `server.ts` handles fallback using `app.get('*', ...) -> dist/index.html`. Ensure `npm run build` ran successfully during build step and generated `dist/index.html`.

### Issue 3: CORS Errors on API Calls
- **Symptom**: Browser console shows `Access-Control-Allow-Origin` error when making API requests.
- **Cause**: Request origin does not match `FRONTEND_ORIGIN`.
- **Fix**: Since the frontend and backend are hosted on the same origin on Render, set `VITE_API_BASE_URL=/api/v1` and ensure `FRONTEND_ORIGIN` includes your exact URL (e.g. `https://your-domain.com`).

### Issue 4: Client Bundle Missing Updated Environment Variables
- **Symptom**: Frontend connects to `localhost:3000` or old endpoints even after updating environment variables.
- **Cause**: `VITE_*` variables are baked into static JS at **build time**, not runtime.
- **Fix**: After updating any `VITE_*` variable in Render, trigger a **Manual Deploy -> Clear build cache & deploy**.

### Issue 5: Render Free Tier Cold Starts
- **Symptom**: First request after 15 minutes of inactivity takes 30-50 seconds to respond.
- **Cause**: Render spins down Free tier web services after idle periods.
- **Fix**: Upgrade to Render **Starter** tier ($7/month) for 24/7 always-on operation, or set up an uptime ping service (e.g. UptimeRobot, BetterStack) targeting `/health` every 5 minutes.

---

## 9. Deployment Maintenance & CI/CD

- **Auto-Deploy on Push**: Render is configured by default to automatically build and deploy whenever changes are merged into the `main` branch.
- **Rollback Capabilities**: Under the **Deploys** tab in Render, you can click on any previous successful build and select **Rollback to this deploy** for instant recovery in case of regressions.
- **Log Inspection**: Real-time console logs and error traces are accessible directly from the **Logs** tab in Render.
