# TheraFlow OS — Environment Setup & Configuration Guide

> **Target Audience:** Engineering, DevOps, and Platform Operations Teams  
> **Environment Types:** Local Development, Interactive Buyer Demo, Production Cloud  

---

## 1. Environment Variables Specification

The system uses standard environment variable configurations loaded via `.env` (development) or cloud secret managers (production).

```env
# ==============================================================================
# 1. CORE SERVER CONFIGURATION
# ==============================================================================
PORT=3000
NODE_ENV=development # 'development' | 'production'
APP_URL=http://localhost:3000

# ==============================================================================
# 2. PERSISTENCE & DATABASE (SUPABASE / POSTGRESQL)
# ==============================================================================
# In demo/evaluation mode, these can remain unset; the app operates with
# in-memory cache and local durable disk ledger (data/audit_ledger.jsonl).
# In production mode, connect to your Supabase/PostgreSQL instance.
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...

# ==============================================================================
# 3. PAYMENT & BILLING (STRIPE)
# ==============================================================================
# Optional in demo mode. If omitted, Stripe checkout functions in a resilient
# local simulation sandbox without network calls.
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# ==============================================================================
# 4. CLINICAL AI & LLM INFERENCE (GOOGLE GEMINI)
# ==============================================================================
# Required only for live external LLM note synthesis.
# If omitted or unconfigured, the app falls back seamlessly to deterministic
# clinical rule-based note generation templates.
GEMINI_API_KEY=AIzaSy...

# ==============================================================================
# 5. AMBIENT AUDIO TRANSCRIPTION & DIARIZATION (DEEPGRAM)
# ==============================================================================
# Optional. If omitted, the app uses the browser's native WebSpeech API
# (SpeechRecognition) for live microphone capture and speaker turn alternation.
DEEPGRAM_API_KEY=...

# ==============================================================================
# 6. TELEHEALTH & WEBRTC (DAILY / AWS CHIME)
# ==============================================================================
# Optional in evaluation mode. If omitted, the WebRTC engine captures local
# camera and mic streams and creates a loopback peer connection.
DAILY_API_KEY=...
DAILY_DOMAIN=...
AWS_REGION=us-east-1

# ==============================================================================
# 7. PAYROLL PROVIDER ORCHESTRATION (GUSTO / ADP / SANDBOX)
# ==============================================================================
# In evaluation mode, the sandbox provider generates deterministic ACH batches.
# To connect to live Gusto or ADP Partner APIs, populate these credentials:
PAYROLL_PROVIDER=sandbox # 'sandbox' | 'gusto' | 'adp' | 'rippling'
GUSTO_CLIENT_ID=...
GUSTO_CLIENT_SECRET=...
GUSTO_REDIRECT_URI=http://localhost:3000/api/payroll/callback/gusto
ADP_CLIENT_ID=...
ADP_CLIENT_SECRET=...

# ==============================================================================
# 8. EMBEDDED BUSINESS BANKING / BAAS (UNIT / STRIPE TREASURY / COLUMN)
# ==============================================================================
# In evaluation mode, the multi-vault treasury functions in a deterministic sandbox.
# To wire live BaaS partner programs, configure:
BAAS_PROVIDER=sandbox # 'sandbox' | 'unit' | 'stripe_treasury' | 'column'
UNIT_API_KEY=...
UNIT_ORG_ID=...
```

---

## 2. Local Setup (Zero-Configuration Evaluation Mode)

To run TheraFlow OS on a local developer workstation or evaluation laptop:

### Prerequisites:
- **Node.js**: v18.0.0 or higher (Node 20+ LTS recommended)
- **npm**: v9.0.0 or higher

### Steps:
```bash
# 1. Clone the repository
git clone <repository_url>
cd clinical_saas_launch

# 2. Install dependencies
npm install

# 3. Start the unified development server
npm run dev
```

The application will start immediately at `http://localhost:3000`.  
- The server will execute its preflight check, recognizing that external credentials are unset and activating **Zero-Liability Evaluation Mode**.
- Open `http://localhost:3000` in Google Chrome, Microsoft Edge, or Safari.
- Click **"Launch Demo Experience"** to open the interactive guided tour.

---

## 3. Demo Setup for Investor & Acquirer Walkthroughs

The application includes pre-configured synthetic clinical data and an in-app walkthrough guide:

1. **Instant Clinician Login**:
   - Navigate to `/login`.
   - Click the prominent **"Demo Clinician: Dr. Sarah Chen, MD"** button.
   - Authentication bypasses third-party networks, instantly initializing session state for Dr. Sarah Chen, MD (MRN `#MC-88219`, Jane Doe active chart).
2. **Interactive Demo Guide Modal**:
   - The interactive guide modal can be accessed at any time via the bottom-left floating badge or top navigation.
   - Allows instant jumps across:
     - *Step 1: Clinical EHR & Charting* (`/dashboard/ehr`)
     - *Step 2: Ambient AI Scribe* (`/dashboard/scribe`)
     - *Step 3: WebRTC Telehealth Suite* (`/dashboard/telehealth`)
     - *Step 4: CMS-1500 & Billing Engine* (`/dashboard/billing`)
     - *Step 5: HIPAA PHI Redaction Engine* (`/dashboard/scrubber`)
     - *Step 6: Cryptographic Audit Trail* (`/dashboard/audit`)
3. **Live Microphone Testing**:
   - Navigate to `/dashboard/scribe`.
   - Click **"Start Live Scribe"**.
   - Speak into your microphone; the live browser WebSpeech provider will transcribe your speech in real time with acoustic waveform animation.

---

## 4. Buyer Production Activation Steps

To transition this codebase into an active production clinical deployment:

### Step 1: Provision Multi-Tenant Database
1. Create a PostgreSQL 15 database (e.g., Supabase or AWS RDS for PostgreSQL).
2. Execute the migration script:
   ```bash
   psql -h <db_host> -U <db_user> -d <db_name> -f supabase/migrations/20261005_init_schema.sql
   ```
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in production environment variables.

### Step 2: Configure Production AI & Telehealth Keys
1. Obtain enterprise Business Associate Agreements (BAAs) with Google Cloud (for Vertex AI / Gemini) and Deepgram.
2. Set `GEMINI_API_KEY` and `DEEPGRAM_API_KEY`.
3. Set `DAILY_API_KEY` or wire AWS Chime SDK credentials.

### Step 3: Compile and Deploy Production Assets
```bash
# 1. Run full automated test suite to ensure clean build
npm test

# 2. Compile static production SPA assets
npm run build

# 3. Start production Node server
NODE_ENV=production PORT=8080 node dist-server/server.js
# Or start via standard container entrypoint
```

### Step 4: Configure Reverse Proxy & TLS 1.3
- Ensure all inbound traffic passes through an SSL/TLS terminating reverse proxy (Cloudflare, AWS ALB, or Nginx) enforcing **TLS 1.3** and HSTS headers.
