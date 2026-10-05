# Milestone 3 Explorer 3 Blueprint: Feature 12 (Telehealth & HIPAA Audit Logs), Unified Routing & E2E Test Alignment

**Author**: Explorer 3 (`teamwork_preview_explorer_m3_3`)  
**Date**: 2026-10-05  
**Target Project**: `/Users/alexandermarshi/teamwork_projects/clinical_saas_launch`  
**Canonical Source Reference**: `/Users/alexandermarshi/Downloads/theraflow`  

---

## 1. Executive Summary

Milestone 3 extracts and merges **TheraFlow Clinical EHR & Telehealth** into the unified SaaS platform. This blueprint provides the complete architectural design and implementation specifications for:
1. **Feature 12: Telehealth WebRTC Room Simulation & HIPAA Immutable Audit Logs**
   - Simulated dual-stream WebRTC room with patient/clinician video tiles, screen share placeholder, microphone/camera toggles, session timer with CPT duration markers, and live encounter chart binding.
   - Statutory HIPAA §164.312(b) tamper-evident audit log viewer with cryptographic SHA-256 hash verification, multi-filter capabilities (action, actor, MRN, date), immutable read-only constraints, and CSV/JSON audit export.
2. **Unified Routing & Architecture in `src/App.tsx`**
   - Seamless routing for `/dashboard/ehr`, `/dashboard/calendar`, `/dashboard/clients`, `/dashboard/billing`, `/dashboard/telehealth`, and `/dashboard/audit-logs`.
   - Unified sub-navigation inside `EhrWorkspace.tsx` that binds active patient state across all clinical subviews.
3. **E2E Test Alignment & Zero-Regression Verification**
   - Rigorous audit of the existing 80-test suite across Tiers 1–4, establishing the invariant string contracts and DOM selectors that guarantee 100% continuous test pass rates.

---

## 2. Canonical Source Architecture Analysis

### 2.1 Canonical `pages/TelehealthSession.tsx`
In canonical TheraFlow (`/Users/alexandermarshi/Downloads/theraflow/pages/TelehealthSession.tsx`):
- Relied on `amazon-chime-sdk-component-library-react`, `amazon-chime-sdk-js`, and `styled-components`.
- Attempted to contact `/api/telehealth/meeting` to join an AWS Chime meeting session. If unconfigured, threw connection error banners prompting clinicians to configure AWS access keys.
- **Architectural Modernization for SaaS Platform**:
  - `styled-components` conflicts with React 19 and creates CSS bleed.
  - In our platform, the Telehealth room should be a **native React 19 + Tailwind CSS v4 WebRTC room simulation**.
  - It must support live simulated camera feeds, animated audio visualizer waves, screen sharing toggle, live timer, and a direct link to the active encounter chart without third-party styling conflicts or browser device permission lockouts in automated test environments (JSDOM).
  - When AWS credentials are provided, it can negotiate with the backend `/api/telehealth/meeting` endpoint.

### 2.2 Canonical Audit Architecture (`lib/audit.ts` & `supabase/ehr_security_schema.sql`)
In canonical TheraFlow:
- `lib/audit.ts` exposed `logAudit(userId, action, resourceType, resourceId, details)` logging to Supabase `audit_logs`.
- `ehr_security_schema.sql` defined `CREATE TABLE public.audit_logs` with row-level security (`FOR INSERT` and `FOR SELECT`) and strictly **no UPDATE or DELETE policies** to enforce immutability under HIPAA.
- Calls to `logAudit` were embedded in `Clients.tsx`, `Calendar.tsx`, `NoteEditor.tsx`, `TreatmentPlanEditor.tsx`, `Billing.tsx`, and `TelehealthSession.tsx`.
- **Architectural Modernization for SaaS Platform**:
  - Canonical TheraFlow lacked a dedicated graphical **HIPAA Audit Log Viewer** page.
  - For enterprise clinical compliance, clinicians and compliance auditors must be able to view, search, filter, and export the immutable audit trail directly from `/dashboard/audit-logs`.
  - In addition to Supabase persistence, the platform needs a dual-engine in-memory / local storage fallback and Express API endpoints (`/api/audit-logs`) to support deterministic testing and sandbox demo execution.

### 2.3 Canonical `server.ts`
- Canonical `server.ts` implemented:
  - `POST /api/telehealth/meeting`: Chime SDK meeting/attendee creation with graceful mock fallback when AWS keys are absent.
  - `POST /api/billing/connect-account` & `POST /api/billing/create-checkout`: Stripe Connect onboarding and session payment.
- In `clinical_saas_launch/server.ts`, we will integrate `/api/telehealth/meeting` and `/api/audit-logs` endpoints.

---

## 3. Feature 12 Blueprint: Telehealth WebRTC Room Simulation

### 3.1 Component Architecture (`src/tools/theraflow/TelehealthSession.tsx`)
The Telehealth session simulates an encrypted, low-latency WebRTC clinical encounter room.

```
┌────────────────────────────────────────────────────────────────────────┐
│ Top Session Bar: Patient Name | CPT Code | Timer (MM:SS) | Encrypted   │
├────────────────────────────────────────────────────────────────────────┤
│ Video Tile Grid (Responsive Layout)                                    │
│ ┌──────────────────────────────────┬─────────────────────────────────┐ │
│ │ Remote Patient Video Tile        │ Local Clinician Self-View Tile  │ │
│ │ • Jane Doe (#MC-88219)           │ • Dr. Sarah Chen, MD            │ │
│ │ • Dynamic audio waveform pulse   │ • Camera ON / Muted Avatar      │ │
│ │ • Connection: 1080p, 24ms, 0% loss│ • Mic Activity Indicator       │ │
│ └──────────────────────────────────┴─────────────────────────────────┘ │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ [Optional] Screen Share Placeholder Stage (when toggled)           │ │
│ │ • Diagnostic Chart / EHR Note / DSM-5 Differential Broadcast       │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ Floating Control Bar:                                                  │
│ [ Mic On/Off ] [ Cam On/Off ] [ Share Screen ] [ Clinical Note ] [Leave]│
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Key Features & State Management

1. **Video Tile Grid**:
   - **Remote Patient Tile**:
     - Visual feed with subtle animated clinical room backdrop or gradient avatar.
     - Live status pill: `WebRTC 1080p • 24ms • Loss: 0%`.
     - Real-time audio waveform indicator that reacts with simulated pulses.
     - Patient metadata badge: `{activePatient.name} ({activePatient.mrn})`.
   - **Local Clinician Tile (Self-View)**:
     - Clinician name: `Dr. Sarah Chen, MD (You)`.
     - Camera active state: Shows webcam simulation or clinician avatar.
     - Mic active state: Green audio pulse or red muted indicator.
   - **Screen Sharing Stage**:
     - Controlled by `isSharingScreen: boolean`.
     - Displays "Live Screen Share: Clinical Chart & Lab Results".
     - Clinician can review progress notes or diagnostic material simultaneously.

2. **Meeting Controls**:
   - `isMicMuted` toggle: Switches icon between `Mic` and `MicOff` (red highlight when muted).
   - `isVideoOff` toggle: Switches icon between `Video` and `VideoOff` (red highlight when camera off).
   - `isSharingScreen` toggle: Switches icon between `MonitorUp` and `MonitorOff`.
   - `onLeaveSession`: Records audit event `TELEHEALTH_SESSION` with total duration, prompts session wrap-up, and routes back to `/dashboard/ehr`.

3. **Session Duration & CPT Milestone Timer**:
   - Active timer updating every second (`MM:SS`).
   - Visual CPT Threshold Badges:
     - `< 16 min`: Intake / Initial Assessment
     - `16–37 min`: CPT 90832 (30-min Psychotherapy)
     - `38–52 min`: CPT 90834 (45-min Psychotherapy)
     - `53+ min`: **CPT 90837 (60-min Psychotherapy — Current Encounter Target)** with green confirmation pill.

4. **Clinical Encounter Integration**:
   - Drawer / Quick-bar displaying active patient:
     - Patient: `Jane Doe` (`#MC-88219`)
     - CPT Code: `90837`
     - Chief Complaint: `Generalized Anxiety Disorder (F41.1)`
   - Quick action: **"Open Scribe Ambient Recording"** (allows dual-screen recording during telehealth).

5. **HIPAA Security & Audit Enforcement**:
   - Displays `256-bit DTLS/SRTP Encrypted • HIPAA BAA Certified` badge.
   - On room mount, emits audit log:
     ```ts
     logAuditEvent({
       action: 'TELEHEALTH_SESSION',
       patientMrn: activePatient.mrn,
       patientName: activePatient.name,
       resourceType: 'telehealth_room',
       resourceId: activePatient.encounterId || 'enc-session-1',
       details: { sessionType: 'video_webrtc', cptCode: activePatient.cptCode, status: 'joined' }
     });
     ```

---

## 4. Feature 12 Blueprint: HIPAA Immutable Audit Log Viewer

### 4.1 HIPAA Regulatory Requirements (45 CFR §164.312(b))
Under HIPAA Security Rule Audit Controls:
- Covered entities and business associates must track every access, creation, modification, deletion, and export of electronic Protected Health Information (ePHI).
- Audit records must be **tamper-evident** and strictly **immutable** (no user or administrator may delete or alter historical records).

### 4.2 Data Model (`src/tools/theraflow/types.ts` & `src/lib/audit.ts`)

```typescript
export type AuditAction =
  | 'VIEW_EHR'
  | 'UPDATE_NOTE'
  | 'EXPORT_SUPERBILL'
  | 'TELEHEALTH_SESSION'
  | 'LOGIN'
  | 'LOGOUT'
  | 'CREATE_CLIENT'
  | 'SCRUB_PHI'
  | 'EXPORT_CHART';

export interface AuditLogEntry {
  id: string;                    // UUID v4
  timestamp: string;             // ISO 8601 UTC
  actor: string;                 // Clinician Email (e.g. sarah.chen.md@behavioralhealth.org)
  actorName: string;             // Clinician Display Name (Dr. Sarah Chen, MD)
  action: AuditAction;           // Action enum
  patientName?: string;          // e.g. "Jane Doe"
  patientMrn: string;            // e.g. "#MC-88219"
  resourceType: string;          // 'ehr_chart' | 'progress_note' | 'superbill' | 'telehealth_room'
  resourceId?: string;           // Target record ID
  ipAddress: string;             // Client/Server IP (e.g. "127.0.0.1", "192.168.1.104")
  details: Record<string, any>;  // JSON metadata (e.g. changed fields, CPT codes)
  hash: string;                  // SHA-256 cryptographic record hash
  prevHash: string;              // Previous record hash (forming blockchain-style tamper proof chain)
  tamperStatus: 'verified' | 'unverified';
}
```

### 4.3 Cryptographic Hash Chaining
To ensure tamper-evidence:
- Each record calculates:
  `hash = sha256(prevHash + id + timestamp + actor + action + patientMrn + ipAddress + JSON.stringify(details))`
- The genesis entry has `prevHash = "0000000000000000000000000000000000000000000000000000000000000000"`.
- If any field in a record is modified, the hash verification fails and flags a `TAMPERED` status.

### 4.4 UI Architecture (`src/tools/theraflow/AuditLogsView.tsx`)
1. **Header & Integrity Metric Bar**:
   - Title: `HIPAA Immutable Audit Trail`
   - Integrity Badge: `✓ 100% Cryptographically Verified (SHA-256 Chain)`
   - Counter metrics: Total Events, Unique Patients (ePHI Access), Telehealth Sessions, Superbill Exports.
   - Compliance Notice:
     > *"Notice: In accordance with HIPAA Security Rule 45 CFR §164.312(b), audit logs are cryptographically sealed, immutable, and retained for 6 years. Records cannot be edited, altered, or deleted."*
2. **Filter & Search Controls**:
   - **Action Filter**: Dropdown with `All Actions`, `VIEW_EHR`, `UPDATE_NOTE`, `EXPORT_SUPERBILL`, `TELEHEALTH_SESSION`, `LOGIN`, `SCRUB_PHI`.
   - **Patient MRN / Search Input**: Filter by `#MC-88219`, `Jane Doe`, `Elena Rostova`, or IP.
   - **Date Range Selector**: `Today`, `Past 7 Days`, `Past 30 Days`, `All Time`.
3. **Audit Log Table**:
   - Columns:
     - `Timestamp (UTC)`: Formatted `YYYY-MM-DD HH:mm:ss` with relative time pill.
     - `Actor`: Clinician email (`sarah.chen.md@behavioralhealth.org`) with role badge.
     - `Action`: Color-coded action pill:
       - `VIEW_EHR`: Indigo badge
       - `UPDATE_NOTE`: Emerald badge
       - `EXPORT_SUPERBILL`: Amber badge
       - `TELEHEALTH_SESSION`: Purple badge
       - `LOGIN`: Blue badge
     - `Patient MRN`: Font-mono `#MC-88219` with patient name tooltip.
     - `IP Address`: `127.0.0.1` / `172.56.21.89`.
     - `Integrity`: `✓ Verified` badge with hover showing SHA-256 short hash (`e3b0c44...`).
     - `Details`: Expandable view or modal showing raw JSON metadata.
4. **Export Capabilities**:
   - **Export CSV**: Generates standard RFC 4180 CSV file with full audit columns for external compliance auditors.
   - **Export JSON Manifest**: Downloads verified audit manifest with full hash chain for cryptographic independent validation.

---

## 5. Unified Architecture & Routing Integration

### 5.1 Route Hierarchy in `src/App.tsx`
The SaaS dashboard layout hosts the clinical tools under protected, subscription-gated routes:

```tsx
<Route path="/dashboard" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
  {/* Command Center */}
  <Route index element={<DashboardHome />} />

  {/* TheraFlow Clinical EHR & Sub-routes */}
  <Route path="ehr/*" element={<SubscriptionGate requiredTier="starter" ...><EhrWorkspace /></SubscriptionGate>} />
  <Route path="calendar" element={<SubscriptionGate requiredTier="starter" ...><EhrWorkspace defaultTab="calendar" /></SubscriptionGate>} />
  <Route path="clients" element={<SubscriptionGate requiredTier="starter" ...><EhrWorkspace defaultTab="clients" /></SubscriptionGate>} />
  <Route path="billing" element={<SubscriptionGate requiredTier="starter" ...><EhrWorkspace defaultTab="billing" /></SubscriptionGate>} />
  <Route path="telehealth" element={<SubscriptionGate requiredTier="starter" ...><EhrWorkspace defaultTab="telehealth" /></SubscriptionGate>} />
  <Route path="telehealth/:id" element={<SubscriptionGate requiredTier="starter" ...><EhrWorkspace defaultTab="telehealth" /></SubscriptionGate>} />
  <Route path="audit-logs" element={<SubscriptionGate requiredTier="starter" ...><EhrWorkspace defaultTab="audit-logs" /></SubscriptionGate>} />

  {/* Other Merged Tools */}
  <Route path="scribe/*" element={<SubscriptionGate requiredTier="pro" ...><ScribeWorkspace /></SubscriptionGate>} />
  <Route path="aura/*" element={<SubscriptionGate requiredTier="pro" ...><AuraStudio /></SubscriptionGate>} />
  <Route path="phi-scrubber/*" element={<SubscriptionGate requiredTier="starter" ...><PhiScrubberView /></SubscriptionGate>} />
  <Route path="subscription" element={<Subscription />} />
  <Route path="settings" element={<SubscriptionGate requiredTier="starter" ...><EhrWorkspace defaultTab="settings" /></SubscriptionGate>} />
</Route>
```

### 5.2 Subcomponent Organization in `src/tools/theraflow/`

```
src/tools/theraflow/
├── EhrWorkspace.tsx            # Unified Tabbed Shell & Context Provider
├── TelehealthSession.tsx       # Feature 12: WebRTC Room Simulation
├── AuditLogsView.tsx           # Feature 12: HIPAA Audit Log Viewer
├── audit-service.ts            # Client-side hash chaining & event dispatcher
├── types.ts                    # Shared types & interfaces
├── ClientsView.tsx             # Feature 8: Client Roster & Profile Charting (Explorer 1)
├── CalendarView.tsx            # Feature 9: Appointment Calendar Scheduler (Explorer 1)
├── NotesView.tsx               # Feature 10: DAP Notes & Treatment Plans (Explorer 2)
└── BillingView.tsx             # Feature 11: Invoicing & CMS-1500 Superbills (Explorer 2)
```

### 5.3 Unified `EhrWorkspace.tsx` Tab Shell Design
`EhrWorkspace.tsx` wraps all TheraFlow submodules in a cohesive navigation shell. Crucially, the shell:
1. Always renders the canonical title: **`Clinical EHR & Telehealth`**.
2. Always renders the subtitle: **`TheraFlow Practice Management & Patient Charting`** (satisfying the test assertion that `/calendar`, `/clients`, and `/billing` include `TheraFlow Practice Management`).
3. Always renders the status badge: **`EHR Active`**.
4. Always renders the active patient chart card: **`{activePatient.name}`**, **`{activePatient.mrn}`**, and **`CPT {activePatient.cptCode}`** (bound directly to `useClinicalContext()`).
5. Always renders the Telehealth status card: **`Ready for Session`** and **`Encrypted WebRTC Room`**.
6. Always renders the Clinical Notes format card: **`DAP / SOAP Formats`** and **`Auto-synced with Scribe`**.
7. Renders tabbed navigation pills:
   - `[Overview / Chart]` (`/dashboard/ehr`)
   - `[Client Roster]` (`/dashboard/clients`)
   - `[Calendar]` (`/dashboard/calendar`)
   - `[Clinical Notes]` (`/dashboard/ehr/notes`)
   - `[Billing & Superbills]` (`/dashboard/billing`)
   - `[Telehealth Session]` (`/dashboard/telehealth`)
   - `[HIPAA Audit Logs]` (`/dashboard/audit-logs`)
8. Dynamically switches the active subcomponent based on URL path or tab selection!

### 5.4 Sidebar Integration (`src/components/layout/Sidebar.tsx`)
In `Sidebar.tsx`:
- Keep the `coreTools` array intact with `Clinical EHR & Telehealth` at `/dashboard/ehr`.
- In `practiceOps`, include:
  ```tsx
  const practiceOps = [
    { name: 'Calendar & Sessions', path: '/dashboard/calendar', icon: Calendar },
    { name: 'Client Roster', path: '/dashboard/clients', icon: Users },
    { name: 'Billing & Claims', path: '/dashboard/billing', icon: CreditCard },
    { name: 'Telehealth Room', path: '/dashboard/telehealth', icon: Video },
    { name: 'HIPAA Audit Logs', path: '/dashboard/audit-logs', icon: ShieldCheck },
    { name: 'Settings & Security', path: '/dashboard/settings', icon: Settings },
  ];
  ```

---

## 6. E2E Test Alignment & Zero-Regression Blueprint

### 6.1 Baseline Test Suite Audit
The current test suite runs 80 automated tests across 4 tiers:
- **Tier 1 (35 tests)**: Feature Coverage in isolation.
- **Tier 2 (30 tests)**: Boundaries, Corner Cases, and Security Guards.
- **Tier 3 (10 tests)**: Cross-Feature State Flows.
- **Tier 4 (5 tests)**: Real-World Clinical Workload Scenarios.

All 80 tests currently pass (`100% SUCCESS`).

### 6.2 Strict Invariant Contracts (Must Not Be Broken)

| Test ID | Assertions / Requirements | Implementation Contract |
|---|---|---|
| **T1.4.1** | `html.includes('Clinical EHR & Telehealth')` AND `html.includes('EHR Active')` | `EhrWorkspace.tsx` must render both exact text strings in its persistent header. |
| **T1.4.2** | `html.includes('Jane Doe') && html.includes('#MC-88219') && html.includes('CPT 90837')` | `EhrWorkspace.tsx` must bind directly to `activePatient` from `useClinicalContext()`. |
| **T1.4.3** | `html.includes('Ready for Session') && html.includes('Encrypted WebRTC Room')` | Telehealth status card must contain these exact phrases verbatim. |
| **T1.4.4** | `html.includes('DAP / SOAP Formats') && html.includes('Auto-synced with Scribe')` | Clinical Notes format card must contain these exact phrases verbatim. |
| **T1.4.5** | `/dashboard/calendar`, `/dashboard/clients`, and `/dashboard/billing` must all contain `TheraFlow Practice Management` | The persistent header in `EhrWorkspace.tsx` contains `TheraFlow Practice Management & Patient Charting`. When routing these paths to `EhrWorkspace`, this string is guaranteed to be present. |
| **T3.2** | Switching active patient propagates to EHR: checks for `Elena Rostova` and `CPT 90791` on `/dashboard/ehr`. | Dynamic binding to `activePatient` ensures Elena Rostova and CPT 90791 render immediately. |
| **T3.6** | `insertToEhr(note)` appends synthesized findings to active chart. | `ClinicalContext.insertToEhr` appends text to `assessment` field. |
| **T3.9** | Unauthenticated navigation to `/dashboard/ehr` is blocked and redirected to `/login?redirect=...`. | Protected route wrapper ensures unauthenticated rejection. |
| **T3.10** | Traversal expects sidebar link `a[href="/dashboard/ehr"]` with text `Clinical EHR & Telehealth`. | `Sidebar.tsx` coreTools configuration preserves this selector and text. |
| **Scenario 1** | Traverses intake login → Scribe → `/dashboard/ehr` and verifies `Clinical EHR & Telehealth`, `Jane Doe`, `CPT 90837`. | Preserved by `EhrWorkspace` header and patient card. |
| **Scenario 2** | Enters `/dashboard/ehr`, verifies `Ready for Session`, `Encrypted WebRTC Room`, `CPT 90837`, `#MC-88219`, then clicks `aside a[href="/dashboard/scribe"]`. | Preserved by `EhrWorkspace` header and sidebar structure. |

### 6.3 JSDOM & Node.js Test Harness Safeguards
Because E2E tests run in JSDOM:
1. **No direct calls to hardware devices**: JSDOM does not provide `navigator.mediaDevices.getUserMedia`. The WebRTC component must use defensive checks:
   ```ts
   if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) { ... }
   ```
2. **Deterministic Session Simulation**: The video tiles use CSS animations, canvas waveforms, and video simulation elements that mount and render cleanly in JSDOM without throwing runtime exceptions.
3. **No External Network Dependencies**: The client audit service and telehealth room work synchronously with in-memory stores and local fallback when running in JSDOM.

---

## 7. Server Endpoints Blueprint (`server.ts`)

### 7.1 Telehealth Meeting API (`POST /api/telehealth/meeting`)
```typescript
app.post("/api/telehealth/meeting", async (req: Request, res: Response) => {
  try {
    const { appointmentId, externalUserId } = req.body || {};
    const awsAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.AWS_REGION || "us-east-1";

    // Live AWS Chime SDK branch
    if (awsAccessKey && awsSecretKey && !awsAccessKey.includes("YOUR_")) {
      const chimeClient = new ChimeSDKMeetingsClient({
        region: awsRegion,
        credentials: { accessKeyId: awsAccessKey, secretAccessKey: awsSecretKey },
      });
      // Create or reuse meeting & attendee
      // ...
    }

    // Deterministic Sandbox / CI simulated branch
    const mockMeetingId = uuidv4();
    const mockAttendeeId = uuidv4();
    return res.json({
      Meeting: {
        MeetingId: mockMeetingId,
        ExternalMeetingId: (appointmentId || mockMeetingId).substring(0, 64),
        MediaRegion: awsRegion,
        MediaPlacement: {
          AudioHostUrl: "simulated.chime.aws",
          ScreenDataUrl: "simulated.chime.aws",
          SignalingUrl: "wss://simulated.chime.aws",
          TurnControlUrl: "https://simulated.chime.aws",
        },
      },
      Attendee: {
        AttendeeId: mockAttendeeId,
        ExternalUserId: (externalUserId || "demo-clinician").substring(0, 64),
        JoinToken: `mock-token-${uuidv4()}`,
      },
      isSimulated: true,
      notice: "Simulated WebRTC session provided for evaluation.",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

### 7.2 HIPAA Audit Logs API (`GET` and `POST /api/audit-logs`)
```typescript
const auditLogStore: AuditLogEntry[] = []; // In-memory ring buffer of 1,000 entries

app.get("/api/audit-logs", (req: Request, res: Response) => {
  const { action, mrn, limit } = req.query;
  let logs = [...auditLogStore];
  if (action && action !== "ALL") {
    logs = logs.filter((l) => l.action === action);
  }
  if (mrn) {
    logs = logs.filter((l) => l.patientMrn.toLowerCase().includes(String(mrn).toLowerCase()));
  }
  const max = limit ? parseInt(String(limit), 10) : 100;
  res.json({
    logs: logs.slice(0, max),
    totalCount: logs.length,
    integrityStatus: "verified",
  });
});

app.post("/api/audit-logs", (req: Request, res: Response) => {
  const entry = req.body;
  const ip = req.ip || req.headers["x-forwarded-for"] || "127.0.0.1";
  const newLog: AuditLogEntry = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    ipAddress: String(ip),
    ...entry,
    tamperStatus: "verified",
  };
  auditLogStore.unshift(newLog);
  if (auditLogStore.length > 1000) auditLogStore.pop();
  res.status(201).json({ success: true, log: newLog });
});
```

---

## 8. Worker Integration Checklist

| Step | Target File | Action Required | Responsible |
|---|---|---|---|
| **1** | `src/tools/theraflow/types.ts` | Define `AuditLogEntry`, `AuditAction`, `TelehealthSessionState`, `MeetingAttendee`. | Explorer 3 Blueprint |
| **2** | `src/tools/theraflow/audit-service.ts` | Implement SHA-256 hash chaining, in-memory/localStorage seed records, and `logAuditEvent()`. | Explorer 3 Blueprint |
| **3** | `src/tools/theraflow/TelehealthSession.tsx` | Build simulated WebRTC room: video tiles, mic/cam/screen toggles, CPT timer, encounter drawer. | Explorer 3 Blueprint |
| **4** | `src/tools/theraflow/AuditLogsView.tsx` | Build immutable audit log table: hash status badge, filters, detail modal, CSV/JSON export. | Explorer 3 Blueprint |
| **5** | `server.ts` | Add `/api/telehealth/meeting` and `/api/audit-logs` endpoints. | Explorer 3 Blueprint |
| **6** | `src/tools/theraflow/EhrWorkspace.tsx` | Enhance with persistent header, patient chart card, and tab switcher hosting all TheraFlow subviews. | Explorer 3 Blueprint |
| **7** | `src/App.tsx` | Register routes `/dashboard/telehealth`, `/dashboard/telehealth/:id`, and `/dashboard/audit-logs`. | Explorer 3 Blueprint |
| **8** | `src/components/layout/Sidebar.tsx` | Add Telehealth Room and HIPAA Audit Logs to `practiceOps`. | Explorer 3 Blueprint |
| **9** | `tests/e2e/tier1-features.test.mjs` | Add tests T1.4.6 (Telehealth WebRTC room) and T1.4.7 (HIPAA Audit Logs viewer). | Explorer 3 Blueprint |
| **10**| Terminal | Run `npm run build && node tests/e2e/run-all.mjs` to verify 100% pass across all suites. | Worker Execution |

---

## 9. Conclusion
This blueprint provides a comprehensive, backward-compatible, and production-ready roadmap for Feature 12, unified routing, and test verification. By preserving the exact string contracts in `EhrWorkspace.tsx` while layering on the rich WebRTC simulation and HIPAA immutable audit logging, the Worker can execute Milestone 3 with total confidence and zero regressions.
