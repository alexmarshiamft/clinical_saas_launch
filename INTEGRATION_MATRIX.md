# TheraFlow OS — External Systems Integration Matrix

> **Purpose:** Transparent technical classification of all external system touchpoints for buyer due diligence.  
> **Classification Tiers:**  
> - **LIVE**: Fully operational with active production network requests.  
> - **DEMO**: Fully functional locally with realistic synthetic simulation and failover sandbox.  
> - **FORMATTER ONLY**: Implements standards-compliant payload formatting and schema transformation without outbound network transmission.  
> - **INTEGRATION-READY**: Complete provider interface, error handling, and configuration contracts authored; requires buyer API credentials to activate.  
> - **ROADMAP**: Architecturally scoped for post-acquisition development.  

---

## Comprehensive Integration Matrix

| External System | Functional Domain | Current Classification | Implementation Path & Code Location | Buyer Activation Requirements |
| :--- | :--- | :--- | :--- | :--- |
| **Supabase / PostgreSQL** | Multi-Tenant Database, RLS, Identity | **INTEGRATION-READY** | `supabase/migrations/20261005_init_schema.sql`, `src/lib/supabase.ts` | Apply SQL migration to buyer Supabase project; set `SUPABASE_URL` and `SUPABASE_ANON_KEY`. |
| **Stripe** | Subscription Billing & Invoicing | **DEMO / INTEGRATION-READY** | `server.ts` (`/api/billing/create-checkout`, `/api/billing/webhook`) | Provide `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Seamlessly falls back to resilient sandbox checkout in demo mode. |
| **Google Gemini (2.5 Flash / Pro)** | Clinical Scribe & Note Expander LLM | **LIVE / DEMO** | `src/tools/scribe/ai-template-generator.ts`, `src/tools/scribe/ai-note-expander.ts` | Intercepted via `phi-privacy-gateway.ts`. If `GEMINI_API_KEY` is present, dispatches de-identified prompts; if missing, falls back to deterministic clinical templates. |
| **Deepgram (Nova-2 Medical)** | Real-Time Speech-to-Text & Diarization | **INTEGRATION-READY** | `src/tools/scribe/audio-transcription-provider.ts` (`DeepgramMedicalStreamingProvider`) | Provide `DEEPGRAM_API_KEY`. Native fallback to in-browser `BrowserSpeechRecognitionProvider` operates live out-of-the-box. |
| **AssemblyAI / AWS Transcribe** | Batch Clinical Transcription | **ROADMAP** | Provider interface in `audio-transcription-provider.ts` | Implement WebSocket client matching `AudioTranscriptionProvider` interface. |
| **Daily.co / AWS Chime SDK** | Two-Party WebRTC Telehealth | **DEMO / INTEGRATION-READY** | `src/tools/theraflow/webrtc-provider.ts`, `TelehealthView.tsx`, `server.ts` (`/api/telehealth/meeting`) | Local camera/mic stream and loopback peer connection works live out-of-the-box. Connect Daily.co domain or AWS Chime SDK meeting API. |
| **Twilio Video** | Programmable Video Fallback | **ROADMAP** | Interface abstracted via `WebRtcEngine` | Replace signaling endpoints with Twilio Video Room tokens if desired. |
| **Epic Systems (SmartText)** | EHR Dot-Phrase Formatting | **FORMATTER ONLY** | `src/tools/scribe/utils/ehrExportAdapters.ts` (`formatEpicSmartText`) | Generates `.MARSHI_CLINICAL_NOTE` formatted macro text with section delimiters and delimiter escaping for direct paste or batch ingest into Epic Hyperspace. |
| **Epic Systems (FHIR R4)** | Interoperable DocumentReference | **FORMATTER ONLY** | `src/tools/scribe/utils/ehrExportAdapters.ts` (`formatEpicFhirDocument`) | Transforms clinical notes into HL7 FHIR R4 `DocumentReference` JSON bundles with SNOMED CT and LOINC codes. Requires buyer Epic USCDI / App Orchard OAuth credentials to POST. |
| **Cerner Millennium** | Enterprise EHR Note Format | **FORMATTER ONLY** | `src/tools/scribe/MultiEhrExportPanel.tsx` | Produces Cerner PowerChart formatted clinical summaries with standard clinical heading tags. |
| **Clearinghouse / EDI (Change Healthcare / Availity)** | ASC X12 837P Professional Health Claims | **FORMATTER ONLY** | `src/components/billing/CMS1500Form.tsx`, `src/components/billing/BillingDashboard.tsx` | Validates 33 CMS-1500 box inputs and compiles standard 837P electronic batch files. Requires buyer SFTP credentials with clearinghouse to transmit. |
| **277CA Claim Acknowledgment** | Electronic Claim Scrubber | **DEMO** | `src/components/billing/` | Synthesizes realistic clearinghouse 277CA acceptance and error acknowledgment reports against CMS-1500 claims. |
| **TheraFlow Sandbox Payroll** | Payroll Orchestration & Direct Deposits | **DEMO / ACTIVE** | `src/modules/payroll/payroll-provider.ts` (`SandboxPayrollProvider`) | Fully functional local simulation. Calculates gross pay, estimates employer taxes (7.65% FICA + SUTA), schedules ACH batches (`ach-sandbox-...`), and settles runs. |
| **Gusto Embedded Payroll** | Regulated Payroll Tax Filing & W-2s | **SANDBOX CLIENT / SCAFFOLD** | `src/modules/payroll/payroll-provider.ts` (`GustoPayrollAdapter`) | Truthful adapter client targeting Gusto API v2 (`https://api.gusto-demo.com/v1`). Requires buyer Gusto Partner Client ID & OAuth tokens; operates as unauthenticated scaffold without credentials and rejects garbage tokens. |
| **ADP Workforce Now** | Enterprise Payroll & Tax Services | **SCAFFOLD SPECIFICATION (NOT IMPLEMENTED)** | `src/modules/payroll/payroll-provider.ts` (`AdpPayrollAdapter`) | Explicitly classified as `not_implemented` scaffold specification. Truthfully returns `connected: false` and `NOT_IMPLEMENTED` errors rather than fabricating network success. Requires buyer ADP Partner credentialing. |
| **Rippling / QuickBooks / Paychex** | General Workforce Payroll | **ABSTRACTION ONLY (NOT IMPLEMENTED)** | `src/modules/payroll/payroll-provider.ts` (`PayrollProvider` interface) | Data contracts modeled. Requires buyer API client implementation. |
| **TheraFlow Sandbox Treasury** | Embedded Business Banking (BaaS) | **DOUBLE-ENTRY SANDBOX SIMULATOR** | `src/modules/money/banking-provider.ts`, `src/modules/ledger/double-entry-ledger.ts` | Fully balanced double-entry general ledger simulator: operating checking (1010), automated 25% tax reserve transfer (1020), payroll escrow (1030), claim-to-deposit reconciliation, and private-pay card charges. Zero money creation/destruction. Simulator only—no live Evolve Bank or banking relationship. |
| **Unit / Stripe Treasury / Column** | Regulated BaaS Banking & FDIC Accounts | **ABSTRACTION ONLY (NOT IMPLEMENTED)** | `src/modules/money/banking-provider.ts` (`BusinessBankingProvider` interface) | Interface contracts only. Live BaaS integration requires buyer bank partner sponsorship, KYC/KYB onboarding (typically 2–3 months), and webhook ingestion. |

---

## Architectural Modularity Guarantee

All external integrations adhere to **strict Provider Abstraction Contracts**:
1. No UI component contains hardcoded vendor API URLs.
2. All audio transcription implements the `AudioTranscriptionProvider` interface (`start`, `stop`, `onTranscript`).
3. All video sessions implement the `WebRtcEngine` interface.
4. All LLM calls pass through the `phi-privacy-gateway.ts` boundary.
5. If an acquirer uses AWS instead of Google Cloud, or Twilio instead of Daily, swapping providers requires updating a single provider class file without touching clinical UI or workflow state.
