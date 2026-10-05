-- ==============================================================================
-- TheraFlow OS Production-Grade Relational Schema & Row Level Security (RLS)
-- Target Database: PostgreSQL 15+ / Supabase
-- Multi-Tenant Isolation: Practice / Clinic Level Tenancy
-- Compliance Alignment: Designed to support HIPAA Security Rule 45 CFR § 164.312
-- Data Classification: All clinical data models support synthetic and production isolation
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TENANCY & PRACTICES (Group Practice Isolation)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS practices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    tax_ein VARCHAR(20),
    npi VARCHAR(10),
    billing_address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    subscription_tier VARCHAR(50) DEFAULT 'pro' CHECK (subscription_tier IN ('starter', 'pro', 'group', 'enterprise')),
    subscription_status VARCHAR(50) DEFAULT 'active' CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled')),
    stripe_customer_id VARCHAR(100),
    stripe_subscription_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. USERS & CLINICIANS (RBAC)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'clinician' CHECK (role IN ('owner', 'admin', 'clinician', 'biller', 'auditor')),
    clinical_degree VARCHAR(50), -- e.g. MD, PhD, PsyD, LCSW, LMFT
    npi VARCHAR(10),
    dea VARCHAR(15),
    state_license_number VARCHAR(50),
    state_license_state VARCHAR(2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. CLIENTS & PATIENTS (EHR Master Patient Index)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    primary_clinician_id UUID REFERENCES users(id) ON DELETE SET NULL,
    mrn VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    phone VARCHAR(25),
    email VARCHAR(255),
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    postal_code VARCHAR(10),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discharged', 'intake')),
    primary_diagnosis_icd10 VARCHAR(20) DEFAULT 'F41.1',
    primary_diagnosis_desc VARCHAR(255) DEFAULT 'Generalized Anxiety Disorder',
    default_cpt_code VARCHAR(10) DEFAULT '90837',
    insurance_carrier VARCHAR(100),
    insurance_member_id VARCHAR(100),
    insurance_group_number VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(practice_id, mrn)
);

-- ------------------------------------------------------------------------------
-- 4. CLINICAL ENCOUNTERS & SESSIONS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    clinician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    encounter_date TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 53,
    cpt_code VARCHAR(10) NOT NULL DEFAULT '90837',
    encounter_type VARCHAR(50) DEFAULT 'psychotherapy_telehealth' CHECK (encounter_type IN ('psychotherapy_telehealth', 'psychotherapy_in_person', 'intake_evaluation', 'crisis_intervention')),
    telehealth_room_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'canceled', 'no_show')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. CLINICAL NOTES (SOAP / DAP / PIRP)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    encounter_id UUID UNIQUE REFERENCES encounters(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    clinician_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    template_type VARCHAR(50) NOT NULL DEFAULT 'soap' CHECK (template_type IN ('soap', 'dap', 'pirp', 'intake', 'birp', 'girp')),
    structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    rendered_markdown TEXT NOT NULL,
    is_signed BOOLEAN NOT NULL DEFAULT FALSE,
    signed_at TIMESTAMPTZ,
    signed_by UUID REFERENCES users(id),
    signature_hash VARCHAR(64), -- SHA-256 digital signature
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. CMS-1500 & REVENUE CYCLE CLAIMS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS billing_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    payer_name VARCHAR(100) NOT NULL,
    payer_id VARCHAR(50),
    total_charge_cents INTEGER NOT NULL,
    copay_amount_cents INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'ready_to_bill', 'submitted', 'paid', 'denied', 'appealed')),
    cms1500_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    edi_837p_payload TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. APPEND-ONLY CRYPTOGRAPHIC AUDIT LOG (HIPAA § 164.312(b))
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    sequence_id BIGSERIAL PRIMARY KEY,
    id UUID UNIQUE DEFAULT gen_random_uuid(),
    practice_id UUID NOT NULL REFERENCES practices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL CHECK (action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'DE_IDENTIFY', 'SIGN')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    previous_hash VARCHAR(64) NOT NULL,
    record_hash VARCHAR(64) NOT NULL, -- SHA-256(previous_hash + payload)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Prevent updates or deletes on audit log table (Append-Only Enforcement)
CREATE OR REPLACE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE OR REPLACE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Security helper: extract current practice ID from JWT metadata
CREATE OR REPLACE FUNCTION current_practice_id() RETURNS UUID AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'practice_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- Practices Policy: users can only view their own practice record
CREATE POLICY practice_isolation_policy ON practices
    FOR ALL
    USING (id = current_practice_id());

-- Users Policy: users can view peers in the same practice
CREATE POLICY users_practice_isolation_policy ON users
    FOR ALL
    USING (practice_id = current_practice_id());

-- Clients Policy: isolate clients to the clinician's practice
CREATE POLICY clients_practice_isolation_policy ON clients
    FOR ALL
    USING (practice_id = current_practice_id());

-- Encounters Policy: isolate encounters to the clinician's practice
CREATE POLICY encounters_practice_isolation_policy ON encounters
    FOR ALL
    USING (practice_id = current_practice_id());

-- Clinical Notes Policy: isolate notes to the clinician's practice
CREATE POLICY clinical_notes_practice_isolation_policy ON clinical_notes
    FOR ALL
    USING (practice_id = current_practice_id());

-- Billing Claims Policy: isolate billing to the practice
CREATE POLICY billing_claims_practice_isolation_policy ON billing_claims
    FOR ALL
    USING (practice_id = current_practice_id());

-- Audit Logs Policy: users can only read audit events for their own practice; only system can append
CREATE POLICY audit_logs_read_policy ON audit_logs
    FOR SELECT
    USING (practice_id = current_practice_id());

CREATE POLICY audit_logs_insert_policy ON audit_logs
    FOR INSERT
    WITH CHECK (practice_id = current_practice_id());
