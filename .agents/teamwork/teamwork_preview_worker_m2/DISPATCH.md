## 2026-10-05T02:00:46Z
You are Worker M2 (teamwork_preview_worker).
Your working directory is: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_worker_m2
The authoritative original user request is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/ORIGINAL_REQUEST.md
The project specification is at: /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Scope & Task:
Implement Milestone 2: Stripe Subscription Billing.
Read the blueprints and handoff reports prepared by the 3 Explorers:
- Explorer 1 (Stripe Backend): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m2_1/report.md
- Explorer 2 (Pricing UI & Context): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m2_2/report.md
- Explorer 3 (Subscription Gating): /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_m2_3/report.md

Implement the following:
1. `server.ts`:
   - `POST /api/create-checkout-session`: support plans ('starter', 'pro', 'group') and billing cycle ('monthly', 'annual' with 20% discount). Integrate Stripe SDK when STRIPE_SECRET_KEY is provided; return simulated session ID and URL when in test sandbox mode.
   - `GET /api/subscription/session/:sessionId`: return completed session verification.
2. `src/lib/subscription.tsx`:
   - SubscriptionContext managing active status, tier, planName, billing cycle, `subscribe()`, `startTrial()`, `cancelSubscription()`.
   - LocalStorage persistence under `clinical_saas_subscription`.
   - Detection of `?status=success&session_id=...` return URL parameters to activate subscription and show confirmation.
3. `src/pages/Subscription.tsx`:
   - Complete 3-tier pricing UI (Starter $49, Clinician Pro $99, Practice Group $249), monthly/annual toggle (20% discount), "Subscribe" buttons with loading state, instant trial bypass toggle for testers/auditors, and success banner.
4. `src/components/guards/SubscriptionGate.tsx`:
   - Lock overlay "Clinician Pro Subscription Required" with direct "Subscribe Now" (initiates Stripe checkout) and "Activate Free Trial" buttons. Renders children when active or trialing.
5. `src/components/layout/Header.tsx` & `Sidebar.tsx`:
   - Display active tier badge (STARTER, PRO CLINICIAN, PRACTICE GROUP, TRIAL).
   - Sidebar displays "Upgrade" badge next to locked tools for Starter tier accounts.
6. `src/App.tsx`:
   - Wrap clinical tool routes (`ehr/*`, `scribe/*`, `aura/*`, `phi-scrubber/*`) in `<SubscriptionGate>`. Ensure `/dashboard/subscription` is ungated.
7. Scripts & package.json:
   - Create `scripts/verify-stripe-checkout.mjs` verifying AC3 (Stripe checkout session initialization with test keys).
   - Create `scripts/verify-subscription-gate.mjs` verifying access gating.
   - Add `"test:stripe": "node scripts/verify-stripe-checkout.mjs"` and `"test:subscription": "node scripts/verify-subscription-gate.mjs"` in `package.json`.

Verification Requirements:
1. Run `node scripts/verify-stripe-checkout.mjs` (or `npm run test:stripe`) and verify exit code 0.
2. Run `node scripts/verify-subscription-gate.mjs` (or `npm run test:subscription`) and verify exit code 0.
3. Run `npm run test:security` and `npm run test:auth` and verify all tests continue to pass.
4. Run `npm run build` and verify clean build with 0 TypeScript compilation errors.
5. Document all commands and outputs in your handoff report.

Write your handoff report to:
/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_worker_m2/handoff.md

When complete, notify parent via send_message.
