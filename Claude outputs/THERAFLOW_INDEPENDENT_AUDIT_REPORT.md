# TheraFlow OS — Independent Adversarial Technical Audit

Audited commit: `52e98b9` ("expand TheraFlow into Unified Practice Operating System"). Audit date: 2026-10-05.
Method: code read-through, plus execution. Tests and builds ran on a **copy** of the repo with its own Linux dependencies. A throwaway PostgreSQL 16 instance ran the migrations. Adversarial scripts were written outside the source tree. Production source was not modified. One housekeeping note is in Appendix C.

Evidence labels: **[RAN]** I executed it and saw the result. **[READ]** Established from source reading. **[EST]** My judgment or estimate.

---

## A. Executive Verdict

**MATERIAL CLAIMS NOT SUPPORTED**

The asset itself is an advanced, visually polished prototype with a good product thesis. The completion report's headline, "THERAPY PRACTICE OS READY", is not supported by the repository.

Six claims fail on direct test:

1. The Practice OS database migration does not deploy.
2. "Clinicians are never double-paid" is false. Dedup history lives in memory, and a restart, a re-key, or a double-click defeats it.
3. The Gusto and ADP "adapters" make no network calls and return fabricated success.
4. The "unified ledger" is React `useState` seeded with hard-coded demo data, with 0 database calls.
5. The main clinical dashboard crashes on first render, and 25 existing test assertions fail because of it.
6. The "100% passing" test claim is false. I observed 32 failing assertions.

---

## B. Claim Verification Matrix

| # | Claim (prior report) | Verified? | Evidence | Qualification |
|---|---|---|---|---|
| 1 | ~24 multi-tenant DB tables | **Partly. Count is wrong, and it does not deploy.** | 23 `CREATE TABLE` statements across both migrations. Applied to Postgres 16: `20261005_unified_practice_os.sql` errors at lines 159, 186 and 269 (`relation "claims" does not exist`; the real table is `billing_claims`). `earning_line_items`, `compensation_events` and `payment_reconciliations` are never created. Non-atomic apply leaves 20 tables. Atomic apply (one transaction, as Supabase CLI does) leaves 7. **[RAN]** | Nothing in the app reads or writes the Practice OS tables anyway (see C2). |
| 2 | Workforce module | **Yes, as UI plus in-memory state.** | `WorkforceView.tsx` calls `addWorker`/`updateWorker`, which are `useState` setters (`practice-os-context.tsx:502-514`). No auth check. **[RAN]** | Reload wipes it. 4 hard-coded seed workers. |
| 3 | Deterministic compensation engine | **Deterministic yes. Correct no.** | `compensation-engine.ts`. 900,000-case cents test found 4,970 rounding mismatches (0.55%). Defects at lines 130, 189, 66-77, 216-222. **[RAN]** | Fine as a prototype spec. Not safe to pay people from. |
| 4 | Payroll orchestration | **Demo only.** | `approveAndSubmitPayroll` (`practice-os-context.tsx:756-804`): no idempotency, no state guard, hard-coded approver, earnings never marked paid. Double-submit created 2 runs and 2 ACH fundings. **[RAN]** | |
| 5 | Gusto and ADP adapters | **No.** | `payroll-provider.ts:122-221`. No `fetch`, OAuth, endpoints, retries or webhooks. `connectPractice({apiKey:"garbage"})` returns "OAuth connection verified (API v2)". `submitPayroll` returns `success:true` plus a fake batch ID. **[RAN]** `INTEGRATION_MATRIX.md` says "ADAPTER IMPLEMENTED". | Interface-shaped stubs that report success. This is worse than an honest "not implemented". |
| 6 | BaaS embedded-banking architecture | **Interface + sandbox simulator only.** | `banking-provider.ts`: one `BusinessBankingProvider` interface and one in-memory `Sandbox…` class. No Unit/Column/Stripe code. | The seed label "Evolve Bank & Trust, Member FDIC" is misleading (see M3). |
| 7 | Claim-to-bank reconciliation | **Simulation.** | `reconcileClaimPayment` accepts hand-typed numbers. No 835/ERA parser, no matching against a real claim. The UI uses `claim-${random}`. **[READ]** | |
| 8 | Idempotency protection | **No.** | Detail in E.3. In-memory `Set`; `clearHistory()` clears it; two OS processes both delivered the same key; keys derive from `Date.now()`. **[RAN]** | |
| 9 | Unified encounter → payroll cascade | **Demo orchestration.** | Detail in Phase 2 below. No shared IDs with the EHR. **[RAN] [READ]** | |
| 10 | PostgreSQL RLS | **Not as claimed.** | Practice OS policies all fail to create (`operator does not exist: uuid = text`). The 13 tables that did create are RLS-enabled with 0 policies, so deny-all. The init-schema RLS does isolate tenants (3 cross-tenant probes blocked), but has no role scoping. **[RAN]** | See F. |
| 11 | 547 passing tests | **Not reproducible, and the "100%" is false.** | The docs' own table sums to 470. I ran 32 harnesses and observed ~1,098 assertions: ~1,066 pass, **32 fail**. | Detail in G. |
| 12 | 3–5 weeks to production | **Not credible.** | See H. | Understated roughly 6–10×. |
| 13 | FMV $310–425k | **Substantially overstated.** | See I. | |
| 14 | Strategic value $850k–1.4M | **Substantially overstated.** | See I. | |
| 15 | PHI: 100% tuned, ~81.6% holdout | **Numbers verified.** | `phi_scrubber_holdout_results.json`: overall recall 81.64%, unstructured 71.17%, structured 92.18%, precision 97.1%. Baseline: recall 100%, precision 77.03%. | The 100% is a tuned in-sample figure. The gateway test checks a single sanitization example. |
| 16 | Fail-closed PHI gateway | **Partly.** | See Phase 10 below. Only known/passed names are re-checked. | |
| 17 | SHA-256 tamper-evident audit | **Only against naive edits.** | Rewrite-and-rehash and truncation both still verify as valid **[RAN]**. The server accepts a client-supplied hash and returns a constant `tamperFree: true` (`server.ts:552-557`). | |
| 18 | TypeScript build | **Yes.** | `tsc --noEmit` clean. `vite build` succeeds (1.63 MB single chunk). **[RAN]** | |

---

## C. Findings by Severity

### Critical

**C1. The Practice OS migration does not apply** **[RAN]**
- `supabase/migrations/20261005_unified_practice_os.sql:159,186,269` reference `claims(id)`. The table is `billing_claims`.
- Lines 322-344: `practice_id = auth.jwt() ->> 'practice_id'::text` compares `uuid = text`, which errors.
- All 8 policies fail.
- The init schema reads `app_metadata.practice_id`. This migration reads a top-level `practice_id` claim, so the two are inconsistent even if the syntax were fixed.

**C2. Zero durable persistence for Practice OS** **[RAN] [READ]**
- No file in `src/modules/` or `practice-os-context.tsx` references Supabase.
- All workers, plans, earnings, bank accounts, transactions, payroll runs and reconciliations are `useState` initialised from hard-coded constants.
- A remount (equivalent to a page reload) restored the seed exactly, with no localStorage keys.
- `server.ts` has no Practice OS endpoints.

**C3. Idempotency is an in-memory `Set` with caller-generated keys** **[RAN]**
- Detail in E.3.
- The bus has 0 subscribers in app code.

**C4. Double-pay paths in the real code** **[RAN against the real `PracticeOsProvider` in a simulated browser]**
- A second identical click of "One-Click Cascade" accepts the event again. It adds +$85 compensation and +$150 deposit, because keys derive from `Date.now()` (`practice-os-context.tsx:540,544,577`).
- `approveAndSubmitPayroll` twice for the same period creates 2 payroll runs and 2 ACH fundings of $680.52 each.
- Earnings are never marked `paid`, and nothing closes the period (`setOpenEarnings` is never called with a paid status). The same lines will be re-included in the next run.

**C5. Gusto/ADP adapters fabricate success** **[RAN]**
- They set `isSandbox = false`, so the UI and factory treat them as real providers.
- A user who selects "Gusto" sees "submitted" while nothing was sent anywhere.
- The adapters are never even asked to `syncWorker` or `previewPayroll` by the app; only `submitPayroll` is called.

**C6. Main dashboard crashes on first render** **[RAN]**
- `DashboardHome.tsx:165` does `operatingAccount.currentBalance`.
- `bankAccounts` starts as `[]` (`practice-os-context.tsx:379`) until an async effect finishes, so `operatingAccount` is `undefined` on first render.
- Effect: 25 existing assertions fail. These are 14 of 80 E2E tests, 5 subscription-gate, 1 auth-redirect, 1 security-audit, 2 deep-audit and 2 m5-it2-stress.
- I reproduced the crash in jsdom. I did not observe it in a real browser (none was available), but the code path is deterministic.

**C7. Unauthenticated PHI-bearing and trust endpoints** **[RAN]**
- `GET /api/audit-logs` returns patient name and MRN to anyone with no token.
- `POST /api/audit-logs` accepts attacker-chosen actor, action, timestamp and hash. My forged "DELETE_RECORD by someone.else" was stored and then reported as `tamperFree: true`.
- `POST /api/subscription/verify` returns `valid: true, tier: "pro"` for token `"garbage"`.

### High

**H1. Not double-entry, and money is created** **[RAN]**
- `reconcileClaimPayment` credits operating by the deposit and the tax vault by 25% of the practice share, with no debit anywhere.
- A $100 insurance deposit raised total balances by **$111.25**.
- A $200 private-pay charge raised them by $222.50.
- `patientResponsibility` is added to the deposit even though only the payer paid.
- No overdraft check: funding $200,000 from about $68k went to −$131,579.
- Funding the same run twice debits twice.
- `getAccounts()` returns shared object references, so a caller can overwrite balances.
- No API exists for refund, chargeback, failed ACH, returned funding, reversal or transfer.

**H2. Floating-point money** **[RAN]**
- `Math.round(x*pct*100)/100` produced wrong-by-one-cent results in 4,970 of 900,000 cases. Example: $2.30 at 45% pays $1.03 instead of $1.04 (half-up).
- Balance accumulation drifted: 10,000 × $0.10 gave 79420.50000005821.
- Mixed schema: `billing_claims` uses integer cents; Practice OS uses `NUMERIC(10,2)` in SQL and JS floats in the app.

**H3. Compensation semantic defects** **[RAN]**
- `percentage: 0` becomes 50% (line 130). `no_show_fee` with `flatAmount: 0` pays $50 (line 189).
- A no-show or late cancel on a plan with no no-show rule falls through to the CPT rule and pays the **full session rate** ($85 in my test).
- The documentation bonus is added to every payment event, so three partial payments pay the bonus three times. My test gave $80 against a fair $60.
- `evaluateDocumentationBonus()` is a second path that doubles it if both run.
- `practiceRetained` is clamped to ≥0 (line 222). A $85 flat fee on $60 collected shows retained $0, so clinician plus practice ≠ collected.
- Flat-rate compensation cannot be clawed back (negative collection still pays +$85).
- Tier index comes from `openEarnings.filter(worker).length` (`practice-os-context.tsx:566`). That counts all lines, never resets at the period boundary, and counts remittance and private-pay lines as "sessions".
- Missing entirely: effective dating, plan versioning, a deferred-accrual queue for pay-on-remittance and pay-on-settlement (a timing mismatch just returns `eligibleForAccrual:false` and nothing revisits it), and minimum-guarantee enforcement (`evaluateMinimumGuarantee` is never called).
- Phantom money: `clinicianPayrollSummaries` adds a hard-coded `+$20` to Sarah Chen's gross (`practice-os-context.tsx:493,496`) on top of bonuses already inside her line items. Gross pay is overstated by $20 on every run.

**H4. RLS design lacks role scoping** **[RAN]**
- Run against the init schema, and against a patched scratch copy of the Practice OS schema.
- A clinician can read a colleague's earnings.
- A clinician can rewrite an approved earning to $99,999 and reset its status.
- A clinician can edit bank balances and delete earnings (policy is `FOR ALL`, practice-wide).
- A clinician can `UPDATE users SET role='owner'` on themselves, or rewrite a colleague's role or NPI.
- A signed clinical note can be edited after signing, with the same `signature_hash`.
- A clinician sees all of the practice's patients, not only their own caseload.
- 8 Practice OS tables have RLS enabled with no policy at all.

**H5. Audit trail is not tamper-evident against the stated threat** **[RAN]**
- A user with write access rewrote entry #2, recomputed downstream hashes, and `verifyAuditChain` returned **true**.
- Truncating the newest 3 entries also returned true.
- `verifyAuditChain` sorts by client-supplied timestamp (`audit.ts:126-128`).
- In Postgres, the `DO INSTEAD NOTHING` rules protect against ordinary DML but not the table owner (`DROP RULE`, then update succeeded).
- The init-schema `audit_logs_insert_policy` lets any practice user insert rows with arbitrary hashes, attributed to another user.

**H6. Schema and app do not correspond** **[READ]**
- `theraflow-store.ts` queries `appointments`, `progress_notes`, `treatment_plans` and `invoices` (lines 230, 321, 404, 506).
- None of those tables exist in the migrations.
- `ClientRecord` (`therapist_id`, `diagnosis_code`, `fee`) does not match `clients` (`practice_id NOT NULL`, `primary_clinician_id`, `mrn NOT NULL`).
- Supabase errors are swallowed (`catch {}`; the `error` return value is ignored). The store then writes PHI to browser `localStorage` regardless.

**H7. Test claims are inaccurate** (see G).

**H8. PHI gateway is a convention, not a chokepoint** (see Phase 10).

**H9. No application-level authorization** **[READ] [RAN]**
- `ProtectedRoute` only checks that a session exists. No page checks `role`.
- Any signed-in user can open Payroll, Banking and Compensation, approve payroll, edit plans, and re-assign workers (`updateWorker` re-assigned a plan with no check).
- The demo session is validated client-side only. Its constants ship in the bundle (`auth.tsx:91-139`), so anyone can write a conforming `localStorage` entry. The "airtight anti-forgery" description is not accurate.

### Medium

- **M1.** CORS reflects any origin with credentials (`server.ts:113-120`; I saw `Access-Control-Allow-Origin: https://evil.example` plus `Allow-Credentials: true`).
- **M2.** Stripe sessions are recorded `status:"complete", paymentStatus:"paid"` at creation, before any payment (`server.ts:229-230`).
- **M3.** The sandbox banking label "TheraFlow Treasury (Evolve Bank & Trust, Member FDIC)" appears in code, the SQL default (`:237`) and UI. It implies a bank relationship that does not exist.
- **M4.** The event bus is a per-tab client-side singleton, so each browser tab has its own "ledger".
- **M5.** Employer-tax figures are flat constants (9.85%, 9.65%, 9.8%). The three providers disagree on the same gross.
- **M6.** UI success banners are hard-coded text, not computed. The dashboard says "$90 Comp Accrued" while the engine computed $85. The cascade also uses a fake 700 ms spinner (`DashboardHome.tsx:56-64`).
- **M7.** Simulated remittance always attributes to `workers[0]`, and private-pay to `workers[1]`.
- **M8.** The cascade silently falls back to `workers[0]` when the ID is unknown. `executeCascadeSimulation` passes `'worker-sarah-chen'`, which does not exist.
- **M9.** Seed data contradicts the engine: Sarah's first two sessions are seeded at the 55% tier, but the engine's tier for session #1 is 50%.
- **M10.** `GEMINI_API_KEY`/`VITE_GEMINI_API_KEY` is read in client code. A `VITE_` key would be bundled to the browser.

### Low

- Doc counts: "24 tables" is 23. Documentation says the audit export "verifies the chain" (it prints a constant).
- Dead code: `previewPayroll`, `syncWorker`, `getPayrollStatus`, `evaluateMinimumGuarantee`, `fundPayrollBatch`.
- `Math.random()` IDs. The sandbox ACH batch ID uses `Date.now()` and can collide in the same millisecond.
- A single 1.6 MB bundle chunk.

---

## D. Architecture Reality Map

Legend: **A** implemented and exercised, **B** implemented but not wired, **C** interface/adapter only, **D** deterministic simulator, **E** static/demo UI, **F** documentation only.

| Component | Class | Notes |
|---|---|---|
| Compensation engine (`calculateEncounterCompensation`) | **A (pure function, wired)** | Used by the cascade only. Semantics flawed (C/H3). |
| `evaluateMinimumGuarantee`, `evaluateDocumentationBonus` | **B** | Called only by tests. |
| Practice event bus | **D/E** | Decorative: 0 subscribers, in-memory, client-side. |
| `SandboxEmbeddedBankingProvider` | **D** | In-memory simulator; also diverges from React state (see Phase 2). |
| `BusinessBankingProvider` for Unit/Column/Stripe Treasury | **C / F** | No implementation exists. |
| `SandboxPayrollProvider` | **D** | Flat-constant taxes. |
| `GustoPayrollAdapter`, `AdpPayrollAdapter` | **C (fabricating)** | Never call a network. |
| Workforce, Compensation, Payroll, Banking pages | **E over client state** | |
| `practice-os-context.tsx` | **A for the demo** | All "truth" lives here. |
| Practice OS SQL (16 tables) | **B (and broken)** | Not applied, not read by the app. |
| Init SQL (7 tables) | **B** | Applies; RLS isolates tenants; app model does not match. |
| EHR / Scribe / Aura / Telehealth UI | **A/E** | Real UI; localStorage store; Gemini branch exists; telehealth is demo or a loopback. |
| PHI scrubber (regex engine) | **A** | Performance in Phase 10. |
| Audit ledger (server file) | **A but unauthenticated** | |
| Stripe | **A with a simulated fallback** | |
| 837P, Epic FHIR export | **Formatter only** | No clearinghouse and no ERA/835 ingestion anywhere. |
| `INTEGRATION_MATRIX`, valuation docs | **F** | |

**Durable backend-backed vs demo/local-state** [EST]: about **5% / 95%.**
- The 5% is the server audit file and the Stripe checkout call.
- Practice OS is 0%.
- The EHR store claims dual-engine persistence, but 4 of its 5 target tables do not exist and errors are swallowed.

### Phase 2: One source of truth, traced end to end

| Step | Real durable ID/state? | Evidence |
|---|---|---|
| 1. Appointment | EHR store only (`appt-<ts>`, localStorage) | `theraflow-store.ts:240-290` |
| 2. Encounter | **Created fresh in the cascade**: `enc-${Date.now()}` | `practice-os-context.tsx:540` |
| 3. Signed note | **Not referenced.** The cascade hard-codes `isNoteSignedOnTime: true` | `:565` |
| 4. CPT | Typed as a parameter | `:530-536` |
| 5. Claim | `claim-${Date.now()}`, not in the EHR/invoice store | `:541` |
| 6. Remittance | A typed number | `:656` |
| 7. Bank deposit | Created inline from the typed amount | `:582-595` |
| 8–9. Compensation and line item | Engine run on the typed inputs | `:552-575` |
| 10. Active pay period | Header counters incremented by hand | `:641-647` |
| 11. Payroll approval | Hard-coded "Dr. Sarah Chen, MD" | `:774` |
| 12. Provider submission | Gusto/ADP: fabricated; sandbox: fabricated | `payroll-provider.ts` |

No module in `src/tools/*` (EHR, Scribe, billing) imports anything from the Practice OS, and nothing from `src/modules/*` imports the EHR.

I also found that the React state and the provider's own state diverge. After 2 cascades (React-only deposits, operating $78,720.50), a simulated remittance refreshed the balance **down** to $78,560.50 and dropped transaction count from 6 to 5. The cascade deposits live only in React, and the provider's internal copy never saw them. **[RAN]**

**Verdict: DEMO ORCHESTRATION.**

The pieces are related by values the demo creates side by side, not by shared durable IDs or state. The engine is real code, but it is fed typed inputs.

### Phase 7: Payroll provider audit

| Provider | Verdict |
|---|---|
| Sandbox | Simulator. |
| Gusto | Interface-shaped stub that fabricates success. Gusto's docs describe OAuth2 with a system access token, then partner-managed companies whose company tokens expire after 2 hours. The adapter has none of this. |
| ADP | Same. I did not verify ADP's current API documentation. |

Missing from both: authentication, request construction, validation, error handling, retries, rate limits, webhooks, external worker IDs, and failure recovery.

Engineering to make each real **[EST]**:
- Gusto: 8–12 engineer-weeks plus Gusto partner onboarding.
- ADP: 10–16 engineer-weeks plus ADP Marketplace onboarding.

### Phase 8: BaaS

Only an interface and a simulator exist. Per-provider integration **[EST]**: 12–20 engineer-weeks each, covering:
- KYB/KYC
- account creation
- ACH and a transfer lifecycle with returns
- ledger webhooks
- account restrictions
- reconciliation
- cards
- statements
- compliance hooks

Unit's own onboarding guide quotes **2–3 months** to go live with a bank partner. That is calendar time during which compliance review, not code, is the gating step. I did not verify Stripe Treasury or Column availability for this use case.

**The 3–5 week estimate is not credible.** My estimate is in H.

### Phase 10: PHI privacy

- **Figures verified:** holdout 3,410 expected entities, 626 missed, recall 81.64%, unstructured 71.17%.
- **Caveat on the holdout:** it is synthetic and generated by the same project (`scripts/generate-holdout-phi-corpus.ts`), so it is likely optimistic.
- **Unseen-text probe [RAN]:**
  - "Bartholomew (goes by Bart)" was not redacted.
  - A phone number written as "4-1-5 5-5-5 0-1-4-2" was not redacted.
  - "Paradise, CA" was not redacted.
  - Spelled-out email and date were not redacted.
  - Elsewhere, the scrubber **over**-redacted a whole clause into `[NAME]`, destroying clinical content.
- **Failing tests:** 3 of its own challenger assertions fail today (hyphen/apostrophe names, identical-start-offset span selection, a clean narrative giving false positives).
- **Gateway:** `sanitizeForOutboundLlm` re-checks only a name and MRN that the caller passes. It does not detect unknown PHI.
  - In my probe, with the correct patient name supplied, outbound text still contained the first name ("Pt [NAME] says Dmitri is doing better.") and the gateway did not block.
  - `expandShorthandToDAP` defaults `clientName` to `'Jane Doe'`, so a caller who omits it gets the check run against the wrong name.
  - The check is not a chokepoint: both Gemini call sites call it by convention, and a new call site could skip it.
  - Raw audio goes to Deepgram (`audio-transcription-provider.ts:194-195`), where no text scrubber applies.
- **Defensible marketing language:** "Client-side pattern-based de-identification for the 18 HIPAA Safe Harbor identifier categories. On our independent synthetic holdout it detected 81.6% of identifiers overall (92% for structured identifiers, 71% for free-text narrative). It reduces PHI exposure but is not a guarantee. Do not send output outside a HIPAA-compliant workflow without a BAA and human review."
- **Do not claim:** "Safe Harbor compliant", "fail-closed against PHI", or "zero PHI leaves your browser".

### Phase 9: Immutability

- Earnings are not immutable. `status` is a free field, edits are unrestricted, and there is no adjustment-entry mechanism.
- No plan versioning: reassigning a plan is instant and the next accrual silently changes rules.
- No server-side audit for Practice OS actions (none of the Practice OS pages or modules call the audit logger).
- A hash chain stored in the same writable system proves nothing against an actor who can write that system. Proper design: HMAC or signature with a key outside the DB, periodic anchoring of the head hash to external storage (WORM or notarisation), and database-level append-only enforcement via triggers and privileges.

---

## E. Financial Integrity Findings

### E.1 Compensation models

**Tier boundaries** [RAN, $100 collected]: #20 → 50%, #21 → 55%, #30 → 55%, #31 → 60%.
- The tier is chosen by the single session index passed for that payment. Earlier sessions are not re-rated (non-retroactive and per-event). A late payment for an early session gets whatever index the caller supplies.
- Index 0 falls to a hard-coded 45% default (line 155).

**Other models:**
- Percent-collected, allowed and billed work arithmetically on the happy path.
- Flat and CPT rates work, except for the no-show fall-through above.
- Pay-on-service accrues on every lifecycle event: 4 events produced four $85 lines unless the caller dedupes.
- Not supported or not tested:
  - reversals and clawbacks
  - duplicate remittances
  - multiple payments per claim (the sandbox bank rejects the second one)
  - claim resubmission
  - charge correction after accrual
  - mid-period plan changes
  - effective-date boundaries

### E.2 Money representation

Integer cents (or decimal-safe arithmetic) is required. The current mix of JS floats and `NUMERIC(…,2)` is not.

### E.3 Double-payment red team

| Attack | Result |
|---|---|
| Same event twice, same process | Blocked |
| Same event after restart | **Paid again.** Two separate OS processes both returned `delivered:true`. |
| Same event, different generated ID | **Paid again** (key `…:retry2` delivered) |
| Retry after timeout | **Paid again** (new key from `Date.now()`) |
| Duplicate webhook with a new event ID | **Paid again** |
| Two simultaneous events, same key, one process | Blocked (50 parallel emits → 1 delivery). This only works because the JS check-and-add is synchronous. |
| Handler throws | Key is already burned, the error is swallowed, and `delivered:true` is returned. The accrual is **lost** and cannot be retried. |
| Partial then final payment | Bonus paid on each (see H3) |
| Reversal then re-payment | No reversal mechanism exists |
| Duplicate ERA, differently keyed claim ID | **Credited twice** (+$222.50 for one $100 ERA) |
| Duplicate bank deposit | No dedupe on the sandbox bank beyond `claimId` |
| Payroll submission retry | **New run and new funding** each time |

**Classification: serious financial-integrity flaw.**

Proper durable design:
1. A Postgres `payment_events` table with `UNIQUE(source, external_event_id)`, where the ID comes from the payer's ERA trace/check number, the bank transaction ID, or the processor's event ID.
2. Insert the event and the compensation rows in one transaction (transactional outbox).
3. Make accrual idempotent by a deterministic key such as `(encounter_id, rule_id, payment_event_id)`, with a unique constraint.
4. Mark a handler's work done only on commit, and make retries safe.
5. Use a durable queue or worker, not an in-process emitter.

### E.4 Ledger

**"Double-entry ledger" is not technically accurate.**
- There is no journal, no debit/credit pairs, no `sum(debits)=sum(credits)` invariant, and no immutability.
- Balances are mutable fields, adjusted in place.
- Money is created (H1) and balances cannot be reconstructed from history. The four seed transactions chain consistently, but there is no opening-balance entry (their amounts sum to −$11,050 against a $78,420.50 balance).
- Insurance deposit, private-pay payment and payroll funding exist in simplified form. The tax-vault set-aside is a one-sided credit.
- Refund, reversal, chargeback, failed ACH and returned payroll funding **do not exist** as operations.

### E.5 Payroll

- Gross pay includes the phantom $20 and double-counts documentation bonuses.
- Employer taxes are flat constants.
- No W-2 / 1099 handling beyond a label.
- Earnings are never closed.

---

## F. Security Findings

| Check | Result |
|---|---|
| Tenant isolation (init schema) | **Holds.** Cross-practice SELECT returned 0 rows, cross-practice INSERT was rejected, and a `user_metadata` spoof was ignored (policy reads `app_metadata`). **[RAN]** |
| Tenant IDs spoofable? | Not through the JWT claim as written. |
| Service-role bypass | `server.ts` never creates a Supabase client; there is no service-role use today. All DB access would be client-side with RLS. |
| Supervisor relationships | `supervisor_relationships` has no policy, so it grants no access. Nothing uses it. |

Attack table (compromised clinician account):

| Attack | Possible? | Rating |
|---|---|---|
| Modify own compensation | Yes (client state, `updateWorker`; and via RLS once policies exist: `FOR ALL`) | **Critical** |
| Approve own payroll | Yes (no role check; approver hard-coded) | **Critical** |
| Alter bank data | Yes (state edit; RLS `FOR ALL`) | **Critical** |
| See another clinician's pay | Yes | **High** |
| Access another practice | No (tenant isolation holds) | n/a |
| Modify historical earnings | Yes | **Critical** |
| Self-promote to owner | Yes (`users.role`) | **High** |
| Forge audit entries | Yes (DB insert policy and server endpoint) | **High** |
| Read audit/patient identifiers without login | Yes | **Critical** |

Secrets: no real secrets found in source. `VITE_GEMINI_API_KEY` is a client-exposure pattern (M10). Provider credentials have no secure storage design; the adapters take an `apiKey` string.

---

## G. Test Quality Assessment

**Exact counts [RAN, Linux dependencies, 32 harnesses]:**

| Metric | Value |
|---|---|
| Assertions executed | ~1,098 |
| Passed | ~1,066 |
| **Failed** | **32** |
| Documented table sum | 470 |
| Doc claim of "547" | Not reproducible |
| Doc claim of "100% PASS" | **False** |

**Failures by cause:**
- 25 assertions: the dashboard crash (C6).
- 5 assertions: 3 distinct PHI-scrubber defects.
- 1 assertion: REG-5.3, which depends on the E2E suite.
- 1 assertion: a Stripe test that needs the internet (an environment artifact on my side).

**Doc/actual mismatches:**

| Suite | Documented | Actual |
|---|---|---|
| E2E | 22 "Playwright" tests, 100% | 80 node-based tests, 66 pass, 14 fail |
| Security audit | 52 tests | 26 tests, 25 pass |
| Stripe | 24 | 15 |
| EHR | 48 | 30 |
| Auth/session | 36 | 29 (12 + 17), 6 fail |

**Quality of the 37-test Practice OS suite** (my classification):
- About 14 assert happy-path arithmetic.
- 1–2 assert timing gates.
- 2 assert single-process idempotency.
- About 19 are shape or tautology. Examples: "adapter conforms to contract" asserts `connected === true`; "startsWith('ach-sandbox-')"; balance greater than 0.
- None test tier boundaries, rounding, reversals, restart-persistence, ledger balance, or concurrency.
- None would have caught any Critical or High financial finding above.

**Share that meaningfully reduces acquisition risk [EST]:** about 30% of the whole suite (the auth, forgery, server and PHI adversarial suites have value). About **10–15%** of the financial-layer tests.

---

## H. Production-Readiness Estimate

For an established buyer with a competent team of 4–5, **[EST]**:

| Work | Effort |
|---|---|
| Data layer: fix schema, role-scoped RLS, integer cents, double-entry journal, durable event store | 8–12 eng-weeks |
| Compensation engine rewrite (decimal-safe, versioned plans, adjustments, deferred accrual) with a property-based test suite | 4–6 |
| Real Gusto integration | 8–12 |
| ADP integration (optional) | 10–16 |
| One BaaS integration (code only) | 12–20 |
| Real auth/RBAC, server-side authorization, audit service | 4–6 |
| Clearinghouse: 837P submit and 835/277CA ingest | 6–10 |
| Wire the EHR → billing → compensation chain on shared IDs | 4–6 |
| Security review, pen test, HIPAA documentation (BAAs, SOC 2 prep) | 4–8 |
| **Total** | **~9–14 engineer-months** |

Calendar time **[EST]**:
- Private beta with payroll and banking on rails: **5–8 months**.
- General availability with compliance: **9–12 months**.

BaaS and payroll partner onboarding runs in parallel, but it is gated by approvals (Unit quotes 2–3 months).

The prior "3–5 weeks" is credible only for a narrow scope: host the EHR/scribe demo, apply the init schema, and wire the Supabase keys. It ignores Practice OS persistence, the payroll and banking integrations, the double-pay design flaw, and the dashboard crash.

---

## I. Independent Valuation

No revenue, no customers, no live integrations. Valuation is by replacement cost, reuse value and optionality. **[EST. Judgment, not an appraisal.]**

**Basis:**
- Roughly 20–28k lines of TypeScript and SQL, mostly UI.
- Practice OS logic is small (~1.5k lines of engine, bus, providers and context) and has the Critical defects above.
- Rebuilding at prototype grade is about 6–8 engineer-months (≈ $100–140k loaded). AI-assisted rebuilding is cheaper.
- Most of what a buyer would reuse is the product concept and the data-model vocabulary. Much of the code would be rewritten against the buyer's stack.

| Measure | Range |
|---|---|
| 1. Fair-market technology/IP value | **$40k – $90k** |
| 2. Recommended asking price | **$150k – $225k** (anchored on strategic optionality; expect to negotiate down) |
| 3. Likely negotiated closing value | **$35k – $85k** |
| 4. Strategic-acquirer value | **$100k – $250k** (up to ~$300k if the founder's domain expertise or an acqui-hire is included) |
| 5. Replacement cost (buyer rebuilding to the same functional level) | **$90k – $180k** |
| 6. OEM/licensing value | non-exclusive source license **$20k – $40k** perpetual or **$5k – $15k/yr**; exclusive **$60k – $120k** |

**Verdicts on the prior numbers:**
- **$310k–$425k FMV: substantially overstated** (about 4–6× my midpoint). The asset has no deployed backend, no working integrations, a deploy-blocking migration, and a first-render crash on its main page.
- **$850k–$1.4M strategic: substantially overstated** (about 5–8×). It is plausible only if the buyer is paying for the founder plus clinical-domain expertise, a go-to-market advantage, or an acqui-hire. It does not hold as a valuation of the repository.

What supports value: the thesis is differentiated (compensation-aware behavioral-health ops, with unification as the story), the UI breadth is real, the compensation-model vocabulary is a useful spec, and keeping it synthetic avoids liability.

---

## J. Highest-ROI Remediation Plan (ranked by value per unit of effort)

1. **Fix the dashboard crash** (guard `operatingAccount`, or hydrate synchronously). Minutes. Restores the demo and clears 25 failing assertions.
2. **Make the migration deploy.** `claims` → `billing_claims`, use `current_practice_id()`, and add a CI job that applies every migration to a fresh Postgres. 1–2 days.
3. **Move all money to integer cents** end to end (engine, bank, schema). 2–3 days.
4. **Durable idempotency in the database:** `UNIQUE(source, external_event_id)` plus a unique accrual key, written in the same transaction as the earning row. 3–5 days.
5. **Fix compensation semantics:** the `|| 50` coercions, the no-show fall-through, the bonus once per encounter, the retained clamp, and negative adjustments. Add boundary and property tests (tiers 20/21/30/31, rounding, reversals). 2–3 days.
6. **Replace the sandbox ledger with a real double-entry journal** (balanced-entry constraint trigger, append-only, balances derived), plus refund, return and chargeback entries. About 1 week.
7. **Make the payroll adapters honest.** Throw "not implemented" and set the flags correctly now, then build one real Gusto demo-environment integration (OAuth, partner-managed company, employee sync, payroll preview). 1–2 weeks. This converts a claim into evidence.
8. **Wire the cascade to real EHR IDs.** One store with foreign keys from appointment → note → invoice/claim → payment → earning, with hard-coded banners removed. About 1 week. This is what turns the verdict from "demo orchestration" toward "partially unified".
9. **Secure the server surface:** authenticate every `/api` route, stop reflecting CORS origins, mark Stripe sessions paid only on webhook, remove the demo-token path in production. 2–3 days.
10. **Correct the documents and marketing claims** (integration status, test counts, tamper-evidence, PHI language), and move the audit chain to an HMAC with an externally anchored head hash. 1–2 days.

---

## Appendix A: What is credible (credit where due)

- Tenant isolation in the init schema holds under adversarial tests.
- The compensation engine is a reasonable, readable spec of the model vocabulary.
- TypeScript compiles clean, and the production build works.
- Many auth and server stress tests are real and pass.
- The PHI benchmark artifacts are honestly reported in their own files. The weakness is in how the headline was summarised.

## Appendix B: Reproduction notes

- Test harnesses ran with the global `tsx` and a Linux `npm ci` in a copy of the repo. The first run against macOS-built `node_modules` gave environment-only failures (2 EHR server-spawn failures), which I discarded.
- DB tests: PostgreSQL 16 with a minimal Supabase shim (`auth.jwt()`, `authenticated`/`service_role` roles). Real Supabase's `auth.jwt()` should behave the same for these cases.
- Real-React run: `PracticeOsProvider` rendered with `react-dom` in jsdom, driven through its public context methods.
- Not done: no real-browser (Chrome) run, so the first-render crash is shown in jsdom and by reading `DashboardHome.tsx:165`. No live Gusto, ADP or BaaS calls. The Stripe live-key path was not exercised.
- Third-party facts used: Gusto Embedded docs (OAuth system access token, 2-hour company tokens, sandbox at `api.gusto-demo.com`) and Unit's onboarding guide (2–3 months). Both read via web fetch on 2026-10-05.

## Appendix C: Side effects of the audit

No source file in the repo was changed (`git status` is clean). One of my read-only `git status` calls left an empty `.git/index.lock` that would have blocked your next git command. I removed that single file after requesting delete permission for it. Test copies, scratch scripts and the throwaway database are outside the repo.
