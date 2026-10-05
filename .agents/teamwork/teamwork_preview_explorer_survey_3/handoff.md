# Handoff Report: Unified Clinical SaaS Platform Survey

## 1. Observation
1. **Target Environment**:
   - Inspected `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch` via `run_command` (`ls -la`):
     ```
     total 8
     drwxr-xr-x@ 4 alexandermarshi staff 128 Oct 4 17:41 .
     drwxr-xr-x@ 7 alexandermarshi staff 224 Oct 4 17:40 ..
     drwxr-xr-x@ 3 alexandermarshi staff 96 Oct 4 17:40 .agents
     -rw-r--r--@ 1 alexandermarshi staff 2072 Oct 4 17:41 ORIGINAL_REQUEST.md
     ```
     Observed that no git repository, `package.json`, or starter application files exist yet in this directory.
2. **Authoritative Specification**:
   - Viewed `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/ORIGINAL_REQUEST.md` (lines 18-34):
     - R1: Unified Authentication & Dashboard (Supabase / Firebase).
     - R2: Stripe Subscription Billing (test keys, restrict access to core tools until active subscription confirmed).
     - R3: Production-Ready SPA Integration (Next.js or Vite SPA, shared state, avoid style conflicts).
     - Acceptance Criteria: `npm run build` cleanly executes, automated E2E test verifying unauthenticated redirection, automated script verifying Stripe checkout initialization with test keys, independent audit confirming all 4 clinical tools render without CSS bleed.
3. **Source Applications**:
   - Identified canonical paths via `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/APP_PORTFOLIO_EVALUATION.md`:
     - Tool 1 (TheraFlow): `/Users/alexandermarshi/Downloads/theraflow`
     - Tool 2 (Clinical AI Scribe v2): `/Users/alexandermarshi/Downloads/heidi-clone`
     - Tool 3 (Aura Assistant): `/Users/alexandermarshi/Documents/antigravity/aura-extension`
     - Tool 4 (HIPAA PHI Scrubber): `/Users/alexandermarshi/phi_scrubber`
4. **CSS Conflict Inspection**:
   - Inspected `/Users/alexandermarshi/Downloads/heidi-clone/src/index.css` (lines 78-93):
     ```css
     * { box-sizing: border-box; margin: 0; padding: 0; }
     html, body {
       height: 100%; width: 100%;
       font-family: var(--font-sans);
       background-color: var(--bg-app);
       color: var(--text-primary);
       overflow: hidden;
     }
     ```
     And line 8: `--bg-app: #0c0e11;`.
   - Inspected `/Users/alexandermarshi/Documents/antigravity/aura-extension/aura.css` (lines 1-10):
     ```css
     :host { all: initial; font-family: ... }
     #aura-container { position: fixed; bottom: 24px; right: 24px; z-index: 2147483647; ... }
     ```
   - Inspected `/Users/alexandermarshi/Downloads/theraflow/package.json` (lines 23, 37, 50):
     `"@tailwindcss/vite": "^4.1.14"`, `"react": "^19.0.0"`, `"vite": "^6.2.0"`.
5. **Existing Stripe & Server Inspection**:
   - Inspected `/Users/alexandermarshi/Downloads/theraflow/server.ts` (lines 164-285):
     Observed existing Express + Vite integration and Stripe API checkout endpoint (`https://api.stripe.com/v1/checkout/sessions` with `Bearer ${stripeSecretKey}`) and simulation fallback.

## 2. Logic Chain
1. *From Observation 1*: Since the target directory is completely greenfield, we can initialize a unified Vite 6 + React 19 + TypeScript + Tailwind CSS v4 project without needing to preserve legacy build scripts or navigate pre-existing conflicts.
2. *From Observations 3 and 4*: TheraFlow is built on React 19, Vite 6, and Tailwind CSS v4; Heidi-clone is built on Vite and React. Next.js App Router would introduce server/client boundary hurdles, hydration errors for Web Audio / WebRTC, and unnecessary build overhead. Therefore, a unified Vite 6 + React 19 SPA with an Express dev/production server (`server.ts`) is the fastest, cleanest, and most stable architecture.
3. *From Observation 4*: Heidi-clone defines global resets (`html, body { background: #0c0e11; overflow: hidden; }` and `* { margin: 0; padding: 0; }`). If imported naively at root, it will completely break TheraFlow's layout, make the background black, freeze scrollbars, and distort buttons. Therefore, Heidi's styles must be strictly isolated into a `.heidi-scribe-theme` namespace container or CSS module.
4. *From Observation 4*: Aura Assistant was written with `:host` and tested with `attachShadow({ mode: 'closed' })`. Mounting Aura inside a Shadow DOM wrapper (or scoped container) provides 100% style isolation without CSS bleed.
5. *From Observation 5*: Stripe checkout session creation requires a server-side secret key (`STRIPE_SECRET_KEY`). Hosting an integrated `server.ts` handles `POST /api/create-checkout-session` using Stripe test keys, with automated test scripts verifying session creation.
6. *From Observation 2*: For Acceptance Criteria, dedicated automated verification scripts (`verify-build.sh`, `verify-auth-redirect.mjs`, `verify-stripe-checkout.mjs`, and `verify-css-bleed.mjs`) will provide verifiable, deterministic proof that all 4 criteria pass.

## 3. Caveats
- Real Stripe test payments require a valid `STRIPE_SECRET_KEY` (e.g. `sk_test_...`). While live outbound connectivity to `https://api.stripe.com` was verified, the backend must support a mock/simulated fallback so test scripts and CI succeed even in offline environments.
- TheraFlow's video telehealth originally used AWS Chime SDK; for public SaaS demo/launch, simulated WebRTC or Jitsi fallback ensures zero dependency on proprietary AWS account provisioning.
- Real Supabase auth requires provisioned cloud credentials; a local mock demo clinician mode is essential for zero-friction E2E verification.

## 4. Conclusion
1. Framework: Implement a single cohesive **Vite 6 + React 19 + TypeScript SPA** styled with **Tailwind CSS v4**, served by a lightweight Express server for Stripe API endpoints.
2. Authentication (R1): Implement Supabase Auth supplemented by a resilient Demo Clinician fallback in `AuthProvider`, enforcing route protection across all 4 clinical tools.
3. Stripe Billing (R2): Implement 3-tier subscription billing (Starter $49/mo, Clinician Pro $99/mo, Practice Group $249/mo), gating core clinical tools behind an active subscription check, powered by `/api/create-checkout-session`.
4. CSS Isolation (R3): Scope Heidi Scribe under `.heidi-scribe-theme`, mount Aura Assistant inside a Shadow DOM wrapper, and render PHI Scrubber using native Tailwind components, ensuring zero global resets and zero CSS bleed.
5. Acceptance Criteria: Provide 4 dedicated automated verification scripts covering build, auth redirect, Stripe checkout initialization, and CSS bleed auditing.

## 5. Verification Method
To independently verify this survey and findings:
1. Check target workspace cleanliness:
   `ls -la /Users/alexandermarshi/teamwork_projects/clinical_saas_launch`
2. Inspect source application package files and styles:
   `cat /Users/alexandermarshi/Downloads/theraflow/package.json`
   `head -n 100 /Users/alexandermarshi/Downloads/heidi-clone/src/index.css`
   `head -n 30 /Users/alexandermarshi/Documents/antigravity/aura-extension/aura.css`
3. Inspect survey report:
   `cat /Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_survey_3/report.md`
4. Invalidation conditions: If the user requires Next.js specifically for SSR SEO or requires Firebase over Supabase, the backend/bundler architecture would need adjustment, but the CSS isolation and Stripe gating recommendations remain valid.
