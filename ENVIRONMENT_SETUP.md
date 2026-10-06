# TheraFlow OS - Evaluation Setup

This guide describes existing commands and configuration. It does not assert production readiness or live vendor activation. Use synthetic data only.

## Local evaluation

Use Node 22 and npm with the committed lockfile:

```bash
npm ci
npm run build
export JWT_SECRET="$(openssl rand -hex 32)"
export AUDIT_HMAC_SECRET="$(openssl rand -hex 32)"
npm start
```

Server defaults to port 3000; `PORT` and `APP_URL` configure hosting. Open the local address and use demo clinician login. `npm run dev` also runs `tsx server.ts`; `npm start` does not refer to a generated dist-server directory. No `npm test` script exists. Typecheck/build and named security/module scripts are listed in package.json and .github/workflows/ci.yml. Keep secrets private and persist production secrets securely rather than regenerating on every start.

## Actual configuration boundaries

| Setting | Existing behavior |
| --- | --- |
| `JWT_SECRET`, `AUDIT_HMAC_SECRET` | API session signing and file audit HMAC; use private strong secrets outside test fixtures |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Browser Supabase client. Missing credentials select demo behavior; live persistence still needs integration |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Server preflight/configuration checks; their presence alone does not prove all application state is persisted |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Configured subscription checkout/webhook code; unconfigured subscription flow and invoice checkout are simulated |
| `GEMINI_API_KEY` | Configured Gemini path exists. Vite currently embeds this value into browser assets: leave unset for evaluation and move secrets/provider calls server-side before deployment |
| Speech/video/payroll/banking keys | Provider-specific integration work is required. Suggested key names in architecture documents are not implemented activation contracts |

Do not put Supabase service-role credentials in VITE variables. Browser speech may use a remote browser-vendor service. Local media permissions do not establish real remote telehealth. See INTEGRATION_MATRIX.md for source paths and operational limits.

## Disposable PostgreSQL verification

Install PostgreSQL CLI tools (`psql`, `createdb`, `dropdb`) and use a dedicated disposable instance with a role allowed to create databases and test roles. Set `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD` for that instance. Run:

```bash
npx tsx tests/migration-pipeline.test.ts
```

The harness creates/deletes a temporary database, supplies a standalone Supabase auth compatibility shim, applies both migrations in order, verifies inventory and exercises tenant/role/note controls. Never direct it at production infrastructure. GitHub CI provisions its own PostgreSQL service. Local validation used PostgreSQL 14.23; the corrected CI service uses PostgreSQL 15.14.

To inspect migrations separately, use `psql -v ON_ERROR_STOP=1` and apply `supabase/migrations/20261005_init_schema.sql`, then `supabase/migrations/20261005_unified_practice_os.sql`. Standalone PostgreSQL must provide auth schema/functions equivalent to the harness; Supabase supplies its own auth objects. Fresh inventory:31 public tables, 58 active public policies. Source declarations:33 table statements/32 targets including auth.users,59 policy creation statements.

## Buyer deployment work

Complete durable database persistence, auth claims/roles and account lifecycle, server-side AI credential protection, deployment-specific privacy/security assessment, audit storage/backups, TLS, monitoring and appropriate agreements. Implement and validate remote video, live speech, clearinghouse transport, payroll and banking before representing them as operational. Entering keys or signing agreements alone does not make the current code suitable for real patient PHI. Staging should remain synthetic.
