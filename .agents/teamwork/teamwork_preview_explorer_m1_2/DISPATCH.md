## 2026-10-05T00:55:49Z
Scope:
Milestone 1: Core Foundation & Auth Shell — Dual-Engine Authentication & Route Guards.
Read ORIGINAL_REQUEST.md and PROJECT.md. Also review survey findings at:
- /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_survey_3/report.md
- TheraFlow auth implementation in `/Users/alexandermarshi/Downloads/theraflow/src/lib/auth.tsx`

Investigate and produce a detailed implementation blueprint for:
1. `src/lib/supabase.ts`: Safe client initialization that handles missing env vars gracefully.
2. `src/lib/auth.tsx`: AuthContext and useAuth hook supporting:
   - Supabase Auth (email/password signup & login).
   - Instant Demo Clinician Login (`Dr. Sarah Chen, MD - Behavioral Health Specialist`, demo token, persistent session in localStorage).
   - Session restore, logout, profile state.
3. `src/components/guards/ProtectedRoute.tsx`: Route guard inspecting auth state; if unauthenticated, strictly blocks route and redirects to `/login?redirect=${encodeURIComponent(location.pathname)}`.
4. Verification criteria: how an automated test can verify that unauthenticated access to `/dashboard` is blocked and redirected to `/login`.

Write your report to:
/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m1_2/report.md
and write a standard handoff report to:
/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m1_2/handoff.md

When complete, notify parent via send_message.
