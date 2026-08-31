# Directory Structure (annotated)

Top 2–3 levels of the two source trees. "Why" columns describe what actually lives there today.

## Root

```
guruomosv2/
├── server.ts                 Express app: health probes, CORS, mounts all /api/v1 routers, Vite middleware, Gemini endpoint
├── vite.config.ts            Vite + React + Tailwind v4 plugins, '@' alias → src/, Vitest test include, DISABLE_HMR flag
├── tsconfig.json             ES2022, bundler resolution, paths '@/*' → './src/*'; excludes supabase/functions & src/backupcomponents
├── .env.example              Template for required env var names
├── src/                      React frontend (below)
├── backend/                  Express REST API (below) + legacy test scripts
│   ├── src/                  The live API code
│   ├── app/                  EMPTY folder skeleton (api/v1, core, models, schemas, services) — leftover from an abandoned FastAPI plan
│   ├── tests/                Node-based module test scripts
│   └── test-*.ts             Standalone HTTP smoke-test scripts per module
├── supabase/
│   ├── migrations/           001_initial_schema … 020_customer_orders_lifecycle_fields (21 SQL files)
│   └── functions/            Supabase edge functions (excluded from tsconfig)
├── tests/                    Vitest unit tests for the pure business engines (state machine, RBAC, statutory, etc.)
├── data/                     company_profile.json — local file-store fallback used by the masters module
└── dist/                     Build output (vite build + esbuild server bundle)
```

## `src/` — frontend

```
src/
├── main.tsx                  React root
├── App.tsx                   Providers (Auth → AccentTheme → Toast) + Router; LoginPage gate; ConsoleContainer route
├── index.css                 Tailwind v4 entry + theme CSS variables
├── components/
│   ├── auth/                 LoginPage (public login screen)
│   ├── console/              The Owner OS shell (see below)
│   ├── common/               Reusable primitives: Modal, Dialog, StatusBadge, Breadcrumbs, SEO,
│   │                         SwitchUserModal, ResendNotifModal, AccessRestrictedGate, CTAButton, Footer…
│   ├── base-ui/              Generic table primitives (table.tsx)
│   ├── interactive/          Marketing-site visual widgets (ArchitectureDiagram, HubAndSpokeVisual…)
│   └── *.tsx                 Legacy marketing shell components (Header, Sidebar, DashboardView…)
├── context/                  AuthContext, ToastContext, AccentThemeContext (global providers)
├── hooks/                    useAuth (re-export), useOwnerOSData, useUrlModal, useInAppNotifications,
│                             usePullToRefresh, useSmoothScroll
├── lib/                      apiClient.ts (REST + token refresh), supabase.ts (client), analytics,
│                             notificationSound, utils (cn())
├── services/                 supabaseServices.ts (all REST data calls), notificationService.ts,
│                             resendEmailService.ts (now an empty stub — email service removed)
├── utils/                    Pure business logic: orderStateMachine, rbacMatrix, permissions,
│                             navigationConfig, statutoryAccountingEngine, procurementEngine,
│                             productionEngine, inventoryCategorization, masterValidation
├── types/                    console.ts (domain types, ConsoleView, UserRole), dashboard.ts, index.ts
├── pages/                    Public marketing pages (HomePage, BookDemoPage, OwnerOsPage, FaqsPage…)
├── data/                     Static seed/mock data for marketing + console defaults (mockData, consoleData…)
└── backupcomponents/         Dead code — explicitly excluded in tsconfig.json
```

### `src/components/console/` — the application shell

```
components/console/
├── ConsoleContainer.tsx      Top-level container: owns view routing map, RBAC gate, passes
│                             useOwnerOSData state/handlers down as props to every view
├── ConsoleHeader.tsx         Top bar (user, notifications, dark mode, command palette trigger)
├── ConsoleSidebar.tsx        Role-filtered navigation (from navigationConfig.ts)
├── MobileDrawer.tsx          Mobile slide-out nav (<1024px)
├── MobileBottomTabBar.tsx    Mobile bottom tabs
├── AccentColorSelector.tsx   Accent theme picker UI
├── AgentBentoGrid.tsx        Command Centre AI-agent card grid
├── views/                    One screen per ConsoleView id: OrdersView, OrderDetailView, InventoryView,
│                             ProductionView, QCView, PDIView, DispatchView, InvoicesView, PayablesView,
│                             ApprovalsView, MastersView, UsersAuditView, CompanyProfileView,
│                             CommandCentreView, ReportsView, FinishedGoodsView, PlatingOutworkView,
│                             WorkflowTestingView
└── modals/                   Cross-view dialogs: CommandPaletteModal (Ctrl+K), SecuritySessionsModal,
                              ChallanDetailModal, JobCardDetailModal
```

## `backend/src/` — API

```
backend/src/
├── config/                   env.ts (typed env access), database.ts (Supabase service-role client singleton)
├── lib/                      Infrastructure singletons: redis.ts, cache.ts (tenant-scoped getOrSet),
│                             lock.ts (Redlock distributed locks), pubsub.ts, queues.ts +
│                             queue-connection.ts (BullMQ), storage.ts (Supabase Storage)
├── middleware/               auth.middleware.ts (Bearer JWT), rbac.middleware.ts (requirePermission),
│                             rateLimit.ts (login/refresh/password/session limiters), upload.middleware.ts (multer)
├── modules/                  One folder per business module (see 02-backend-modules.md)
├── services/                 auditLog.ts — shared structured audit-log writer
├── utils/                    jwt.ts, password.ts (argon2), geolocation.ts, deviceParser.ts
└── scripts/                  Seed/cleanup/maintenance scripts (seed-master-data.ts, clean-all-data.ts, *.cjs generators)
```

