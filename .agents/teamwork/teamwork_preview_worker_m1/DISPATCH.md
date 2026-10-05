## 2026-10-05T01:02:10Z

You are Worker 1 for Milestone 1 (teamwork_preview_worker).
Your working directory is: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_worker_m1
The authoritative original user request is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/ORIGINAL_REQUEST.md
The project specification is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Task:
Implement Milestone 1: Core Foundation & Auth Shell.
Synthesize and implement all the blueprints provided by the 3 Explorers:
1. Explorer 1 report: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m1_1/report.md
2. Explorer 2 report: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m1_2/report.md
3. Explorer 3 report: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m1_3/report.md

You own exclusively and must create/configure:
- `package.json`: Vite 6, React 19, Tailwind CSS v4, Lucide React, Express, cors, Stripe, TypeScript, tsx. (Note: use existing node_modules or run npm install with appropriate flags).
- `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `src/index.css`.
- `server.ts`: Production/development Express server with CORS, `/api/health`, `/api/create-checkout-session` (supporting test keys and simulated sandbox), raw body retention, and static asset serving.
- `src/lib/supabase.ts`: Safe client initialization that handles missing env vars without crashing.
- `src/lib/auth.tsx`: AuthContext and useAuth supporting Supabase auth and 1-click Demo Clinician login (`Dr. Sarah Chen, MD`), session persistence in localStorage, user metadata.
- `src/lib/subscription.tsx`: SubscriptionContext supporting 3 tiers (Starter, Clinician Pro, Practice Group), trial mode, and checkout integration.
- `src/lib/clinical-context.tsx`: Shared patient context (`Jane Doe • DOB: 04/12/1988 • CPT: 90837`).
- `src/components/guards/ProtectedRoute.tsx`: Route guard blocking unauthenticated users and redirecting to `/login?redirect=${encodeURIComponent(location.pathname)}`.
- `src/components/guards/SubscriptionGate.tsx`: Subscription access gate with upgrade prompt and trial unlock.
- `src/components/layout/AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx`: Unified clinical command center with navigation badges for all 4 tools (EHR, Scribe v2, Aura Assistant, PHI Scrubber), Active Patient bar, practice switcher.
- `src/pages/Landing.tsx`, `src/pages/Login.tsx` (with prominent "Quick Sign-In: Demo Clinician"), `src/pages/Subscription.tsx`, `src/pages/DashboardHome.tsx`.
- `src/App.tsx`: Full router setup wiring public and protected routes.
- `scripts/verify-build.sh` and `scripts/verify-auth-redirect.mjs`.

Verification Requirements:
1. Run `npm run build` (or `tsc --noEmit && vite build`) and confirm exit code 0 with zero type errors.
2. Run `scripts/verify-auth-redirect.mjs` and confirm unauthenticated access to `/dashboard` is blocked and redirected to `/login`.
3. Document exact commands executed and full verification outputs in your handoff report.

Write your handoff report to:
/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_worker_m1/handoff.md

When complete, send a message to parent notifying that your work is ready for review.
