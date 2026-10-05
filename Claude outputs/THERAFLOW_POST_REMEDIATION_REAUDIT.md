# TheraFlow OS: Post-Remediation Independent Re-Audit

**Auditee:** branch `audit-remediation`, uncommitted working tree as found on disk (17 modified files, 7 new files, plus `THERAFLOW_AUDIT_REMEDIATION_REPORT.md`).
**Baseline:** commit `52e98b9` (the tree I originally audited).
**Date:** 2026-10-05.
**Method:** I did not modify, repair or commit anything in the repository. I audited a scratch copy of the remediated tree and a scratch copy of the baseline. Live repo access was limited to read-only `git status` and `git diff`. Test servers, Postgres 16 clusters and scratch scripts lived outside the production tree. I did not read the remediation report for its conclusions, only for its claims, and I reused none of its verdicts.

Evidence tags: **[RAN]** I executed it and observed the result. **[READ]** code inspection only.

**Limits.**

- No real browser was available, so UI behaviour was exercised through jsdom with the real `PracticeOsProvider`.
- No outbound network, so Stripe and Gusto were tested against a stubbed `fetch`, not live endpoints.
- The device VM lacks Postgres. Database tests ran against PostgreSQL 16.15 in the cloud container.

---

## A. New Executive Verdict

**SUBSTANTIAL PROGRESS, MATERIAL FAILURES REMAIN.**

The remediation report's own verdict ("MAJOR AUDIT FAILURES REMEDIATED"; "FIXED AND VERIFIED" for all of C1–C7 and H1–H7; "45% durable") is **not supported** and is rejected.

Of the 7 Critical and 9 High findings:

| Status | Count | Findings |
|---|---|---|
| VERIFIED FIXED | 2 | C1 (migration applies), C6 (dashboard crash) |
| PARTIALLY FIXED | 11 | C2, C3, C4, C5, C7, H1, H2, H3, H4, H5, H7 |
| NOT FIXED | 3 | H6, H8, H9 |
| REGRESSED | 0 | none from the original 16 |
| NEW DEFECT INTRODUCED | 8 | see section C |

What is real:

- The Practice OS migration applies cleanly to a fresh PG16.
- A genuine double-entry ledger class exists and balances per entry.
- The compensation engine fixes several semantic bugs.
- The first-render dashboard crash is gone.
- ADP now honestly returns `NOT_IMPLEMENTED`.
- Hostile CORS origins and garbage subscription tokens are rejected.

What is not real, and still decides whether this can touch money or PHI:

- **Nothing the Practice OS owns is in PostgreSQL.** The money-bearing state (bank balances, transactions, journal) resets on reload.
- **Unauthenticated audit read and write remain open.**
- **A clinician can self-promote to owner and then approve payroll** (init-schema `users` policy unchanged).
- **A double-click on payroll with realistic provider latency still funds twice.**
- **The "durable idempotency" store is not on the product path.** The bus runs in the browser; the JSONL file is written only when the bus runs under Node (tests).
- **Gusto is a scaffold** that reports fabricated success on any HTTP 200.
- **The unified clinical-to-financial chain is a demo button** with hard-coded "Jane Doe, 90837, $150, Sarah Chen".
- **The "100% HIPAA Safe Harbor Certified" marketing is still shipped** while the independent holdout recall is 81.64%.

---

## B. Original Finding → Current Status Matrix

| ID | Original finding | Status | Evidence (all [RAN] unless noted) |
|---|---|---|---|
| C1 | Practice OS migration does not apply | **VERIFIED FIXED** (stock PG16, superuser) | Both migrations applied to a brand-new PG16 with `ON_ERROR_STOP=1`: 27 public tables, 27 with RLS, 47 policies. The remediation's `migration-pipeline.test.ts` ran against it: 3/3 pass. Caveats are new defects N1 and N2. |
| C2 | Zero durable persistence for Practice OS | **PARTIALLY FIXED** | 6 entity types are now in `localStorage` (workers, plans, earnings, pay period, payroll runs, reconciliations). No PostgreSQL write path exists (0%). After remount the bank balance reset from 78,123.70 to 78,420.50 while payroll runs persisted (R8). Two tabs on one profile lose updates, last writer wins (P4). See section D. |
| C3 | Idempotency is an in-memory `Set` | **PARTIALLY FIXED** | Works: same-process duplicate rejected (I1), restart rehydrates from file (I2). Fails: two OS processes with the same key both delivered, 2 lines in the store (I3, I4). Ten concurrent async emits ran all 10 handlers (I6). The same payment re-keyed 3 times was accepted 3 times (I5). A crash after handlers but before persist replays side effects, 2 for one payment (I9). A failed disk write is swallowed and `emit` still reports `delivered:true` (I8). A handler that throws after a side effect and is retried creates the earning twice (I7). Acceptance and accrual are not atomic in one DB transaction: none exists (I10). |
| C4 | Double-pay paths | **PARTIALLY FIXED** | Fixed: a sequential duplicate payroll for the same period is rejected, earnings are marked `paid`, and period status survives reload. **Still reproduces:** a double-click on payroll with 300 ms provider latency and the second click 100 ms later fulfils both clicks: 2 payroll runs, 2 fundings of 387.22, operating delta -774.44 against one funding due (Q1). A second cascade click now throws an idempotency fault, but earning lines still accrue: 1→2→3→4 lines, gross due 437.50→692.50, bank unchanged (P1). Re-keyed claim "claim-X-copy" credited a second 124.25 (R3). The same private-pay event twice was accepted twice (R3b). |
| C5 | Gusto/ADP fabricate success | **PARTIALLY FIXED** | ADP: now returns `success:false`, `NOT_IMPLEMENTED`, `scaffold_unconfigured` (confirmed). Gusto with no credentials: the adapter returns `scaffold_unconfigured`, but `approveAndSubmitPayroll` throws only when the provider name includes "ADP". Gusto-unconfigured still **funded the run, marked all earnings paid and recorded `status:"submitted"` with `externalBatchId:""`** (R9). With a stubbed 200 response the adapter returns `success:true` plus fabricated tax figures (G). |
| C6 | Dashboard crashes on first render | **VERIFIED FIXED** | `regression-dashboard-hydration.test.ts` 3/3. e2e Tier 1, 3, 4 all pass (35, 10, 5). The 25 assertions that failed in the baseline now pass. First render and hydration settle (R0). |
| C7 | Unauthenticated PHI-bearing and trust endpoints | **PARTIALLY FIXED** (headline NOT FIXED) | Fixed: `POST /api/subscription/verify` with `"garbage"` now returns 401. Hostile-origin CORS returns 403. **Not fixed:** unauthenticated `GET /api/audit-logs` returns 200 with patient name and MRN (S1). Unauthenticated `POST` stores a forged `EXPORT_PHI` entry attributed to `sarah.chen.md@…` and the chain reports it `verified` (S2). Any bearer token other than a short list of literals is accepted (`abc123` → 200). New unauthenticated `/api/practice-os/state` accepts attacker state with a $999,999,999 balance (S7). Demo token `demo-token-sarah-chen-jwt-valid` still returns `valid:true, tier:"pro"`. Simulated checkout is stored `complete/paid` at creation, and unauthenticated `/api/subscription/status` returns active pro (S5). |
| H1 | Not double-entry; money created | **PARTIALLY FIXED** | **Verdict: PARTIAL LEDGER** (section E). |
| H2 | Floating-point money | **PARTIALLY FIXED** | Balances are integer cents inside the ledger and bank. Positive collections at the production 50/55/60% tiers: 300,000 cases, 0 mismatches against a BigInt half-up reference. But: fractional percentages (99.99%) mis-round, for example 1,814,818 vs 1,814,819 cents. **Negative collections: 2,311 of 40,000 differ from the reference** (sample: -339,279 vs -339,280). Reversal symmetry breaks: pay(+c) then clawback(-c) did not net to zero in 99,858 of 200,000 cases. `Math.round(Number(cents) * (pct/100))` is still float multiplication. UI and `financialSummary` remain floats. |
| H3 | Compensation semantic defects | **PARTIALLY FIXED** | Fixed: `percentage:0` earns 0, `flatAmount:0` earns 0, no-show/late-cancel/cancel without a rule earn 0 (4/4), tier boundaries correct (#20=50%, #21=55%, #31=60%), phantom +$20 removed (Sarah gross 196 = seed lines 196). **Still defective:** three partial payments without the caller-supplied `bonusAlreadyAwarded` flag pay 80 vs fair 60. A flat $85 plan pays 85×3 across 3 partial payments of one encounter, 85×4 across four lifecycle events. The embedded and standalone documentation bonus paths are both callable (60 + 10). Negative collection on a flat rule earns +85. Undefined `percentage` silently becomes 50%. Flat $85 on $60 collected gives retained -25. No plan versioning, effective dating or pay-period reset in the engine. The cascade hard-codes `compensationPercentage: 50` and `isNoteSignedOnTime: true`. |
| H4 | RLS lacks role scoping | **PARTIALLY FIXED** | Now blocked for a compromised clinician: edit own plan (A1), insert plan (A2), self-assign (A3), approve own payroll (A4), alter historical earning (A6), read or alter bank (A7, A8), read journal (A9), cross-practice read and write (A11, A12). **Still open:** colleague pay readable (A5). **Self-promotion `users.role → owner` succeeds (A10), and promoting or demoting peers and the owner succeeds (A10b).** After promotion, B1 reads pay and bank, and B2 edits the comp plan to 100% and approves payroll. Signed note edited after signing (A13) and un-signed (A14). Forged audit row as another user (A15). Setting `app.current_practice_id` to another practice did not override the JWT practice id (A17 blocked). Supabase-style JWT (top-level `role`, no `app_metadata.role`) did not escalate (B3). |
| H5 | Audit trail not tamper-evident | **PARTIALLY FIXED** | Section F. Plain-hash recomputation is now detected. Truncation and whole-file replacement are not, even with a strong secret. |
| H6 | Schema and app do not correspond | **NOT FIXED** | `theraflow-store.ts` and the init schema are unchanged (`diff -rq` shows no differences). No client code writes the Practice OS to Postgres. [READ] |
| H7 | Test claims inaccurate | **PARTIALLY FIXED** | Section H. The remediation suites run and pass (79 assertions), but the report's "259 assertions / 11 harnesses" and "FIXED AND VERIFIED" are not reproducible. Baseline tests passed vacuously: `challenger-m2-empirical-audit` passed 53/53 only because the dashboard crashed before rendering. |
| H8 | PHI gateway is a convention | **NOT FIXED** | `src/tools` is byte-identical to the baseline. Both Gemini call paths (`ai-note-expander.ts`, `ai-template-generator.ts`) call `sanitizeForOutboundLlm`, but both are browser-side with a client-held key, so the gateway is still a convention and not a server chokepoint. Marketing "100% HIPAA Safe Harbor Certified" (`Landing.tsx:174`) and "100% HIPAA" (`DashboardHome.tsx:158`) are still shipped. See section G. |
| H9 | No application-level authorization | **NOT FIXED** | A worker role was escalated to `practice_owner` and a plan reassigned with no check (R7). No route or provider checks role. The demo session is still validated client-side only. [READ] and [RAN] |

---

## C. New Defects Introduced

| # | Defect | Evidence |
|---|---|---|
| N1 | **Cross-tenant idempotency collision.** `idx_unq_accrual_idempotency` is on `(COALESCE(encounter_id), COALESCE(compensation_rule_id), COALESCE(payment_event_id), accrual_type)` with no `practice_id` or `worker_id`. One practice's adjustment row blocks another practice's, and blocks a second worker's. Silent data loss in a multi-tenant system. | Hit by my own seed; reproduced: practice B and practice A's second worker both got `duplicate key value violates unique constraint`. |
| N2 | **Migration creates its own `auth` schema, `auth.users`, `auth.uid()` and `auth.jwt()`.** As a non-superuser migrator: `permission denied for schema auth`. On managed Supabase, `auth` is owned by `supabase_auth_admin`, so this migration fails or shadows platform functions. It applies only because the test harness runs as superuser on bare PG. | T2 vs non-superuser run. |
| N3 | **Phantom accruals.** A duplicate cascade click throws "Idempotency fault" on the bank side, but the compensation accrual is still created. Payroll liability grows without cash: 4 lines, gross due 692.50, bank unchanged. | P1. |
| N4 | **Unconfigured Gusto still pays.** Funding is debited, every earning is marked `paid`, and the run is recorded `submitted` with an empty batch id. The guard keys on the substring "ADP". | R9. |
| N5 | **Earnings accrued while a payroll is in flight are marked paid but not included.** Run gross 352.50 vs 462.50 of lines marked paid: $110 is never paid and is shown as paid. | Q2. |
| N6 | **Period can never roll.** After the first funding the period is `funded`, and the next period id is rejected as "already approved". New accruals have no path to payment. | R6. |
| N7 | **New unauthenticated state-overwrite endpoint** `/api/practice-os/state`. Accepts arbitrary JSON, and no client code calls it. It adds attack surface only. | S7. |
| N8 | **Durable event store is not on the product path.** The bus is imported only by the browser-side `practice-os-context.tsx`. In the browser it uses `localStorage` (`slice(-500)`). `clearHistory()` deletes the store. | [READ] plus I3, I8. |
| (latent) | **Patient names on the ungated dashboard.** "Marcus Vance" and "Elena Rostova" render to an unsubscribed clinician (`DashboardHome.tsx:87,402`). Synthetic names, but the pattern is real. This was masked in the baseline because the crash prevented rendering, so it is an unmasked pre-existing issue and not a regression. | `challenger-m2-empirical-audit`: 52/53, verdict REJECT. |

---

## D. Architecture Reality Map

**1. Persistence by state class.** Unweighted count over 13 enumerated state classes.

| Backing | Classes | Share |
|---|---|---|
| PostgreSQL | none | **0%** |
| Server file | audit ledger (1) | **~8%** (the JSONL event store and `/api/practice-os/state` exist, but nothing in the product writes to them) |
| Browser `localStorage` | workers, plans, earnings, pay period, payroll runs, reconciliations, idempotency keys (7) | **~54%** |
| React or module memory only | bank accounts, bank transactions, journal and ledger, financial summary, payment-event history (5) | **~38%** |

The remediation's "45% durable" does not match: the durable share of anything that survives a device change or a server restart is 8%. Weighted by money risk, the ledger, bank and journal are 0% durable.

Reload and restart behaviour [RAN]:

- After remount, workers, plans, earnings and runs persist, but the bank resets.
- A server restart affects only the audit file.

**2. Idempotency.** Browser `localStorage` in the product, JSONL under Node in tests. The check, handler and persist steps are not atomic (TOCTOU). The server has no event endpoint.

**3. Banking.** `SandboxEmbeddedBankingProvider` is created per page load. There is no real BaaS. Labels still say "FDIC Insured" (`BankingMoneyView.tsx:119`, `OnboardingWizard.tsx:333`).

**4. Payroll.** Sandbox, Gusto (scaffold) and ADP (`NOT_IMPLEMENTED`). Funding and "paid" state live in the browser.

**5. Authentication and authorization.** Demo session in `localStorage`, validated client-side. No server-side session. No role checks anywhere.

**6. Clinical-to-financial chain.** Verdict: **DEMO ORCHESTRATION.**

- `executeCascadeSimulation()` posts a fixed payload: client "Jane Doe", CPT 90837, $150, `worker-dr-sarah-chen`.
- No clinical module (appointment, encounter, signed note, claim) calls the Practice OS, and nothing in the Practice OS reads them.
- IDs are synthetic (`enc-…`, `claim-…`).

Of the eight stages (appointment → encounter → signed note → claim → payment → reconciliation → comp → payroll), only the last four exist, and only inside a browser demo.

---

## E. Financial Integrity Re-test

**Ledger verdict: PARTIAL LEDGER.**

Real (inside `DoubleEntryLedger`, [RAN]):

- Per-entry balance is enforced at post time.
- A $100 insurance deposit now moves cash by exactly 100 (before: +$111.25). Journal: `D1010 87.50 / D1020 12.50 / C4010 100.00`; `D5010 50 / C2010 50`.
- 19,020 random operations kept the global ledger balanced.
- Payroll overdraft is blocked. Duplicate funding with the same id is rejected.
- Integer cents throughout.

Still failing [RAN]:

| Test | Result |
|---|---|
| L5 same ERA re-keyed | operating +175 from the same $100 ERA twice |
| L6 returned ACH with no prior funding, twice | operating **+$10,000** created from nothing |
| L7 refund of a nonexistent charge, twice | cash out -$2,000 with no revenue |
| L8 charge then full refund | comp payable 110 remains; tax reserve not reversed |
| L9 chargeback | ledger 2050 moves; **bank operating unchanged** |
| L9 reversal of the same entry twice | no guard: 1010 = -200, revenue = -100 |
| L10 payroll funding vs accrual | 2010 payable goes to -4.93; employer-tax expense 5020 never posted |
| L11 same payroll under 2 ids | funded twice (React supplies `Date.now()` ids) |
| L12 unbalanced opening history | constructor accepts it |
| L12 mutable entries | mutating a returned line, or `getAllEntries()`, changes balances (`balanced=false`) |
| L13 multi-tenant | balances not scoped by practice |
| L14 same journal reference twice | posts twice (no idempotency in the ledger) |
| L2 two sources of truth | a $50,000 journal deposit does not move the bank balance |
| L15 20,000-operation fuzz | **bank operating minus opening minus ledger 1010 = -256,823.60** (bank and ledger diverge) |
| Opening balance | not in the ledger (1010 starts at 0 vs bank 78,420.50) |
| L3 patient responsibility | the $20 patient portion is never deposited, while comp is accrued on the $100 |

At the database level [RAN]:

- An unbalanced journal entry (debit 1,000,000 cents, no credit) inserts fine (D1).
- Header status and description are editable after posting (D4).
- Bank balance can be set directly with no journal (D5).
- One earning can be paid in two runs and then un-paid (D6).
- A re-keyed duplicate `payment_events` row is accepted (D8).
- `TRUNCATE` on journal lines and audit logs succeeds (D10).
- There are no triggers on any public table.
- `DO INSTEAD NOTHING` rules block ordinary line UPDATE/DELETE (D2), but do not stop the owner or TRUNCATE.

**Compensation engine** [RAN]: see H2 and H3 above. In summary, fixed for 0%, no-show and tier boundaries, still wrong for partial payments, flat fees and clawbacks.

---

## F. Security / RLS Re-test

**Applied to a fresh PG16 with `ON_ERROR_STOP=1`** (superuser): both migrations pass. As a non-superuser migrator the second migration fails (N2). Run on bare PG16, `init_schema` alone fails (`schema "auth" does not exist`), so the init schema depends on Supabase.

**Clinician attack matrix** [RAN]:

| Attack | Outcome |
|---|---|
| A1 edit own comp plan | blocked |
| A2 insert plan | blocked |
| A3 self-assign plan | blocked |
| A4 approve own payroll | blocked |
| A5 read colleague pay | **succeeds** |
| A6 alter historical earning | blocked |
| A7/A8 bank read and alter | blocked |
| A9 read journal | blocked |
| A10 self-promote to owner | **succeeds** |
| A10b change peers' or owner's role | **succeeds** |
| A11/A12 cross-practice read and write | blocked |
| A13 edit a signed note | **succeeds** |
| A14 un-sign another's note | **succeeds** |
| A15 forge audit entry as another user | **succeeds** |
| A16 delete or update audit rows | blocked by rule |
| A17 override practice via `app.current_practice_id` GUC | blocked (JWT practice id wins) |
| B1/B2 after A10: read pay and bank, edit plan, approve payroll | **succeeds** |

The new schema's role gating works, but the unchanged init-schema `users` policy lets any clinician become the owner. After that, every new control is bypassed.

**Server probes** [RAN] against the real `server.ts`:

| Probe | Result |
|---|---|
| S1 unauthenticated audit read | 200 with patient name and MRN |
| S2 unauthenticated audit write | 201, forged actor, `tamperStatus: verified` |
| S3 bearer `abc123` | 200 (garbage, invalid, fake → 401) |
| S4 garbage subscription token | 401 (fixed) |
| S4 demo token | `valid:true, tier:"pro"` |
| S5 simulated checkout | stored `complete/paid` before any payment; entitlement granted |
| S6 hostile CORS origin | 403 (fixed). Any `localhost:<port>` origin is still reflected with credentials. |
| S7 `/api/practice-os/state` | unauthenticated overwrite |
| S8 audit export | unauthenticated 200 |

**Audit integrity (H5)** [RAN]: the real server, real log of 168 entries, tampered files.

| Attack | Key | Records | Unverified | Result |
|---|---|---|---|---|
| T0 baseline | default | 168 | 0 | verified |
| T1 edit actor, no rehash | default | 168 | 1 | detected |
| T2 edit and rehash with plain SHA-256 | default | 168 | 168 | detected |
| T3 edit and rehash with the key read from source | default | 168 | 0 | **undetected** |
| T4 truncate newest 10 | default | 158 | 0 | **undetected** |
| T5 replace the whole file | default | 3 | 0 | **undetected** |
| S0 baseline | strong env secret | 168 | 0 | verified |
| S1 edit and rehash using the default key | strong env secret | 168 | 168 | detected |
| S2 truncate newest 10 | strong env secret | 158 | 0 | **undetected** |
| Rotation: start the as-delivered file under a new secret | strong env secret | 168 | 168 | all flagged |

Findings:

- The HMAC defeats a naive recompute and defeats an attacker who lacks the key.
- The default key is in source (`"theraflow-server-audit-secret-2026-key"`), so any reader of the repo can forge undetected unless `AUDIT_HMAC_SECRET` is set.
- **Truncation of the newest entries is not detected, with or without a strong secret.** There is no head-hash anchor and no external anchor or checkpoint.
- Verification runs at startup only.
- Forged actor and timestamp are accepted: the POST handler stamps the actor from `req.user`, else defaults to Sarah Chen.
- **Accurate threat model:** it protects against casual editing by someone without the key. It does not protect against a server-side insider, a deployment with the default key, deletion of recent entries, or replacement of the file. It is not a HIPAA-grade immutable audit log.

---

## G. Integration Reality

**Gusto: scaffold with real network code, not a credible integration.**

I stubbed `fetch` and captured exactly what the adapter sends:

| Request | Method | Notes |
|---|---|---|
| `https://api.gusto-demo.com/v1/me` | GET | `Authorization`, `Accept`; no `X-Gusto-API-Version` header |
| `…/companies/c1/employees` | POST | `{first_name, last_name, email}` |
| `…/companies/c1/payrolls` | POST | `{start_date: "pp-2026-10-01", gross_pay: 1000}` |

Problems:

- **Gusto's documented flow is create, update, calculate and submit.** I fetched Gusto's payroll docs: creation has no documented `gross_pay` total, and the version header is documented.
- `start_date` receives a pay-period id string and not a date.
- Any HTTP 200 returns `success:true` with fabricated tax withholding (115, 58, 14.5, 62, 6) computed from flat percentages.
- `getPayrollStatus` returns a hard-coded `submitted_to_gusto`.
- `previewPayroll` makes no network call.
- There is no OAuth flow, no company-token refresh (company tokens expire in about 2 hours), no worker onboarding or compliance steps, and no webhook handling.
- In the browser UI, `getPayrollProvider('gusto')` reads `process.env` keys that do not exist, so it is always unconfigured (and N4 applies).

Classification: **scaffold**, with a nominally real HTTP surface. It has never been exercised against any Gusto endpoint.

**ADP:** confirmed `NOT_IMPLEMENTED` on submit (`success:false`, `scaffold_unconfigured`); sync, preview and status throw. Honest.

**Banking:** a sandbox simulator only. There is no BaaS client. Real onboarding with a BaaS partner such as Unit takes weeks to months, so this layer has no external integration at all.

**Stripe:** the simulated branch is marked paid at creation (M2, unchanged). The live branch could not be tested without network (the `forensic-m2-audit` 502 `StripeConnectionError` is environment-only). There is no webhook handler, so nothing verifies a provider event before a session is trusted.

**PHI gateway (focus 12)** [RAN]:

- `src/tools` is identical to the baseline, so the gateway logic is unchanged.
- Tuned gold benchmark: 100% recall (1,261 of 1,261), 376 false positives. I give this no credit, because the engine was tuned against that corpus.
- **Independent holdout: 81.64% recall** (2,784 of 3,410), 97.10% precision, 626 false negatives. Unstructured recall is 71.17%.
- My own 10-case adversarial probe leaked **10 of 28 sensitive tokens**. Missed: hyphenated names (O'Brien-Kowalski), spoken or typed-out digits and phone numbers, "ssn nine digits 123456789", `@janedoe_88`, small-town place names (Boone), accented names (Ángeles Pérez), and "03/04/22" and "1985" in a DOB sentence. It also over-redacts ("Patient lives in" → "Patient [NAME]").
- Both Gemini call paths use the gateway (2 of 2), but from the browser.
- **The marketing language was NOT corrected.** "100% HIPAA Safe Harbor Certified" remains in the product.

---

## H. Test Quality and Results

**Execution.** TypeScript `tsc --noEmit` exits 0. `vite build` completes.

I ran **33 harness entry points** (5 remediation, 28 legacy; the e2e runner is counted once) with **1,074 assertions executed: 1,065 passed, 9 failed.**

| Group | Harness | Pass / total |
|---|---|---|
| Remediation | `practice-os-unified` | 39 / 39 |
| | `adversarial-financial-and-security` | 23 / 23 |
| | `compensation-engine-adversarial` | 11 / 11 |
| | `regression-dashboard-hydration` | 3 / 3 |
| | `migration-pipeline` (PG16, cloud) | 3 / 3 |
| Legacy | m3-ehr 30/30; m4-scribe 61/61; m4-challenger 44/44; m3-challenger 32/32 | |
| | tier5-coverage 87/87; tier5-challenger 53/54; m5-aura 85/85; m5-challenger 50/53 | |
| | adversarial-security-audit 26/26; subscription-gate 17/17; auth-redirect 12/12 | |
| | e2e tiers 1–4: 35/35, 30/30, 10/10, 5/5 | |
| | challenger-adversarial-burst 7/7; deep-audit 31/31 | |
| | m2-empirical-audit 52/53; m2-stress 24/24 | |
| | m3-concurrency 16/16; m4-deep-probe 13/13; m4-empirical-stress 26/27 | |
| | m4-it2 42/42; m4-it3-empirical 44/44; m4-it3-stress 15/15 | |
| | m5-it2-stress 12/12; m5-challenger-empirical 40/40 | |
| | empirical-auth-stress 16/17; race-stress 23/23; server-stress 26/27; forensic-m2 21/22 | |

**The 9 failures:**

- **8 are identical to the baseline** (pre-existing): tier5-challenger T5.2.1 (1), m5-challenger CHAL-1.1a/2.2/4.1 (3), m4-empirical-stress REG-5.3 (1), empirical-auth-stress cold start (1), empirical-server-stress CORS reflection (1), forensic-m2 Stripe SDK (1, **environment-only**: no outbound network).
- **1 is new in the sense of being unmasked:** `challenger-m2-empirical-audit` (ePHI on the ungated dashboard). The baseline passed it vacuously.
- **Environment-only:** `migration-pipeline` on the device needs `createdb` and `psql`; I ran it in the cloud, where it passes.
- **Timing flakes under 8-way parallel load, passing in sequence and on re-runs:** e2e Tier 2 T2.3.5 (30/30 on 3 re-runs), `m5-aura-scrubber` (83/85 and 84/85 under load, 85/85 alone), forensic server-start timeout.

**Property loops, described separately and not counted as architectural tests:**

- The remediation's `compensation-engine-adversarial` runs 50,000 randomized cases as **one assertion**: 0 cent-level mismatches. It exercises positive collections at fixed percentages.
- My independent loop used a BigInt reference over 400,000 cases (360,000 positive, 40,000 negative) and found 2,311 negative-collection mismatches and fractional-percentage float errors. The remediation's test cannot see these.
- My 20,000-operation ledger fuzz kept the ledger balanced but showed bank and ledger divergence.

**Quality assessment:**

- The remediation suites are mostly in-process unit tests. The "durable idempotency" tests run under Node against a file, which is not how the product runs.
- They do not test the double-click-with-latency race, two processes, crash windows, re-keyed payments, role self-promotion, truncation or Gusto request shape.
- The header of `migration-pipeline.test.ts` promises that clinicians cannot approve payroll or alter bank accounts; the test body has 3 assertions and does not exercise them.
- The remediation report's claim of 259 assertions across 11 harnesses is not reproducible; I count 79 assertions in the 5 remediation suites.

---

## I. Revised Production-Readiness Estimate

| Subsystem | Estimate | Reason |
|---|---|---|
| Clinical UI shell and demo flow | 65–70% | Renders; builds; e2e passes. |
| Compensation engine | 50–55% | Core cases correct; partial payments, flat fees, clawbacks, versioning missing. |
| Ledger | 30–35% | Real double-entry class; no durability, tenancy, idempotency or bank reconciliation. |
| Persistence | ~5% | Browser storage only; 0% PostgreSQL. |
| Authentication and authorization | ~10–15% | Client-side demo session; no role enforcement. |
| Payroll execution | ~10% | Race conditions and N3–N6; Gusto is a scaffold. |
| Banking | ~5% | Sandbox only. |
| Audit and compliance | ~20% | Detects casual edits only. |
| PHI de-identification | ~35% | 81.6% holdout recall; marketing claims uncorrected. |
| External integrations | ~5% | Nothing is exercised live. |

**Overall: roughly 18–25% of a production-ready, money-and-PHI-handling system** (my original estimate was materially lower; the gain comes from C1, C6, the ledger class, the comp-engine fixes and honest labels).

To reach real production use I estimate **6–9 months with 3–4 engineers (about $450–750k)**, plus roughly 2–3 months of third-party onboarding (BaaS partner, Gusto partner approval) that can run in parallel. This is my judgment, not a measured figure.

**Blocking items before any real use:**

1. Move Practice OS state to PostgreSQL behind an authenticated API.
2. Atomic transaction for event acceptance and accrual.
3. Close the `users.role` self-promotion hole and add per-operation RLS.
4. Authenticate every endpoint.
5. Server-side payroll idempotency.
6. Anchor audit heads externally.
7. Remove the marketing claims.
8. Rebuild the Gusto client against the documented flow.

---

## J. Independent Valuation

These are judgment estimates for technology and IP only (source code, schema, tests, documentation). They are not legal or financial advice, and I am not a licensed appraiser. There is no revenue, no customers, no live integrations and no regulatory standing in the evidence I audited.

**Prior valuation (my original audit):** FMV $40k–$90k; strategic acquirer $100k–$250k.

| Measure | Original | **Now** |
|---|---|---|
| Fair-market technology/IP value | $40k–$90k | **$55k–$105k** |
| Recommended asking price | n/a | **$150k–$190k** (anchored to the strategic range, with room to negotiate) |
| Likely closing value | n/a | **$60k–$95k** |
| Strategic-acquirer value | $100k–$250k | **$120k–$275k** |
| Replacement cost, as-verified code | n/a | **$90k–$160k** |
| Cost to reach production on top of that | n/a | **$450k–$750k** (section I) |
| OEM or licensing value | n/a | Comp engine plus ledger library: **$15k–$40k** one-time. PHI scrubber: **not licensable as a de-identification product** at 81.6% holdout recall. |

**The increase is modest: about +$15k to +$20k at the midpoint of FMV, and about +$20k to +$25k on the strategic range.** It is justified only by these verified remediations:

1. **C1: the 589-line unified migration applies to a fresh PG16** with 27 tables and 47 policies, and the new role gating holds against most clinician attacks (A1–A4, A6–A9, A11–A12). This is a usable schema foundation, worth roughly +$5k to +$10k.
2. **A real double-entry ledger class** with balanced entries, integer cents and a clean 19,020-operation fuzz inside the ledger, roughly +$5k to +$10k. It is a library, not a system of record.
3. **Compensation engine fixes** (zero percentage, no-show, tier boundaries, cents) and the removal of the phantom $20, roughly +$3k to +$5k.
4. **C6: dashboard crash fixed**, which restores 25 previously failing assertions and a working demo, roughly +$2k to +$3k.
5. **Honest labelling** of ADP and Gusto, and rejection of garbage subscription tokens and hostile CORS origins, which reduce misrepresentation exposure for a buyer.

**Why the value does not rise further:**

- There is zero database persistence.
- Unauthenticated PHI-bearing endpoints remain open.
- A clinician can escalate to owner.
- Payroll can double-fund under latency.
- The audit log is truncatable.
- Gusto and the clinical-to-financial chain are demonstrations.
- The remediation report's claims overstate the state of the system, and that credibility gap is itself a diligence risk for a buyer.

**Conditions that would move the valuation:** persisting the ledger and payroll state to PostgreSQL with server-side idempotency and tests that cover the failure cases listed above, closing the escalation and endpoint-auth issues, and one live Gusto sandbox run, which together could justify the strategic range at its upper end.

---

*Sources of evidence: auditor scripts (compensation 400k-case BigInt reference test, 20k-operation ledger/bank fuzz, event-bus race, restart, two-process and crash tests, jsdom provider tests, 28 Postgres attack probes, live-server probes, audit-file tamper variants, Gusto fetch capture) and 33 harness entry points described in section H. The live repository was not modified.*
