# TheraFlow OS — Final Post-Remediation Independent Re-Audit

## Audited Commit

- Branch: audit-remediation
- Expected SHA: c403048de385ae9de38cb1eca52175fad77f6b3d
- Actual audited SHA: c403048de385ae9de38cb1eca52175fad77f6b3d
- Working tree clean: YES (`git status --porcelain` empty; `git diff c403048… --` empty; no `.git/index.lock`)
- Scratch copy derived directly from exact commit: YES (`git archive` of the SHA, tar commit-id verified; every destructive or adversarial test ran in the scratch copy, or in throwaway PostgreSQL 16 databases created from the exact migration files at that SHA)
- Live repository modified by this audit: NO (only read-only `git --no-optional-locks` commands; HEAD, porcelain and diff re-confirmed at the end of the audit)

This report supersedes `THERAFLOW_POST_REMEDIATION_REAUDIT.md`. That earlier re-audit was run against an unfinished remediation; its valuation is disregarded. Two of its factual statements about RLS attacks were also wrong and are corrected here (see Section F, "Corrections to my earlier report"). The three earlier reports were used only as test specifications. No claim in the remediation report was accepted without executable evidence.

---

## A. Executive Verdict

**SUBSTANTIAL PROGRESS, MATERIAL FAILURES REMAIN.**

The remediation is real in places. It fixed things that were demonstrably broken, and I can show them with executed evidence:

- The SQL migration now deploys cleanly in two realistic environments (PG16 with an external Supabase-style `auth` schema, and a restricted non-superuser migrator that does not own `auth`). It no longer creates or replaces managed auth objects.
- The accrual idempotency index is now scoped by practice, worker, encounter, rule, payment event and accrual type.
- Role self-promotion, peer role changes and demoting an owner are blocked by a trigger.
- Signed clinical note content and un-signing are blocked by a trigger.
- `/api/practice-os/state` is gone, and none of the 8 equivalent paths I tried exist.
- The duplicate cascade no longer pays phantom compensation.
- An unconfigured Gusto provider and ADP now fail honestly. They no longer fund, mark paid, or record a submitted payroll.
- A pay-period rollover works.
- The dashboard crash is fixed.
- Several, but not all, misleading marketing labels were corrected.

The remediation report's overall claims are still not supported. Material failures persist in the areas that decide whether this is a financial and compliance platform, as opposed to a polished demo:

1. **PostgreSQL is not the system of record for any Practice OS state.** About 62.5% of the implemented state classes live in browser `localStorage`. About 37.5% live in memory only and reset on reload. The share in PostgreSQL or server-side storage is 0%. No Practice OS table is read or written by the application.
2. **The unified clinical-to-financial chain is a hard-coded demo cascade.** It is not an integrated chain.
3. **The payroll double-funding race is not fixed.** With 300 ms of provider latency and a second click 100 ms later, both calls succeed and funding is deducted twice. Earnings created while a payroll is in flight are marked paid without being in the run.
4. **Idempotency is not exactly-once.** It is a browser-local check, non-atomic, bypassed by re-keying, and two OS processes both delivered the same key in 5 of 6 trials.
5. **The ledger is a PARTIAL LEDGER.** The module-level ledger is balanced, but it is not the single source of truth. A 18,979-operation fuzz run left the bank balance diverged from the ledger by $261,397.22. The database accepts an unbalanced journal insert.
6. **The Gusto integration is a SCAFFOLD.** Any HTTP 200 becomes `success:true` with fabricated tax numbers and a hard-coded status. ADP is an honest NOT_IMPLEMENTED. There is no BaaS client.
7. **The audit endpoints are still not authenticated in practice.** A request with no Authorization header returns 200 on audit read, write and export, including patient names and MRNs. Any string beginning `eyJ` or `demo-token-` is accepted as the practice owner.
8. **The audit log is tamper-evident only against casual edits.** Truncation, rollback and whole-file replacement are not detected, even with a strong secret.
9. **The PHI scrubber still leaks.** On an independent 610-snippet holdout, recall is 81.64%. Eleven of 16 adversarial probe cases leaked at least one token. Marketing still claims "zero-leak", "all 18 identifiers" and "FDIC-insured".

Counts: of 16 original Critical/High findings, **2 are VERIFIED FIXED (C1, C6), 11 are PARTIALLY FIXED, 3 are NOT FIXED (H6, H8, H9), 0 REGRESSED**. New and residual defects are listed in Section C. The remediation report's own conclusion should be rejected.

---

## B. Finding-by-Finding Matrix

Status key: VERIFIED FIXED requires executable evidence or unambiguous architectural proof. Nothing here is credited for documents, existence of files or interfaces, mocks, implementer-written tests, unused SQL, or network-shaped classes.

| Finding | Status | Evidence | Remaining Risk |
|---|---|---|---|
| **C1** Migration unusable or destructive on managed Supabase | **VERIFIED FIXED** (environments tested; real managed Supabase not tested) | Final migration applied with `ON_ERROR_STOP=1` in env A (superuser migrator, external `auth` schema owned by `supabase_auth_admin` with `jwt()`/`uid()`/`users`) and env B (non-superuser migrator that does not own `auth`). Both produced 27 tables, 47 policies, 27 RLS-enabled. Auth function owners unchanged. The auth shim is skipped when the schema exists. `tests/migration-pipeline.test.ts` passes 3/3 in PG16. Index scope tested: cross-practice and cross-worker accepted, duplicate payment-event accrual rejected. | Not run on real managed Supabase. The role model does not work with real Supabase JWTs (see C-2). NULL-key collapse in the accrual index (C-1). |
| **C2** Persistence not real / PostgreSQL not the system of record | **PARTIALLY FIXED** | Practice OS state now survives remount for 10 of 16 classes, through `localStorage` keys `theraflow_pos_*`. Bank balance, transactions and the journal reset to seed on remount (operating 77,413.52 became 78,420.50). Two tabs: last-writer-wins lost update. Zero Practice OS tables are read or written by any app code. `theraflow-store.ts` still queries nonexistent tables (`appointments`, `progress_notes`, `treatment_plans`, `invoices`). | PostgreSQL 0%. Multi-device, multi-user and server-side authority do not exist. Browser storage is user-editable. |
| **C3** Idempotency / exactly-once | **PARTIALLY FIXED** | Same-process duplicate is rejected. A restart that rehydrates the key set rejects. Failures: re-keyed same payment accepted 3 of 3 (I5); 10 concurrent async emits ran 10 handlers (I6); throw after a side effect then retry duplicates the effect (I7); unwritable store swallows the persist failure, then restart re-delivers (I8); crash after handlers but before persist yields 2 side effects (I9); no DB transaction (I10); two OS processes both delivered the same key in 5 of 6 trials (I3). Keys live in browser `localStorage`, `slice(-500)`. | Check, handler and persist are not atomic. Dedup is keyed on caller-supplied ids. 500-key window. Not exactly-once. |
| **C4** Payroll double-submit, duplicate payroll, paid-state errors | **PARTIALLY FIXED** | Fixed: unconfigured Gusto and ADP no longer fund (R9, R10); duplicate cascade no longer accrues (P1); sequential and staggered 5 ms double submit yields one funding (R4, P2); provider failure modes (`success:false`/HTTP 500, ECONNREFUSED, 2.5 s timeout) leave funding and earnings unchanged and retry succeeds (V5); rollover opens the next period and re-submitting an old period id is rejected (V1–V4). **Not fixed:** Q1, provider latency 300 ms with a second click 100 ms later: both fulfilled, 2 payroll runs, 2 fundings of 387.22 each (−774.44 vs 387.22 due). Q2, an earning created during an in-flight payroll was marked paid but not in the run (run gross 352.50 vs 462.50 of lines marked paid). | Guard reads React state, so it is a stale-closure race under any real provider latency. Money can be funded twice. Late earnings are lost from payroll but flagged paid. |
| **C5** Fabricated external payroll/banking integrations | **PARTIALLY FIXED** | ADP: honest NOT_IMPLEMENTED. Unconfigured Gusto: throws "Cannot submit payroll to Gusto: API credentials not configured". Configured Gusto (stubbed fetch capture): `POST /v1/companies/c1/payrolls {"start_date":"pp-2026-10-01","gross_pay":1000}`, with any HTTP 200 mapped to `success:true`, fabricated tax rates (federal 11.5%, state 5.8%, medicare 1.45%, SS 6.2%, FUTA 0.6%), `estimatedDebitDate`, and `getPayrollStatus` hard-coded to `submitted_to_gusto`. No `X-Gusto-API-Version` header, no OAuth, no token refresh, no webhook. Banking is `SandboxEmbeddedBankingProvider` with no BaaS client. | Classified SCAFFOLD. The Gusto flow does not match the documented create, update, calculate, submit sequence. It is not a working integration. |
| **C6** Dashboard crashes / hydration failure | **VERIFIED FIXED** | First render OK in jsdom (R0); Sarah gross 196 equals seed, so the phantom $20 is gone; remount hydration test passes; `regression-dashboard-hydration` 3/3; `tsc --noEmit` exit 0; `vite build` succeeds. | Fixing the crash exposed ePHI names on the ungated /dashboard route (C-11). |
| **C7** Server auth, state endpoint, Stripe entitlement | **PARTIALLY FIXED** | Fixed: `/api/practice-os/state` and 7 equivalents return 404; empty `Bearer `, `abc123`, garbage, random tokens return 401; CORS is an allowlist; audit actor no longer defaults to Sarah Chen (now `unverified_client_session`); client-supplied actor and timestamp are ignored. **Not fixed:** `checkAuth` calls `next()` when no Authorization header is present. `GET /api/audit-logs` without a header returns 200 with patient names and MRN; POST returns 201; EXPORT returns 200 (96,000 bytes). `eyJhbGciOiJub25lIn0.e30.`, `eyJ-expired-looking`, `demo-token-sarah-chen-jwt-valid` and `demo-token-whatever` all return 200 and set the user to Sarah Chen, practice owner. Stripe simulated branch creates `status:"complete"`, `paymentStatus:"paid"` immediately; the cached-session path hard-codes `subscriptionStatus:"active"`, `isSubscribed:true`; `/api/subscription/status` always returns active/pro; no webhook handler. | Authentication is not authentication. Entitlement is granted by creation. Any production deployment of this server leaks audit data and grants Pro. |
| **H1** Ledger not double-entry / GAAP-style claims | **PARTIALLY FIXED** | **Verdict: PARTIAL LEDGER.** Module ledger balances on every successful posting. See Section E for all 24 attacks, the 18,979-op fuzz and the divergence. Database accepts an unbalanced journal insert (D1: debits 1,000,000, credits 0). | Not a single source of truth; bank and ledger can diverge; reconcile is non-atomic (L4); no DB balance constraint. |
| **H2** Compensation engine correctness | **PARTIALLY FIXED** | Tier boundaries correct (#20 → 50%, #21 → 55%, #31 → 60%). Zero percentage and flat amount yield 0. Cancelled/no-show with no rule yield 0. Remediation suite 11/11. Independent BigInt reference over 400,000 cases: production tier set (50/55/60%) 300,000 cases, 0 mismatches; fractional percentages 3 mismatches in 360,000; negative collections 2,261 mismatches in 40,000. Refund symmetry fails in 99,878 of 200,000. | Float rounding path. No versioning, effective dates or period reset. Flat $85 on $60 collected earns 85 and retains −25. Partial payments without the caller's flag pay 80 against a fair 60. Undefined percentage silently becomes 50%. |
| **H3** Idempotency uniqueness index scope | **PARTIALLY FIXED** | Index is now `(practice_id, worker_id, COALESCE(encounter_id,0uuid), COALESCE(compensation_rule_id,0uuid), COALESCE(payment_event_id,0uuid), accrual_type)`. Cross-practice (X1) and cross-worker (X2, X3) accepted; duplicate payment-event accrual rejected (X9). **Defect:** a second legitimate `adjustment_clawback` or `admin_allowance` for the same worker with null keys is rejected (X5, X7). | Legitimate repeat adjustments collide on the zero-UUID. |
| **H4** RLS / authorization / role escalation / immutability | **PARTIALLY FIXED** | Blocked by trigger: self to owner/admin/practice_admin, colleague to owner, demote owner, upsert, Supabase-style JWT (E1–E6). Signed-note body, structured data, un-sign blocked (N1–N3, N6, N10, N11). A1–A4, A6–A9, A10–A14, A16, A17 blocked. **Still possible:** E7 edit of colleague NPI/license/email; E11 INSERT of a users row with role `owner` for a pending `auth.users` id; N4 clearing `signed_at` and `signature_hash`; N5 replacing signer/hash; N7 reassigning `clinician_id`/`template_type`; N8 DELETE; N9 TRUNCATE; T1 `authenticated` can TRUNCATE `journal_entry_lines` and `audit_logs` under Supabase default grants; A15 forge an audit row as another user. | Role model is dead under real Supabase JWTs (C-2). Immutability is partial. |
| **H5** Audit log tamper evidence | **PARTIALLY FIXED** (unchanged) | See Section F. HMAC defeats a plain-SHA256 recompute. Default key `theraflow-server-audit-secret-2026-key` is in source: rehash with the default key goes undetected (T3, T3b). Truncation, rollback and whole-file replacement are verified as clean even with a strong secret (S2–S4). No head hash, sequence anchor or WORM. | Supports only casual edits by someone without the key. |
| **H6** Clinical-to-financial unification | **NOT FIXED** | Chain trace: only `practice-os-context.tsx` emits bus events. No clinical module (`theraflow`, `scribe`, `aura`) references Practice OS. The cascade is a hard-coded payload (client "Jane Doe", CPT 90837, $150, `worker-dr-sarah-chen`, synthetic ids, compensation percentage 50, `isNoteSignedOnTime` true). **Verdict: DEMO ORCHESTRATION.** | The core product promise does not exist as code. |
| **H7** Test suite credibility | **PARTIALLY FIXED** | Independent re-run of 34 harness entry points: about 1,122 assertions, 1,114 pass, 8 fail (Section J). Remediation suites 79/79. | Implementer tests did not detect Q1, Q2, I3, L4 or the no-header audit access. |
| **H8** PHI de-identification claims | **NOT FIXED** (technical); marketing partially corrected | `src/tools` is byte-identical to the baseline. Holdout (610 snippets, 3,410 entities): recall 81.64%, precision 97.10%, F1 88.70%. Adversarial probe leaked 22 of 37 tokens; 11 of 16 cases leaked at least one. Both Gemini call paths sanitize in the browser with a client key: a convention, not a server chokepoint. | Not a de-identification tool. Marketing still claims zero leak (Section I). |
| **H9** Marketing / compliance truth | **NOT FIXED** | Three labels corrected (Landing badge, Onboarding banking line, BankingMoneyView badge). At least 10 misleading strings remain (Section I), including "FDIC-insured business checking", "Zero-Leak Statutory 18-Rule HIPAA Redaction", "HIPAA Safe Harbor Compliant", "100% Local HIPAA PHI Scrubber", "Guarantees zero sensitive PHI escapes", and a "GAAP-compliant" claim in the remediation report. | Regulatory and misrepresentation exposure for any buyer or customer relying on these claims. |

Scoring by row: 16 findings; VERIFIED FIXED 2 (C1, C6); PARTIALLY FIXED 11 (C2, C3, C4, C5, C7, H1, H2, H3, H4, H5, H7); NOT FIXED 3 (H6, H8, H9); REGRESSED 0. Defects introduced or exposed by the remediation are in Section C (the NEW DEFECT INTRODUCED label is applied there, not to the original findings).

---

## C. New and Residual Defects (found on c403048)

Severity: Critical = money or protected data loss or exposure reachable now; High = integrity or security failure likely in production; Medium = correctness or hardening gap.

| # | Severity | Defect | Evidence |
|---|---|---|---|
| C-1 | Medium | Accrual idempotency index collapses NULL keys to the zero UUID, so a second legitimate `adjustment_clawback` or `admin_allowance` for the same worker is rejected. | `idx.sql` cases X5, X7. |
| C-2 | High | The role model is dead under real Supabase JWTs. `current_user_role()` returns `'authenticated'` because the real token carries top-level `role: authenticated`; the `users.role` fallback is never reached. `payroll_admin` is accepted by `is_payroll_admin()` but is not in the `users.role` CHECK list. With a Supabase-style JWT for a user whose `users.role` is `owner`, payroll runs visible = 0 and bank visible = 0. No code in the repository provisions `app_metadata.role`. | Role-escalation attack set, Supabase-style JWT case. |
| C-3 | High | `users` table remains writable for colleague identity fields (E7: NPI, license, email edited by a clinician), and there is no INSERT trigger (E11: a `users` row with role `owner` can be inserted for a pending `auth.users` id). | `attack3.sh`. |
| C-4 | High | Signed-note immutability is incomplete: clearing `signed_at` and `signature_hash` (N4), replacing signer and hash (N5), reassigning `clinician_id`/`template_type` (N7), DELETE (N8) and TRUNCATE (N9) all succeed. | `attack3.sh`. |
| C-5 | Critical | `checkAuth` passes when no Authorization header is present, and trusts any `eyJ…` or `demo-token-…` string as Sarah Chen, practice owner. Audit read, write and export are open. The read returns patient names and MRN. | Port 3951 probes: no header 200, `eyJhbGciOiJub25lIn0.e30.` 200, `demo-token-whatever` 200, EXPORT 200 (96,000 bytes). |
| C-6 | High | Stripe entitlement: the simulated branch stores `complete`/`paid` at creation; the cached-session path hard-codes `isSubscribed:true` (read in source; a live-mode open or unpaid cached session would entitle); `/api/subscription/status` always returns active/pro; `/api/subscription/verify` accepts demo tokens and any paid cached id; no webhook handler. The live-Stripe branch alone records open/unpaid. | Server probes; source. |
| C-7 | High | Payroll latency race (Q1: two funded runs, −774.44 vs 387.22 due) and in-flight earnings marked paid but absent from the run (Q2). | `react5b.tsx`. |
| C-8 | High | Partial failure in reconcile: for a 0% compensation case the ledger posts 1010/4010 = 100 and then throws "Invalid line item amount: 0" while the bank is unchanged; the claim cannot be retried. | `bank2.ts` L4. |
| C-9 | High | `authenticated` can TRUNCATE `journal_entry_lines` and `audit_logs` under Supabase default grants. The DO INSTEAD NOTHING rules stop ordinary UPDATE and DELETE only. Deleting users or journal headers is broken by the rules versus RI ("referential integrity query … unexpected result"), which blocks them incidentally rather than by design. | T1, E9/E10, D3. |
| C-10 | Medium | CORS allowlist still reflects `http://localhost:9999` (any port) with credentials; hostile origin `evil.example` correctly returns 403. | Probe. |
| C-11 | Medium | Latent ePHI on the ungated /dashboard route: names "Marcus Vance" and "Elena Rostova" render without authentication. The baseline test passed only vacuously because the dashboard crashed. | `m2-empirical-audit` 52/53. |
| C-12 | Medium | Forging an audit row as another user succeeds in the database (A15). | `attack.sh`. |

---

## D. Architecture Reality

**Is PostgreSQL the system of record for the Practice OS? NO.**

Practice OS state classes as implemented (16 classes; plan versions do not exist):

| Store | Classes | Share |
|---|---|---|
| Browser `localStorage` | workers, clinician profiles, compensation plans, assignments, earnings, pay periods, payroll runs, run line items, reconciliations, idempotency keys (10) | **62.5%** |
| Memory / module singleton | payment-event history, funding events and bank transactions, bank accounts, journal headers, journal lines, financial summary (6) | **37.5%** |
| PostgreSQL | none | **0%** |
| Server file | none of the Practice OS (only the audit ledger, which is outside the Practice OS; the JSONL event store is written only when the bus runs under Node, that is, in tests) | **0%** |

- Actual system of record: the user's browser. The bank balance, transactions and journal are not even durable there; they reset to seed on remount.
- No server routes for compensation, payroll or banking exist (grep count 0), so "protected mutations" exist only in React code that any caller can invoke. Role changes to `practice_owner` and plan changes were accepted by any caller (R7).
- `supabase.from()` inventory: `appointments`, `clients`, `invoices`, `progress_notes`, `treatment_plans`. Only `clients` exists in the migrations. No Practice OS table is touched.
- The 859 SQL lines are therefore real, tested schema work that nothing uses. They receive no valuation credit as a running system.
- Codebase: about 28.7k TS/TSX lines in `src`, a 784-line `server.ts`, 859 SQL lines, and about 20.7k test lines.

---

## E. Financial Integrity

**Ledger verdict: PARTIAL LEDGER.**

The module-level double-entry ledger itself enforces balance on postings. It is not a system of record, and the surrounding bank, reconcile and payroll code can diverge from it.

Attack results (24 attacks):

- Works: a $100 insurance deposit moves operating cash +100 with a balanced journal (D1010 87.5, D1020 12.5, C4010 100; D5010 50, C2010 50).
- L1: the opening balance is not in the ledger.
- L2: two sources of truth. A $50k journal deposit does not move the bank.
- L3: patient responsibility of $20 is never deposited.
- L4: the zero-compensation partial failure above (ledger posted, bank not, claim not retryable).
- L5: the same ERA re-keyed funds operating +175 again.
- L6: phantom ACH returns of +$10,000 accepted.
- L7: a refund of a nonexistent charge of −$2,000 accepted.
- L8: a refund does not reverse the compensation payable or tax reserve.
- L9: a chargeback does not touch the bank; duplicate reversal is unguarded (1010 −200, 4010 −100).
- L10: the 2010 payable goes −4.93, and employer tax expense is never posted.
- L11: the same payroll under two ids funds twice (overdraft is blocked, duplication is not).
- L12: the constructor accepts an unbalanced history, and returned entries are mutable.
- L13: no tenant scoping.
- L14: the same journal reference posts twice.
- L15: fuzz run of 18,979 operations (1,021 threw). The ledger stayed balanced, but operating cash minus opening balance minus ledger account 1010 equals **−261,397.22**. The bank and ledger diverged.

Database layer, executed in PG16: D1 an unbalanced journal insert is accepted (debits 1,000,000, credits 0); D2 UPDATE blocked by rule; D3 header delete errors by RI; D4 journal header mutable; D5 direct bank balance set; D6 an earning can be re-paid or un-paid; D7 a duplicate external id is blocked; D8 a re-keyed duplicate is accepted; D9 blocked; D10 TRUNCATE works. The database has two triggers in total (the role and signed-note triggers) and four rules. There is no balance trigger or constraint.

Compensation engine (independent BigInt reference, 400,000 randomized cases, run separately from the 50,000-case property loop in the remediation suite): production tier set (50/55/60%, 300,000 cases) 0 mismatches. Mismatches appear only outside the production tier set: fractional percentages (3 of 360,000) and negative collections (2,261 of 40,000). Sum invariant (earning plus retained equals collected) violated 0 times. Refund symmetry pay(+c) then clawback(−c) is not zero in 99,878 of 200,000. Money is integer cents in ledger and bank, with a float `Math.round(Number(cents)*(pct/100))` in the engine.

Payroll: see C4 and C-7. Rollover works (periods advance, old ids rejected). Provider failure modes leave state unchanged.

---

## F. Security, RLS and Authorization

**Migration environments.** A (PG16.15, superuser migrator, external Supabase-style `auth` schema) and B (non-superuser `migrator` owning the database but not `auth`): both apply cleanly, 27 tables, 47 policies, 27 RLS-enabled, `auth` function owners unchanged. **Would it deploy under a realistic managed Supabase?** Likely yes for the schema objects, since the shim is skipped when `auth` exists and nothing in `auth` is created or replaced. This is inference from environment A/B; I did not run it on a managed project. The application would not function correctly there because of C-2.

**RLS attack matrix (original A1–A17, B1/B2).** A1–A4, A6–A9, A10, A10b, A11–A14, A16, A17 blocked. B1/B2 no escalation. **A5: only the caller's own earning is visible, and colleague pay is not readable.** **A15: forging an audit row as another user succeeds.**

**Corrections to my earlier report.** The intermediate report said A5 allowed reading colleague pay, and that A17 (the GUC) succeeded. Both statements were wrong. A5 is blocked and A17 is blocked. This final report is authoritative.

**Role escalation.** E1–E6 blocked (self to owner, admin, practice_admin; colleague to owner; demote the owner; upsert; Supabase-style JWT). Owner positive control works (E12). E13: cannot disable the trigger or set the replication role. Remaining holes: E7, E11 (C-3), E9/E10 DELETE blocked only incidentally.

**Signed notes.** N1, N2, N3, N6, N10, N11 blocked. N4, N5, N7, N8, N9 succeed (C-4).

**Application authorization (direct calls).** React-side Practice OS functions have no authorization; any caller changes roles and plans (R7). The server has no Practice OS routes.

**Audit-log integrity.** Matrix on the same ledger of 168 entries:

| Test | Default key | Strong secret |
|---|---|---|
| Baseline | 168 verified | 168 verified |
| Edit actor without rehash | detected | detected |
| Edit action without rehash | detected | detected |
| Rehash with plain SHA-256 | detected (168 unverified) | detected |
| Rehash with the default key | **undetected** | detected |
| Forge timestamp with the default key | **undetected** | detected |
| Truncate newest 10 | **158 verified, undetected** | **undetected** |
| Truncate half | **84 verified, undetected** | **undetected** |
| Roll back to an older 100 | **undetected** | **undetected** |
| Replace the whole file (3 forged records) | **verified, undetected** | detected for default-key forgeries |

Verification runs at startup only. There is no external anchor, head hash, sequence number or WORM store. The default HMAC key is a string literal in source. The threat model actually supported is a casual editor who does not hold the key.

**Server endpoints (auth).**

| Probe | Result |
|---|---|
| Audit GET, no header | 200 (PHI-bearing) |
| `Bearer ` (empty) | 401 |
| `abc123`, garbage, `randomtoken` | 401 |
| `eyJhbGciOiJub25lIn0.e30.` | 200 as owner |
| `eyJ-expired-looking` | 200 as owner |
| `demo-token-sarah-chen-jwt-valid`, `demo-token-whatever` | 200 as owner |
| POST, no header | 201, actor `unverified_client_session` |
| POST with `eyJ`/demo token | actor sarah.chen.md@behavioralhealth.org |
| EXPORT no header / `eyJfake` | 200 / 200 |
| `/api/practice-os/state` plus 7 equivalents | 404 |

---

## G. External Integrations

| Integration | Classification | Evidence |
|---|---|---|
| **Gusto** | **SCAFFOLD** | Under a stubbed fetch the code issues `GET https://api.gusto-demo.com/v1/me` (no `X-Gusto-API-Version`), `POST /v1/companies/c1/employees {first_name,last_name,email}` and `POST /v1/companies/c1/payrolls {"start_date":"pp-2026-10-01","gross_pay":1000}`. Gusto's documented flow is create off-cycle payroll, update, calculate, submit; it has no documented `gross_pay` total on create. Any HTTP 200 returns `success:true` with fabricated tax numbers and an `estimatedDebitDate`. `getPayrollStatus` is hard-coded `submitted_to_gusto`. `previewPayroll` makes no network call. No OAuth, token refresh or webhook. Unconfigured, it now throws and changes no state (improvement, VERIFIED). |
| **ADP** | Honest NOT_IMPLEMENTED | Throws; no state change (R10). |
| **BaaS / banking** | Honest simulation, no client | `SandboxEmbeddedBankingProvider`, institution "TheraFlow Sandbox Treasury (Simulated BaaS Partner - Demo Only)". No partner API client, no webhooks, no ACH rail. Mark: simulation, correctly labeled in the provider but not in all UI strings. |
| **Stripe** | Simulated plus live SDK branch | Simulated checkout is paid at creation; no webhook endpoint (404 on 4 paths); the live branch records open/unpaid; the live SDK call fails here with 502 because the sandbox has no network (environment-only). |
| **Clearinghouse** | Formatter only | No transmission code found. |
| **AI (Gemini, Deepgram)** | Real SDK calls from the browser | Both Gemini paths (`ai-note-expander.ts`, `ai-template-generator.ts`) call `sanitizeForOutboundLlm` browser-side with a client-held key. A convention, not a server chokepoint. |

---

## H. Clinical-to-Financial Unification

**Verdict: DEMO ORCHESTRATION.**

Only `src/lib/practice-os-context.tsx` emits bus events (`encounter.completed`, `compensation.accrued`). Its consumers are BankingMoneyView, CompensationView, DashboardHome, MigrationWizard, OnboardingWizard, PayrollView and WorkforceView. No clinical module (`theraflow`, `scribe`, `aura`) references Practice OS. The cascade fires from a button with a hard-coded payload (client "Jane Doe", CPT 90837, $150, worker `worker-dr-sarah-chen`), synthetic ids `enc-<worker>-<client>-<date>` and `claim-<enc>`, `compensationPercentage` fixed at 50 and `isNoteSignedOnTime` fixed true. A signed note in the scribe or EHR does not create an encounter, a claim, a payment or an earning. The remediation correctly stopped the duplicate cascade from paying twice and reordered it (deposit, earning, then accrual event), but the chain it protects is a demonstration.

---

## I. PHI and Privacy

**Technical.** `src/tools` is identical to the baseline.

- Gold benchmark: 100% recall (1,261 of 1,261), precision 77.03%, 376 false positives. The scrubber was tuned against this set, so there is no credit for it.
- Independent holdout (610 snippets, 3,410 entities): recall **81.64%**, precision 97.10%, F1 88.70%; structured recall 92.18%, unstructured 71.17%; TP 2,784, FN 626, FP 460. The fail-closed gateway behavior was verified.
- Adversarial probe (16 cases, 37 sensitive tokens): **22 of 37 tokens leaked; 11 of 16 cases leaked at least one.** Leaks: accented names (partial), apostrophe and hyphenated names, nicknames, small-town geography, spelled-out phone numbers, separated-digit phone and SSN, social handles, natural-language dates, spelled-out emails, relative names and ages.
- Both AI call paths scrub before sending, but in the browser, with the client key. Another call site bypasses it. No server-side chokepoint, no BAA path, no logging control exists.
- It is a useful best-effort redaction aid. It is not a HIPAA Safe Harbor de-identification tool and cannot be licensed as one.

**Marketing and product language (assessed separately).**

Corrected on this commit: Landing badge now "Client-Side Safe Harbor Pattern Scrubber"; OnboardingWizard "Embedded business banking sandbox enabled"; BankingMoneyView badge "BaaS Sandbox Treasury".

Still misleading at the audited SHA:

- `BankingMoneyView.tsx:69` "FDIC-insured business checking…"
- `Landing.tsx:76` "Zero-Leak Statutory 18-Rule HIPAA Redaction"
- `DashboardHome.tsx:157` "zero-leak diff viewer"
- `InvestorDeck.tsx:53` "HIPAA Safe Harbor Compliant"; `:111` "All 18 … redacted in-browser before any data reaches cloud AI models"; `:389` "100% Local HIPAA PHI Scrubber"
- `DemoGuideModal.tsx:225` "zero cloud leak"; `:760` "Guarantees zero sensitive PHI escapes"
- `PhiScrubberView.tsx:120` "removing all 18 statutory identifiers"
- `ClientsView.tsx:178` "HIPAA-compliant medical record"
- "Zero-Leak De-identification" and "Zero Cloud Leak" strings in the built `dist`
- Docs: `EMBEDDED_BANKING_ARCHITECTURE.md` ("Underlying Regulated Partner Bank: FDIC Insured"), `STRATEGIC_ACQUISITION_BRIEF.md`, "GAAP" in code comments (`double-entry-ledger.ts:4`, `banking-provider.ts:9`), and "GAAP-compliant DoubleEntryLedger" in the remediation report (H1)
- `types/practice-os.ts:216` comment naming a bank and "Member FDIC"

The investor deck at line 623 correctly lists SOC 2 and HITRUST as future work. Marketing truth pass: **PARTIAL, three of at least thirteen locations corrected.** The measured facts (81.64% holdout recall, 11 of 16 leaking probes) contradict "zero leak" and "all 18".

---

## J. Test Results

All suites run against the scratch copy of the exact SHA; I did not accept the remediation report's counts. Property loops are reported separately.

- Harness entry points: **34** (5 remediation, 29 legacy; the end-to-end runner has 4 files).
- Assertions executed: about **1,122**; passed about **1,114**; failed **8**.
- Remediation suites: **79/79** (`practice-os-unified` 39, `adversarial-financial-and-security` 23, `compensation-engine-adversarial` 11, `regression-dashboard-hydration` 3, `migration-pipeline` 3). `migration-pipeline` fails on the device VM for environment reasons only (no `createdb`/`psql`) and passes 3/3 in the cloud PG16.
- Legacy: m3-ehr 30/30; m4-scribe 61/61; m4-challenger 44/44; m3-challenger 32/32; tier5-coverage 87/87; tier5-challenger 54/54; m5-aura 85/85; m5-challenger 50/53 (CHAL-1.1a, 2.2, 4.1; same as baseline); adversarial-security-audit 26/26; subscription-gate 17/17; auth-redirect 12/12; e2e 80/80; burst 7/7; deep-audit 31/31; m2-empirical-audit 52/53; m2-stress 24/24; m3-concurrency 16/16; m4-deep-probe 13/13; m4-empirical-stress 27/27; m4-it2 42/42; m4-it3-empirical 44/44; m4-it3-stress 15/15; m5-it2-stress 12/12; m5-challenger-empirical 40/40; m5-it2-empirical-challenger 47/49 (SCHED-2.2, CONF-4.1; baseline); empirical-auth-stress 17/17; race-stress 23/23; empirical-server-stress 26/27; forensic-m2 21/22.
- Failures by cause: pre-existing baseline defects 5 (m5-challenger 3, m5-it2-empirical 2); the empirical-server-stress failure (OPTIONS `/api/health` CORS reflection, pre-existing); `m2-empirical-audit` 1 (real ePHI names on the ungated dashboard, newly visible because the dashboard no longer crashes; C-11); environment-only 1 (live Stripe SDK 502 with no network). The `migration-pipeline` device failure is environment-only and not counted in the 8.
- Flaky under parallel load, passing when run alone: burst (port clash), m4-it2 (62 ms against a 50 ms timing assertion).
- `tsc --noEmit` exit 0. `vite build` succeeds.
- Property loops, reported separately: the remediation suite's 50,000-case compensation loop; my 400,000-case BigInt reference loop (Section E); my 20,000-op ledger fuzz (18,979 executed).
- My own adversarial harnesses (not counted above): comp2, bank2, bus2a/2b, react2/3/4/5b, gusto2, phi2/phi3, attack/attack2/attack3 SQL, idx.sql, tamper3. Their results are the evidence in B–I. They found failures the implementer's suites did not (Q1, Q2, I3, L4, C-5).

---

## K. Production Readiness

| Subsystem | Maturity |
|---|---|
| Schema / RLS (SQL) | Good design, deploys in two environments; not wired to anything; role model broken for real JWTs; immutability partial. Prototype+ |
| Practice OS state & persistence | Browser demo. Prototype |
| Idempotency / event bus | Prototype |
| Payroll orchestration | Prototype; double-funding race open |
| Ledger / banking | Partial ledger library; no BaaS. Prototype+ |
| Compensation engine | Solid for the production tier set; needs fixed-point math, versioning and effective dating. Library |
| Gusto / ADP | Scaffold / not implemented |
| Server auth, audit, Stripe | Not production-safe |
| Clinical (EHR/scribe/aura) UIs | Demo-grade, working in tests |
| PHI scrubber | Research-grade redaction aid, 81.6% holdout recall |
| Clinical-to-financial chain | Demo orchestration |

**Blocking items before any live customer:** (1) server-authoritative persistence in PostgreSQL for all Practice OS state, with transactional idempotency; (2) real authentication (verified JWT signature) on every route and an `app_metadata` provisioning flow; (3) fixing the payroll concurrency race and the in-flight earnings defect server-side; (4) a single ledger source of truth with a DB balance constraint and no TRUNCATE grant; (5) real Gusto or a replacement (OAuth, documented payroll flow, webhooks) and a real BaaS partner; (6) wiring signed notes to encounters, claims and earnings; (7) an externally anchored audit log; (8) PHI controls: BAA-covered AI path, server-side chokepoint, and independent evaluation; (9) a marketing and compliance pass; (10) security review, SOC 2 or HIPAA program, and regulated partners.

**Estimated cost to reach production:** about 24 to 36 engineer-months, **9 to 14 calendar months** for an established buyer with a team and existing payroll and banking relationships. This is deliberately conservative. It excludes regulatory standing, partner onboarding delays and compliance audits, which can add months.

---

## L. Fresh Valuation

Context assumed throughout: no revenue, no customers, no live PHI, no regulatory standing, no live banking or payroll partnership. This valuation is entirely fresh. The valuation in the intermediate re-audit is disregarded. Reference points are the original audit's $40–90k FMV and $100–250k strategic.

| Measure | Original audit | Final (as verified at c403048) |
|---|---|---|
| FMV, technology / IP | $40–90k | **$50–95k** |
| Reasonable asking price | n/a | $150–220k |
| Likely closing price | n/a | $40–85k |
| Strategic-acquirer value | $100–250k | **$110–260k** |
| Replacement cost of the as-verified asset | n/a | $90–150k |
| Cost to reach production | n/a | $450–750k |
| OEM / licensing value (comp engine plus ledger library) | n/a | $15–40k |
| OEM value of the PHI scrubber | n/a | not licensable as de-identification at 81.64% holdout recall; research value only |

**What justifies each increase above the original audit, each tied to a specific VERIFIED remediation:**

1. **Migration deploys in two realistic environments with the auth schema left alone (C1).** Verified by `ON_ERROR_STOP=1` applications in A and B and a passing PG16 pipeline test. This removes a deploy-blocking defect and lifts the SQL from unusable to usable schema work: roughly +$4–8k.
2. **Role and signed-note triggers and the scoped idempotency index.** Verified in PG16 against 13 role/escalation attacks and 11 note attacks. Partial, with known holes (C-2, C-3, C-4), so only a small uplift: roughly +$2–4k.
3. **Dashboard crash fixed and phantom-duplicate cascade closed; unconfigured Gusto/ADP now fail honestly; rollover works.** Verified by executed provider-failure and rollover tests. These reduce the demo's liability and improve diligence credibility: roughly +$3–5k.
4. **Partial ledger and compensation engine.** Verified against a 400,000-case independent reference with 0 mismatches on the production tier set. They carry the OEM figure of $15–40k and a modest strategic bump.

**No uplift is given for:** the remediation report and the added documents; interfaces and files that merely exist; the unused SQL tables (no app code uses them); the honest simulations; the implementer's self-reported tests; and the Gusto and BaaS scaffolds. The strategic figure rises less than the verified items imply because the unfixed items (no PostgreSQL system of record, the payroll race, the unauthenticated audit API, a PHI scrubber that leaks, and marketing that still overclaims) are exactly what a strategic acquirer would have to rebuild or indemnify.

**Bottom line:** the asset is worth modestly more than at the original audit, and the increase comes from a deployable schema, a sound compensation engine for the production tiers, a partial ledger, and honest failure behavior. It is not a payroll, banking or compliance platform. A buyer should price it as a well-tested prototype plus a deployable schema, not as the unified Practice OS the remediation report describes.
