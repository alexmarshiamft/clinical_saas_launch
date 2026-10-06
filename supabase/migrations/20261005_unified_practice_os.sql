-- ==============================================================================
-- TheraFlow OS — Unified Practice Operating System Schema Expansion
-- Migration: 20261005_unified_practice_os.sql
-- Modules: Workforce, Compensation Rules Engine, Payroll Orchestration, Embedded Money & Double-Entry Ledger
-- Standard: PostgreSQL 14+ / Supabase Multi-Tenant RLS & Role-Based Access Control
-- ==============================================================================

-- Standalone PostgreSQL compatibility shim for auth schema (only if not running in managed Supabase)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        CREATE SCHEMA auth;
        CREATE TABLE auth.users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT,
            raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
            raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
        EXECUTE $fn$
            CREATE FUNCTION auth.uid() RETURNS UUID AS $body$
              SELECT COALESCE(
                NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID,
                (auth.jwt() ->> 'sub')::UUID
              );
            $body$ LANGUAGE SQL STABLE;
        $fn$;
        EXECUTE $fn$
            CREATE FUNCTION auth.jwt() RETURNS JSONB AS $body$
              SELECT COALESCE(
                NULLIF(current_setting('request.jwt.claims', true), '')::JSONB,
                '{}'::JSONB
              );
            $body$ LANGUAGE SQL STABLE;
        $fn$;
    END IF;
END $$;

-- Security Helpers for Multi-Tenancy & RBAC
CREATE OR REPLACE FUNCTION current_practice_id() RETURNS UUID AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'practice_id', '')::UUID,
    NULLIF(auth.jwt() ->> 'practice_id', '')::UUID,
    NULLIF(current_setting('app.current_practice_id', true), '')::UUID
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION current_user_role() RETURNS TEXT AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'role', ''),
    NULLIF(auth.jwt() ->> 'app_role', ''),
    CASE 
      WHEN auth.jwt() ->> 'role' IN ('owner', 'admin', 'practice_admin', 'payroll_admin', 'supervising_clinician', 'clinician', 'biller', 'auditor') THEN auth.jwt() ->> 'role'
      ELSE NULL
    END,
    (SELECT role FROM users WHERE id = auth.uid()),
    'clinician'
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_practice_admin_or_owner() RETURNS BOOLEAN AS $$
  SELECT current_user_role() IN ('owner', 'admin', 'practice_admin');
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION is_payroll_admin() RETURNS BOOLEAN AS $$
  SELECT current_user_role() IN ('owner', 'admin', 'practice_admin', 'payroll_admin');
$$ LANGUAGE SQL STABLE;

-- Ensure users.role check constraint permits practice_admin and payroll_admin
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'practice_admin', 'payroll_admin', 'supervising_clinician', 'clinician', 'biller', 'auditor'));

-- ------------------------------------------------------------------------------
-- 1. PRACTICE LOCATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS practice_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    zip VARCHAR(10) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    phone VARCHAR(25),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- ------------------------------------------------------------------------------
-- 1B. CLINICAL APPOINTMENTS & ENCOUNTERS WIRE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    clinician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled', 'no_show')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_practice ON appointments(practice_id);
ALTER TABLE encounters ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL;

-- ------------------------------------------------------------------------------
-- 2. WORKERS & CLINICIAN PROFILES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(25),
    role VARCHAR(50) NOT NULL CHECK (role IN (
        'practice_owner', 'clinical_admin', 'supervising_clinician',
        'licensed_clinician', 'associate_clinician', 'intern',
        'billing_specialist', 'administrative_assistant'
    )),
    employment_type VARCHAR(20) NOT NULL CHECK (employment_type IN ('w2_employee', '1099_contractor')),
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_leave', 'terminated', 'onboarding')),
    primary_location_id UUID REFERENCES practice_locations(id) ON DELETE SET NULL,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    weekly_target_hours NUMERIC(5,2) DEFAULT 25.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workers_practice ON workers(practice_id);
CREATE INDEX IF NOT EXISTS idx_workers_user ON workers(user_id);

CREATE TABLE IF NOT EXISTS clinician_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    license_type VARCHAR(20) NOT NULL CHECK (license_type IN ('LMFT', 'LCSW', 'LPCC', 'PsyD', 'MD', 'DO', 'AMFT', 'ASW', 'APCC')),
    license_number VARCHAR(50) NOT NULL,
    license_state VARCHAR(2) NOT NULL,
    npi VARCHAR(10) NOT NULL,
    taxonomy_code VARCHAR(20) NOT NULL DEFAULT '101YM0800X',
    expiration_date DATE NOT NULL,
    caqh_id VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id)
);

-- ------------------------------------------------------------------------------
-- 3. EMPLOYMENT & SUPERVISION RELATIONSHIPS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supervisor_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    supervisee_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    weekly_supervision_hours NUMERIC(4,2) DEFAULT 1.00,
    effective_start DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_diff_worker CHECK (supervisee_id <> supervisor_id)
);
CREATE INDEX IF NOT EXISTS idx_supervisor_rel ON supervisor_relationships(practice_id, supervisee_id);

-- ------------------------------------------------------------------------------
-- 4. COMPENSATION PLANS & RULES ENGINE (Versioned & Effective-Dated)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compensation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    is_default BOOLEAN DEFAULT false,
    minimum_pay_guarantee_cents BIGINT DEFAULT 0,
    documentation_bonus_amount_cents BIGINT DEFAULT 1000, -- $10.00 in integer cents
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_plans_practice ON compensation_plans(practice_id);

CREATE TABLE IF NOT EXISTS compensation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES compensation_plans(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
        'flat_fee', 'cpt_rate', 'percentage_billed', 'percentage_allowed',
        'percentage_collected', 'tiered_volume', 'tiered_collections',
        'supervision_stipend', 'admin_hourly', 'no_show_fee',
        'late_cancellation', 'documentation_bonus'
    )),
    cpt_codes TEXT[],
    encounter_types TEXT[],
    flat_amount_cents BIGINT,
    percentage NUMERIC(5,2), -- 55.00 = 55%
    tier_thresholds JSONB, -- JSON array of [{ fromCount: 1, toCount: 20, rateOrPercentage: 50 }]
    timing_policy VARCHAR(50) NOT NULL DEFAULT 'on_cash_settlement' CHECK (timing_policy IN (
        'on_date_of_service', 'on_claim_acceptance', 'on_insurer_remittance', 'on_cash_settlement'
    )),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_rules_plan ON compensation_rules(plan_id);

CREATE TABLE IF NOT EXISTS compensation_plan_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES compensation_plans(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    rules JSONB NOT NULL DEFAULT '[]'::jsonb,
    minimum_pay_guarantee_cents BIGINT DEFAULT 0,
    documentation_bonus_cents BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, version)
);
CREATE INDEX IF NOT EXISTS idx_comp_plan_versions ON compensation_plan_versions(plan_id, version);

CREATE TABLE IF NOT EXISTS compensation_plan_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES compensation_plans(id) ON DELETE CASCADE,
    effective_start DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_end DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(worker_id, plan_id, effective_start)
);

-- ------------------------------------------------------------------------------
-- 5. DURABLE PAYMENT EVENTS & IDEMPOTENCY STORE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    source VARCHAR(50) NOT NULL CHECK (source IN (
        'insurance_era_835', 'patient_card_stripe', 'ach_direct_deposit', 'manual_adjustment', 'simulated_cascade'
    )),
    external_event_id VARCHAR(255) NOT NULL,
    trace_id VARCHAR(255),
    claim_id UUID REFERENCES billing_claims(id) ON DELETE SET NULL,
    amount_cents BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'settled' CHECK (status IN ('pending', 'settled', 'failed', 'reversed', 'disputed')),
    received_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_id, source, external_event_id)
);
CREATE INDEX IF NOT EXISTS idx_payment_events_external ON payment_events(practice_id, source, external_event_id);

-- ------------------------------------------------------------------------------
-- 6. PAY PERIODS & EARNINGS LEDGER
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pay_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    pay_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closing', 'closed', 'funded')),
    total_clinicians INTEGER DEFAULT 0,
    total_encounters INTEGER DEFAULT 0,
    total_gross_collections_cents BIGINT DEFAULT 0,
    total_gross_compensation_cents BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_id, start_date, end_date)
);
CREATE INDEX IF NOT EXISTS idx_pay_periods_practice ON pay_periods(practice_id);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL DEFAULT 1,
    provider VARCHAR(50) NOT NULL DEFAULT 'sandbox',
    external_payroll_batch_id VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'submitted', 'settled', 'voided')),
    total_gross_pay_cents BIGINT NOT NULL DEFAULT 0,
    total_employer_taxes_estimate_cents BIGINT NOT NULL DEFAULT 0,
    total_funding_required_cents BIGINT NOT NULL DEFAULT 0,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_id, pay_period_id, version)
);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(pay_period_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unq_active_payroll_submission ON payroll_runs(practice_id, pay_period_id) WHERE status IN ('submitted', 'settled');

CREATE TABLE IF NOT EXISTS earning_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    pay_period_id UUID REFERENCES pay_periods(id) ON DELETE SET NULL,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    claim_id UUID REFERENCES billing_claims(id) ON DELETE SET NULL,
    payment_event_id UUID REFERENCES payment_events(id) ON DELETE SET NULL,
    compensation_rule_id UUID REFERENCES compensation_rules(id) ON DELETE SET NULL,
    plan_version_id UUID REFERENCES compensation_plan_versions(id) ON DELETE SET NULL,
    rule_version INTEGER DEFAULT 1,
    idempotency_key VARCHAR(255),
    accrual_type VARCHAR(50) NOT NULL DEFAULT 'session_compensation' CHECK (accrual_type IN (
        'session_compensation', 'documentation_bonus', 'supervision_stipend',
        'admin_allowance', 'late_cancellation', 'no_show_fee', 'adjustment_clawback', 'minimum_guarantee_topup'
    )),
    date_of_service DATE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    cpt_code VARCHAR(10) NOT NULL,
    service_description VARCHAR(255) NOT NULL,
    amount_billed_cents BIGINT NOT NULL DEFAULT 0,
    amount_collected_cents BIGINT NOT NULL DEFAULT 0,
    clinician_earning_cents BIGINT NOT NULL DEFAULT 0,
    practice_retained_cents BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued', 'approved', 'paid', 'adjusted', 'voided')),
    rule_applied VARCHAR(255) NOT NULL,
    calculation_explanation TEXT NOT NULL,
    paid_in_payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Separate partial unique indexes to prevent NULL-key zero-UUID collapse on manual adjustments (C-1)
DROP INDEX IF EXISTS idx_unq_accrual_idempotency;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unq_accrual_encounter ON earning_line_items (
    practice_id,
    worker_id,
    encounter_id,
    compensation_rule_id,
    accrual_type
) WHERE encounter_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unq_accrual_payment ON earning_line_items (
    practice_id,
    worker_id,
    payment_event_id,
    accrual_type
) WHERE payment_event_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unq_earning_idempotency_key ON earning_line_items (
    practice_id,
    idempotency_key
) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_earnings_period ON earning_line_items(pay_period_id);
CREATE INDEX IF NOT EXISTS idx_earnings_worker ON earning_line_items(worker_id);

-- ------------------------------------------------------------------------------
-- 6B. IMMUTABLE PAYROLL RUN SNAPSHOT LINE ITEMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_run_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    earning_line_item_id UUID NOT NULL REFERENCES earning_line_items(id) ON DELETE RESTRICT,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    gross_amount_cents BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'included' CHECK (status IN ('included', 'paid', 'voided')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(payroll_run_id, earning_line_item_id)
);
CREATE INDEX IF NOT EXISTS idx_payroll_run_lines_run ON payroll_run_line_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_run_lines_earning ON payroll_run_line_items(earning_line_item_id);

CREATE TABLE IF NOT EXISTS compensation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    claim_id UUID REFERENCES billing_claims(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_events_idempotency ON compensation_events(idempotency_key);

-- ------------------------------------------------------------------------------
-- 7. DOUBLE-ENTRY PRACTICE LEDGER (GAAP-Compliant Balanced Journal)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS general_ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    account_code VARCHAR(10) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_type VARCHAR(30) NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_id, account_code)
);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_practice ON general_ledger_accounts(practice_id);

CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    entry_number BIGSERIAL,
    transaction_ref VARCHAR(100) NOT NULL,
    source VARCHAR(50) DEFAULT 'practice_ops',
    external_reference VARCHAR(255),
    reversal_of_entry_id UUID REFERENCES journal_entries(id) ON DELETE RESTRICT,
    payment_event_id UUID REFERENCES payment_events(id) ON DELETE SET NULL,
    payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN (
        'insurance_deposit', 'patient_private_pay', 'clinician_accrual',
        'tax_reserve_transfer', 'payroll_funding', 'refund_payout', 'chargeback_reversal',
        'opening_balance', 'reversal', 'general_adjustment'
    )),
    description TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'voided')),
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_id, transaction_ref)
);
CREATE INDEX IF NOT EXISTS idx_journal_entries_ref ON journal_entries(practice_id, transaction_ref);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unq_journal_external ON journal_entries(practice_id, source, external_reference) WHERE external_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unq_journal_single_reversal ON journal_entries(reversal_of_entry_id) WHERE reversal_of_entry_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES general_ledger_accounts(id) ON DELETE RESTRICT,
    debit_cents BIGINT NOT NULL DEFAULT 0 CHECK (debit_cents >= 0),
    credit_cents BIGINT NOT NULL DEFAULT 0 CHECK (credit_cents >= 0),
    description VARCHAR(255),
    CONSTRAINT chk_debit_or_credit CHECK (
        (debit_cents > 0 AND credit_cents = 0) OR
        (credit_cents > 0 AND debit_cents = 0)
    )
);
CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_entry_lines(journal_entry_id);

-- Append-only rule for journal lines: prevent mutations to posted accounting lines
CREATE OR REPLACE RULE journal_lines_no_update AS ON UPDATE TO journal_entry_lines DO INSTEAD NOTHING;
CREATE OR REPLACE RULE journal_lines_no_delete AS ON DELETE TO journal_entry_lines DO INSTEAD NOTHING;

-- ------------------------------------------------------------------------------
-- 8. THERAFLOW MONEY (EMBEDDED BAAS SIMULATOR & TREASURY ACCOUNTS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    gl_account_id UUID REFERENCES general_ledger_accounts(id) ON DELETE RESTRICT,
    account_type VARCHAR(40) NOT NULL CHECK (account_type IN ('operating_checking', 'tax_reserve', 'payroll_escrow')),
    account_number_masked VARCHAR(20) NOT NULL,
    routing_number_masked VARCHAR(20) NOT NULL,
    current_balance_cents BIGINT NOT NULL DEFAULT 0,
    available_balance_cents BIGINT NOT NULL DEFAULT 0,
    institution_name VARCHAR(255) NOT NULL DEFAULT 'TheraFlow BaaS Sandbox Treasury (Simulated Bank Partner)',
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(30) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'restricted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_id, account_type)
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_practice ON bank_accounts(practice_id);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'ach_debit', 'ach_credit', 'internal_transfer')),
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'insurance_deposit', 'insurance_remittance', 'patient_private_pay', 'payroll_funding',
        'tax_set_aside', 'tax_reserve_transfer', 'operating_expense', 'refund_payout',
        'chargeback_reversal', 'opening_balance', 'reversal', 'general_adjustment'
    )),
    amount_cents BIGINT NOT NULL, -- Positive = Credit/Deposit, Negative = Debit
    description VARCHAR(255) NOT NULL,
    reference_id VARCHAR(100),
    running_balance_cents BIGINT NOT NULL,
    reconciled BOOLEAN NOT NULL DEFAULT true,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_tx_account ON bank_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_timestamp ON bank_transactions(timestamp DESC);

-- ------------------------------------------------------------------------------
-- 9. CLAIM-TO-BANK RECONCILIATIONS & PAYROLL FUNDING
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    claim_id UUID REFERENCES billing_claims(id) ON DELETE SET NULL,
    payment_event_id UUID REFERENCES payment_events(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    payer_name VARCHAR(100) NOT NULL,
    cpt_code VARCHAR(10) NOT NULL,
    date_of_service DATE NOT NULL,
    amount_billed_cents BIGINT NOT NULL,
    allowed_amount_cents BIGINT NOT NULL,
    payer_payment_cents BIGINT NOT NULL,
    patient_responsibility_cents BIGINT NOT NULL DEFAULT 0,
    matched_deposit_id VARCHAR(100) NOT NULL,
    clinician_id UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    clinician_name VARCHAR(255) NOT NULL,
    compensation_rule VARCHAR(255) NOT NULL,
    clinician_share_cents BIGINT NOT NULL,
    practice_share_cents BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'matched' CHECK (status IN ('matched', 'pending_deposit', 'disputed', 'reversed')),
    reconciled_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recon_practice ON payment_reconciliations(practice_id);
CREATE INDEX IF NOT EXISTS idx_recon_claim ON payment_reconciliations(claim_id);

ALTER TABLE earning_line_items ADD COLUMN IF NOT EXISTS reconciliation_id UUID REFERENCES payment_reconciliations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_earnings_reconciliation ON earning_line_items(reconciliation_id);

CREATE TABLE IF NOT EXISTS payroll_funding_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    source_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    amount_cents BIGINT NOT NULL,
    ach_trace_number VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'settled' CHECK (status IN ('pending', 'processing', 'settled', 'failed')),
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    settled_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. PAYROLL PROVIDER CONNECTIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payroll_provider_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    provider_name VARCHAR(50) NOT NULL CHECK (provider_name IN ('sandbox', 'gusto', 'adp', 'rippling', 'quickbooks', 'paychex')),
    status VARCHAR(30) NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'action_required')),
    external_company_id VARCHAR(100),
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    config_metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_id, provider_name)
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) & RBAC POLICIES
-- ==============================================================================
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinician_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE earning_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_run_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE general_ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_funding_events ENABLE ROW LEVEL SECURITY;

-- 0. Clinical Appointments
CREATE POLICY rls_appointments_select ON appointments
    FOR SELECT USING (practice_id = current_practice_id());
CREATE POLICY rls_appointments_write ON appointments
    FOR ALL USING (practice_id = current_practice_id() AND is_practice_admin_or_owner());

-- 1. Practice Locations
CREATE POLICY rls_locations_select ON practice_locations
    FOR SELECT USING (practice_id = current_practice_id());
CREATE POLICY rls_locations_write ON practice_locations
    FOR ALL USING (practice_id = current_practice_id() AND is_practice_admin_or_owner());

-- 2. Workers & Profiles (Peers view, only Admin writes)
CREATE POLICY rls_workers_select ON workers
    FOR SELECT USING (practice_id = current_practice_id());
CREATE POLICY rls_workers_write ON workers
    FOR ALL USING (practice_id = current_practice_id() AND is_practice_admin_or_owner());

CREATE POLICY rls_profiles_select ON clinician_profiles
    FOR SELECT USING (worker_id IN (SELECT id FROM workers WHERE practice_id = current_practice_id()));
CREATE POLICY rls_profiles_write ON clinician_profiles
    FOR ALL USING (
        worker_id IN (SELECT id FROM workers WHERE practice_id = current_practice_id())
        AND is_practice_admin_or_owner()
    );

CREATE POLICY rls_supervisors_select ON supervisor_relationships
    FOR SELECT USING (practice_id = current_practice_id());
CREATE POLICY rls_supervisors_write ON supervisor_relationships
    FOR ALL USING (practice_id = current_practice_id() AND is_practice_admin_or_owner());

-- 3. Compensation Plans & Rules (Admin only write; clinicians cannot edit plans)
CREATE POLICY rls_comp_plans_select ON compensation_plans
    FOR SELECT USING (practice_id = current_practice_id());
CREATE POLICY rls_comp_plans_write ON compensation_plans
    FOR ALL USING (practice_id = current_practice_id() AND is_practice_admin_or_owner());

CREATE POLICY rls_comp_versions_select ON compensation_plan_versions
    FOR SELECT USING (practice_id = current_practice_id());
CREATE POLICY rls_comp_versions_write ON compensation_plan_versions
    FOR ALL USING (practice_id = current_practice_id() AND is_practice_admin_or_owner());

CREATE POLICY rls_comp_rules_select ON compensation_rules
    FOR SELECT USING (plan_id IN (SELECT id FROM compensation_plans WHERE practice_id = current_practice_id()));
CREATE POLICY rls_comp_rules_write ON compensation_rules
    FOR ALL USING (
        plan_id IN (SELECT id FROM compensation_plans WHERE practice_id = current_practice_id())
        AND is_practice_admin_or_owner()
    );

CREATE POLICY rls_comp_assign_select ON compensation_plan_assignments
    FOR SELECT USING (worker_id IN (SELECT id FROM workers WHERE practice_id = current_practice_id()));
CREATE POLICY rls_comp_assign_write ON compensation_plan_assignments
    FOR ALL USING (
        worker_id IN (SELECT id FROM workers WHERE practice_id = current_practice_id())
        AND is_practice_admin_or_owner()
    );

-- 4. Payment Events & Pay Periods
CREATE POLICY rls_payment_events_select ON payment_events
    FOR SELECT USING (practice_id = current_practice_id());
CREATE POLICY rls_payment_events_write ON payment_events
    FOR ALL USING (practice_id = current_practice_id() AND is_payroll_admin());

CREATE POLICY rls_pay_periods_select ON pay_periods
    FOR SELECT USING (practice_id = current_practice_id());
CREATE POLICY rls_pay_periods_write ON pay_periods
    FOR ALL USING (practice_id = current_practice_id() AND is_payroll_admin());

-- 5. Earning Line Items (Clinicians can only view their own earnings; Admins view all; only Payroll Admin writes)
CREATE POLICY rls_earnings_select ON earning_line_items
    FOR SELECT USING (
        practice_id = current_practice_id() AND (
            is_payroll_admin() OR
            worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
        )
    );
CREATE POLICY rls_earnings_write ON earning_line_items
    FOR ALL USING (practice_id = current_practice_id() AND is_payroll_admin());

-- 5B. Payroll Run Line Items (Immutable snapshot of approved earnings)
CREATE POLICY rls_payroll_run_lines_select ON payroll_run_line_items
    FOR SELECT USING (
        practice_id = current_practice_id() AND (
            is_payroll_admin() OR
            worker_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
        )
    );
CREATE POLICY rls_payroll_run_lines_write ON payroll_run_line_items
    FOR ALL USING (practice_id = current_practice_id() AND is_payroll_admin());

-- 6. Payroll Runs & Funding (Admins view/execute; clinician cannot approve own payroll)
CREATE POLICY rls_payroll_runs_select ON payroll_runs
    FOR SELECT USING (practice_id = current_practice_id() AND is_payroll_admin());
CREATE POLICY rls_payroll_runs_write ON payroll_runs
    FOR ALL USING (practice_id = current_practice_id() AND is_payroll_admin());

CREATE POLICY rls_funding_events_select ON payroll_funding_events
    FOR SELECT USING (payroll_run_id IN (SELECT id FROM payroll_runs WHERE practice_id = current_practice_id()) AND is_payroll_admin());
CREATE POLICY rls_funding_events_write ON payroll_funding_events
    FOR ALL USING (payroll_run_id IN (SELECT id FROM payroll_runs WHERE practice_id = current_practice_id()) AND is_payroll_admin());

-- 7. Banking & General Ledger (Restricted to financial admins)
CREATE POLICY rls_bank_accounts_select ON bank_accounts
    FOR SELECT USING (practice_id = current_practice_id() AND is_payroll_admin());
CREATE POLICY rls_bank_accounts_write ON bank_accounts
    FOR ALL USING (practice_id = current_practice_id() AND is_payroll_admin());

CREATE POLICY rls_bank_tx_select ON bank_transactions
    FOR SELECT USING (account_id IN (SELECT id FROM bank_accounts WHERE practice_id = current_practice_id()) AND is_payroll_admin());
CREATE POLICY rls_bank_tx_write ON bank_transactions
    FOR ALL USING (account_id IN (SELECT id FROM bank_accounts WHERE practice_id = current_practice_id()) AND is_payroll_admin());

CREATE POLICY rls_gl_accounts_select ON general_ledger_accounts
    FOR SELECT USING (practice_id = current_practice_id() AND is_payroll_admin());
CREATE POLICY rls_gl_accounts_write ON general_ledger_accounts
    FOR ALL USING (practice_id = current_practice_id() AND is_payroll_admin());

CREATE POLICY rls_journal_entries_select ON journal_entries
    FOR SELECT USING (practice_id = current_practice_id() AND is_payroll_admin());
CREATE POLICY rls_journal_entries_write ON journal_entries
    FOR ALL USING (practice_id = current_practice_id() AND is_payroll_admin());

CREATE POLICY rls_journal_lines_select ON journal_entry_lines
    FOR SELECT USING (journal_entry_id IN (SELECT id FROM journal_entries WHERE practice_id = current_practice_id()) AND is_payroll_admin());
CREATE POLICY rls_journal_lines_write ON journal_entry_lines
    FOR ALL USING (journal_entry_id IN (SELECT id FROM journal_entries WHERE practice_id = current_practice_id()) AND is_payroll_admin());

-- 8. Reconciliations & Compensation Events
CREATE POLICY rls_reconciliations_select ON payment_reconciliations
    FOR SELECT USING (
        practice_id = current_practice_id() AND (
            is_payroll_admin() OR
            clinician_id IN (SELECT id FROM workers WHERE user_id = auth.uid())
        )
    );
CREATE POLICY rls_reconciliations_write ON payment_reconciliations
    FOR ALL USING (practice_id = current_practice_id() AND is_payroll_admin());

CREATE POLICY rls_comp_events_select ON compensation_events
    FOR SELECT USING (practice_id = current_practice_id() AND is_payroll_admin());
CREATE POLICY rls_comp_events_write ON compensation_events
    FOR ALL USING (practice_id = current_practice_id() AND is_payroll_admin());

CREATE POLICY rls_payroll_provider_conn ON payroll_provider_connections
    FOR ALL USING (practice_id = current_practice_id() AND is_practice_admin_or_owner());

-- ------------------------------------------------------------------------------
-- 9. IMMUTABILITY & ROLE INTEGRITY TRIGGERS
-- ------------------------------------------------------------------------------

-- Prevent regular users from modifying colleague identity fields or escalating roles (C-3)
CREATE OR REPLACE FUNCTION prevent_unauthorized_user_modifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Only practice owners/admins can modify other users' profiles or change roles
    IF NOT is_practice_admin_or_owner() THEN
        -- Non-admins cannot modify other users' profiles (E7: NPI, license, email)
        IF OLD.id IS DISTINCT FROM auth.uid() THEN
            RAISE EXCEPTION 'Unauthorized: Users can only modify their own profile';
        END IF;

        -- Non-admins cannot modify their own role
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            RAISE EXCEPTION 'Unauthorized: Only practice owners and administrators can modify user roles';
        END IF;

        -- Non-admins cannot modify practice affiliation
        IF NEW.practice_id IS DISTINCT FROM OLD.practice_id THEN
            RAISE EXCEPTION 'Unauthorized: Users cannot reassign practice affiliation';
        END IF;
    END IF;

    -- Prevent demoting or removing the sole practice owner
    IF OLD.role = 'owner' AND NEW.role != 'owner' THEN
        IF (SELECT COUNT(*) FROM users WHERE practice_id = OLD.practice_id AND role = 'owner') <= 1 THEN
            RAISE EXCEPTION 'Unauthorized: Cannot demote or remove the sole practice owner';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON users;
DROP TRIGGER IF EXISTS trg_prevent_user_modifications ON users;
CREATE TRIGGER trg_prevent_user_modifications
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_unauthorized_user_modifications();

-- Prevent unauthorized insertion of privileged accounts (E11)
CREATE OR REPLACE FUNCTION prevent_unauthorized_user_insert()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IN ('owner', 'admin', 'practice_admin', 'payroll_admin') THEN
        IF auth.uid() IS NOT NULL AND NOT is_practice_admin_or_owner() THEN
            RAISE EXCEPTION 'Unauthorized: Only practice administrators can provision privileged user accounts';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_user_insert ON users;
CREATE TRIGGER trg_prevent_user_insert
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION prevent_unauthorized_user_insert();

-- Prevent alteration or un-signing of signed clinical notes (complete metadata protection)
CREATE OR REPLACE FUNCTION lock_signed_clinical_notes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_signed = true THEN
        IF (
            NEW.rendered_markdown IS DISTINCT FROM OLD.rendered_markdown OR
            NEW.structured_data IS DISTINCT FROM OLD.structured_data OR
            NEW.is_signed IS DISTINCT FROM OLD.is_signed OR
            NEW.signed_at IS DISTINCT FROM OLD.signed_at OR
            NEW.signed_by IS DISTINCT FROM OLD.signed_by OR
            NEW.signature_hash IS DISTINCT FROM OLD.signature_hash OR
            NEW.clinician_id IS DISTINCT FROM OLD.clinician_id OR
            NEW.template_type IS DISTINCT FROM OLD.template_type OR
            NEW.client_id IS DISTINCT FROM OLD.client_id OR
            NEW.encounter_id IS DISTINCT FROM OLD.encounter_id OR
            NEW.practice_id IS DISTINCT FROM OLD.practice_id
        ) THEN
            RAISE EXCEPTION 'Signed clinical notes cannot be altered or unlocked (HIPAA §164.312 immutability)';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lock_signed_clinical_notes ON clinical_notes;
CREATE TRIGGER trg_lock_signed_clinical_notes
BEFORE UPDATE ON clinical_notes
FOR EACH ROW
EXECUTE FUNCTION lock_signed_clinical_notes();

-- Prevent deletion of signed clinical notes
CREATE OR REPLACE FUNCTION prevent_delete_signed_clinical_notes()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.is_signed = true THEN
        RAISE EXCEPTION 'Signed clinical notes cannot be deleted (HIPAA §164.312 retention and auditability)';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_delete_signed_notes ON clinical_notes;
CREATE TRIGGER trg_prevent_delete_signed_notes
BEFORE DELETE ON clinical_notes
FOR EACH ROW
EXECUTE FUNCTION prevent_delete_signed_clinical_notes();

-- ------------------------------------------------------------------------------
-- 10. CLINICAL NOTE AMENDMENTS (Append-only corrections for signed notes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_note_amendments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id UUID NOT NULL REFERENCES clinical_notes(id) ON DELETE RESTRICT,
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amendment_reason TEXT NOT NULL,
    amendment_text TEXT NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signature_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinical_note_amendments ENABLE ROW LEVEL SECURITY;
CREATE POLICY rls_note_amendments_select ON clinical_note_amendments
    FOR SELECT USING (practice_id = current_practice_id());
CREATE POLICY rls_note_amendments_insert ON clinical_note_amendments
    FOR INSERT WITH CHECK (practice_id = current_practice_id() AND (author_id = auth.uid() OR is_practice_admin_or_owner()));

-- ------------------------------------------------------------------------------
-- 11. REVOKE TRUNCATE PRIVILEGES & ATTACH TRUNCATE PREVENTION TRIGGERS (C-9)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION prevent_table_truncate()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'TRUNCATE is strictly forbidden on compliance, audit, and accounting tables (HIPAA §164.312 immutability)';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_truncate_clinical_notes ON clinical_notes;
CREATE TRIGGER trg_prevent_truncate_clinical_notes
BEFORE TRUNCATE ON clinical_notes
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_journal_lines ON journal_entry_lines;
CREATE TRIGGER trg_prevent_truncate_journal_lines
BEFORE TRUNCATE ON journal_entry_lines
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_journal_entries ON journal_entries;
CREATE TRIGGER trg_prevent_truncate_journal_entries
BEFORE TRUNCATE ON journal_entries
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_audit_logs ON audit_logs;
CREATE TRIGGER trg_prevent_truncate_audit_logs
BEFORE TRUNCATE ON audit_logs
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_earnings ON earning_line_items;
CREATE TRIGGER trg_prevent_truncate_earnings
BEFORE TRUNCATE ON earning_line_items
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_payroll_runs ON payroll_runs;
CREATE TRIGGER trg_prevent_truncate_payroll_runs
BEFORE TRUNCATE ON payroll_runs
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_table_truncate();

DROP TRIGGER IF EXISTS trg_prevent_truncate_payroll_run_lines ON payroll_run_line_items;
CREATE TRIGGER trg_prevent_truncate_payroll_run_lines
BEFORE TRUNCATE ON payroll_run_line_items
FOR EACH STATEMENT
EXECUTE FUNCTION prevent_table_truncate();

REVOKE TRUNCATE ON clinical_notes, journal_entry_lines, journal_entries, audit_logs, payment_reconciliations, payroll_runs, payroll_run_line_items, earning_line_items, users, clients, appointments, compensation_plan_versions FROM PUBLIC;
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE TRUNCATE ON clinical_notes, journal_entry_lines, journal_entries, audit_logs, payment_reconciliations, payroll_runs, payroll_run_line_items, earning_line_items, users, clients, appointments, compensation_plan_versions FROM anon;';
    END IF;
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE TRUNCATE ON clinical_notes, journal_entry_lines, journal_entries, audit_logs, payment_reconciliations, payroll_runs, payroll_run_line_items, earning_line_items, users, clients, appointments, compensation_plan_versions FROM authenticated;';
    END IF;
END $$;


