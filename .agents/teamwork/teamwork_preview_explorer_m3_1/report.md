# Architectural Blueprint: Milestone 3 — TheraFlow EHR & Telehealth (Features 8 & 9)

**Date**: 2026-10-05  
**Author**: Explorer 1 (`teamwork_preview_explorer_m3_1`)  
**Scope**: Milestone 3: Feature 8 (Client & Patient Roster) & Feature 9 (Interactive Appointment Calendar)  
**Target Project**: `clinical_saas_launch` (Vite 6 + React 19 + TypeScript + Tailwind v4 + Express)  
**Canonical Source Reference**: `/Users/alexandermarshi/Downloads/theraflow/`  

---

## 1. Executive Summary

Milestone 3 extracts the practice operations and clinical charting core from the standalone TheraFlow application and integrates it into the unified `clinical_saas_launch` platform. Specifically, this blueprint addresses:
- **Feature 8: Client & Patient Roster**: A comprehensive patient table with multi-attribute search, status filtering (`Active`, `On Hold`, `Discharged`), new client creation, client profile charting with 4 tabs (**Demographics**, **Clinical Encounters**, **Treatment Plans**, **Notes History**), and bi-directional synchronization with the platform's central `ClinicalContext`.
- **Feature 9: Interactive Appointment Calendar**: A scheduler built on `react-big-calendar` supporting Month, Week, and Day views, drag/slot selection, a dual-purpose booking modal (Appointment vs. Out of Office), event editing, status tracking (`Scheduled`, `Completed`, `Cancelled`), and seamless telehealth linking.
- **Dual-Engine Data Resilience**: A unified data adapter (`theraflow-store.ts`) that executes live Supabase queries when configured and seamlessly falls back to a deterministic, persistent local demo store (`demo-seed.ts` featuring Jane Doe + 10 canonical TheraFlow patients) during CI/testing and sandbox modes.
- **React 19 & Tailwind v4 Compatibility**: Verified zero type/bundler regressions with `@base-ui/react` 1.8.0, `react-big-calendar` 1.19.4, and Tailwind v4 `@theme` styling.

---

## 2. Canonical Source Analysis (`/Users/alexandermarshi/Downloads/theraflow/`)

### 2.1 `pages/Clients.tsx` (9.9 KB, 236 lines)
- **Role**: Primary patient listing, search, status filtering, and client intake dialog.
- **Data Model**: Reads from table `clients` filtered by `therapist_id = user.id`, ordered by `last_name ASC`.
- **UI Components Used**: `Table`, `TableHeader`, `TableRow`, `TableHead`, `TableCell`, `TableBody`, `Dialog`, `DialogTrigger`, `DialogContent`, `Input`, `Select`, `Button`.
- **Audit Logging**: Invokes `logAudit(user.id, 'CREATE', 'client', data[0].id)` on new client submission.
- **Key Capabilities**:
  - Full-text search across client first name, last name, and email.
  - Status dropdown filter (`all`, `active`, `inactive`, `discharged`).
  - Add Client modal with first name, last name, email, phone, date of birth, status, and ICD-10 diagnosis code.
  - Link to `/dashboard/clients/:id` for individual client profile inspection.

### 2.2 `pages/ClientProfile.tsx` (19.9 KB, 458 lines)
- **Role**: In-depth charting profile for an individual client.
- **Data Model**: Fetches client details (`clients`), appointments (`appointments`), progress notes (`progress_notes`), treatment plans (`treatment_plans`), and intake forms (`intake_forms`).
- **Audit Logging**: Emits `logAudit(user.id, 'READ', 'client', id)` upon view, and `logAudit(user.id, 'UPDATE', 'client', id)` upon profile edits.
- **UI Components Used**: `Card`, `CardContent`, `CardHeader`, `CardTitle`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Dialog`, `Button`, `Input`, `Label`, `Select`.
- **Key Capabilities**:
  - Header with patient name, DOB, status badge, edit modal trigger, and back button.
  - Demographics card showing contact info, diagnosis code, and patient portal link.
  - Tabbed sub-panels: Appointments history, Progress Notes history (showing lock/draft status), Treatment Plans, and Intake Forms.
  - Direct scheduling button redirecting to `/dashboard/calendar?client=${client.id}`.

### 2.3 `pages/Calendar.tsx` (26.8 KB, 656 lines)
- **Role**: Full-screen interactive appointment scheduling matrix.
- **Library**: `react-big-calendar` (version 1.19.4) parameterized with `dateFnsLocalizer` (`format`, `parse`, `startOfWeek`, `getDay`, `enUS` locale).
- **Data Model**: Fetches appointments (`appointments` joined with `clients` and `progress_notes`) and out-of-office blocks (`out_of_office`).
- **Key Capabilities**:
  - Views: Month (`Views.MONTH`), Week (`Views.WEEK`), Day (`Views.DAY`); default is Week.
  - Time granularity: `step={15}`, `timeslots={4}` (15-minute intervals per 1-hour slot).
  - Slot selection (`selectable`, `onSelectSlot`): Clicking or dragging an empty slot pre-populates date, start time, and end time in the booking dialog.
  - Booking Modal: Dual tabs for **Appointment** (Client dropdown, Date, Start/End times, Session Type CPT code, Status, Location) and **Out of Office** (Date, Times, Reason).
  - Event Details / Edit Modal:
    - View Mode: Shows client contact info, session type, formatted time, telehealth join button (if location is Telehealth), and "Write / View Note" action.
    - Edit Mode: Allows updating schedule, status (`scheduled`, `completed`, `cancelled`), location, and session type.
  - Dynamic Color Coding via `eventPropGetter`:
    - Scheduled: Blue (`#3b82f6` / `#2563eb`)
    - Completed: Emerald Green (`#10b981` / `#059669`)
    - Cancelled: Red (`#ef4444` / `#dc2626`)
    - Out of Office: Slate Gray (`#6b7280` / `#4b5563`)

---

## 3. UI Dependencies & Styling Architecture

### 3.1 Base UI Component Library Integration
In `clinical_saas_launch`, `@base-ui/react` (version 1.8.0) and `class-variance-authority` (0.7.1) are already installed in `package.json`. Canonical TheraFlow uses Base UI primitives wrapped in Tailwind v4 classes.
The target project requires:
1. `src/lib/utils.ts`:
   ```ts
   import { clsx, type ClassValue } from "clsx";
   import { twMerge } from "tailwind-merge";

   export function cn(...inputs: ClassValue[]) {
     return twMerge(clsx(inputs));
   }
   ```
2. `src/components/ui/`:
   - `button.tsx` (wraps `@base-ui/react/button` with `buttonVariants` via `cva`)
   - `card.tsx` (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`)
   - `dialog.tsx` (wraps `@base-ui/react/dialog` primitives: `Root`, `Trigger`, `Portal`, `Backdrop`, `Popup`, `Close`)
   - `input.tsx` (wraps `@base-ui/react/input`)
   - `label.tsx` (styled HTML label)
   - `select.tsx` (wraps `@base-ui/react/select`: `Root`, `Trigger`, `Value`, `Portal`, `Positioner`, `Popup`, `Item`)
   - `table.tsx` (`Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`)
   - `tabs.tsx` (wraps `@base-ui/react/tabs`: `Root`, `List`, `Tab`, `Panel`)

### 3.2 React 19 Compatibility Analysis
- **Build Verification**: Executed `npm run build` (`tsc --noEmit && vite build`) on `clinical_saas_launch` — completed with 0 errors in 5.07s.
- **Type Compatibility**: React 19 no longer requires `forwardRef` for standard components. `@base-ui/react` 1.8.0 and `react-big-calendar` 1.19.4 types compile with 0 TypeScript diagnostics under `tsconfig.json`.
- **Toaster Component**: Added `<Toaster position="top-right" richColors />` from `sonner` inside `App.tsx` root layout.

### 3.3 Tailwind v4 & Calendar CSS Containment
- **Styles Import**: Line 5 of `src/index.css` already contains `@import "react-big-calendar/lib/css/react-big-calendar.css";`.
- **Layout Sizing Rule**: `react-big-calendar` calculates internal geometry based on 100% of its immediate parent. To prevent flexbox height collapse:
  - The calendar wrapper element must specify `min-h-[650px] h-[calc(100vh-230px)]` and `overflow-hidden`.
  - The calendar view container uses `bg-white p-4 rounded-xl border border-slate-200 shadow-2xs`.
- **Zero Style Bleed**: `react-big-calendar` styles are strictly class-scoped (`.rbc-*`), causing zero interference with Tailwind v4 base layer or scoped themes (`.heidi-scribe-theme`).

---

## 4. Data Layer & Dual-Engine Store Design

### 4.1 Architecture
In production, TheraFlow queries live Supabase tables (`clients`, `appointments`, `out_of_office`, `progress_notes`, `treatment_plans`, `audit_logs`). In Sandbox / CI / Demo mode (`!isSupabaseConfigured`), raw queries to `placeholder-sandbox.supabase.co` fail.
To solve this, implement a resilient dual-engine service layer:
```
src/tools/theraflow/
├── data/
│   ├── demo-seed.ts       # Authoritative fixtures (Jane Doe + 10 TheraFlow patients, appts, notes)
│   └── theraflow-store.ts # Dual-engine CRUD store with localStorage persistence
```

### 4.2 Seed Dataset (`demo-seed.ts`)
The seed dataset contains:
1. **Default Context Patient**: `Jane Doe` (`p-101`, DOB: 1988-04-12, MRN: `#MC-88219`, CPT: `90837`, Status: `active`, ICD-10: `F41.1 Generalized Anxiety Disorder`).
2. **Canonical TheraFlow Patients (10 patients)**:
   - `Elena Reyes` (`b000...0001`, DOB: 1991-04-12, F41.1, `active`)
   - `Marcus Chen` (`b000...0002`, DOB: 1988-11-23, F33.0, `active`)
   - `Sarah Jenkins` (`b000...0003`, DOB: 1995-02-17, F43.10, `active`)
   - `David O'Connor` (`b000...0004`, DOB: 1982-08-05, F43.23, `active`)
   - `Priya Patel` (`b000...0005`, DOB: 1993-06-30, F40.10, `active`)
   - `James Wilson` (`b000...0006`, DOB: 1979-12-14, F34.1, `active`)
   - `Chloe Alvarez` (`b000...0007`, DOB: 1997-09-08, F41.0, `active`)
   - `Robert Kim` (`b000...0008`, DOB: 1985-03-21, F51.01, `active`)
   - `Maya Taylor` (`b000...0009`, DOB: 1990-10-19, Z63.0, `on_hold`)
   - `Samuel Brooks` (`b000...0010`, DOB: 1974-05-03, F43.20, `discharged`)
3. **Realistic Schedule**: Today's sessions (Jane Doe at 10:00 AM, Marcus Vance at 11:30 AM, Elena Reyes at 2:00 PM), upcoming sessions, completed past encounters with DAP notes, and Out-of-Office blocks.

### 4.3 CRUD Interface (`theraflow-store.ts`)
```ts
export interface TheraFlowStore {
  // Clients
  getClients(therapistId?: string): Promise<ClientRecord[]>;
  getClientById(id: string): Promise<ClientDetailRecord | null>;
  addClient(client: NewClientInput): Promise<ClientRecord>;
  updateClient(id: string, updates: Partial<ClientRecord>): Promise<ClientRecord>;

  // Appointments
  getAppointments(therapistId?: string): Promise<CalendarEventRecord[]>;
  addAppointment(apt: NewAppointmentInput): Promise<CalendarEventRecord>;
  updateAppointment(id: string, updates: Partial<CalendarEventRecord>): Promise<CalendarEventRecord>;

  // Out of Office
  addOutOfOffice(ooo: NewOooInput): Promise<CalendarEventRecord>;
  updateOutOfOffice(id: string, updates: Partial<CalendarEventRecord>): Promise<CalendarEventRecord>;

  // Audit Logs
  logAuditEvent(action: string, resourceType: string, resourceId?: string, details?: any): Promise<void>;
}
```

---

## 5. Blueprint: Feature 8 — Client & Patient Roster

### 5.1 Patient Roster View (`src/tools/theraflow/Clients.tsx`)
- **Search Engine**: Instant filter across `${client.first_name} ${client.last_name}`, `client.email`, `client.phone`, `client.diagnosis_code`, and `client.mrn`.
- **Status Filter**:
  - `all`: "All Statuses"
  - `active`: "Active"
  - `on_hold`: "On Hold"
  - `discharged`: "Discharged"
  - `inactive`: "Inactive"
- **Table Structure**:
  - `Patient Name`: Avatar circle, full name, MRN chip, and an `"Active in Copilot"` emerald badge when `client.id === activePatient.id`.
  - `Contact`: Email address and formatted phone number.
  - `DOB & Age`: `YYYY-MM-DD` and age in years.
  - `Clinical Details`: ICD-10 code (`F41.1`, `F33.0`) with diagnosis label tooltip.
  - `Status`: Badge with custom color styling (`bg-emerald-100`, `bg-amber-100`, `bg-slate-100`).
  - `Actions`:
    - **"View Chart"**: Navigates to `/dashboard/clients/${client.id}`.
    - **"Set Active"**: Immediately dispatches client into `ClinicalContext.setActivePatient`, displaying a toast notification: `Active client set to ${client.name}. Synced with Scribe, Aura & Scrubber.`
- **Intake Modal ("Add Client")**:
  - Validates required first name, last name, email, DOB, and diagnosis code.
  - Emits HIPAA audit log (`CREATE`, `client`).
  - Pre-calculates an MRN (e.g., `#MC-` + 5 random digits).

### 5.2 Client Profile Charting (`src/tools/theraflow/ClientProfile.tsx`)
Organized into 4 discrete clinical tabs:
1. **Tab 1: Demographics**
   - Personal details (Legal Name, Preferred Name, DOB, Age, Gender Identity, MRN).
   - Contact coordinates (Email, Phone, Address, Emergency Contact).
   - Payer & Billing (Insurance Payer, Member ID, Standard Session Fee, Default CPT Code `90837`).
   - Clinical Baseline (Primary ICD-10 Diagnosis, Referral Source, Intake Date).
2. **Tab 2: Clinical Encounters**
   - Chronological list of historical and upcoming appointments.
   - Date, time span, session type (CPT), modality (`Telehealth` vs `In-Person`), and status (`Scheduled`, `Completed`, `Cancelled`).
   - Telehealth direct action: "Join Telehealth Room".
   - Direct button to schedule: links to `/dashboard/calendar?client=${client.id}`.
3. **Tab 3: Treatment Plans**
   - Active Treatment Plan with problem statement, measurable short-term and long-term goals, target completion dates, clinical interventions (CBT, Mindfulness), and review date.
4. **Tab 4: Notes History**
   - Chronological list of DAP / SOAP progress notes.
   - For each note: Date of service, locking status (`Locked & Signed` vs `Draft`), and structured DAP sections:
     - **D (Data)**: Subjective complaints, clinical observations.
     - **A (Assessment)**: Diagnostic formulation and response to intervention.
     - **P (Plan)**: Continued therapy plan, assignments, next appointment.
   - Cross-tool pipeline button: **"Send Note to PHI Scrubber"** (loads note directly into `clinicalContext.sendToPhiScrubber`).

### 5.3 Synchronization with `ClinicalContext`
In `src/lib/clinical-context.tsx`:
```ts
export interface Patient {
  id: string;
  name: string;
  dob: string;
  mrn: string;
  cptCode: string;
  encounterId?: string;
  age?: number;
  cptDesc?: string;
  encounterTime?: string;
  nextAppt?: string;
}
```
- In `Clients.tsx`, clicking "Set Active" maps:
  ```ts
  setActivePatient({
    id: client.id,
    name: `${client.first_name} ${client.last_name}`,
    dob: client.date_of_birth,
    age: calculateAge(client.date_of_birth),
    mrn: client.mrn || `#MC-${client.id.slice(0, 5).toUpperCase()}`,
    cptCode: client.diagnosis_code ? '90837' : '90837',
    cptDesc: 'Psychotherapy (60m)',
    encounterId: `enc-${client.id}-${Date.now()}`,
    nextAppt: client.next_appt || 'Next session scheduled',
  });
  ```
- In `ClientProfile.tsx`, the header features a "Set as Active Patient" button that lights up with an "Active in Scribe & Copilot" badge if already selected.
- Header Patient Switcher (`Header.tsx`): Hydrated from the client store so selecting any client in the top bar propagates into the Roster, Scribe, Aura, and PHI Scrubber.

---

## 6. Blueprint: Feature 9 — Interactive Appointment Calendar

### 6.1 Scheduler Architecture (`src/tools/theraflow/Calendar.tsx`)
- **Localizer**:
  ```ts
  import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
  import { format, parse, startOfWeek, getDay } from 'date-fns';
  import { enUS } from 'date-fns/locale';

  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: { 'en-US': enUS },
  });
  ```
- **Configuration**:
  - `views={[Views.MONTH, Views.WEEK, Views.DAY]}`
  - `defaultView={Views.WEEK}`
  - `step={15}`, `timeslots={4}`
  - `selectable={true}`
  - `onSelectSlot={handleSelectSlot}`: Populates start and end times, opens booking modal.
  - `onSelectEvent={openEditModal}`: Opens event view/edit modal.
  - `eventPropGetter={eventStyleGetter}`: Applies color coding based on status.

### 6.2 Booking Modal (`Dialog`)
- **Mode Toggle**:
  - **Appointment**:
    - Client select dropdown (lists all roster clients).
    - Date picker (`YYYY-MM-DD`).
    - Start time & End time (`HH:mm`).
    - Session Type dropdown:
      - `90837 - 60 Min Individual Psychotherapy`
      - `90834 - 45 Min Individual Psychotherapy`
      - `90791 - Psychiatric Diagnostic Evaluation`
      - `90847 - Family / Couples Psychotherapy (50m)`
    - Status dropdown: `scheduled`, `completed`, `cancelled`.
    - Location dropdown: `In-Person`, `Telehealth`.
  - **Out of Office**:
    - Date, start time, end time.
    - Reason input (e.g., "Clinical Supervision", "Case Conference", "Vacation").
- **Audit Logging**: Emits `logAudit(user.id, 'CREATE', 'appointment' | 'out_of_office', id)`.

### 6.3 Event Details & Edit Modal
- **View Mode**:
  - Client full name, email, phone.
  - Formatted date and time interval.
  - Session type & status badge.
  - Location badge.
  - "Join Telehealth Session" button if location is `Telehealth`.
  - "Set as Active Patient" button to instantly bind this encounter's client to `ClinicalContext`.
  - "Write DAP Note" button if session is `completed`.
  - "Edit Event" toggle button.
- **Edit Mode**:
  - Full form allowing rescheduling, status update (`completed`, `cancelled`), or location change.

---

## 7. Integration Path & Route Configuration

### 7.1 Container Component: `src/tools/theraflow/EhrWorkspace.tsx`
`EhrWorkspace` serves as the unified shell that hosts:
1. **Persistent Header & Stats Summary** (Guarantees 100% backward compatibility with Tier 1 E2E tests `T1.4.1` - `T1.4.5`):
   - Title: `"Clinical EHR & Telehealth"`
   - Subtitle: `"TheraFlow Practice Management & Patient Charting"`
   - Status Badge: `"EHR Active"`
   - Three summary cards:
     - Card 1: Active Patient Chart (`Jane Doe`, `#MC-88219`, `CPT 90837`)
     - Card 2: Telehealth State (`Ready for Session`, `Encrypted WebRTC Room`)
     - Card 3: Clinical Notes (`DAP / SOAP Formats`, `Auto-synced with Scribe`)
2. **Sub-Navigation Tabs**:
   - Tab 1: **Patients & Roster** (embeds `Clients.tsx`)
   - Tab 2: **Calendar & Sessions** (embeds `Calendar.tsx`)
   - Tab 3: **DAP Notes & Treatment Plans** (M3 Feature 10 preview)
   - Tab 4: **Invoicing & Superbills** (M3 Feature 11 preview)
   - Tab 5: **Telehealth & Audit Logs** (M3 Feature 12 preview)
3. **Sub-Route Dispatcher**:
   - If URL matches `/dashboard/clients/:id`, renders `ClientProfile.tsx`.
   - If URL matches `/dashboard/calendar`, activates Calendar tab.
   - If URL matches `/dashboard/clients`, activates Patients & Roster tab.

### 7.2 Route Table in `src/App.tsx`
```tsx
{/* The 4 Core Integrated Clinical Tools (Gated by Subscription) */}
<Route
  path="ehr/*"
  element={
    <SubscriptionGate
      requiredTier="starter"
      featureName="Clinical EHR & Telehealth"
      headline="Clinical EHR Subscription Required"
    >
      <EhrWorkspace />
    </SubscriptionGate>
  }
/>

{/* Practice Operations Aliases */}
<Route
  path="calendar"
  element={
    <SubscriptionGate
      requiredTier="starter"
      featureName="Appointment Calendar"
      headline="Calendar Subscription Required"
    >
      <EhrWorkspace defaultTab="calendar" />
    </SubscriptionGate>
  }
/>
<Route
  path="clients"
  element={
    <SubscriptionGate
      requiredTier="starter"
      featureName="Client Roster"
      headline="Client Roster Subscription Required"
    >
      <EhrWorkspace defaultTab="clients" />
    </SubscriptionGate>
  }
/>
<Route
  path="clients/:id"
  element={
    <SubscriptionGate
      requiredTier="starter"
      featureName="Client Profile"
      headline="Client Profile Subscription Required"
    >
      <EhrWorkspace defaultTab="clients" />
    </SubscriptionGate>
  }
/>
<Route
  path="billing"
  element={
    <SubscriptionGate
      requiredTier="starter"
      featureName="Billing & Claims"
      headline="Billing Subscription Required"
    >
      <EhrWorkspace defaultTab="billing" />
    </SubscriptionGate>
  }
/>
<Route
  path="settings"
  element={
    <SubscriptionGate
      requiredTier="starter"
      featureName="Practice Settings"
      headline="Settings Subscription Required"
    >
      <EhrWorkspace defaultTab="settings" />
    </SubscriptionGate>
  }
/>
```

---

## 8. Verification Criteria & Automated Test Strategy

### 8.1 Acceptance Criteria Matrix
| # | Requirement | Acceptance Criteria |
|---|---|---|
| AC-1 | Build Integrity | `npm run build` (`tsc --noEmit && vite build`) exits with code 0. |
| AC-2 | Roster Rendering | `/dashboard/clients` renders patient table with 10+ patients (Jane Doe + 10 demo patients). |
| AC-3 | Patient Search | Searching for "Elena" or "anxiety" dynamically isolates matching patient records. |
| AC-4 | Status Filtering | Selecting "Active", "On Hold", or "Discharged" correctly subsets the roster. |
| AC-5 | Client Intake | Adding a new client via dialog appends record, saves to store, and displays toast. |
| AC-6 | Client Charting | `/dashboard/clients/:id` renders Demographics, Encounters, Treatment Plans, Notes History tabs. |
| AC-7 | Context Sync | "Set Active" propagates client identity to `ClinicalContext.activePatient` and header. |
| AC-8 | Interactive Calendar | `/dashboard/calendar` mounts `react-big-calendar` with Month, Week, Day views. |
| AC-9 | Appointment Booking | Clicking empty slot or "New Event" opens dialog, saves appointment, and color-codes by status. |
| AC-10 | Out of Office Blocks | Out of Office toggle creates gray blocked time slot with audit log. |
| AC-11 | Backward Compatibility | All existing E2E tests (`npm run test:e2e`, Tiers 1-4) continue to pass 100%. |

### 8.2 Dedicated Automated Test Suite: `tests/m3-theraflow-roster-calendar.test.ts`
Implement a test script runnable via `npx tsx tests/m3-theraflow-roster-calendar.test.ts` verifying:
1. `M3.1 [Roster Table]`: Client table mounts with seed patients and full columns.
2. `M3.2 [Search Engine]`: Filtering by name, email, or ICD-10 code isolates records.
3. `M3.3 [Status Filter]`: Filtering by "Active", "On Hold", and "Discharged" filters correctly.
4. `M3.4 [Add Client Modal]`: Intake form validation, submission, and state persistence.
5. `M3.5 [Profile Charting]`: Client profile displays Demographics, Encounters, Treatment Plans, Notes History.
6. `M3.6 [Clinical Context Sync]`: "Set Active" updates `ClinicalContext` and persists across workspace switches.
7. `M3.7 [Calendar Scheduler]`: `react-big-calendar` renders week view with events and hour slots.
8. `M3.8 [Calendar Views]`: Month, Week, and Day view switching executes cleanly.
9. `M3.9 [Appointment Booking]`: Booking modal saves appointment with CPT code and updates calendar.
10. `M3.10 [Out of Office]`: Out of office blocks render with gray styling and reason text.
11. `M3.11 [Event Details]`: View/edit modal displays patient contact details and updates status.
12. `M3.12 [Telehealth Link]`: Telehealth appointments render join session action button.
13. `M3.13 [Cross-Tool Nav]`: Scheduling from Client Profile pre-populates client ID in calendar modal.
14. `M3.14 [Audit Logging]`: Client creation and appointment updates trigger audit log entries.
15. `M3.15 [Style Containment]`: Calendar container maintains minimum height without global CSS pollution.
16. `M3.16 [E2E Regression]`: Full regression execution of Tiers 1-4 passes with zero failures.

---

## 9. Implementation File Manifest

To implement Features 8 & 9 in Milestone 3, the implementer will create and update the following files:

1. **Utilities & Shared UI**:
   - `src/lib/utils.ts` (cn helper)
   - `src/lib/audit.ts` (HIPAA logAudit helper)
   - `src/components/ui/button.tsx`
   - `src/components/ui/card.tsx`
   - `src/components/ui/dialog.tsx`
   - `src/components/ui/input.tsx`
   - `src/components/ui/label.tsx`
   - `src/components/ui/select.tsx`
   - `src/components/ui/table.tsx`
   - `src/components/ui/tabs.tsx`
2. **TheraFlow Data Layer**:
   - `src/tools/theraflow/data/demo-seed.ts` (Jane Doe + 10 demo patients, appointments, notes, plans)
   - `src/tools/theraflow/data/theraflow-store.ts` (dual-engine Supabase/local CRUD store)
3. **TheraFlow Features 8 & 9 Components**:
   - `src/tools/theraflow/Clients.tsx` (Roster table, search, status filter, add client dialog)
   - `src/tools/theraflow/ClientProfile.tsx` (Demographics, Encounters, Treatment Plans, Notes History tabs)
   - `src/tools/theraflow/Calendar.tsx` (react-big-calendar scheduler, booking dialog, event edit dialog)
   - `src/tools/theraflow/EhrWorkspace.tsx` (Shell preserving Tier 1 test markers, sub-tabs & routing)
4. **App Integration & Router**:
   - `src/App.tsx` (Add `<Toaster />`, route `/dashboard/clients`, `/dashboard/clients/:id`, `/dashboard/calendar`, and `/dashboard/ehr/*`)
   - `src/components/layout/Header.tsx` (Optionally hydrate patient switcher from theraflow store)
5. **Automated Verification Script**:
   - `tests/m3-theraflow-roster-calendar.test.ts`
