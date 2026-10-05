-- ==============================================================================
-- TheraFlow OS — Unified Practice Operating System Schema Expansion
-- Migration: 20261005_unified_practice_os.sql
-- Modules: Workforce, Compensation Rules Engine, Payroll Orchestration, Embedded Money
-- Standard: PostgreSQL 15+ / Supabase Multi-Tenant RLS Architecture
-- ==============================================================================

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
CREATE INDEX IF NOT EXISTS idx_locations_practice ON practice_locations(practice_id);

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
-- 4. COMPENSATION PLANS & RULES ENGINE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS compensation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    minimum_pay_guarantee NUMERIC(10,2) DEFAULT 0.00,
    documentation_bonus_amount NUMERIC(8,2) DEFAULT 10.00, -- $10 per note <24h
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
    cpt_codes TEXT[], -- Array of CPT codes
    encounter_types TEXT[], -- Array of encounter types
    flat_amount NUMERIC(10,2),
    percentage NUMERIC(5,2), -- 55.00 = 55%
    tier_thresholds JSONB, -- JSON array of [{ fromCount: 1, toCount: 20, rateOrPercentage: 50 }]
    timing_policy VARCHAR(50) NOT NULL DEFAULT 'on_cash_settlement' CHECK (timing_policy IN (
        'on_date_of_service', 'on_claim_acceptance', 'on_insurer_remittance', 'on_cash_settlement'
    )),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_rules_plan ON compensation_rules(plan_id);

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
-- 5. PAY PERIODS, EARNINGS LEDGER & AUDIT TRAIL
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
    total_gross_collections NUMERIC(12,2) DEFAULT 0.00,
    total_gross_compensation NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_id, start_date, end_date)
);
CREATE INDEX IF NOT EXISTS idx_pay_periods_practice ON pay_periods(practice_id);

CREATE TABLE IF NOT EXISTS earning_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    pay_period_id UUID REFERENCES pay_periods(id) ON DELETE SET NULL,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
    payment_id VARCHAR(100),
    date_of_service DATE NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    cpt_code VARCHAR(10) NOT NULL,
    service_description VARCHAR(255) NOT NULL,
    amount_billed NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    amount_collected NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    clinician_earning NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    practice_retained NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    rule_applied VARCHAR(255) NOT NULL,
    explanation TEXT NOT NULL, -- Mandatory forensic formula explanation
    status VARCHAR(30) NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued', 'approved', 'paid', 'adjusted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_earnings_worker ON earning_line_items(worker_id);
CREATE INDEX IF NOT EXISTS idx_earnings_pay_period ON earning_line_items(pay_period_id);
CREATE INDEX IF NOT EXISTS idx_earnings_encounter ON earning_line_items(encounter_id);

CREATE TABLE IF NOT EXISTS compensation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL, -- Deduplication key
    worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_comp_events_idempotency ON compensation_events(idempotency_key);

-- ------------------------------------------------------------------------------
-- 6. PAYROLL RUNS & PROVIDER ABSTRACTION
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

CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE RESTRICT,
    provider VARCHAR(50) NOT NULL DEFAULT 'sandbox',
    external_payroll_batch_id VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'under_review', 'approved', 'submitted', 'settled')),
    total_gross_pay NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_employer_taxes_estimate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_funding_required NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period ON payroll_runs(pay_period_id);

-- ------------------------------------------------------------------------------
-- 7. THERAFLOW MONEY (EMBEDDED BANKING & BAAS)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    account_type VARCHAR(40) NOT NULL CHECK (account_type IN ('operating_checking', 'tax_reserve', 'payroll_escrow')),
    account_number_masked VARCHAR(20) NOT NULL,
    routing_number_masked VARCHAR(20) NOT NULL,
    current_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    available_balance NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    institution_name VARCHAR(255) NOT NULL DEFAULT 'TheraFlow Banking (Evolve Bank & Trust, Member FDIC)',
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
    type VARCHAR(30) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'ach_debit', 'ach_credit', 'internal_transfer')),
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'insurance_remittance', 'patient_private_pay', 'payroll_funding', 'tax_set_aside', 'operating_expense'
    )),
    amount NUMERIC(12,2) NOT NULL, -- Positive = Credit/Deposit, Negative = Debit
    description VARCHAR(255) NOT NULL,
    reference_id VARCHAR(100),
    running_balance NUMERIC(14,2) NOT NULL,
    reconciled BOOLEAN NOT NULL DEFAULT true,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_tx_account ON bank_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_timestamp ON bank_transactions(timestamp DESC);

-- ------------------------------------------------------------------------------
-- 8. CLAIM-TO-BANK RECONCILIATIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    payer_name VARCHAR(100) NOT NULL,
    cpt_code VARCHAR(10) NOT NULL,
    date_of_service DATE NOT NULL,
    amount_billed NUMERIC(10,2) NOT NULL,
    allowed_amount NUMERIC(10,2) NOT NULL,
    payer_payment NUMERIC(10,2) NOT NULL,
    patient_responsibility NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    matched_deposit_id VARCHAR(100) NOT NULL,
    clinician_id UUID NOT NULL REFERENCES workers(id) ON DELETE RESTRICT,
    clinician_name VARCHAR(255) NOT NULL,
    compensation_rule VARCHAR(255) NOT NULL,
    clinician_share NUMERIC(10,2) NOT NULL,
    practice_share NUMERIC(10,2) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'matched' CHECK (status IN ('matched', 'pending_deposit', 'disputed', 'reversed')),
    reconciled_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_recon_practice ON payment_reconciliations(practice_id);
CREATE INDEX IF NOT EXISTS idx_recon_claim ON payment_reconciliations(claim_id);

CREATE TABLE IF NOT EXISTS payroll_funding_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    source_account_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL,
    ach_trace_number VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'settled' CHECK (status IN ('pending', 'processing', 'settled', 'failed')),
    initiated_at TIMESTAMPTZ DEFAULT NOW(),
    settled_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE practice_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinician_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE earning_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_funding_events ENABLE ROW LEVEL SECURITY;

-- Practice isolation policies
CREATE POLICY practice_isolation_locations ON practice_locations
    FOR ALL USING (practice_id = auth.jwt() ->> 'practice_id'::text);

CREATE POLICY practice_isolation_workers ON workers
    FOR ALL USING (practice_id = auth.jwt() ->> 'practice_id'::text);

CREATE POLICY practice_isolation_comp_plans ON compensation_plans
    FOR ALL USING (practice_id = auth.jwt() ->> 'practice_id'::text);

CREATE POLICY practice_isolation_pay_periods ON pay_periods
    FOR ALL USING (practice_id = auth.jwt() ->> 'practice_id'::text);

CREATE POLICY practice_isolation_earnings ON earning_line_items
    FOR ALL USING (practice_id = auth.jwt() ->> 'practice_id'::text);

CREATE POLICY practice_isolation_payroll_runs ON payroll_runs
    FOR ALL USING (practice_id = auth.jwt() ->> 'practice_id'::text);

CREATE POLICY practice_isolation_bank_accounts ON bank_accounts
    FOR ALL USING (practice_id = auth.jwt() ->> 'practice_id'::text);

CREATE POLICY practice_isolation_reconciliations ON payment_reconciliations
    FOR ALL USING (practice_id = auth.jwt() ->> 'practice_id'::text);
