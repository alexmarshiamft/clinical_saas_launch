# TheraFlow OS - Integration Matrix

Classifications describe code, not verified vendor accounts or deployed production services. Credentials alone do not finish scaffolds. Evaluation uses synthetic data.

| System | Current implementation | Remaining buyer work |
| --- | --- | --- |
| Supabase/PostgreSQL | Client configuration and two SQL migrations; demo/browser and memory state remain | Apply both migrations, complete persistence/auth claims, test real hosted environment |
| Stripe subscription | SDK checkout and webhook code when configured; unconfigured simulation | Test account, secrets, webhook delivery and end-to-end reconciliation |
| Stripe invoice checkout | `/api/billing/create-checkout` produces simulated sessions | Implement actual invoice checkout/payment reconciliation |
| Gemini | SDK paths in Scribe/AI note expansion with privacy gateway and deterministic fallback | Move provider calls/secrets server-side; current Vite build can expose configured key; validate privacy boundaries |
| Browser speech | Browser speech API plus manual/demo speaker attribution | Confirm browser processing behavior; no validated acoustic speaker separation |
| Deepgram | Transcription provider scaffold | Complete streaming integration and validate transcripts/diarization; keys alone insufficient |
| Telehealth | `webrtc-provider.ts` local media/loopback; `/api/telehealth/meeting` synthetic meeting response | Implement remote signaling/media service and validate multi-party operation |
| Epic/Cerner/FHIR | `ehrExportAdapters.ts` clipboard/download formatters | Conformance/interoperability validation and actual hospital API/auth integration |
| Superbill / 837P | SuperbillModal prints/copies reimbursement statement text; no 837P generator found | Implement formal claim generation, conformance tests and real transport |
| 277CA / 835 | UI/demo claim events; parser/generator not established | Implement actual clearinghouse acknowledgments and remittance ingestion |
| Payroll sandbox | `SandboxPayrollProvider`, calculations and simulated batch settlement | No real tax filing, money movement or employee documents |
| Gusto | Sandbox API client/scaffold in payroll-provider.ts | Partner auth, live transport, error handling, reconciliation and tax workflow validation |
| ADP | Explicit not-implemented adapter scaffold | Implement authenticated provider client and payroll workflows |
| Banking | `SandboxBankingProvider`, allocations and double-entry ledger | Real banking partner, account lifecycle, funds transport/webhooks/reconciliation |
| Other providers | Interfaces and architectural opportunities | Provider implementation and commercial onboarding |

Implemented interfaces reduce coupling; swapping a vendor can still require changes across API/auth/state/UI and tests. No single-file integration guarantee, bank relationship, independent security certification or real-PHI readiness is established. Release evidence and finite tests are described in BUYER_HANDOFF.md.
