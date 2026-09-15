---
name: GuruOm Owner OS
description: Precision manufacturing enterprise operating system & factory command center
colors:
  primary: "#3B82F6"
  primary-hover: "#2563EB"
  primary-dark: "#60A5FA"
  neutral-bg-dark: "#101317"
  neutral-surface-dark: "#171B1F"
  neutral-card-dark: "#262A30"
  neutral-border-dark: "#343A40"
  neutral-bg-light: "#F4F7FA"
  neutral-surface-light: "#FFFFFF"
  neutral-border-light: "#D4D9E0"
  success: "#10B981"
  warning: "#F59E0B"
  danger: "#F43F5E"
  accent-brand: "#0A7E58"
typography:
  display:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "'JetBrains Mono', monospace"
    fontWeight: 500
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  xl: "24px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
---

# Design System

## Overview

GuruOm Owner OS (Stratum) delivers high-density, mission-critical workspace intelligence for precision CNC manufacturing. The interface balances calm, industrial command-center readability with rigorous operational status distinction. Dark mode serves as the primary factory command console, supported by a crisp Frost White light mode.

## Colors

The palette derives from a custom slate and carbon bedrock, paired with authoritative primary electric and precision status indicators:

- **Carbon & Dark Base**: `#101317` (canvas bedrock), `#171B1F` (structural panels), `#262A30` (elevated cards), `#343A40` (borders).
- **Frost & Light Base**: `#F4F7FA` (canvas bedrock), `#FFFFFF` (elevated cards), `#D4D9E0` (structural hairline borders).
- **Primary & Accent Tiers**:
  - Electric Blue (`#3B82F6` light / `#60A5FA` dark): default system primary action.
  - Synthesis Teal / Brand (`#0A7E58` light / `#34D399` dark): verified operational status and executive KPIs.
- **Factory Status Vocabulary**:
  - **Emerald (`#10B981`)**: QC Pass, GRN verified, Dispatch approved.
  - **Amber (`#F59E0B`)**: In-production, shortage pending, approval required.
  - **Rose (`#F43F5E`)**: Machine breakdown, QC rejection, overdue payment, safety trip.

## Typography

- **Primary Sans**: `Plus Jakarta Sans`, falling back to Apple SF / Segoe UI. Clean geometric letterforms optimized for tight numeric tables and form grids.
- **Code & Numbers**: `JetBrains Mono`. Monospace digits for part numbers, batch IDs, tolerances (e.g. `±0.005mm`), quantities, and timestamps.
- **Scale**:
  - Display / Hero: `24px - 30px` (font-bold, tracking-tight).
  - Section Headers: `14px - 18px` (font-semibold).
  - Body Text: `13px - 14px` (font-normal).
  - Micro Badges & Labels: `10px - 11px` (font-semibold, tracking-wider, uppercase).

## Layout

- **Desktop (1024px+)**: Fixed top navigation / command header, multi-pane bento grids, sticky table heads, and collapsible detail drawers.
- **Mobile & Tablet**: Single-column vertical stream anchored by a floating liquid-glass navigation dock.
- **Rhythm**: 8px modular baseline grid with consistent 16px–24px outer panel gutters.

## Elevation & Depth

- **Tonal Layering**: Avoids harsh drop-shadows; elevation is achieved through subtle border hairlines (`border-white/10` in dark, `border-slate-200` in light) and tinted backdrop blurs (`backdrop-blur-2xl`).
- **Surface Elevation**:
  - Base canvas: flat bedrock.
  - Cards & Bento cells: `bg-slate-900/60` (dark) or `bg-white` (light) with 1px border.
  - Modals & Floating Drawers: `backdrop-blur-3xl`, specular top-border highlight (`shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]`), and deep ambient diffusion.

## Shapes

- Small utility buttons / tags: `rounded-lg` (8px).
- Content cards & table containers: `rounded-2xl` (16px).
- Modals, drawers, and bento tiles: `rounded-3xl` (24px).
- Status badges and pills: `rounded-full`.

## Components

- **Action Buttons**: Solid primary gradient with subtle specular inset border, active scale feedback (`active:scale-95`).
- **Data Tables**: Striped or hairline-divided row items with hover state (`hover:bg-slate-800/40`), right-aligned numeric data, and inline action clusters.
- **Status Pills**: Icon-plus-label composite badges with tinted background (e.g. `bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`).
- **Notification Drawer**: Multi-tab category selector, live unread counter, sound toggle, and severity-tinted cards.

## Do's and Don'ts

### Do
- Always pair status colors with an icon or clear text (e.g. AlertOctagon for critical errors).
- Use monospace numbers for currency, parts, quantities, and dates.
- Ensure all interactive elements provide active scale (`active:scale-95` or `0.98`) and smooth 150ms transitions.
- Maintain WCAG AA contrast against `#101317` (dark) and `#F4F7FA` (light).

### Don't
- Don't use raw pure saturated colors (`#FF0000`, `#0000FF`) — use curated palette anchors.
- Don't animate layout geometry (width, height, margin) — animate transform and opacity.
- Don't hide critical factory alerts behind nested submenus.
