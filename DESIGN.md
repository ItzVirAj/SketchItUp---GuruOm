# GuruOm Owner OS — Design System & Submodule UI Specification

> **Target Audience:** AI Engineering Agents & Frontend Developers  
> **Reference Canonical Implementations:**  
> - Orders Submodule: `src/components/console/views/OrdersView.tsx`  
> - Inventory Submodule: `src/components/console/views/InventoryView.tsx`  
> - App Frame & Layout: `src/components/console/ConsoleContainer.tsx`, `ConsoleSidebar.tsx`, `ConsoleHeader.tsx`

---

## 1. System Philosophy & Aesthetic DNA

GuruOm Owner OS employs an **Apple macOS Pro / Hardware Command Console** visual architecture.
The design balances **calm, tactile industrial elegance** with **high-density, mission-critical factory telemetry**.

### Core Tenets
1. **True Dual-Mode Mastery (Never Inverted Colors)**:
   - **Light Mode**: Luminous Apple Blue (`#155dfc`) vertical hero gradient + frosted silver/neutral aluminum command surfaces + crisp white-to-slate table cards.
   - **Dark Mode**: Rich true black gradients (`#111318` via `#090a0d` to `#020204`) with hairline specular highlights + recessed `bg-black/60` inputs + subtle white-tinted gradient row highlights.
2. **San Francisco Typographic Hierarchy**:
   - Zero illegible micro-text. Clear distinction between **Display Titles (32px font-black)**, **Table Titles (16px font-black)**, **Column Headers (11px font-bold uppercase)**, and **Monospace Figures (tabular nums for currency, parts, quantities)**.
3. **Apple Elevated Floating Row-Card Tables**:
   - Tables are not bare borders. Every table lives inside a `rounded-3xl` glass container with an integrated queue title bar, frosted gradient `thead`, and alternating row cards with gradient hover glow.
4. **Tactile Capsule Controls & Squircle Icon Tiles**:
   - Interactive triggers use Apple capsule shapes (`rounded-full`) or squircle tiles (`rounded-2xl` / `rounded-xl`) with active spring response (`active:scale-95`).

---

## 2. Master Color Tokens & Gradients

### 2.1 Hero Banner Surface

| Element | Light Mode Tokens / Classes | Dark Mode Tokens / Classes |
| :--- | :--- | :--- |
| **Outer Section Container** | `border-[#155dfc]/30 bg-gradient-to-b from-[#1b64ff] via-[#155dfc] to-[#0f52dc] text-white shadow-[0_16px_40px_rgba(21,93,252,0.25)] rounded-2xl` | `border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl` |
| **Status Eyebrow Pill** | `bg-white/20 border border-white/30 backdrop-blur-md text-white shadow-xs rounded-full px-3 py-1 text-xs font-bold` | `bg-white/10 border border-white/15 text-white rounded-full px-3 py-1 text-xs font-bold` |
| **Pulsating Dot** | `bg-emerald-400 animate-pulse h-2 w-2 rounded-full` | `bg-emerald-400 animate-pulse h-2 w-2 rounded-full` |
| **Hero CTA Pill Button** | `bg-white hover:bg-slate-50 text-[#155dfc] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)] rounded-full px-5 py-3 text-xs sm:text-sm font-bold active:scale-95` | `bg-white hover:bg-slate-100 text-slate-950 shadow-black/40 rounded-full px-5 py-3 text-xs sm:text-sm font-bold active:scale-95` |
| **Metric Strip Container** | `border-t border-white/20 bg-white/[0.06] backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` | `border-t border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` |
| **Metric Cell Divider** | `lg:border-l border-white/20` | `lg:border-l border-white/10` |
| **Metric Squircle Icon Tile** | `h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs` (solid color backgrounds: white, emerald, amber, purple, blue) | `h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs` (solid color backgrounds: blue-600, emerald-500, amber-500, rose-500) |

---

### 2.2 Apple 2-Tier Command Deck (Toolbar / Filters)

| Element | Light Mode Tokens / Classes | Dark Mode Tokens / Classes |
| :--- | :--- | :--- |
| **Deck Outer Frame** | `rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_2px_12px_rgba(0,0,0,0.03),inset_0_1px_0_0_rgba(255,255,255,0.9)] p-3.5 space-y-3 backdrop-blur-xl` | `rounded-2xl border border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)] p-3.5 space-y-3 backdrop-blur-xl` |
| **Segmented Rail Track** | `inline-flex items-center p-1 rounded-xl border border-slate-200/80 bg-slate-200/50 shadow-inner text-xs overflow-x-auto max-w-full` | `inline-flex items-center p-1 rounded-xl border border-white/10 bg-black/60 text-xs overflow-x-auto max-w-full` |
| **Segmented Tab (Active)** | `bg-white text-slate-900 shadow-xs border border-slate-200/80 px-3 py-1.5 rounded-lg text-xs font-bold transition-all` | `bg-white/15 text-white shadow-xs border border-white/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-all` |
| **Segmented Tab (Inactive)**| `text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold transition-all` | `text-slate-400 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all` |
| **Segmented Count Pill** | `text-[10px] font-mono px-1.5 py-0.2 rounded-full` (`bg-slate-100 text-slate-800` active, `bg-slate-300/60 text-slate-600` inactive) | `text-[10px] font-mono px-1.5 py-0.2 rounded-full` (`bg-white/20 text-white` active, `bg-white/5 text-slate-400` inactive) |
| **Spotlight Search Input** | `flex h-10 min-w-[280px] flex-1 items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white text-slate-900 shadow-2xs focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60 px-3` | `flex h-10 min-w-[280px] flex-1 items-center gap-2.5 rounded-xl border border-white/10 bg-black/60 text-white focus-within:border-white/30 focus-within:bg-black/90 px-3` |
| **Filter Dropdowns (`select`)** | `h-10 rounded-xl border border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 px-3 text-xs font-semibold outline-none cursor-pointer` | `h-10 rounded-xl border border-white/10 bg-black/60 text-slate-200 hover:bg-black/80 px-3 text-xs font-semibold outline-none cursor-pointer` |
| **View Toggle (Table/Grid)** | `flex h-10 items-center rounded-xl border border-slate-200/90 bg-slate-200/70 p-0.5 shadow-inner` | `flex h-10 items-center rounded-xl border border-white/10 bg-black/60 p-0.5` |

---

### 2.3 Desktop Data Tables (`hidden md:block`)

| Element | Light Mode Tokens / Classes | Dark Mode Tokens / Classes |
| :--- | :--- | :--- |
| **Outer Table Container** | `overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,1)]` | `overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]` |
| **Table Queue Header Bar** | `flex items-center justify-between border-b border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-white/60 to-slate-50/90 px-6 py-4.5` | `flex items-center justify-between border-b border-white/[0.08] bg-gradient-to-r from-black/60 via-black/30 to-black/60 px-6 py-4.5` |
| **Header Icon Squircle** | `flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-2xs` | `flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white border border-white/10 shadow-xs` |
| **Thead Row (`thead tr`)** | `border-b border-slate-200/90 bg-gradient-to-b from-slate-100/90 to-slate-50/90 text-slate-600 text-[11px] font-bold uppercase tracking-wider` | `border-b border-white/[0.07] bg-gradient-to-b from-black/80 to-black/60 text-slate-400 text-[11px] font-bold uppercase tracking-wider` |
| **Column Headers (`th`)** | `py-4 px-6 font-bold uppercase text-[11px] tracking-wider` | `py-4 px-6 font-bold uppercase text-[11px] tracking-wider` |
| **Tbody Container (`tbody`)** | `divide-y divide-slate-200/70 text-xs font-sans` | `divide-y divide-white/[0.04] text-xs font-sans` |
| **Table Row (`tbody tr`)** | `group transition-all duration-150 even:bg-slate-50/50 hover:bg-gradient-to-r hover:from-blue-500/[0.05] hover:via-indigo-500/[0.03] hover:to-transparent` | `group transition-all duration-150 even:bg-white/[0.015] hover:bg-gradient-to-r hover:from-white/[0.06] hover:via-white/[0.02] hover:to-transparent` |
| **Table Cell (`td`)** | `py-4 px-6 align-middle` | `py-4 px-6 align-middle` |
| **Inline Action Buttons** | `px-3 py-1.5 rounded-xl font-mono text-xs font-bold border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 transition-all cursor-pointer` | `px-3 py-1.5 rounded-xl font-mono text-xs font-bold border border-white/15 bg-white/10 hover:bg-white/15 text-white transition-all cursor-pointer` |

---

### 2.4 Status Badge System

Always render status badges as **Apple Capsule Pills** (`rounded-full px-2.5 py-1 text-[10px] font-mono font-bold uppercase border flex items-center gap-1.5`):

```tsx
// Status Pill Architecture:
// Container: inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-tight border
// Colored Dot: w-1.5 h-1.5 rounded-full

// 1. Success / On Hand / Balanced / Verified / Complete
className={isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}
dot="bg-emerald-500"

// 2. Alert / Shortage / Rejected / Overdue / Critical Discrepancy
className={isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200'}
dot="bg-rose-500 (with animate-ping halo)"

// 3. Warning / Reorder Soon / Due Soon / Pending / Inspection Hold
className={isDarkMode ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'}
dot="bg-amber-500"

// 4. In Production / Fresh / Issued / Active
className={isDarkMode ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200'}
dot="bg-blue-500"

// 5. Special Subtype / Blanket Calloff / Quality Gate
className={isDarkMode ? 'bg-purple-500/15 text-purple-300 border-purple-500/30' : 'bg-purple-50 text-purple-700 border-purple-200'}
dot="bg-purple-500"
```

---

## 3. Typography & Sizing Standards

| Role | Size | Font Family | Weight | Tracking / Leading | Example Use Case |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display Title** | `text-3xl sm:text-[32px]` | Sans (`Inter`, `Plus Jakarta Sans`, system) | `font-black` (900) | `tracking-tight leading-tight text-white` | "Customer Purchase Orders", "Inventory & Store Ledger" |
| **Table Queue Title** | `text-base` (16px) | Sans | `font-black` (900) | `tracking-tight text-slate-900 dark:text-white` | "Order Lifecycle Queue", "Store Inventory Master" |
| **Hero Eyebrow Pill** | `text-xs` (12px) | Sans | `font-bold` (700) | `tracking-wide uppercase` | "Active Order Book", "Store & Material Telemetry" |
| **Metric Large Number** | `text-2xl sm:text-[26px]` | Sans / Tabular | `font-black` (900) | `tracking-tight tabular-nums text-white` | `₹1,24,500`, `450`, `18` |
| **Metric Label** | `text-xs` (12px) | Sans | `font-bold` (700) | `uppercase tracking-wider text-white/85` | "Total SKUs", "Pipeline Value" |
| **Metric Sub-detail** | `text-xs` (12px) | Sans | `font-medium` (500) | `text-white/90 truncate` | "Active catalog parts", "Under inspection" |
| **Table Column Header**| `text-[11px]` | Sans | `font-bold` (700) | `uppercase tracking-wider text-slate-600 dark:text-slate-400` | "Part Code", "Description", "Available" |
| **Table Column 1 Code**| `text-sm` (14px) | Mono (`JetBrains Mono`, `ui-monospace`) | `font-black` (900) | `font-mono tracking-tight text-slate-900 dark:text-white` | `FG-HEX-001`, `PO-2026-089` |
| **Table Column 1 Subtext**| `text-xs` (12px) | Sans | `font-bold` (700) | `text-slate-800 dark:text-slate-200 truncate mt-1` | `Part #H102`, `Supplier Acme Ltd` |
| **Currency & Balances**| `text-xs` (12px) | Mono | `font-bold` (700) | `font-mono tabular-nums` | `₹45,000.00`, `1,250.00 Nos` |
| **Secondary Metadata** | `text-[10px]` or `text-[11px]`| Mono / Sans | `font-medium` (500) | `text-slate-400 dark:text-slate-500` | "0 Lines", "14:32 23-Sep" |

---

## 4. Spacing, Radii & Geometry Grid

```
Border Radius Scale:
- Table Outer Shell: rounded-3xl (24px)
- Hero Section:       rounded-2xl (16px)
- Command Deck:       rounded-2xl (16px)
- Category Bar:       rounded-2xl (16px)
- Icon Tiles:         rounded-2xl (16px) [h-11 w-11 or h-10 w-10]
- Segmented Rail:     rounded-xl  (12px) [outer], rounded-lg (8px) [inner button]
- Inputs & Selects:   rounded-xl  (12px) [h-10]
- Primary CTA & Pills: rounded-full (9999px)

Vertical Gap Rhythm:
- Between Hero, Command Deck, and Table Container: space-y-4 (16px)
- Inside Command Deck (Tier 1 to Tier 2):         space-y-3 (12px)
- Inside Table Header to Scrollable Table:        flush border-b divider
```

---

## 5. Reusable Component Blueprints (Copy & Paste for New Submodules)

### 5.1 Hero Header & 4-Column KPI Strip
Replace `HeroIcon`, `Title`, `Eyebrow`, `Description`, and metrics with submodule specifics:

```tsx
<div className="hidden md:block space-y-4">
  {/* Apple macOS Frosted Header & Integrated Metrics */}
  <section className={`overflow-hidden rounded-2xl border transition-all ${
    isDarkMode
      ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] text-white shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
      : 'border-[#155dfc]/30 bg-gradient-to-b from-[#1b64ff] via-[#155dfc] to-[#0f52dc] text-white shadow-[0_16px_40px_rgba(21,93,252,0.25)]'
  }`}>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-6 py-6 sm:py-7">
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
            isDarkMode
              ? 'bg-white/10 border border-white/15 text-white'
              : 'bg-white/20 border border-white/30 backdrop-blur-md text-white shadow-xs'
          }`}>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>[Submodule Eyebrow Telemetry]</span>
          </span>
          <span className="text-sm font-semibold text-white/80">•</span>
          <span className="text-xs sm:text-sm font-semibold text-white/95">
            {records.length} Active Records
          </span>
        </div>

        <h1 className="text-3xl sm:text-[32px] font-black tracking-tight text-white leading-tight">
          [Submodule Main Title]
        </h1>

        <p className="text-xs sm:text-sm text-white/95 font-medium leading-relaxed max-w-2xl">
          [Submodule descriptive contextual subtitle explaining the governed process].
        </p>
      </div>

      {/* Primary Action Capsule */}
      <button
        onClick={handlePrimaryAction}
        className={`inline-flex items-center gap-2 px-5 py-3 rounded-full text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
          isDarkMode
            ? 'bg-white hover:bg-slate-100 text-slate-950 shadow-black/40'
            : 'bg-white hover:bg-slate-50 text-[#155dfc] shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]'
        }`}
      >
        <Plus className="h-4 w-4 stroke-[3]" />
        <span>New [Action Label]</span>
      </button>
    </div>

    {/* Integrated 4-Column Metric Strip */}
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-t ${
      isDarkMode
        ? 'border-white/10 bg-gradient-to-b from-black/40 to-black/70 backdrop-blur-md'
        : 'border-white/20 bg-white/[0.06] backdrop-blur-sm'
    }`}>
      {metrics.map((metric, index) => {
        const MetricIcon = metric.icon;
        return (
          <div
            key={metric.label}
            className={`flex items-center gap-4 px-6 py-5 transition-all ${
              index > 0 ? (isDarkMode ? 'lg:border-l border-white/10' : 'lg:border-l border-white/20') : ''
            }`}
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${metric.iconBg} ${metric.iconColor}`}>
              <MetricIcon className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-white/85">
                {metric.label}
              </div>
              <div className="text-2xl sm:text-[26px] font-black tracking-tight text-white tabular-nums my-0.5 leading-tight">
                {metric.value}
              </div>
              <div className="text-xs font-medium text-white/90 truncate">
                {metric.detail}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </section>
```

---

### 5.2 Apple 2-Tier Command Deck (Toolbar / Filters)

```tsx
  {/* Apple macOS Style Pro Command Deck / Filters */}
  <div className={`rounded-2xl border p-3.5 space-y-3 transition-all backdrop-blur-xl ${
    isDarkMode
      ? 'border-white/10 bg-gradient-to-b from-[#111318] via-[#090a0d] to-[#020204] shadow-[0_8px_28px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
      : 'border-slate-200/80 bg-gradient-to-b from-white/95 via-slate-50/90 to-slate-100/70 shadow-[0_2px_12px_rgba(0,0,0,0.03),inset_0_1px_0_0_rgba(255,255,255,0.9)]'
  }`}>
    {/* Top Tier: Apple Segmented Navigation / Filter Rail */}
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className={`inline-flex items-center p-1 rounded-xl border text-xs overflow-x-auto max-w-full ${
        isDarkMode ? 'border-white/10 bg-black/60' : 'border-slate-200/80 bg-slate-200/50 shadow-inner'
      }`}>
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === t.id
                ? isDarkMode ? 'bg-white/15 text-white shadow-xs border border-white/10' : 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>{t.label}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeTab === t.id
                ? isDarkMode ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-800'
                : isDarkMode ? 'bg-white/5 text-slate-400' : 'bg-slate-300/60 text-slate-600'
            }`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Record Counter & Reset Action */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <span className="hidden sm:inline">Showing <strong className="text-slate-900 dark:text-white">{filteredRecords.length}</strong> records</span>
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            <span>Clear Search</span>
          </button>
        )}
      </div>
    </div>

    {/* Bottom Tier: Apple Spotlight Search & Dropdown Filters */}
    <div className="flex items-center gap-2.5 flex-wrap">
      <div className={`flex h-10 min-w-[280px] flex-1 items-center gap-2.5 rounded-xl border px-3 transition-all ${
        isDarkMode
          ? 'border-white/10 bg-black/60 text-white focus-within:border-white/30 focus-within:bg-black/90'
          : 'border-slate-200/90 bg-white text-slate-900 shadow-2xs focus-within:border-slate-400 focus-within:ring-2 focus-within:ring-slate-200/60'
      }`}>
        <Search className="h-4 w-4 shrink-0 text-slate-400" />
        <input
          type="text"
          placeholder="Search by ID, name, code, reference..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-full w-full bg-transparent text-xs font-medium outline-none placeholder:text-slate-400"
        />
        <span className="hidden sm:inline-block text-[10px] font-mono text-slate-400 border border-slate-200 dark:border-white/10 px-1.5 py-0.5 rounded bg-slate-50 dark:bg-white/5">
          ⌘F
        </span>
        {searchQuery && (
          <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5 cursor-pointer">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <select
        value={categoryFilter}
        onChange={(e) => setCategoryFilter(e.target.value)}
        className={`h-10 rounded-xl border px-3 text-xs font-semibold outline-none cursor-pointer transition-all ${
          isDarkMode ? 'border-white/10 bg-black/60 text-slate-200 hover:bg-black/80' : 'border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:bg-slate-50'
        }`}
      >
        <option value="ALL">All Categories</option>
        {/* Submodule options */}
      </select>
    </div>
  </div>
```

---

### 5.3 Apple Rounded-3xl Data Table Container

```tsx
  {/* Desktop Table View */}
  <div className={`overflow-hidden rounded-3xl border transition-all ${
    isDarkMode
      ? 'border-white/[0.08] bg-gradient-to-b from-[#111318] via-[#08090c] to-[#010203] shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
      : 'border-slate-200/90 bg-gradient-to-b from-white via-slate-50/40 to-[#f6f8fc] shadow-[0_16px_40px_rgba(15,23,42,0.05),inset_0_1px_0_0_rgba(255,255,255,1)]'
  }`}>
    {/* Table Queue Header Bar */}
    <div className={`flex items-center justify-between border-b px-6 py-4.5 transition-all ${
      isDarkMode
        ? 'border-white/[0.08] bg-gradient-to-r from-black/60 via-black/30 to-black/60'
        : 'border-slate-200/80 bg-gradient-to-r from-slate-50/90 via-white/60 to-slate-50/90'
    }`}>
      <div className="flex items-center gap-3.5">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-xs ${
          isDarkMode ? 'bg-white/10 text-white border border-white/10' : 'bg-slate-900 text-white shadow-2xs'
        }`}>
          <QueueIcon className="h-5 w-5 stroke-[2]" />
        </div>
        <div>
          <div className="text-base font-black tracking-tight text-slate-900 dark:text-white">
            [Queue Title]
          </div>
          <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
            [Queue descriptive subtitle explaining data validation & lifecycle]
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <span className={`rounded-full border px-3 py-1 font-mono text-xs font-bold tracking-tight ${
          isDarkMode ? 'border-white/10 bg-black/60 text-slate-300' : 'border-slate-200 bg-white text-slate-700 shadow-2xs'
        }`}>
          {filteredRecords.length} records
        </span>
      </div>
    </div>

    {/* Table Grid */}
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse font-sans">
        <thead>
          <tr className={`border-b text-[11px] font-bold uppercase tracking-wider transition-all ${
            isDarkMode
              ? 'border-white/[0.07] bg-gradient-to-b from-black/80 to-black/60 text-slate-400'
              : 'border-slate-200/90 bg-gradient-to-b from-slate-100/90 to-slate-50/90 text-slate-600'
          }`}>
            <th className="py-4 px-6">ID / Code</th>
            <th className="py-4 px-6">Title / Name</th>
            <th className="py-4 px-6">Category</th>
            <th className="py-4 px-6 text-right">Numeric Metric</th>
            <th className="py-4 px-6 text-center">Status</th>
            <th className="py-4 px-6 text-center">Action</th>
          </tr>
        </thead>
        <tbody className={`divide-y text-xs transition-colors ${
          isDarkMode ? 'divide-white/[0.04]' : 'divide-slate-200/70'
        }`}>
          {filteredRecords.map((item) => (
            <tr
              key={item.id}
              className={`group transition-all duration-150 ${
                isDarkMode
                  ? 'even:bg-white/[0.015] hover:bg-gradient-to-r hover:from-white/[0.06] hover:via-white/[0.02] hover:to-transparent'
                  : 'even:bg-slate-50/50 hover:bg-gradient-to-r hover:from-blue-500/[0.05] hover:via-indigo-500/[0.03] hover:to-transparent'
              }`}
            >
              <td className="py-4 px-6 font-bold font-mono text-slate-900 dark:text-white">
                {item.code}
              </td>
              <td className={`py-4 px-6 font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
                {item.name}
              </td>
              <td className="py-4 px-6 text-slate-500 dark:text-slate-400 font-mono">
                {item.category}
              </td>
              <td className="py-4 px-6 text-right font-mono font-bold text-slate-900 dark:text-white">
                {item.formattedValue}
              </td>
              <td className="py-4 px-6 text-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{item.status}</span>
                </span>
              </td>
              <td className="py-4 px-6 text-center">
                <button
                  onClick={() => handleInspect(item)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                    isDarkMode
                      ? 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                  }`}
                >
                  Inspect
                </button>
              </td>
            </tr>
          ))}

          {filteredRecords.length === 0 && (
            <tr>
              <td colSpan={6} className="py-12 text-center text-slate-400 font-mono text-xs">
                No records matching your search or filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
```

---

### 5.4 Discrete Multi-Segment Precision Stepper
Used in `OrdersView` for the 8-Gate Lifecycle progression. Can be adapted for Job Card operations or QC steps:

```tsx
<div className="space-y-1.5 min-w-[200px] max-w-[280px]">
  {/* Status Header Pill */}
  <div className="flex items-center justify-between gap-1 text-[11px]">
    <span className="inline-flex items-center gap-1.5 font-bold truncate text-slate-800 dark:text-slate-200">
      <span className={`h-1.5 w-1.5 rounded-full ${stepInfo.badgeDot}`} />
      <span className="truncate">{stepInfo.statusLabel}</span>
    </span>
    <span className="font-mono text-[10px] text-slate-400 shrink-0">
      Gate {activeStep + 1}/{totalSteps}
    </span>
  </div>

  {/* Discrete Segments Rail (NO blue halo around active stage) */}
  <div className="flex items-center gap-1">
    {steps.map((step, idx) => {
      const isPast = idx < activeStep;
      const isCurrent = idx === activeStep;

      return (
        <div
          key={step.id}
          className={`h-2 flex-1 rounded-sm transition-all ${
            isPast
              ? 'bg-blue-600'
              : isCurrent
              ? 'bg-blue-600 font-bold'
              : isDarkMode
              ? 'bg-white/10'
              : 'bg-slate-200/90'
          }`}
          title={`${idx + 1}. ${step.label}`}
        />
      );
    })}
  </div>
</div>
```

---

## 6. Checklist for Any New or Refactored Submodule

Before considering any submodule UI complete, verify:
- [ ] **Dual Theme Support**: Tested in both Dark mode (true black gradients) and Light mode (luminous blue hero + frosted silver deck).
- [ ] **Hero Banner**: Has the 32px display title, live pulsating eyebrow pill, and bottom 4-column KPI strip.
- [ ] **Command Deck**: Contains Tier 1 (Segmented Module Tabs with counts) and Tier 2 (Spotlight Search with `⌘F` + Parametric Selects).
- [ ] **Table Architecture**: Encapsulated in `rounded-3xl` glass container with Queue Header bar (icon squircle + title + subtitle + count badge).
- [ ] **Table Rows**: Uses alternating tint (`even:bg-slate-50/50` in light; `even:bg-white/[0.015]` in dark) and horizontal gradient hover (`hover:from-blue-500/[0.05]` in light; `hover:from-white/[0.06]` in dark).
- [ ] **Data Figures**: Tabular currency (`₹`), parts, codes, and quantities are set with `font-mono font-bold`.
- [ ] **Badges**: Statuses use Apple capsule pill design (`rounded-full`) with 1.5px pulsating/solid colored dots.
- [ ] **Zero Redundancy**: No unnecessary green "Credit OK" or repetitive filler tags.
- [ ] **Typecheck Clean**: Runs `npx tsc --noEmit` and `npx tsc -p tsconfig.backend.json --noEmit` with **0 errors**.
