# Handoff Report: Portfolio Survey & Analysis (TheraFlow & Clinical AI Scribe v2)

**Agent:** Explorer 1 (`teamwork_preview_explorer_survey_1`)  
**Target Recipient:** Orchestrator Parent (`b0192614-d8d6-40cc-89d2-10ad99ce4cc6`) / Integration Team  
**Date:** 2026-10-05  
**Handoff Type:** Hard (Task Complete)

---

## 1. Observation

Direct observations from the filesystem, codebase analysis, and execution tools:

1. **Exact Canonical Locations:**
   - **TheraFlow / Clinical OS**: Located at `/Users/alexandermarshi/Downloads/theraflow` (with staging mirror at `/Users/alexandermarshi/Downloads/remix_-theraflow`). Confirmed via `app_portfolio_eval/APP_PORTFOLIO_EVALUATION.md:273` and `app_portfolio_eval/verify_builds.sh:107`.
   - **Clinical AI Scribe v2**: Located at `/Users/alexandermarshi/Downloads/heidi-clone` (package name `marshi-diarize` in `package.json:2`). Confirmed via `app_portfolio_eval/APP_PORTFOLIO_EVALUATION.md:515` and `app_portfolio_eval/verify_builds.sh:114`.

2. **Build Verifications:**
   - Ran `npm run build` in `/Users/alexandermarshi/Downloads/theraflow`:
     - Tool command: `run_command` -> `npm run build` (Cwd: `/Users/alexandermarshi/Downloads/theraflow`)
     - Result: `vite build` completed with **exit code 0** in 8.90s. Output produced `dist/index.html` (0.52 kB), `dist/assets/index-mjKWE6KT.css` (93.66 kB), and `dist/assets/index-Ck_bONym.js` (3,853.62 kB).
   - Ran `npm run build` in `/Users/alexandermarshi/Downloads/heidi-clone`:
     - Tool command: `run_command` -> `npm run build` (Cwd: `/Users/alexandermarshi/Downloads/heidi-clone`)
     - Result: `vite build` completed with **exit code 0** in 946ms. Output produced `dist/index.html` (1.28 kB), `dist/assets/index-QcgkIA5u.css` (6.02 kB), and `dist/assets/index-5Tw6mros.js` (240.96 kB).

3. **Technology Stacks & Version Differences:**
   - **TheraFlow**: React `19.0.0`, React DOM `19.0.0`, Vite `6.2.0`, `@tailwindcss/vite` `4.1.14`, `tailwindcss` `4.1.14`, `react-router-dom` `7.13.2`, `@supabase/supabase-js` `2.100.0`, `@google/genai` `1.29.0`, `@aws-sdk/client-chime-sdk-meetings` `3.1015.0`, `amazon-chime-sdk-component-library-react` `3.12.0`, `lucide-react` `0.546.0`.
   - **Clinical AI Scribe v2**: React `18.3.1`, React DOM `18.3.1`, Vite `5.4.11`, `canvas-confetti` `1.9.4`, `lucide-react` `0.468.0`.

4. **Style Conflicts & Global Selectors:**
   - TheraFlow uses Tailwind v4 with `@theme inline` and OKLCH CSS variables in `src/index.css`.
   - Scribe (`heidi-clone/src/index.css:84-93`) declares:
     ```css
     html, body {
       height: 100%;
       width: 100%;
       font-family: var(--font-sans);
       background-color: var(--bg-app);
       color: var(--text-primary);
       overflow: hidden;
     }
     ```
     and generic classes `.btn`, `.btn-primary`, `.btn-secondary`, `.badge`, `.badge-yellow`.

5. **Server & Mock Architecture:**
   - TheraFlow has an active Express server (`server.ts`) listening on `PORT` 3000 with `/api/health`, `/api/telehealth/meeting`, `/api/billing/connect-account`, `/api/billing/create-checkout`, and `/api/billing/connect-status/:therapistId`. All telehealth and Stripe routes feature complete simulation fallbacks when credentials are not configured.
   - Clinical AI Scribe v2 provides Vercel serverless handlers in `api/`: `diarize.ts` (AssemblyAI and Whisper transcription with simulated fallback), `sessions.js` (cloud session persistence), and `health.js`.

---

## 2. Logic Chain

1. **Portfolio Discovery:**  
   - Based on the master evaluation catalogue in `APP_PORTFOLIO_EVALUATION.md` (lines 58, 129, 136, 270–305, 512–537) and `ROADMAP_COMPLETION_CHECKLIST.md` (lines 70–94, 259–283), "TheraFlow" is App 02 and "Clinical AI Scribe v2" is App 09.
   - File inspection confirmed both reside in `/Users/alexandermarshi/Downloads/theraflow` and `/Users/alexandermarshi/Downloads/heidi-clone` with full source trees, package configurations, and build scripts.

2. **Architectural Roles in Unified SaaS:**  
   - TheraFlow contains the complete outer EHR shell: authentication (`lib/auth.tsx`), role-based routing (`src/App.tsx`), patient charting (`pages/ClientProfile.tsx`), appointment calendar (`pages/Calendar.tsx`), invoicing and superbills (`pages/Billing.tsx`, `components/SuperbillDialog.tsx`), and patient portal (`pages/portal/*`).
   - Clinical AI Scribe v2 provides the specialized ambient scribing engine: acoustic voice diarization (`utils/diarizationEngine.js`), real-time 2-speaker speech processing, 6 clinical note templates (`data/defaultTemplates.js`), custom template creator (`components/templates/TemplateStudio.jsx`), ICD-10 and CPT coding assistant (`components/billing/BillingPanel.jsx`), and multi-EHR export formatting (`components/notes/ExportModal.jsx`).
   - Merging these two creates a comprehensive EHR with native ambient scribing.

3. **Compatibility & Integration Obstacles:**  
   - *Dependency reconciliation:* TheraFlow is already on React 19 and Tailwind v4. Scribe's components do not use React 18-specific internals or deprecated lifecycles; they use standard functional hooks (`useState`, `useEffect`, `useRef`, `useContext`) and can run on React 19 without modification.
   - *Style bleed protection:* Scribe's global `html, body { overflow: hidden; }` and generic `.btn` classes must not be imported into TheraFlow's global bundle. They must be scoped to `.scribe-container` or converted into Tailwind classes.
   - *Backend unification:* The serverless endpoints in `heidi-clone/api/diarize.ts` and `api/sessions.js` can be imported directly as Express router middleware into TheraFlow's `server.ts`.

---

## 3. Caveats

1. **Aura Assistant & PHI Scrubber:** This survey specifically focused on App 1 (TheraFlow) and App 2 (Clinical AI Scribe v2) per the assignment instructions. The other two apps (Aura Clinical Assistant at `/Users/alexandermarshi/teamwork_projects/app_portfolio_eval/staged_verification/app_31` and HIPAA PHI Scrubber) are assigned to peer explorers or subsequent analysis.
2. **Microphone Permissions in Test Runners:** The speech recognition in Scribe relies on browser Web Speech API and `navigator.mediaDevices.getUserMedia()`, which require active browser microphone permissions and will require mock stubs during automated headless E2E testing.
3. **External Secrets:** AWS Chime, Gemini AI, AssemblyAI, and Stripe live keys were evaluated in sandbox/simulation mode; neither live AWS calls nor real credit card charges were executed during this read-only phase.

---

## 4. Conclusion

TheraFlow and Clinical AI Scribe v2 are technically mature, independently buildable applications that are well-suited for integration into a single clinical SaaS platform:
- **TheraFlow** provides the host dashboard, Supabase auth/data architecture, patient charting, billing, and telehealth WebRTC rooms.
- **Clinical AI Scribe v2** provides ambient dual-speaker diarization, multi-template documentation, CPT/ICD-10 clinical coding, and EHR export adapters.
- **Key Action for Implementers:** Standardize on TheraFlow's React 19 / Vite 6 / Tailwind v4 stack, scope Scribe's CSS to eliminate root overflow locking, merge Scribe's API handlers into `server.ts`, and add an active Stripe subscription gate before routing users to the unified clinical tools.

---

## 5. Verification Method

To independently reproduce and verify all findings:

1. **Verify TheraFlow Build:**
   ```bash
   cd /Users/alexandermarshi/Downloads/theraflow
   npm run build
   ```
   *Expected result:* Exit code 0, bundles successfully to `dist/`.

2. **Verify Clinical AI Scribe v2 Build:**
   ```bash
   cd /Users/alexandermarshi/Downloads/heidi-clone
   npm run build
   ```
   *Expected result:* Exit code 0, bundles successfully to `dist/`.

3. **Verify Report and Survey Artifacts:**
   - Inspect `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_survey_1/report.md` for full component breakdown, feature inventories, schema definitions, and integration strategies.
   - Inspect `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch/.agents/teamwork/teamwork_preview_explorer_survey_1/handoff.md` for this handoff.

4. **Invalidation Conditions:**
   - Finding is invalidated if either repository fails `npm run build` or if key components identified in Section 3 are missing from the canonical file paths.
