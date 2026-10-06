# TheraFlow OS - Buyer Handoff

## Release provenance

- Follow-up candidate (unpublished): `v1.1.2-acquisition-accuracy`. Exact SHA and successful CI run IDs will be recorded in its annotated tag after publication and [GitHub release](https://github.com/alexmarshiamft/clinical_saas_launch/releases/tag/v1.1.2-acquisition-accuracy). Resolve with `git rev-parse v1.1.2-acquisition-accuracy^{commit}`; a commit cannot embed its own hash.
- Original immutable release: `v1.1.0-security-remediated` at `515cefe320b46b9e50695849dd23ce0c2b93cd63`, annotated and unsigned. Preserve unchanged.
- Core remediation checkpoint: `4113573e982e6176ea8c71c3deb2862f44a6f11e`. `9518a84` is an older documentation commit, not the acquisition snapshot.
- Evaluation uses synthetic data. Passing tests do not establish readiness for real PHI or independent certification.

## Assets and functional classification

Buyer receives React/Vite interfaces, Express API code, migrations, workflow engines, tests, synthetic fixtures and PDF scripts/documents. This code package does not establish an operating customer business, verified revenue, vendor contracts or regulatory certification.

| Module | Working assets | Sandbox / incomplete boundary |
| --- | --- | --- |
| EHR | Roster, scheduling, DAP editor, treatment plans/history | Browser/demo state; production persistence incomplete |
| Scribe | Templates, deterministic notes, recording/speech, exports, Gemini SDK path | Manual/demo attribution; cloud diarization unproven |
| Aura | Diagnostic reference/checklist and drafting UI | Assistive reference; no clinical validation claim |
| PHI scrubber | Regex categories corresponding to 18 Safe Harbor categories; three masking styles | Heuristic aid; missed identifiers require review |
| Workforce/compensation | Provider data, volume splits, CPT rates, bonuses | Integer cents/basis-point helpers with test fixtures |
| Payroll | Calculations, exports, sandbox settlement, Gusto sandbox client, ADP scaffold | No verified live filing/disbursement |
| Treasury/ledger | Allocations and double-entry journal | Simulated accounts/ACH; no real funds movement |
| Billing | Superbill reimbursement statements | No implemented 837P generator or clearinghouse/payer acceptance verification established |
| Telehealth | Local media/loopback, timer/controls/CPT crosswalk | Synthetic meeting endpoint; remote sessions require implementation |
| Onboarding/migration | Practice and CSV workflow interfaces | Buyer must validate/map/wire durable migration |

## Database inventory

Apply `20261005_init_schema.sql` then `20261005_unified_practice_os.sql` from `supabase/migrations/` to a fresh disposable database. Count source declarations excluding comments, then runtime objects separately.

- **33 CREATE TABLE statements / 32 distinct targets:** 31 public application tables plus `auth.users`, declared as a standalone compatibility shim in both migrations. The shim is not an extra application table on Supabase.
- **59 CREATE POLICY statements / 58 active public policies:** one old broad clinical-notes policy is removed and replaced with granular policies. Other `DROP POLICY IF EXISTS` statements remove nothing on fresh deployment.
- Runtime inventory: public base tables in `information_schema.tables`, active public policies in `pg_policies`. The corrected harness asserts exact inventory and note policy replacement, plus behavior probes.

## Security completed

SEC-01 authenticates meeting/checkout routes, enforces billing roles and practice boundaries on reads/financial mutations, and removes administrator cross-tenant bypasses. SEC-02 scopes audit reads/exports/writes and isolates legacy records. SEC-03 restricts unsigned-note writes to authors/authorized practice admins, prevents author reassignment and protects signed notes with triggers/policies.

Allocation helpers use integer cents/basis points. Tests verify cent conservation and balanced journals. HMAC-SHA256 audit logging needs durable hosting, protected secrets, backup/recovery and operating controls. These are documented finding remediations, not elimination of every vulnerability.

## Verification evidence

Original release CI passed at `515cefe`: [37514914857](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37514914857) on master and [37514932475](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37514932475) on remediation-pass-2. Core runs: [37511948228](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37511948228), [37511959898](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37511959898).

| Check | Command | Historical snapshot result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | Passed |
| Build | `npm run build` | Passed; not a zero-warning claim |
| Client security | `npm run test:security` | 26/26 |
| Server security | `npx tsx tests/server-security-and-tenant-isolation.test.ts` | 29/29 |
| Server stress | `npx tsx tests/empirical-server-stress.ts` | 28/28 |
| EHR | `npm run test:ehr` | 30/30 |
| Scribe | `npm run test:scribe` | 61/61 |
| Aura/scrubber | `npm run test:aura` | 85/85 |
| Financial/security invariants | `npx tsx tests/adversarial-financial-and-security.test.ts` | Passed |
| Migration/RLS | `npx tsx tests/migration-pipeline.test.ts` | **Not executed in historical CI** |

Corrected CI adds PostgreSQL-backed migration/RLS verification. Its successful run IDs and tested SHA must accompany the release annotation and release evidence before publication. Setup/checkout steps are not test suites. Historical results do not mean every repository test or E2E scenario ran.

Recorded synthetic holdouts: 81.64% recall (626 missed / 3,410 entities), and 92.79% (111 missed / 1,540) on a separate corpus. Historical precision totals are inconsistent and omitted pending reconciliation. Gateway rejects detected residual identifiers/errors and falls back to deterministic generation; finite tests do not guarantee zero PHI leakage. Browser WebSpeech may use remote browser-vendor processing.

## Setup and operational limitations

Node 22 and lockfile: `npm ci`, `npm run build`, `npm start`. Configure `JWT_SECRET` and `AUDIT_HMAC_SECRET` securely. See [setup guide](ENVIRONMENT_SETUP.md).

Supabase browser client reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`; service-role keys must remain server-side. Apply both migrations and complete persistence, JWT claims/roles, identity, backups and access controls. Vite currently embeds a configured Gemini key in browser code: move sensitive provider calls/secrets behind a server boundary before real deployment.

Stripe subscription checkout has a configured SDK path; invoice checkout remains simulated. Telehealth meeting creation is simulated. Live speech, banking, payroll and clearinghouse services need implementation, commercial onboarding and validation; credentials alone are insufficient. No independent HIPAA/security certification or approval for real PHI is claimed. Real deployment requires deployment-specific assessment, appropriate agreements and operating controls.

## Buyer documents and next work

[Acquisition readiness](ACQUISITION_READINESS.md), [due diligence](THERAFLOW_ACQUISITION_DUE_DILIGENCE.md), [integration matrix](INTEGRATION_MATRIX.md), [deck](clinical_saas_investor_presentation.pdf), [walkthrough](clinical_saas_platform_walkthrough.pdf). Screenshots depict historical synthetic UI; corrected prose describes capability boundaries.

Keep the released snapshot immutable. A polished synthetic staging demo is the next separate project. Live vendor work follows buyer demand. Pricing, replacement effort and launch dates require buyer estimates; they are not validated asset facts.

**Published correction received during this review:** `v1.1.1-acquisition-package` at `fd9e2b3e442016f4dc9e85b893bb092b68393a97`. CI [37519919273](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37519919273) and [37519932172](https://github.com/alexmarshiamft/clinical_saas_launch/actions/runs/37519932172) passed, including the original migration harness. The follow-up candidate strengthens that harness and corrects further marketing claims; it does not move either published tag.
