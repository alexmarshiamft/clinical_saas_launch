/**
 * TheraFlow OS — Database Migration Validation & RLS Adversarial Suite
 * 
 * Tests:
 * 1. Fresh PostgreSQL / Supabase database creation
 * 2. In-order migration deployment with ON_ERROR_STOP=1
 * 3. Exact schema verification against the ordered SQL source inventory:
 *    31 public tables, auth.users, and 58 active public policies
 * 4. Multi-tenant RLS isolation adversarial verification
 * 5. Thirteen behavioral probes covering compensation-plan insert RBAC,
 *    journal-line update immutability, signed/draft note guards, user identity
 *    and privilege guards, manual-accrual inserts, and TRUNCATE denial.
 *    Note trigger probes set JWT identity while retaining the database admin
 *    role; tenant, plan, user, and TRUNCATE probes use authenticated role.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DB_NAME = `theraflow_test_migration_${Date.now()}`;
const MIGRATION_FILES = [
  '20261005_init_schema.sql',
  '20261005_unified_practice_os.sql',
].map(name => fileURLToPath(new URL(`../supabase/migrations/${name}`, import.meta.url)));
let passedProbes = 0;

function passProbe(message: string) {
  passedProbes += 1;
  console.log(`✓ [PASS] ${message}`);
}

// These migrations use unquoted identifiers and literal CREATE/DROP statements.
// Count distinct schema-qualified targets; replay policy replacement in order.
function migrationInventory() {
  const tables = new Set<string>();
  const activePolicies = new Set<string>();
  let createTableStatements = 0;
  let createPolicyStatements = 0;
  for (const file of MIGRATION_FILES) {
    const sql = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|--[^\n]*/g, '');
    for (const match of sql.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w.]+)/gi)) {
      createTableStatements += 1;
      const table = match[1].toLowerCase();
      tables.add(table.includes('.') ? table : `public.${table}`);
    }
    for (const match of sql.matchAll(/\b(CREATE|DROP)\s+POLICY\s+(?:IF\s+EXISTS\s+)?(\w+)\s+ON\s+([\w.]+)/gi)) {
      const table = match[3].toLowerCase();
      const key = `${table.includes('.') ? table : `public.${table}`}:${match[2].toLowerCase()}`;
      if (match[1].toUpperCase() === 'CREATE') {
        createPolicyStatements += 1;
        activePolicies.add(key);
      } else {
        activePolicies.delete(key);
      }
    }
  }
  return { tables, activePolicies, createTableStatements, createPolicyStatements };
}

function assertSameInventory(actual: string[], expected: Set<string>, label: string) {
  const actualSet = new Set(actual);
  const missing = [...expected].filter(value => !actualSet.has(value));
  const unexpected = actual.filter(value => !expected.has(value));
  if (missing.length || unexpected.length || actual.length !== expected.size) {
    throw new Error(`${label} mismatch: missing [${missing.join(', ')}]; unexpected [${unexpected.join(', ')}]`);
  }
}

function runPsql(sqlOrFile: string, isFile = false) {
  if (isFile) {
    return execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-d', DB_NAME, '-f', sqlOrFile],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } else {
    return execFileSync('psql', ['-X', '-v', 'ON_ERROR_STOP=1', '-d', DB_NAME, '-q', '-t', '-A'],
      { input: sqlOrFile, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  }
}

function expectSqlRejected(sql: string, expectedReason: RegExp, failureMessage: string) {
  try {
    runPsql(sql);
  } catch (error) {
    const stderr = String((error as { stderr?: string | Buffer }).stderr ?? error);
    if (!expectedReason.test(stderr)) {
      throw new Error(`Unexpected SQL failure while checking ${failureMessage}: ${stderr}`);
    }
    return;
  }
  throw new Error(failureMessage);
}

async function runMigrationPipelineTest() {
  console.log('====================================================================');
  console.log('   PostgreSQL / Supabase Migration Pipeline & RLS Audit Suite      ');
  console.log('====================================================================');

  try {
    // 1. Create fresh throwaway database
    console.log(`[Phase 1] Provisioning clean throwaway database: ${DB_NAME}...`);
    execFileSync('createdb', [DB_NAME]);
    console.log('✓ Clean test database created.');

    // 2. Auth shim
    console.log('[Phase 2] Applying Supabase Auth compatibility shim...');
    runPsql(`
      CREATE SCHEMA IF NOT EXISTS auth;
      CREATE TABLE IF NOT EXISTS auth.users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT,
          raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
          raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB AS $$
        SELECT COALESCE(
          NULLIF(current_setting('request.jwt.claims', true), '')::JSONB,
          '{}'::JSONB
        );
      $$ LANGUAGE SQL STABLE;
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
        SELECT COALESCE(
          NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID,
          (auth.jwt() ->> 'sub')::UUID
        );
      $$ LANGUAGE SQL STABLE;

      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated;
        END IF;
      END $$;
      -- Exercise the migrations' explicit revocations against broad preexisting
      -- Supabase-style table grants, rather than an unprivileged fresh role.
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
    `);
    console.log('✓ Auth shim applied cleanly.');

    // 3. Apply migrations in order
    console.log('[Phase 3] Applying migration 1: 20261005_init_schema.sql...');
    runPsql(MIGRATION_FILES[0], true);
    console.log('✓ Init schema applied cleanly.');

    console.log('[Phase 3] Applying migration 2: 20261005_unified_practice_os.sql...');
    runPsql(MIGRATION_FILES[1], true);
    console.log('✓ Unified Practice OS schema applied cleanly.');

    // 4. Verify exact table identities, separating auth shim from public tables.
    console.log('\n[Phase 4] Auditing Database Entities...');
    const inventory = migrationInventory();
    const publicTables = runPsql("SELECT table_schema || '.' || table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name").split('\n').filter(Boolean);
    const authTables = runPsql("SELECT table_schema || '.' || table_name FROM information_schema.tables WHERE table_schema = 'auth' AND table_type = 'BASE TABLE' ORDER BY table_name").split('\n').filter(Boolean);
    assertSameInventory(publicTables, new Set([...inventory.tables].filter(table => table.startsWith('public.'))), 'Public tables');
    assertSameInventory(authTables, new Set([...inventory.tables].filter(table => table.startsWith('auth.'))), 'Auth tables');
    console.log(`Source inventory: ${inventory.createTableStatements} CREATE TABLE statements; ${inventory.tables.size} distinct targets (${publicTables.length} public + ${authTables.length} auth).`);
    console.log(`✓ Exact public base-table inventory verified: ${publicTables.length}.`);

    // 5. Verify active policy identities; replacement statements are not extra policies.
    const publicPolicies = runPsql("SELECT schemaname || '.' || tablename || ':' || policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname").split('\n').filter(Boolean);
    assertSameInventory(publicPolicies, new Set([...inventory.activePolicies].filter(policy => policy.startsWith('public.'))), 'Active public policies');
    console.log(`Source inventory: ${inventory.createPolicyStatements} CREATE POLICY statements; runtime pg_policies: ${publicPolicies.length} active public policies.`);
    console.log('✓ Exact active policy inventory verified against ordered CREATE/DROP statements.');

    // 6. Adversarial RLS & Multi-Tenant Tests
    console.log('\n[Phase 5] Executing Adversarial RLS Multi-Tenant & RBAC Tests...');

    // Setup Supabase authenticated role for RLS testing
    runPsql(`
      GRANT USAGE ON SCHEMA public TO authenticated;
      GRANT USAGE ON SCHEMA auth TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
      GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
      GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO authenticated;
    `);

    // Seed Practice A and Practice B (as superuser/admin)
    runPsql(`
      INSERT INTO practices (id, name, slug) VALUES 
        ('a0000000-0000-0000-0000-000000000001', 'Practice A', 'practice-a'),
        ('b0000000-0000-0000-0000-000000000002', 'Practice B', 'practice-b');

      INSERT INTO workers (id, practice_id, first_name, last_name, email, role, employment_type) VALUES
        ('11111111-1111-1111-1111-111111111111', 'a0000000-0000-0000-0000-000000000001', 'Alice', 'Clinician', 'alice@a.com', 'licensed_clinician', 'w2_employee'),
        ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000002', 'Bob', 'Clinician', 'bob@b.com', 'licensed_clinician', 'w2_employee');

      INSERT INTO compensation_plans (id, practice_id, name) VALUES
        ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Practice A Plan'),
        ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Practice B Plan');
    `);

    // Probe 1: Practice A JWT cannot see Practice B workers
    const rawProbeA = runPsql(
      `SET ROLE authenticated;
       SET "request.jwt.claims" = '{"app_metadata": {"practice_id": "a0000000-0000-0000-0000-000000000001", "role": "clinician"}}';
       SELECT count(*) FROM workers;`
    );
    const probeALines = rawProbeA.split('\n').map(l => l.trim()).filter(Boolean);
    const countA = probeALines[probeALines.length - 1];
    if (countA !== '1') {
      throw new Error(`Tenant Isolation Failed: Practice A saw ${countA} workers (expected 1)`);
    }
    passProbe('Cross-tenant isolation holds (Practice A sees only its own workers).');

    // Probe 2: Clinician without admin role cannot insert compensation plan
    expectSqlRejected(
        `SET ROLE authenticated;
         SET "request.jwt.claims" = '{"app_metadata": {"practice_id": "a0000000-0000-0000-0000-000000000001", "role": "clinician"}}';
         INSERT INTO compensation_plans (id, practice_id, name) VALUES ('c0000000-0000-0000-0000-000000000099', 'a0000000-0000-0000-0000-000000000001', 'Hacked Plan');`,
        /new row violates row-level security policy for table "compensation_plans"/,
        'RBAC Violation: Clinician was able to insert a compensation plan!'
    );
    passProbe('RBAC enforced: Regular clinician cannot create a compensation plan.');

    // Probe 3: Double-entry journal append-only immutability
    const glAccountId = 'd0000000-0000-0000-0000-000000000001';
    const jEntryId = 'e0000000-0000-0000-0000-000000000001';
    const lineId = 'f0000000-0000-0000-0000-000000000001';

    runPsql(`
      INSERT INTO general_ledger_accounts (id, practice_id, account_code, account_name, account_type) VALUES
        ('${glAccountId}', 'a0000000-0000-0000-0000-000000000001', '1010', 'Operating Checking', 'asset');

      INSERT INTO journal_entries (id, practice_id, transaction_ref, entry_type, description) VALUES
        ('${jEntryId}', 'a0000000-0000-0000-0000-000000000001', 'TX-INITIAL', 'insurance_deposit', 'Initial deposit');

      INSERT INTO journal_entry_lines (id, journal_entry_id, account_id, debit_cents, credit_cents) VALUES
        ('${lineId}', '${jEntryId}', '${glAccountId}', 10000, 0);
    `);

    // Try to update journal entry line -> rule should do instead nothing
    runPsql(`
      UPDATE journal_entry_lines SET debit_cents = 999999 WHERE id = '${lineId}';
    `);
    const afterUpdateDebit = runPsql(`SELECT debit_cents FROM journal_entry_lines WHERE id = '${lineId}'`);
    if (afterUpdateDebit !== '10000') {
      throw new Error(`Append-Only Violation: Journal line was mutated to ${afterUpdateDebit}!`);
    }
    passProbe('Journal-line update immutability: Debit remains unchanged.');
    // Probe 4: Signed Clinical Note Metadata & Deletion Immutability
    console.log('\n[Phase 6] Auditing Signed Clinical Note Immutability & Deletion Guards...');
    const clientUuid = '11111111-2222-3333-4444-555555555555';
    const clinicianUuid = '11111111-1111-1111-1111-111111111111';
    const noteUuid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    runPsql(`
      INSERT INTO clients (id, practice_id, first_name, last_name, mrn, date_of_birth) VALUES
        ('${clientUuid}', 'a0000000-0000-0000-0000-000000000001', 'Jane', 'Doe', '#MC-TEST-999', '1990-01-01');

      INSERT INTO auth.users (id, email) VALUES
        ('${clinicianUuid}', 'alice@a.com');

      INSERT INTO users (id, practice_id, email, full_name, role) VALUES
        ('${clinicianUuid}', 'a0000000-0000-0000-0000-000000000001', 'alice@a.com', 'Alice Clinician', 'clinician');

      INSERT INTO clinical_notes (id, practice_id, client_id, clinician_id, template_type, rendered_markdown, structured_data, is_signed, signed_at, signature_hash) VALUES
        ('${noteUuid}', 'a0000000-0000-0000-0000-000000000001', '${clientUuid}', '${clinicianUuid}', 'soap', 'Initial Note Content', '{"summary": "Test"}'::jsonb, true, NOW(), 'orig_hash_12345');
    `);

    // Probe 4.1: Attempting to clear signed_at or signature_hash must fail
    expectSqlRejected(
      `UPDATE clinical_notes SET signed_at = NULL, signature_hash = NULL WHERE id = '${noteUuid}';`,
      /Signed clinical notes cannot be altered or unlocked/,
      'Signed Note Immutability Violation: Able to clear signature metadata!'
    );
    passProbe('Signed note metadata lock: Clearing signature metadata blocked.');

    // Probe 4.2: Attempting to change template_type or clinician_id must fail
    expectSqlRejected(
      `UPDATE clinical_notes SET template_type = 'dap' WHERE id = '${noteUuid}';`,
      /Signed clinical notes cannot be altered or unlocked/,
      'Signed Note Immutability Violation: Able to alter template_type!'
    );
    passProbe('Signed note metadata lock: Changing template_type blocked.');

    // Probe 4.3: Attempting to DELETE signed note must fail
    expectSqlRejected(
      `DELETE FROM clinical_notes WHERE id = '${noteUuid}';`,
      /Signed clinical notes cannot be deleted/,
      'Signed Note Immutability Violation: Able to DELETE a signed clinical note!'
    );
    passProbe('Signed note deletion guard: Deleting signed note rejected by trigger.');

    // Probe 4.4: Colleague B attempting to UPDATE Colleague A's unsigned note must fail
    const unsignedNoteUuid = 'aaaaaaaa-bbbb-cccc-dddd-111111111111';
    const colleagueUuid = '33333333-3333-3333-3333-333333333333';
    runPsql(`
      INSERT INTO auth.users (id, email) VALUES
        ('${colleagueUuid}', 'colleague@a.com');
      INSERT INTO users (id, practice_id, email, full_name, role) VALUES
        ('${colleagueUuid}', 'a0000000-0000-0000-0000-000000000001', 'colleague@a.com', 'Colleague Clinician', 'clinician');

      INSERT INTO clinical_notes (id, practice_id, client_id, clinician_id, template_type, rendered_markdown, structured_data, is_signed) VALUES
        ('${unsignedNoteUuid}', 'a0000000-0000-0000-0000-000000000001', '${clientUuid}', '${clinicianUuid}', 'soap', 'Unsigned draft note by Alice', '{"summary": "Draft"}'::jsonb, false);
    `);

    // Test the trigger as database admin with Colleague B's JWT identity.
    expectSqlRejected(`
        SET request.jwt.claim.sub = '${colleagueUuid}';
        UPDATE clinical_notes SET rendered_markdown = 'Tampered by Bob' WHERE id = '${unsignedNoteUuid}';
      `,
      /Unauthorized: Clinicians can only modify their own unsigned notes/,
      'Unsigned Note Violation: Colleague B was able to modify Colleague A unsigned note!'
    );
    passProbe('Unsigned note trigger protection: Colleague B modifying Colleague A draft note blocked.');

    // Probe 4.5: Colleague B attempting to DELETE Colleague A's unsigned note must fail
    expectSqlRejected(`
        SET request.jwt.claim.sub = '${colleagueUuid}';
        DELETE FROM clinical_notes WHERE id = '${unsignedNoteUuid}';
      `,
      /Unauthorized: Clinicians can only delete their own unsigned notes/,
      'Unsigned Note Violation: Colleague B was able to delete Colleague A unsigned note!'
    );
    passProbe('Unsigned note deletion trigger: Colleague B deleting Colleague A draft note blocked.');

    // Probe 4.6: Author Alice CAN modify her own unsigned note
    runPsql(`
      SET request.jwt.claim.sub = '${clinicianUuid}';
      UPDATE clinical_notes SET rendered_markdown = 'Legitimate update by Alice' WHERE id = '${unsignedNoteUuid}';
    `);
    const afterAliceUpdate = runPsql(`SELECT rendered_markdown FROM clinical_notes WHERE id = '${unsignedNoteUuid}';`);
    if (!afterAliceUpdate.includes('Legitimate update by Alice')) {
      throw new Error('Author was improperly blocked from updating their own unsigned note!');
    }
    passProbe('Author legitimate edit: Alice updating her own draft note succeeds.');

    // Probe 5: Colleague Identity Modification & Privileged User Insert Guards
    console.log('\n[Phase 7] Auditing User Modification and Privilege Escalation Guards...');
    const otherClinicianUuid = '22222222-3333-4444-5555-666666666666';
    runPsql(`
      INSERT INTO auth.users (id, email) VALUES
        ('${otherClinicianUuid}', 'bob@a.com');

      INSERT INTO users (id, practice_id, email, full_name, role) VALUES
        ('${otherClinicianUuid}', 'a0000000-0000-0000-0000-000000000001', 'bob@a.com', 'Bob Clinician', 'clinician');
    `);

    // Clinician Alice trying to edit Bob's email/name must fail
    expectSqlRejected(`
        SET ROLE authenticated;
        SET "request.jwt.claim.sub" = '${clinicianUuid}';
        SET "request.jwt.claims" = '{"sub": "${clinicianUuid}", "role": "authenticated", "app_metadata": {"practice_id": "a0000000-0000-0000-0000-000000000001"}}';
        UPDATE users SET email = 'hacked_bob@a.com' WHERE id = '${otherClinicianUuid}';
      `,
      /Unauthorized: Users can only modify their own profile/,
      'RBAC Violation: Clinician was able to edit colleague identity field!'
    );
    passProbe('User identity protection: Non-admin editing colleague profile blocked.');

    // Non-admin trying to INSERT a user with role 'owner' must fail
    const attackerUuid = '99999999-9999-9999-9999-999999999999';
    runPsql(`
      INSERT INTO auth.users (id, email) VALUES
        ('${attackerUuid}', 'attacker@a.com');
    `);

    expectSqlRejected(`
        SET ROLE authenticated;
        SET "request.jwt.claim.sub" = '${clinicianUuid}';
        SET "request.jwt.claims" = '{"sub": "${clinicianUuid}", "role": "authenticated", "app_metadata": {"practice_id": "a0000000-0000-0000-0000-000000000001"}}';
        INSERT INTO users (id, practice_id, email, full_name, role) VALUES
          ('${attackerUuid}', 'a0000000-0000-0000-0000-000000000001', 'attacker@a.com', 'Attacker', 'owner');
      `,
      /Unauthorized: Only practice administrators can provision privileged user accounts/,
      'RBAC Violation: Non-admin was able to insert a privileged owner user!'
    );
    passProbe('User privilege guard: Unauthorized insertion of owner role blocked.');

    // Probe 6: Accrual Idempotency Partial Index (Repeat manual adjustments succeed without zero-UUID collapse)
    console.log('\n[Phase 8] Auditing Accrual Idempotency Partial Indexes...');
    runPsql(`
      -- Insert two legitimate manual adjustment accruals with null encounter_id and null payment_event_id
      INSERT INTO earning_line_items (practice_id, worker_id, date_of_service, client_name, cpt_code, service_description, amount_billed_cents, amount_collected_cents, clinician_earning_cents, practice_retained_cents, status, rule_applied, calculation_explanation, accrual_type) VALUES
        ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-10-01', 'Practice Adjustment', 'ADJ', 'Admin Allowance 1', 0, 0, 5000, -5000, 'accrued', 'admin_allowance', 'First allowance', 'admin_allowance'),
        ('a0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-10-01', 'Practice Adjustment', 'ADJ', 'Admin Allowance 2', 0, 0, 3000, -3000, 'accrued', 'admin_allowance', 'Second allowance', 'admin_allowance');
    `);
    passProbe('Accrual partial indexes: Multiple manual adjustments for same worker succeed without zero-UUID collision.');

    // Probe 7: TRUNCATE Revocation
    console.log('\n[Phase 9] Auditing TRUNCATE Privilege Revocation...');
    const revokedTruncateTables = [
      'clinical_notes', 'journal_entry_lines', 'journal_entries', 'audit_logs',
      'payment_reconciliations', 'payroll_runs', 'payroll_run_line_items',
      'earning_line_items', 'users', 'clients', 'appointments', 'compensation_plan_versions',
    ];
    for (const table of revokedTruncateTables) {
      if (runPsql(`SELECT has_table_privilege('authenticated', 'public.${table}', 'TRUNCATE');`) !== 'f') {
        throw new Error(`TRUNCATE privilege was not revoked on public.${table}`);
      }
    }
    expectSqlRejected(`
        SET ROLE authenticated;
        TRUNCATE journal_entry_lines;
      `,
      /permission denied for table journal_entry_lines/,
      'Security Violation: authenticated role was able to TRUNCATE journal_entry_lines!'
    );
    passProbe(`TRUNCATE denied by privilege: authenticated lacks TRUNCATE on all ${revokedTruncateTables.length} explicitly protected tables.`);

    console.log('\n====================================================================');
    console.log(`✓ ALL ${passedProbes} DATABASE MIGRATION & RLS BEHAVIORAL PROBES PASSED`);
    console.log('====================================================================');
  } finally {
    // 7. Teardown test database
    try {
      execFileSync('dropdb', ['--if-exists', DB_NAME]);
      console.log(`Cleaned up test database: ${DB_NAME}`);
    } catch {}
  }
}

runMigrationPipelineTest().catch((err) => {
  console.error('❌ MIGRATION TEST HARNESS FAILED:', err);
  process.exit(1);
});
