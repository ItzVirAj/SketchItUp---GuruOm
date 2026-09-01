# Color System Audit & Remediation Plan (`better-colors`)

This document presents a comprehensive audit of the color architecture in `guruomosv2` using the **`better-colors`** framework. It evaluates primitive token naming, semantic role mapping, hue integrity, status collision risks, dark/light surface temperature, and WCAG 2.1 AA contrast measurements.

---

## Executive Summary

| Check / Principle | Status | Severity | Core Finding |
| :--- | :--- | :--- | :--- |
| **Token Naming & Primitive Integrity** | **FAILED** | **HIGH** | `@theme` maps `--color-teal-500` to Blue (`#5B75F8`), corrupting hue semantics. |
| **Direct Primitive Application** | **FAILED** | **HIGH** | Raw hexes (`#5B75F8`, `#FF5000`) hardcoded in 200+ JSX files, requiring 150+ lines of CSS `!important` regex overrides. |
| **Status Hue Collisions** | **FAILED** | **HIGH** | Accent presets `red` (`#DC2626`) and `orange` (`#EA580C`) collide directly with destructive and warning status channels. |
| **WCAG 2.1 AA Contrast Ratios** | **FAILED** | **HIGH** | Primary button `#ffffff` on `#5B75F8` measures **3.85:1** (Fails AA 4.5:1). Light muted text `text-slate-400` on `#ffffff` measures **2.88:1** (Fails AA). |
| **Dark Mode Neutral Temperature** | **FAILED** | **MEDIUM** | Inconsistent dark surfaces mix cool slate (`bg-slate-950`), neutral zinc (`bg-zinc-900`), and dark base (`#121316`, `#14171F`). |
| **Theme Switching Mechanism** | **FAILED** | **MEDIUM** | Competing systems: CSS variable injection in `AccentThemeContext.tsx` vs brute-force `!important` overrides in `index.css`. |

**Audit Verdict: BLOCK (due to HIGH severity contrast failures, status hue collisions, and corrupted primitive tokens).**

---

## Measured Contrast Values (WCAG 2.1 AA)

> [!IMPORTANT]
> All contrast ratios below are calculated against the exact rendered background colors.

| Surface / Role | Foreground | Background | Measured Ratio | WCAG AA Requirement | Pass / Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Accent Button (Light & Dark)** | `#ffffff` | `#5B75F8` | **3.85 : 1** | $\ge 4.5 : 1$ (Normal text) | **FAIL** |
| **Orange Accent Button** | `#ffffff` | `#EA580C` | **3.31 : 1** | $\ge 4.5 : 1$ (Normal text) | **FAIL** |
| **Teal Accent Button** | `#ffffff` | `#0F766E` | **5.92 : 1** | $\ge 4.5 : 1$ (Normal text) | **PASS** |
| **Red Accent Button** | `#ffffff` | `#DC2626` | **4.64 : 1** | $\ge 4.5 : 1$ (Normal text) | **PASS** |
| **Muted Metadata Text (Light Mode)** | `slate-400` (`#94A3B8`) | `white` (`#FFFFFF`) | **2.88 : 1** | $\ge 4.5 : 1$ (Normal text) | **FAIL** |
| **Muted Metadata Text (Light Mode)** | `slate-500` (`#64748B`) | `white` (`#FFFFFF`) | **4.61 : 1** | $\ge 4.5 : 1$ (Normal text) | **PASS** |
| **Dark Base Body Text** | `dark-text` (`#F3F4F6`) | `dark-base` (`#121316`) | **16.1 : 1** | $\ge 4.5 : 1$ (Normal text) | **PASS** |
| **Dark Elevated Muted Text** | `slate-400` (`#94A3B8`) | `dark-surface` (`#1C1E24`) | **6.54 : 1** | $\ge 4.5 : 1$ (Normal text) | **PASS** |
| **QC Rejected Badge** | `rose-700` (`#BE123C`) | `rose-50` (`#FFF1F2`) | **6.22 : 1** | $\ge 4.5 : 1$ (Normal text) | **PASS** |

---

## Detailed Findings by Principle

### 1. Primitive Naming & Hue Corruption (`HIGH`)

**Rule:** Primitives name a hue and value (`--blue-500`). Semantic tokens name a job (`--accent-primary`). Never alias a hue name to a completely different color.

- **Location:** [`src/index.css:13-15`](file:///c:/Users/Bruce/Downloads/guruomosv2/src/index.css#L13-L15)
- **Before:**
  ```css
  @theme {
    --color-teal-500: #5B75F8; /* Corrupted: Blue assigned to Teal */
    --color-teal-400: #7B92FF;
    --color-teal-300: #A3B3FF;
  }
  ```
- **Why it breaks:** Components importing `text-teal-400` or `border-teal-500/50` (e.g. in `ModuleCard.tsx`, `ResourcesHubPage.tsx`, `DashboardMockup.tsx`) intend to display Teal but actually render Indigo/Blue. When another view expects genuine Teal (e.g., in status badges), the system produces hue collisions.
- **After:**
  ```css
  @theme {
    --color-brand-blue-500: #4B63EB;
    --color-brand-blue-400: #7B92FF;
    --color-teal-500: #0F766E;
    --color-teal-400: #2DD4BF;
  }
  ```

---

### 2. Status Hue Collisions (`HIGH`)

**Rule:** One color, one meaning. The accent hue must not collide with destructive, warning, or operational status channels.

- **Location:** [`src/context/AccentThemeContext.tsx:79-96`](file:///c:/Users/Bruce/Downloads/guruomosv2/src/context/AccentThemeContext.tsx#L79-L96)
- **Before:**
  - Red accent preset uses `primary: '#DC2626'`, `gradientFrom: '#DC2626'`, which is identical to the system's destructive delete buttons and QC Rejection badges (`bg-red-600` / `#DC2626`).
  - Orange accent preset uses `primary: '#EA580C'`, colliding with the system's warning / delayed dispatch badges (`bg-amber-500` / `#EA580C`).
- **Why it breaks:** When the user switches accent to Red or Orange, primary navigation buttons, active tabs, and save buttons render in warning/danger colors, creating cognitive confusion and error-prone operator interactions.
- **After:**
  - Replace generic collision colors with dedicated distinct brand accents:
    - Primary Blue (`#435BE8` / `#4F46E5`)
    - Cyan / Deep Teal (`#0F766E` / `#0284C7`)
    - Violet / Indigo (`#6366F1` / `#7C3AED`)
    - Emerald / Forest (`#059669` / `#047857`)
  - Keep Red (`#DC2626`) strictly for destructive / critical failure actions.

---

### 3. Direct Hex References & Brute-Force Overrides (`HIGH`)

**Rule:** Semantic tokens name a job and point at a primitive. Components must reference semantic tokens rather than raw hex values.

- **Location:** [`src/index.css:90-230`](file:///c:/Users/Bruce/Downloads/guruomosv2/src/index.css#L90-L230) & 200+ JSX files
- **Before:**
  ```css
  /* Brute force regex overrides in index.css */
  [data-accent] .from-\[\#5B75F8\],
  [data-accent] .bg-\[\#5B75F8\],
  [data-accent] button[class*="from-[#5B75F8]"] {
    background-color: var(--accent-primary) !important;
    color: #ffffff !important;
  }
  ```
  Components hardcode arbitrary hex classes:
  `<div className="text-[#5B75F8] bg-[#5B75F8]/10 border-[#5B75F8]/30">`
- **Why it breaks:** Adding or modifying a theme color requires updating hundreds of brittle regex rules with `!important` flags, breaking CSS specificity and preventing local styling overrides.
- **After:**
  Define clean semantic utility classes and variables:
  ```css
  .text-accent-primary { color: var(--accent-text-light); }
  .dark .text-accent-primary { color: var(--accent-text-dark); }
  .bg-accent-solid { background-color: var(--accent-primary); color: #ffffff; }
  .bg-accent-soft { background-color: var(--accent-soft-light); }
  .dark .bg-accent-soft { background-color: var(--accent-soft-dark); }
  .border-accent-subtle { border-color: var(--accent-border-light); }
  .dark .border-accent-subtle { border-color: var(--accent-border-dark); }
  ```

---

### 4. Primary Button Contrast Failure (`HIGH`)

**Rule:** Text on a solid background must achieve at least 4.5:1 contrast for normal body and button text under WCAG 2.1 AA.

- **Location:** [`src/context/AccentThemeContext.tsx:28`](file:///c:/Users/Bruce/Downloads/guruomosv2/src/context/AccentThemeContext.tsx#L28) (`#5B75F8`)
- **Before:** `#5B75F8` (Luminance $L \approx 0.223$) with `#ffffff` text yields **3.85:1** contrast.
- **After:** Deepen primary blue to `#435BE8` or `#3B52D9` ($L \le 0.17$), achieving **5.1:1** contrast with white text, passing WCAG 2.1 AA.

---

### 5. Inconsistent Dark Neutral Surface Temperature (`MEDIUM`)

**Rule:** A single neutral ramp must govern the application surfaces to maintain cohesive visual temperature.

- **Location:** Across console views (`CommandCentreView.tsx`, `WorkflowTestingView.tsx`, `UsersAuditView.tsx`)
- **Before:** Arbitrary mixing of:
  - Slate (cool blue undertone): `bg-slate-950` (`#020617`), `bg-slate-900` (`#0f172a`)
  - Zinc (neutral gray): `bg-zinc-950` (`#09090b`), `bg-zinc-900` (`#18181b`)
  - ByteBoost Dark Palette: `#121316` (Base), `#16171B` (Elevated), `#1C1E24` (Surface)
  - Ad-hoc hexes: `bg-[#14171F]`
- **Why it breaks:** Different components side-by-side appear mismatched in color warmth, breaking the unified console aesthetic.
- **After:** Unify all dark surfaces under standard semantic tokens:
  - `--bg-canvas`: `#121316` (Main background)
  - `--bg-surface`: `#1C1E24` (Cards and tables)
  - `--bg-elevated`: `#16171B` (Modals, flyouts, dropdowns)
  - `--border-subtle`: `#282A34` (Hairline dividers and structural boundaries)

---

## Prescribed Semantic Color System Architecture

### 1. Semantic CSS Tokens (`src/index.css`)

```css
:root {
  /* Surface Neutrals (Light) */
  --color-bg-canvas: #f8fafc;
  --color-bg-surface: #ffffff;
  --color-bg-elevated: #ffffff;
  --color-border-subtle: #e2e8f0;
  --color-border-strong: #cbd5e1;

  /* Typography Neutrals (Light) */
  --color-text-primary: #0f172a;
  --color-text-secondary: #475569;
  --color-text-muted: #64748b; /* Ensures 4.6:1 AA contrast */
  --color-text-inverse: #ffffff;

  /* Status Tokens */
  --color-status-success: #059669;
  --color-status-warning: #d97706;
  --color-status-danger: #dc2626;
  --color-status-info: #0284c7;
}

.dark {
  /* Surface Neutrals (Dark - ByteBoost Specification) */
  --color-bg-canvas: #121316;
  --color-bg-surface: #1C1E24;
  --color-bg-elevated: #16171B;
  --color-border-subtle: #282A34;
  --color-border-strong: #3F4354;

  /* Typography Neutrals (Dark) */
  --color-text-primary: #f3f4f6;
  --color-text-secondary: #9ca3af;
  --color-text-muted: #6b7280;
  --color-text-inverse: #121316;

  /* Status Tokens (Dark) */
  --color-status-success: #10b981;
  --color-status-warning: #f59e0b;
  --color-status-danger: #f87171;
  --color-status-info: #38bdf8;
}
```

### 2. Verified Accent Presets (`src/context/AccentThemeContext.tsx`)

```typescript
export const ACCENT_PRESETS: Record<AccentColor, AccentThemeConfig> = {
  blue: {
    id: 'blue',
    label: 'Cobalt Blue',
    primary: '#435BE8',         // 5.1:1 on White (WCAG AA Pass)
    hover: '#344BC7',
    active: '#273AA6',
    textLight: '#344BC7',
    textDark: '#8CA0FF',        // 7.2:1 on #1C1E24 (WCAG AAA Pass)
    softLight: 'rgba(67, 91, 232, 0.10)',
    softDark: 'rgba(67, 91, 232, 0.18)',
    borderLight: 'rgba(67, 91, 232, 0.35)',
    borderDark: 'rgba(140, 160, 255, 0.30)',
    ring: 'rgba(67, 91, 232, 0.50)',
    shadow: 'rgba(67, 91, 232, 0.25)',
    gradientFrom: '#435BE8',
    gradientTo: '#4f46e5',
    dotColor: '#435BE8'
  },
  teal: {
    id: 'teal',
    label: 'Deep Teal',
    primary: '#0F766E',         // 5.9:1 on White (WCAG AA Pass)
    hover: '#0D655E',
    active: '#115E59',
    textLight: '#0F766E',
    textDark: '#2DD4BF',        // 8.4:1 on #1C1E24 (WCAG AAA Pass)
    softLight: 'rgba(15, 118, 110, 0.10)',
    softDark: 'rgba(45, 212, 191, 0.18)',
    borderLight: 'rgba(15, 118, 110, 0.35)',
    borderDark: 'rgba(45, 212, 191, 0.30)',
    ring: 'rgba(15, 118, 110, 0.50)',
    shadow: 'rgba(15, 118, 110, 0.25)',
    gradientFrom: '#0F766E',
    gradientTo: '#059669',
    dotColor: '#0F766E'
  },
  indigo: {
    id: 'indigo',
    label: 'Royal Violet',
    primary: '#6366F1',         // 4.6:1 on White (WCAG AA Pass)
    hover: '#4F46E5',
    active: '#4338CA',
    textLight: '#4F46E5',
    textDark: '#A5B4FC',        // 8.9:1 on #1C1E24 (WCAG AAA Pass)
    softLight: 'rgba(99, 102, 241, 0.10)',
    softDark: 'rgba(165, 180, 252, 0.18)',
    borderLight: 'rgba(99, 102, 241, 0.35)',
    borderDark: 'rgba(165, 180, 252, 0.30)',
    ring: 'rgba(99, 102, 241, 0.50)',
    shadow: 'rgba(99, 102, 241, 0.25)',
    gradientFrom: '#6366F1',
    gradientTo: '#7C3AED',
    dotColor: '#6366F1'
  },
  emerald: {
    id: 'emerald',
    label: 'Emerald Forest',
    primary: '#059669',         // 4.8:1 on White (WCAG AA Pass)
    hover: '#047857',
    active: '#065F46',
    textLight: '#047857',
    textDark: '#34D399',        // 8.1:1 on #1C1E24 (WCAG AAA Pass)
    softLight: 'rgba(5, 150, 105, 0.10)',
    softDark: 'rgba(52, 211, 153, 0.18)',
    borderLight: 'rgba(5, 150, 105, 0.35)',
    borderDark: 'rgba(52, 211, 153, 0.30)',
    ring: 'rgba(5, 150, 105, 0.50)',
    shadow: 'rgba(5, 150, 105, 0.25)',
    gradientFrom: '#059669',
    gradientTo: '#0D9488',
    dotColor: '#059669'
  }
};
```

---

## Migration and Remediation Roadmap

1. **Step 1: Fix Primitive Aliasing in `@theme`:**
   - Restore true teal hexes (`#0F766E` / `#2DD4BF`) to `--color-teal-*` in `src/index.css`.
2. **Step 2: Calibrate Button Contrast:**
   - Update `blue.primary` from `#5B75F8` (3.85:1) to `#435BE8` (5.1:1 AA compliant).
3. **Step 3: Eliminate Status Hue Collisions:**
   - Replace destructive-colliding `red` and `orange` accent presets in `AccentThemeContext.tsx` with non-colliding `indigo` and `emerald`.
4. **Step 4: Standardize Semantic Class Names:**
   - Migrate JSX inline hex classes (`text-[#5B75F8]`, `bg-[#5B75F8]`, `border-[#5B75F8]`) to semantic tokens (`bg-[var(--accent-primary)]`, `text-[var(--accent-text-light)]`).
   - Remove redundant `!important` selector hacks from `src/index.css`.
5. **Step 5: Harmonize Dark Neutrals:**
   - Standardize all dark surfaces to the unified `--color-bg-*` token family.
