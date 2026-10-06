# TheraFlow Technical Due Diligence & Acquisition Package

**Document updated:** October 6, 2026

**Asset:** TheraFlow Clinical OS / Clinical Telehealth, AI Scribe & Practice OS

**Repository:** [alexmarshiamft/clinical_saas_launch](https://github.com/alexmarshiamft/clinical_saas_launch)

**Evaluation posture:** Synthetic data and sandbox workflows

**Scope:** Repository evidence, documented SEC-01/02/03 remediation, and recorded automated test results. This memo is not an independent certification or a new security audit.

## 1. Release Provenance

| Reference | Exact identity and meaning |
|:---|:---|
| Core security remediation | [`4113573e982e6176ea8c71c3deb2862f44a6f11e`](https://github.com/alexmarshiamft/clinical_saas_launch/commit/4113573e982e6176ea8c71c3deb2862f44a6f11e) |
| Preserved published release | `v1.1.0-security-remediated` resolves to [`515cefe320b46b9e50695849dd23ce0c2b93cd63`](https://github.com/alexmarshiamft/clinical_saas_launch/commit/515cefe320b46b9e50695849dd23ce0c2b93cd63). This is the documentation snapshot containing the core remediation. Its annotated tag is unsigned. |
| Published acquisition package | `v1.1.1-acquisition-package` resolves to [`fd9e2b3e442016f4dc9e85b893bb092b68393a97`](https://github.com/alexmarshiamft/clinical_saas_launch/commit/fd9e2b3e442016f4dc9e85b893bb092b68393a97). Its successful CI includes the original migration harness. |
| Further accuracy corrections | Candidate release `v1.1.2-acquisition-accuracy`. Resolve the tag after publication to obtain the authoritative package commit; the tag/release evidence must identify its completed CI runs. Publication and current-candidate CI validation are pending at preparation of this source document. |

The published `v1.1.0-security-remediated` and `v1.1.1-acquisition-package` tags must retain their original targets. The earlier documentation commit `9518a84` exists but does not identify either release snapshot or the latest corrected package. Branch names can move; use full commit IDs and release tag resolution for evaluation.

```sh
git fetch origin --tags
git rev-parse 'v1.1.0-security-remediated^{commit}'
git rev-parse 'v1.1.1-acquisition-package^{commit}'
git rev-parse 'v1.1.2-acquisition-accuracy^{commit}'
```

The candidate resolution succeeds only after its tag is published. Refer to the tag annotation and its linked GitHub release for final evidence rather than treating earlier green CI as proof of a later commit.

## 2. Acquisition Assessment

The asset is a functional clinical frontend, domain logic, and database migration foundation for an acquiring engineering team. The repository includes EHR workspaces, clinical note templates, a diagnostic reference interface, redaction heuristics, compensation calculations, ledger logic, payroll payload formatters, and a treasury sandbox. Production vendor services and operational controls remain deployment work.

| Dimension | Supported conclusion |
|:---|:---|
| Functional scope | Working browser and server logic is available for evaluation with synthetic fixtures. Some apparent integrations are payload formatters or simulations. |
| Security work completed | Source and automated tests document remediation of SEC-01 authentication/tenant checks, SEC-02 audit tenant filtering, and SEC-03 clinical-note permissions. |
| Database assets | The two migrations define 31 public table targets plus an `auth.users` compatibility target. Ordered execution produces 58 active public RLS policies from 59 policy creation statements. See the counting methodology below. |
| Verification | Published-release CI passed the listed suites. The `v1.1.0` workflow omitted migration execution; `v1.1.1` added the original harness. The corrected migration harness in this further accuracy candidate requires its own successful run evidence. |
| Commercial activation | Supabase, Stripe subscription checkout, and Gemini code paths exist, but configured credentials do not establish complete production persistence, vendor acceptance, or regulatory readiness. |
| Acquisition limits | No independent certification, production PHI approval, guaranteed launch timeline, or independently appraised replacement value is represented. |

## 3. Functional Inventory: Working, Sandbox, and Unimplemented

### Working code and implemented logic

| Module | Implemented behavior | Evaluation boundary |
|:---|:---|:---|
| Clinical EHR | Client roster, scheduling interfaces, DAP note editor, treatment plans, and billing forms | Synthetic/local workflows are available; production data persistence must be validated separately. |
| Scribe and note expansion | Clinical templates and deterministic note generation; configured Gemini SDK calls | Outputs need clinician review. No clinical efficacy or universal response-time claim is made. |
| Aura diagnostic reference | Diagnostic reference data and differential/structured-note interfaces | A reference and workflow tool; no independent clinical validation is claimed. |
| PHI scrubber | Browser JavaScript regex rules mapped to 18 Safe Harbor identifier categories; Tag, Block, and Asterisk masking | Rule definitions and synthetic examples do not establish complete identifier detection or legal de-identification. |
| Outbound LLM privacy gateway | Sanitizes implemented clinical Gemini call paths; throws on sanitization exceptions and detected retained patient name/MRN | Heuristic detection can miss identifiers. Fail-closed handling of detected failures does not prove zero leakage. |
| Compensation and money calculations | Tiered compensation logic; integer-cent/basis-point helpers `calculateBasisPointsCents` and `parseBasisPoints` | Financial invariants cover specified scenarios; this is not a claim that every numeric operation in the application avoids floating point. |
| General ledger | Journal balancing, reversal, and treasury allocation logic | Application bookkeeping logic, not a live banking or tax service. |
| Database migrations | Tables, RLS policies, signed-note locks, and draft-note author/admin guards | Migration source and isolated PostgreSQL tests; no live customer database deployment is evidenced here. |
| API authorization | JWT `checkAuth`, role checks on protected financial/billing routes, tenant checks, audit tenant filtering | Documented routes and tests are the evidence; no claim that every public endpoint requires authentication is made. |
| Superbill and EHR export formatters | Reimbursement statement UI with CPT/ICD inputs and print/clipboard output; Epic/Cerner text and FHIR `DocumentReference` JSON | The source supports statement/text formatting. An official 33-box CMS-1500 editor, 837P generator, clearinghouse conformance, and hospital API interoperability are not evidenced. |

### Synthetic and sandbox behavior

| Capability | What the evaluator sees | What it does not demonstrate |
|:---|:---|:---|
| Embedded treasury | Simulated checking, tax allocation, payroll escrow, and transactions | Regulated accounts or movement of real funds |
| Payroll adapters | Payroll batch payloads and CSV exports | Payroll-provider submission or automated tax filing |
| Speech recognition/speaker feed | Browser WebSpeech recognition and heuristic/manual speaker attribution | Validated acoustic diarization; recognition privacy depends on the browser/provider |
| Telehealth | Local media controls and a simulated meeting response | A working production multiparty relay; `/api/telehealth/meeting` returns simulated Chime URLs |
| Subscription checkout | Simulated sessions without configured Stripe credentials; SDK path when configured | Production billing validation merely from a successful sandbox checkout |
| Client invoice checkout | `/api/billing/create-checkout` returns a simulated invoice session | Live invoice collection, even when a Stripe key is configured |
| Claims/payment fixtures | Synthetic claim status and payment events in Practice OS workflows | 837P transaction generation, a 277CA acknowledgment, or payer acceptance |

### Vendor services not yet implemented or operationally validated

Live payroll/tax submission, regulated banking rails, clearinghouse transport/remittance ingestion, server-side acoustic diarization, and production telehealth media services require engineering, provider onboarding, and end-to-end validation. Supplying commercial keys alone does not implement these services. Infrastructure agreements, applicable BAA scope, operational privacy controls, monitoring, backups, and incident procedures remain buyer deployment requirements.

## 4. Architecture and Data Flow

The frontend uses React 19, TypeScript, Vite, and Tailwind CSS. `server.ts` provides the Express API. Historical CI targets Node 22. Dependency versions are defined by `package.json` and `package-lock.json`; this memo does not assert that every deployed environment uses a particular PostgreSQL or Vite version.

```text
React clinical and Practice OS interfaces
  ├─ synthetic fixtures / browser storage for evaluation
  ├─ redaction engine → privacy gateway → configured Gemini call paths
  └─ Express API
       ├─ protected route authentication / roles / tenant checks
       ├─ Practice OS domain logic and local persistence
       ├─ tenant-filtered HMAC audit file
       ├─ Stripe subscription SDK or simulator
       └─ invoice / meeting simulators

Supabase client and SQL migration assets
  └─ production schema, auth configuration, and persistence validation required
```

Migration files are deployable assets, not evidence that all application data is already backed by live PostgreSQL. The audit JSONL file is application-managed local persistence with HMAC checks; production retention, access restrictions, backup durability, and tamper response require operational design.

**Known deployment limitation:** `vite.config.ts` defines `process.env.GEMINI_API_KEY` into browser code. A configured Gemini key can therefore be included in the delivered client bundle. Move provider secrets and calls behind a server boundary before a real deployment; this accuracy release documents the limitation without changing that code path.

## 5. Documented Security Remediation

The core remediation reference is `4113573e982e6176ea8c71c3deb2862f44a6f11e`, retained in the published snapshot at `515cefe320b46b9e50695849dd23ce0c2b93cd63`.

| Finding | Source change and tested behavior |
|:---|:---|
| SEC-01: API authentication and tenant enforcement | Added `checkAuth` to telehealth meeting and invoice checkout routes; billing role checks; rejection of cross-tenant ledger query and financial mutation inputs; removal of the Practice OS owner/admin tenant escape path. |
| SEC-02: Audit tenant filtering | Removed fallback inclusion of records with no practice ID; assigned legacy records to the demo practice; rejected cross-tenant log creation. The audit implementation includes a local JSONL file and HMAC-SHA256 checks. |
| SEC-03: Clinical-note write permissions | SQL triggers restrict unsigned-note mutation/deletion to the author or permitted practice administrator and block author reassignment. Signed-note protections and granular clinical-note policies remain migration assets. |
| Financial calculation hardening | Introduced integer-cent/basis-point helpers and exact basis-point parsing for documented allocation paths. Financial invariants exercise cent conservation and balanced journal behavior. |

Use the phrase **“security-remediated against documented findings.”** Automated checks substantiate covered behavior; they do not establish that the entire system has no remaining vulnerabilities. Historical server tests contain source-level SQL checks. A database migration/RLS execution test provides different evidence: omitted from `v1.1.0` CI, included with the original harness in `v1.1.1`, and strengthened in this accuracy candidate.

## 6. PHI Scrubber Evidence and Limitations

The scrubber defines 18 heuristic rule groups. The pure `scrubText()` function operates in browser JavaScript without making a network request itself. That statement does not describe all browser recognition, AI, or application network behavior.

Recorded benchmark artifacts must be read with their specific corpus and evaluation method:

| Recorded artifact | Corpus and date | Recorded recall | Limitation |
|:---|:---|:---|:---|
| [`phi_scrubber_benchmark_results.json`](phi_scrubber_benchmark_results.json) | Gold-standard synthetic corpus, October 5, 2026; 1,261 expected entities in 392 snippets | 100% on that corpus | Finite synthetic examples; no general guarantee |
| [`phi_scrubber_holdout_results.json`](phi_scrubber_holdout_results.json) | Holdout synthetic corpus, evaluated `2026-10-05T17:49:28.739Z`; 3,410 expected entities in 610 snippets | 81.64%; 626 expected entities missed | Demonstrates incomplete detection, particularly for some unstructured identifiers |
| [`THERAFLOW_REMEDIATION_PASS2_REPORT.md`](THERAFLOW_REMEDIATION_PASS2_REPORT.md), section M | Historical fresh-holdout report dated October 5, 2026; 1,540 expected entities in 250 snippets | Recorded 92.79%; 111 expected entities missed | Historical narrative report, not new CI evidence or a real-world performance estimate |

The historical reports' precision/false-positive arithmetic requires reconciliation, so this memo does not present precision or F1 as validated results. Recorded recall is the evaluator's metric on synthetic annotated entities; overlap-based matches do not necessarily mean every identifying character was removed. These artifacts are historical benchmark evidence, not an independent regulatory assessment.

The privacy gateway rejects detected retained context identifiers and engine failures. Identifiers outside its detection rules may remain. Do not describe it as “zero PHI leakage,” universal coverage of all identifier forms, or proof that arbitrary text is safe for external transmission.

## 7. Test Evidence and CI Scope

### Historical successful runs

| Checkpoint | Branch label at run | GitHub Actions run |
|:---|:---|:---|
| Core remediation | `master` | [37511948228](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37511948228) |
| Core remediation | `remediation-pass-2` | [37511959898](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37511959898) |
| Published documentation snapshot `515cefe` | `master` | [37514914857](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37514914857) |
| Published documentation snapshot `515cefe` | `remediation-pass-2` | [37514932475](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37514932475) |
| Published `v1.1.1` snapshot `fd9e2b3` | `master` | [37519919273](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37519919273) |
| Published `v1.1.1` snapshot `fd9e2b3` | `remediation-pass-2` | [37519932172](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37519932172) |

These recorded runs completed successfully. The first four, associated with the core remediation and `v1.1.0` snapshot, did **not** execute `tests/migration-pipeline.test.ts`. The two `v1.1.1` runs did execute the original migration harness; they do not establish the stronger corrected-harness checks in this candidate.

In particular, the original TRUNCATE probe re-granted table privileges after the migrations and observed a trigger rejection. That outcome demonstrated denial in that scenario, but did not prove the migration had revoked TRUNCATE privileges. The corrected harness tests those privileges directly and requires the privilege-denied outcome.

| Historical check | Command | Recorded result |
|:---|:---|:---|
| TypeScript | `npm run typecheck` | Passed |
| Vite bundle | `npm run build` | Passed |
| Client security | `node scripts/adversarial-security-audit.mjs` | 26/26 |
| Server security and tenant isolation | `npx tsx tests/server-security-and-tenant-isolation.test.ts` | 29/29 |
| Empirical server stress | `npx tsx tests/empirical-server-stress.ts` | 28/28 |
| EHR | `npx tsx tests/m3-theraflow-ehr.test.ts` | 30/30 |
| Scribe | `npx tsx tests/m4-clinical-scribe.test.ts` | 61/61 |
| Aura and scrubber | `npx tsx tests/m5-aura-scrubber.test.ts` | 85/85 |
| Financial/security invariants | `npx tsx tests/adversarial-financial-and-security.test.ts` | Passed |

Counts identify the named suites and their recorded assertions. They are not a total count of every repository test, a full browser end-to-end certification, or live-vendor evidence. No unsupported CI “stage count” is assigned.

### Corrected package validation

The accuracy candidate retains PostgreSQL migration validation using `npx tsx tests/migration-pipeline.test.ts` and strengthens that harness to verify exact inventories, all 12 explicit TRUNCATE revocations, and behavioral outcomes. Successful CI coverage for the candidate remains pending until a run on its actual commit completes. Final run IDs, conclusions, and the authoritative package SHA belong in its PR evidence and, after publication, the `v1.1.2-acquisition-accuracy` tag/GitHub release notes.

Separately executed local migration verification is distinct from historical GitHub CI. The corrected harness passed on an isolated PostgreSQL 14.23 instance, observing 31 public tables, one auth table, and 58 active public policies. It checks 12 explicit TRUNCATE revocations and 13 behavioral scenarios. Six clinical-note scenarios exercise trigger permissions using database-admin access with supplied JWT identity; they are not authenticated-role RLS probes. The new CI PostgreSQL service must establish its own result; this local run does not substitute for it.

## 8. Database Inventory and Counting Method

Inventory the two versioned migration files in order: `20261005_init_schema.sql`, then `20261005_unified_practice_os.sql`.

| Measure | Count | Method |
|:---|:---:|:---|
| `CREATE TABLE` source statements | 33 | Count both migration files, including repeat declarations |
| Distinct table targets | 32 | Normalize unqualified table names to `public`; count schema-qualified targets once |
| Public application table targets | 31 | Exclude the `auth.users` standalone-PostgreSQL compatibility target |
| Compatibility target | 1 | `auth.users` is declared twice but counted once; managed Supabase supplies its own auth schema |
| `CREATE POLICY` source statements | 59 | Count all creation statements, including the policy later replaced |
| Active public RLS policies after ordered execution | 58 | Query `pg_policies` after both migrations; five `DROP POLICY IF EXISTS` statements occur, but only one removes a previously created policy |

The original `clinical_notes_practice_isolation_policy` is dropped and replaced by granular policies. Thus 59 creation statements and 58 active policies describe different measures. The older “27 tables” inventory is stale. These counts do not independently prove complete RLS coverage, correct grants, or every possible role/tenant behavior; evaluate the migration test scenarios and deployment separately.

## 9. Buyer Deliverables and Evaluation

The buyer package contains frontend and domain source, Express API, two SQL migrations, automated verification suites, setup/handoff documentation, an acquisition-readiness brief, and investor/walkthrough PDFs. Use the corrected release reference when distributing them. Prior PDFs or historical audit reports retain the context of their original checkpoint and should not override the corrected package inventory or limitations.

For local evaluation, install locked dependencies with `npm ci` and start the application using `npm run dev`. Follow [BUYER_HANDOFF.md](BUYER_HANDOFF.md) and [ENVIRONMENT_SETUP.md](ENVIRONMENT_SETUP.md) for configuration and synthetic-data evaluation. A successful local demo is evidence of those workflows, not production deployment readiness.

## 10. Replacement-Cost Interpretation

Earlier materials estimated 1,540–2,980 engineering hours, with a 2,180-hour base scenario, and used an illustrative $125/hour rate. These are author planning assumptions, not measured implementation effort, a validated market rate, an independent valuation, or a purchase-price recommendation. The resulting arithmetic is $192,500–$372,500 with a $272,500 base scenario. Production integrations, compliance operations, provider fees, support, and infrastructure costs are outside that estimate. No engineering-time savings or launch-date guarantee follows from it.

## 11. Remaining Deployment and Integration Work

Before real customer data or commercial operations, validate production persistence paths, deployed migrations, auth/role configuration, secret handling, audit retention/backups, and monitoring. Provider calls and keys need an appropriate server boundary. Confirm exact vendor products, agreement/BAA scope where applicable, and operational requirements rather than assuming that an API key establishes them.

Validate live subscription billing separately from the simulated invoice endpoint. Implement and verify external payroll submission, bank rails, clearinghouse transport, diarization, or multiparty telehealth when those services are in scope. Formatters and simulator responses are useful acquisition assets but do not show an operational integration.

The next evaluation deployment should use synthetic data. Its availability and deployment checks must be reported separately from this repository snapshot.

## 12. Asset-Sale Classification

**Functional prototype and workflow-engine foundation, with implemented domain logic and explicit integration/deployment gaps.**

The acquisition value is reusable clinical UI, workflow modeling, financial logic, migration assets, and reproducible evaluation material. Commercial activation depends on the buyer's implementation, provider onboarding, infrastructure, and operational controls. This package does not predict a 30–60-day launch or represent the software as certified or approved for real PHI.

## 13. Evidence Index

- [Core remediation commit](https://github.com/alexmarshiamft/clinical_saas_launch/commit/4113573e982e6176ea8c71c3deb2862f44a6f11e)
- [Preserved published snapshot](https://github.com/alexmarshiamft/clinical_saas_launch/tree/515cefe320b46b9e50695849dd23ce0c2b93cd63)
- [Historical workflow at the preserved snapshot](https://github.com/alexmarshiamft/clinical_saas_launch/blob/515cefe320b46b9e50695849dd23ce0c2b93cd63/.github/workflows/ci.yml)
- [Published acquisition snapshot](https://github.com/alexmarshiamft/clinical_saas_launch/tree/fd9e2b3e442016f4dc9e85b893bb092b68393a97) and [its workflow](https://github.com/alexmarshiamft/clinical_saas_launch/blob/fd9e2b3e442016f4dc9e85b893bb092b68393a97/.github/workflows/ci.yml)
- [Current workflow source](.github/workflows/ci.yml) and [migration execution test](tests/migration-pipeline.test.ts)
- [Server API and audit implementation](server.ts)
- [Initial migration](supabase/migrations/20261005_init_schema.sql) and [Practice OS migration](supabase/migrations/20261005_unified_practice_os.sql)
- [Money calculation helpers](src/modules/money/banking-provider.ts) and [compensation engine](src/modules/compensation/compensation-engine.ts)
- [Redaction rules](src/tools/phi-scrubber/safeHarborRules.ts), [scrub function](src/tools/phi-scrubber/engine.ts), and [privacy gateway](src/tools/phi-scrubber/phi-privacy-gateway.ts)
- [Scribe generator](src/tools/scribe/ai-template-generator.ts), [note expander](src/tools/theraflow/ai-note-expander.ts), and [Vite environment definitions](vite.config.ts)
- [Superbill reimbursement formatter](src/tools/theraflow/SuperbillModal.tsx) and [EHR export formatters](src/tools/scribe/utils/ehrExportAdapters.ts)
- [Buyer handoff](BUYER_HANDOFF.md), [acquisition-readiness brief](ACQUISITION_READINESS.md), and [environment setup](ENVIRONMENT_SETUP.md)
- [Investor presentation PDF](clinical_saas_investor_presentation.pdf) and [platform walkthrough PDF](clinical_saas_platform_walkthrough.pdf)

Resolve `v1.1.2-acquisition-accuracy^{commit}` after publication and inspect its annotation/GitHub release notes for the final package SHA and completed CI evidence. Until then, review the candidate PR and its CI on the actual commit. Earlier release CI, local PostgreSQL verification, and source inspection are different evidence categories and must remain distinguishable.
