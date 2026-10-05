# Original User Request

## Initial Request — 2026-10-05T00:40:41Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview
> Requested team: [none — teamwork routes from the description]

Extract the 4 core applications of the Clinical Telehealth & AI Scribe Ecosystem (TheraFlow, Clinical AI Scribe v2, Aura Assistant, and PHI Scrubber) from the massive portfolio and merge them into a single, production-ready SaaS platform. Implement secure authentication, a unified dashboard, and active Stripe subscription billing to prepare for immediate public launch.

Working directory: ~/teamwork_projects/clinical_saas_launch
Integrity mode: development

## Requirements

### R1. Unified Authentication & Dashboard
Initialize a production backend architecture (e.g., Supabase or Firebase) and wrap the 4 extracted clinical apps behind a secure authentication wall. Users must log in to a unified dashboard to access the tools.

### R2. Stripe Subscription Billing
Implement a fully functional Stripe checkout flow using test keys. Restrict access to the core clinical tools until an active subscription is confirmed.

### R3. Production-Ready SPA Integration
Merge the existing React components and logic from the 4 standalone apps into a single cohesive Next.js or Vite Single Page Application, ensuring state is managed centrally and styles do not conflict.

## Acceptance Criteria

### Execution Verification (Programmatic & Agent-as-Judge)
- [ ] `npm run build` executes cleanly with zero type or dependency errors across the newly merged SaaS application.
- [ ] An automated E2E test script confirms that unauthenticated users are strictly blocked from the application routes and redirected to the pricing/login page.
- [ ] An automated script or independent auditor confirms that the Stripe checkout initialization successfully executes using test keys.
- [ ] An independent auditor confirms all four clinical tools render successfully within the authenticated dashboard without CSS bleed.
