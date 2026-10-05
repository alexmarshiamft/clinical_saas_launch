# TheraFlow OS — Payroll Provider Integration Architecture

## 1. Executive Summary & Regulatory Boundary

**TheraFlow is a specialized healthcare payroll orchestration engine, NOT a payroll tax filing entity, chartered bank, or money transmitter.**

Live payroll tax withholdings (Federal 941, State SUTA, FICA, FUTA) and statutory remittances require specialized compliance infrastructure. Instead of attempting to reinvent ADP or Gusto, TheraFlow acts as the **clinical source of truth**: it calculates the complex healthcare-specific session, CPT, split, and bonus logic, packages the resulting gross earnings into an auditable payroll run, and dispatches the batch to regulated payroll partners.

```
+-------------------------------------------------------------------------+
|                              THERAFLOW OS                               |
|                                                                         |
|  [Clinical Note Signed]                                                 |
|          |                                                              |
|          v                                                              |
|  [Compensation Engine]                                                  |
|   - 90837 ($150 allowed -> 60% split = $90)                             |
|   - Doc promptness bonus (+$10)                                         |
|          |                                                              |
|          v                                                              |
|  [Pay Period Earnings Ledger]                                           |
|   - Auditable line items across all 14 clinicians                       |
|   - Owner inspection & approval interface                               |
+-------------------------------------------------------------------------+
                                   |
                   Universal Payroll Provider Interface
                                   |
    +------------------------------+------------------------------+
    |                              |                              |
    v                              v                              v
[TheraFlow Sandbox]      [Gusto Embedded Payroll]      [ADP Workforce Now]
(Deterministic ACH)       (OAuth API v2 - Buyer)       (Partner API - Buyer)
    |                              |                              |
    +------------------------------+------------------------------+
                                   |
                                   v
             [Tax Filings, W-2s & Direct Deposit Settlement]
```

---

## 2. Universal Provider Interface (`PayrollProvider`)

All payroll operations pass through a strictly typed TypeScript interface located at `src/modules/payroll/payroll-provider.ts`:

```typescript
export interface PayrollProvider {
  name: string;
  isSandbox: boolean;
  connectPractice(config: ProviderConnectionConfig): Promise<{ connected: boolean; message: string }>;
  syncWorker(worker: WorkerRecord): Promise<{ synced: boolean; externalWorkerId: string }>;
  previewPayroll(run: PayrollRun): Promise<{ previewReady: boolean; employerTaxesEstimate: number }>;
  submitPayroll(run: PayrollRun): Promise<PayrollSubmissionResult>;
  getPayrollStatus(externalBatchId: string): Promise<{ status: string; settled: boolean }>;
}
```

---

## 3. Integration Classification Matrix

| Provider | Status | Classification | Implementation Details |
|---|---|---|---|
| **TheraFlow Sandbox Provider** | **Active & Functional** | Sandbox Simulation | Full bi-directional simulation. Generates deterministic ACH batches (`ach-sandbox-...`), estimates 7.65% FICA + SUTA, and clears funding. |
| **Gusto Embedded Payroll** | **Adapter Implemented** | Contract Conforming | Implements `GustoPayrollAdapter` targeting Gusto API v2 (`/v1/companies`, `/v1/employees`, `/v1/payrolls`). Requires buyer production client ID. |
| **ADP Workforce Now** | **Adapter Implemented** | Contract Conforming | Implements `AdpPayrollAdapter` targeting ADP OpenID Connect & Payroll Ingestion APIs. Requires buyer ADP Partner credentialing. |
| **Rippling** | **Abstraction Modeled** | Buyer Integration | Universal contract supports Rippling Custom Earnings API. |
| **QuickBooks Payroll** | **Abstraction Modeled** | Buyer Integration | Universal contract supports Intuit Developer Payroll endpoints. |
| **Paychex Flex** | **Abstraction Modeled** | Buyer Integration | Universal contract supports Paychex Payroll Import API. |

---

## 4. End-to-End Payroll Review & Funding Lifecycle

1. **Earnings Accrual**: Encounters and payment reconciliations post individual `EarningLineItem` records to the active `PayPeriod` (e.g., Oct 1–15, 2026).
2. **Pre-Review Aggregation**: The orchestrator aggregates earnings by clinician into `ClinicianPayrollSummary` records, detailing:
   - Individual sessions, couples sessions, intakes, and late cancellations.
   - Attributable revenue collections.
   - Base compensation splits.
   - Promptness bonuses, clinical stipends, and adjustments.
   - Gross payable earnings.
3. **Practice Owner Review**:
   - Practice administrators can click any clinician to inspect the exact formula behind every cent before approving.
   - Adjustments or reimbursements can be appended directly with audit comments.
4. **Approval & Lock**: Once approved, the pay period status shifts from `open` to `closing`, preventing race conditions or retroactive changes.
5. **Provider Submission**:
   - The selected provider adapter transmits the batch payload via secure TLS.
   - The provider returns an immutable `externalBatchId` and scheduled debit date.
6. **BaaS Payroll Funding**:
   - The embedded banking layer automatically checks operating account balance.
   - An ACH debit is scheduled against the operating account, moving funds into escrow for clinician direct deposit.
