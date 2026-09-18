# Product

## Platform

web

## Users

- **Primary User**: Factory Owner / Managing Director (strategic oversight, approval queues, financial health, margin monitoring, company profile configuration).
- **Secondary Users / Department Roles**:
  - **Sales & Order Desk**: PO booking, drawing revision confirmation, customer communications.
  - **Production Planner & Plant Head**: Routing, job cards, CNC schedule, material shortages, shift logs.
  - **Store Keeper & Inventory Manager**: Raw materials, GRN inspection, finished goods intake, stock reconciliation.
  - **Quality Control (QC & PDI)**: In-process dimensional inspection, final pre-dispatch inspection (PDI), rejection logs.
  - **Logistics & Dispatch**: Outwork challans, delivery notes, packing lists, vehicle dispatch logs.
  - **Accounts & Finance**: GST e-invoices, vendor bills, payment matching, receivables/payables.

## Product Purpose

GuruOm **Owner OS** is a single-tenant manufacturing ERP and operational command center tailored specifically for precision job-shops (precision brass, turned parts, CNC components). Its purpose is to enforce discipline, eliminate inventory blind spots, and streamline the complete manufacturing lifecycle from initial customer PO and technical drawing verification to dispatch and GST settlement.

Success means zero unapproved drawing changes making it to CNC spindles, zero orders shipped without passing QC/PDI gates, transparent shopfloor job progress, and real-time operational metrics for the factory owner.

## Positioning

Unlike generic SaaS ERPs (SAP, NetSuite) which are overburdened with bureaucracy, or light inventory software (Tally, Zoho) that lack real manufacturing floor controls, GuruOm Owner OS pairs high-density desktop workstation efficiency with strict, hard-gated operational workflows (job cards, drawings, inspections, gate passes) purpose-built for Indian precision engineering SMBs.

## Operating Context

- **Environments**: High-paced factory office, QC lab desk, and noisy shopfloor supervisor tablet/mobile terminals.
- **Display Paradigms**: High-density desktop command center (1920x1080 multi-pane workflows) combined with responsive mobile web dock for on-the-floor approvals and quick status checks.
- **Core Rituals**: Morning order backlog review, real-time breakdown & QC alert resolution, shift handover logs, end-of-day dispatch and GST invoice sign-offs.

## Capabilities and Constraints

- **Confirmed Capabilities**:
  - Centralized Command Center with metric bentos, pipeline status, and real-time live event feed.
  - Department modules: Masters, Orders, BOM, GRN, Inventory, Production (Job Cards & Logs), QC & PDI, Outwork, Finished Goods, Dispatch, Invoices, Vendor Bills, HR (Employees, Meetings, Tasks).
  - Multi-tier granular RBAC matrix with role-specific views, permission-gated action buttons, and audit trail logging.
  - In-app notification drawer with category tabs, sound toggles, and live operational push events.
- **Constraints**:
  - Same-origin full-stack architecture (Node/Express API + Vite React SPA).
  - In-memory JWT access token paired with secure httpOnly cookie session refresh.
  - Zero-placeholder rule: all UI metrics and forms must bind to authentic business models and database contracts.

## Brand Commitments

- **Name**: GuruOm Owner OS / Stratum.
- **Tone**: Precision-crafted, industrial, authoritative, calm, high-efficiency.
- **Visual Baseline**: High-contrast, clean dark/light mode toggle with refined border hierarchy, subtle glassmorphic depth, and unambiguous status colors (Emerald for QC pass, Amber for pending, Rose for critical breakdowns).

## Evidence on Hand

- Validated database schema and migrations (`public-schema.sql`, `backend/src/`).
- Working module REST APIs across all 18 factory departments.
- Comprehensive technical documentation in `docs/project/`.
- Pre-built design foundations in Tailwind CSS v4, Lucide icons, Recharts, and Motion.

## Product Principles

1. **Gated Integrity over Convenience**: Never bypass drawing approvals or QC inspections to accelerate dispatch.
2. **High-Density Legibility**: Present deep manufacturing state without cognitive clutter; critical alerts must command immediate attention.
3. **Workstation & Floor Continuity**: Deliver an uncompromising desktop tool for administrative deep work and an agile, frictionless mobile dock for floor spot-checks.
4. **Resilient Fail-Safe Defaults**: Graceful degradation when offline or unauthenticated; fail-closed on permissions.

## Accessibility & Inclusion

- WCAG AA contrast standards across both light and dark modes.
- Strict keyboard navigability for repetitive high-speed data entry (PO intake, job card logging).
- Distinct color-plus-icon status indicators for all critical factory alerts (not relying on color alone).
