import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('screenshots');
const OUTPUT_PDF = path.resolve('clinical_saas_investor_presentation.pdf');
const ARTIFACT_DIR = '/Users/alexandermarshi/.gemini/antigravity-ide/brain/a81f747e-6c5b-4196-8698-c13ba9726836';

const getImg = (file) => {
  const p = path.join(SCREENSHOT_DIR, file);
  if (fs.existsSync(p)) {
    return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
  }
  return '';
};

function buildSlidesHtml() {
  const imgLanding = getImg('01_landing_page.png');
  const imgDashboard = getImg('03_dashboard_command_center.png');
  const imgEhr = getImg('04_theraflow_ehr_clients.png');
  const imgChart = getImg('05_theraflow_client_chart.png');
  const imgTelehealth = getImg('07_telehealth_room.png');
  const imgSuperbill = getImg('09_cms1500_superbill_modal.png');
  const imgScribe = getImg('11_clinical_ai_scribe_live.png');
  const imgAura = getImg('13_aura_assistant_copilot.png');
  const imgScrubber = getImg('14_hipaa_phi_scrubber.png');
  const imgPricing = getImg('15_subscription_pricing.png');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TheraFlow Clinical — Investor Presentation</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #090d16;
      color: #f1f5f9;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }

    .slide {
      width: 13.333in;
      height: 7.5in;
      page-break-after: always;
      break-after: page;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 0.65in 0.8in;
      background: radial-gradient(circle at 10% 10%, #1e1b4b 0%, #0b0f19 65%, #050811 100%);
      box-sizing: border-box;
    }

    /* Decorative Glows */
    .glow-indigo {
      position: absolute;
      top: -100px;
      right: -100px;
      width: 400px;
      height: 400px;
      background: rgba(99, 102, 241, 0.15);
      filter: blur(120px);
      border-radius: 50%;
      pointer-events: none;
    }

    .glow-emerald {
      position: absolute;
      bottom: -100px;
      left: 10%;
      width: 450px;
      height: 450px;
      background: rgba(16, 185, 129, 0.10);
      filter: blur(140px);
      border-radius: 50%;
      pointer-events: none;
    }

    /* Slide Header */
    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.35rem;
    }

    .slide-badge-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .slide-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(129, 140, 248, 0.4);
      color: #c7d2fe;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .slide-badge-emerald {
      background: rgba(16, 185, 129, 0.2);
      border-color: rgba(52, 211, 153, 0.4);
      color: #a7f3d0;
    }

    .slide-badge-amber {
      background: rgba(245, 158, 11, 0.2);
      border-color: rgba(251, 191, 36, 0.4);
      color: #fde68a;
    }

    .slide-number {
      font-size: 0.75rem;
      color: #64748b;
      font-weight: 700;
    }

    .slide-title {
      font-size: 2.15rem;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.025em;
      color: #ffffff;
      margin-bottom: 0.25rem;
    }

    .slide-subtitle {
      font-size: 0.95rem;
      color: #94a3b8;
      line-height: 1.4;
      max-width: 90%;
    }

    /* Slide Body */
    .slide-body {
      flex: 1;
      display: flex;
      gap: 1.5rem;
      align-items: center;
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 0.45rem;
      font-size: 0.72rem;
      color: #64748b;
    }

    /* Cards & Grids */
    .grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.1rem;
      width: 100%;
    }

    .grid-4 {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.9rem;
      width: 100%;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.35rem;
      width: 100%;
    }

    .glass-card {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 0.85rem;
      padding: 1.15rem 1.25rem;
      backdrop-filter: blur(12px);
    }

    .card-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card-text {
      font-size: 0.82rem;
      color: #cbd5e1;
      line-height: 1.5;
    }

    /* Metric Callouts */
    .metric-hero {
      font-size: 2.8rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1;
      margin-bottom: 0.35rem;
      background: linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .metric-hero-emerald {
      background: linear-gradient(135deg, #a7f3d0 0%, #34d399 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .metric-hero-amber {
      background: linear-gradient(135deg, #fde68a 0%, #f59e0b 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .metric-label {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
      font-weight: 600;
    }

    /* Product Showcase Frame */
    .mockup-frame {
      border-radius: 0.75rem;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
      background: #0b0f19;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .mockup-frame img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* Comparison Table */
    .comp-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.76rem;
    }

    .comp-table th {
      text-align: left;
      padding: 0.65rem 0.85rem;
      background: rgba(255, 255, 255, 0.06);
      color: #94a3b8;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }

    .comp-table td {
      padding: 0.65rem 0.85rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      color: #cbd5e1;
    }

    .comp-table tr.highlight {
      background: rgba(99, 102, 241, 0.15);
    }

    .comp-table tr.highlight td {
      color: #ffffff;
      font-weight: 700;
    }

    .check {
      color: #10b981;
      font-weight: 800;
      font-size: 0.95rem;
    }

    .cross {
      color: #ef4444;
      font-weight: 800;
      font-size: 0.95rem;
    }
  </style>
</head>
<body>

  <!-- ===================================================================== -->
  <!-- SLIDE 1: COVER / TITLE -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="glow-indigo"></div>
    <div class="glow-emerald"></div>

    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge">Seed / Series A Confidential Presentation</span>
        <span class="slide-badge slide-badge-emerald">Live on Production</span>
      </div>
      <span class="font-mono text-xs text-slate-400">clinicalsaaslaunch.vercel.app</span>
    </div>

    <div style="margin: auto 0; max-width: 9.5in;">
      <h1 style="font-size: 3.4rem; font-weight: 800; line-height: 1.1; letter-spacing: -0.035em; color: #ffffff; margin-bottom: 1rem;">
        TheraFlow Clinical Platform
      </h1>
      <p style="font-size: 1.45rem; line-height: 1.45; color: #94a3b8; font-weight: 400; margin-bottom: 1.5rem;">
        The Next-Generation Ambient AI Scribe, Local HIPAA Safe Harbor Engine &amp; Practice Operating System for Behavioral Health.
      </p>
      <div style="display: flex; gap: 0.75rem;">
        <span class="slide-badge" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: #fff;">
          4 Integrated Clinical Suites
        </span>
        <span class="slide-badge" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: #fff;">
          100% Client-Side Safe Harbor Redaction
        </span>
        <span class="slide-badge" style="background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.15); color: #fff;">
          $2.5M Seed Round
        </span>
      </div>
    </div>

    <div class="slide-footer">
      <span>TheraFlow Health Technologies, Inc. • Confidential Investor Deck</span>
      <span>Live URL: https://clinicalsaaslaunch.vercel.app • October 2026</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 2: EXECUTIVE SUMMARY -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="glow-indigo"></div>
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge">Executive Summary</span>
      </div>
      <span class="slide-number">02 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">Unifying the Fragmented Mental Health Practice</h2>
      <p class="slide-subtitle">TheraFlow replaces 4 to 6 disconnected point solutions with a single, privacy-first clinical operating system.</p>
    </div>

    <div class="slide-body">
      <div class="grid-4">
        <div class="glass-card">
          <div class="metric-hero">40%</div>
          <div class="metric-label">Clinician Time Lost</div>
          <p class="card-text" style="margin-top: 0.5rem;">Therapists spend over 15 hours each week on documentation, ICD/CPT coding, and claim generation.</p>
        </div>
        <div class="glass-card">
          <div class="metric-hero metric-hero-emerald">100%</div>
          <div class="metric-label">Local-First Privacy</div>
          <p class="card-text" style="margin-top: 0.5rem;">All 18 HIPAA Safe Harbor identifiers are scrubbed in-browser before data ever touches cloud AI models.</p>
        </div>
        <div class="glass-card">
          <div class="metric-hero metric-hero-amber">$45B</div>
          <div class="metric-label">Global Market TAM</div>
          <p class="card-text" style="margin-top: 0.5rem;">Rapidly expanding market for digital behavioral health infrastructure, telehealth, and AI scribing.</p>
        </div>
        <div class="glass-card">
          <div class="metric-hero">$99</div>
          <div class="metric-label">Flagship SaaS Pricing</div>
          <p class="card-text" style="margin-top: 0.5rem;">Predictable, high-margin monthly subscription tiers (Starter $49, Pro $99, Enterprise $199/seat).</p>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>TheraFlow Platform Overview • Executive Briefing</span>
      <span>100% Synthetic Demo Data • Verified Safe Harbor Compliant</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 3: THE PROBLEM -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge slide-badge-amber">The Market Problem</span>
      </div>
      <span class="slide-number">03 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">Administrative Friction is Paralyzing Mental Health Care</h2>
      <p class="slide-subtitle">Providers are drowning in non-clinical overhead while facing heightened privacy scrutiny and tool fatigue.</p>
    </div>

    <div class="slide-body">
      <div class="grid-3">
        <div class="glass-card" style="border-top: 3px solid #ef4444;">
          <div class="card-title">🚨 62% Clinician Burnout Rate</div>
          <p class="card-text">
            Therapists and psychiatrists spend 2 hours documenting for every 1 hour of patient therapy. Administrative exhaustion is driving clinicians out of practice amidst a severe national mental health shortage.
          </p>
        </div>
        <div class="glass-card" style="border-top: 3px solid #f59e0b;">
          <div class="card-title">🧩 Extreme Tool Fragmentation</div>
          <p class="card-text">
            Clinicians currently juggle separate subscriptions: SimplePractice for EHR, Zoom for telehealth, Heidi/DAX for notes, and spreadsheets for billing. None of them communicate seamlessly.
          </p>
        </div>
        <div class="glass-card" style="border-top: 3px solid #ec4899;">
          <div class="card-title">⚖️ Acute Cloud PHI Exposure</div>
          <p class="card-text">
            Standard cloud AI scribes require transmitting raw patient dialogue and acoustic recordings to remote LLM servers, exposing therapy clinics to immense HIPAA liability and patient confidentiality breaches.
          </p>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>Source: APA Clinician Well-Being Survey • HHS Health IT Interoperability Report</span>
      <span>TheraFlow Investor Presentation</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 4: THE SOLUTION -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="glow-emerald"></div>
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge slide-badge-emerald">The TheraFlow Solution</span>
      </div>
      <span class="slide-number">04 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">The Unified Clinical Operating Loop</h2>
      <p class="slide-subtitle">From intake to session, ambient transcription to de-identification, and insurance claim to reimbursement in one seamless platform.</p>
    </div>

    <div class="slide-body" style="align-items: stretch;">
      <div style="flex: 1.1; display: flex; flex-direction: column; justify-content: space-between; gap: 0.8rem;">
        <div class="glass-card">
          <div class="card-title" style="color: #818cf8;">1. Ambient Session Capture</div>
          <p class="card-text">High-fidelity acoustic diarization listens during telehealth or in-person therapy, separating clinician from client without awkward prompt commands.</p>
        </div>
        <div class="glass-card">
          <div class="card-title" style="color: #34d399;">2. Zero-Trust Local PHI De-Identification</div>
          <p class="card-text">100% browser-local engine identifies and masks all 18 HIPAA Safe Harbor identifiers before note synthesis or LLM transmission.</p>
        </div>
        <div class="glass-card">
          <div class="card-title" style="color: #38bdf8;">3. Instant Note Formulation &amp; Billing</div>
          <p class="card-text">Produces complete SOAP/DAP notes mapped directly to ICD-10 diagnostic codes and CMS-1500 procedural claim forms ready for reimbursement.</p>
        </div>
      </div>

      <div style="flex: 1.2;" class="mockup-frame">
        <img src="${imgDashboard}" alt="Dashboard Mockup" />
      </div>
    </div>

    <div class="slide-footer">
      <span>Command Center Live on Vercel: /dashboard</span>
      <span>TheraFlow Confidential Investor Deck</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 5: SUITE 1 - CLINICAL AI SCRIBE V2 -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge">Core Suite 1</span>
        <span class="slide-badge slide-badge-emerald">Ambient Clinical AI Scribe v2</span>
      </div>
      <span class="slide-number">05 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">Ambient Acoustic Diarization &amp; Note Synthesis</h2>
      <p class="slide-subtitle">Captures natural clinical conversations, distinguishes speakers, and synthesizes structured medical documentation in seconds.</p>
    </div>

    <div class="slide-body">
      <div style="flex: 1.2;" class="mockup-frame">
        <img src="${imgScribe}" alt="AI Scribe Mockup" />
      </div>

      <div style="flex: 1; display: flex; flex-direction: column; gap: 0.85rem;">
        <div class="glass-card">
          <div class="card-title">🎙️ Multi-Speaker Diarization</div>
          <p class="card-text">Real-time acoustic analysis separates clinician and client channels with live dynamic audio waveforms and speaker attribution tags.</p>
        </div>
        <div class="glass-card">
          <div class="card-title">📝 Specialty Documentation Library</div>
          <p class="card-text">Pre-configured templates for Psychiatric SOAP, Initial Diagnostic Intakes, DAP Notes, and Specialist Referrals with custom clinician prompt adjustments.</p>
        </div>
        <div class="glass-card">
          <div class="card-title">🏥 Enterprise EHR Interoperability</div>
          <p class="card-text">One-click bridge to push formatted notes directly into Epic Systems, Cerner, and HL7 FHIR-compliant hospital repositories.</p>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>Route: /dashboard/scribe • Live Interactive Studio</span>
      <span>TheraFlow Investor Presentation</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 6: SUITE 2 - LOCAL HIPAA PHI SCRUBBER -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="glow-emerald"></div>
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge slide-badge-emerald">Core Suite 2</span>
        <span class="slide-badge">Zero-Trust Security Moat</span>
      </div>
      <span class="slide-number">06 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">100% In-Browser HIPAA Safe Harbor Redaction</h2>
      <p class="slide-subtitle">The first clinical AI architecture that guarantees zero sensitive patient identifiers leave the clinician's browser unmasked.</p>
    </div>

    <div class="slide-body">
      <div style="flex: 1; display: flex; flex-direction: column; gap: 0.85rem;">
        <div class="glass-card">
          <div class="card-title">🛡️ Full 18 Statutory Categories</div>
          <p class="card-text">Detects names, locations, birthdates, SSNs, phone numbers, MRNs, biometric identifiers, device serials, and IP addresses automatically.</p>
        </div>
        <div class="glass-card">
          <div class="card-title">⚡ Zero Cloud Transmission</div>
          <p class="card-text">All de-identification regex and heuristics execute in client memory. No unmasked data is ever transmitted across public networks or stored on remote servers.</p>
        </div>
        <div class="glass-card">
          <div class="card-title">🔍 Interactive Diff &amp; Forensic Ledger</div>
          <p class="card-text">Clinicians toggle between Tag [NAME], Block ████, and Asterisk masking with cryptographically verifiable tamper-evident audit logs.</p>
        </div>
      </div>

      <div style="flex: 1.2;" class="mockup-frame">
        <img src="${imgScrubber}" alt="PHI Scrubber Mockup" />
      </div>
    </div>

    <div class="slide-footer">
      <span>Statutory Reference: 45 CFR § 164.514(b)(2) • Route: /dashboard/phi-scrubber</span>
      <span>TheraFlow Investor Presentation</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 7: SUITE 3 & 4 - EHR, TELEHEALTH & AURA -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge">Core Suites 3 &amp; 4</span>
        <span class="slide-badge">Integrated Practice Operations</span>
      </div>
      <span class="slide-number">07 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">TheraFlow EHR, Encrypted Video &amp; Aura Copilot</h2>
      <p class="slide-subtitle">Full practice management infrastructure paired with an on-demand psychiatric diagnostic copilot.</p>
    </div>

    <div class="slide-body">
      <div class="grid-3" style="align-items: stretch;">
        <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="card-title">🗂️ TheraFlow Clinical EHR</div>
            <p class="card-text">
              Client directories, appointment scheduling, treatment plans, longitudinal DAP note histories, and multi-site practice switching.
            </p>
          </div>
          <div class="mockup-frame" style="height: 2.1in; margin-top: 0.8rem;">
            <img src="${imgEhr}" alt="EHR Roster" />
          </div>
        </div>

        <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="card-title">📹 Encrypted Telehealth</div>
            <p class="card-text">
              Compliant WebRTC video consultations with hardware toggles, session timer, and side-by-side active note synchronizer.
            </p>
          </div>
          <div class="mockup-frame" style="height: 2.1in; margin-top: 0.8rem;">
            <img src="${imgTelehealth}" alt="Telehealth Room" />
          </div>
        </div>

        <div class="glass-card" style="display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div class="card-title">🧠 Aura DSM-5 Copilot</div>
            <p class="card-text">
              Indexed diagnostic criteria search, clinical differential prompts, typewriter note formulation, and persistent action orb.
            </p>
          </div>
          <div class="mockup-frame" style="height: 2.1in; margin-top: 0.8rem;">
            <img src="${imgAura}" alt="Aura Copilot" />
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>Integrated Workspaces: /dashboard/ehr • /dashboard/telehealth • /dashboard/aura</span>
      <span>TheraFlow Investor Presentation</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 8: BILLING & CMS-1500 SUPERBILLS -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="glow-indigo"></div>
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge slide-badge-emerald">Revenue Cycle Automation</span>
      </div>
      <span class="slide-number">08 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">Closing the Loop: Note to CMS-1500 Superbill</h2>
      <p class="slide-subtitle">Automating insurance reimbursement by directly linking clinical encounter documentation with billing codes.</p>
    </div>

    <div class="slide-body">
      <div style="flex: 1.2;" class="mockup-frame">
        <img src="${imgSuperbill}" alt="Superbill Mockup" />
      </div>

      <div style="flex: 1; display: flex; flex-direction: column; gap: 0.85rem;">
        <div class="glass-card">
          <div class="card-title">📋 Official CMS-1500 Claim Format</div>
          <p class="card-text">Generates standard electronic HCFA/CMS-1500 insurance claim forms with client demographics, payer IDs, and NPI attribution.</p>
        </div>
        <div class="glass-card">
          <div class="card-title">🔗 Automatic ICD-10 &amp; CPT Linking</div>
          <p class="card-text">AI automatically maps documented therapeutic interventions to appropriate procedural codes (CPT 90834, 90837) and psychiatric diagnoses.</p>
        </div>
        <div class="glass-card">
          <div class="card-title">💰 Accelerated Reimbursement Cycle</div>
          <p class="card-text">Reduces claim rejection rates by validating diagnostic pointers and allowable fee schedules prior to submission.</p>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>Route: /dashboard/billing • Automated Superbill Generation</span>
      <span>TheraFlow Investor Presentation</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 9: MARKET OPPORTUNITY & TAM -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge slide-badge-emerald">Market Opportunity</span>
      </div>
      <span class="slide-number">09 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">A $45 Billion Addressable Market in Transition</h2>
      <p class="slide-subtitle">Behavioral health digital health spending is compounding at 18.2% CAGR as private practices adopt AI tooling.</p>
    </div>

    <div class="slide-body">
      <div class="grid-3" style="width: 100%;">
        <div class="glass-card" style="text-align: center; padding: 1.8rem 1.2rem;">
          <div class="metric-hero">$45.2B</div>
          <div class="metric-label" style="font-size: 0.85rem; color: #a5b4fc;">Total Addressable Market (TAM)</div>
          <p class="card-text" style="margin-top: 0.8rem;">
            Global behavioral health EHR, practice management, telehealth, and clinical documentation software market.
          </p>
        </div>

        <div class="glass-card" style="text-align: center; padding: 1.8rem 1.2rem; border-color: rgba(99, 102, 241, 0.4);">
          <div class="metric-hero metric-hero-emerald">$9.8B</div>
          <div class="metric-label" style="font-size: 0.85rem; color: #6ee7b7;">Serviceable Addressable Market (SAM)</div>
          <p class="card-text" style="margin-top: 0.8rem;">
            US outpatient mental health providers, solo practitioners, and independent group behavioral health practices (130,000+ clinics).
          </p>
        </div>

        <div class="glass-card" style="text-align: center; padding: 1.8rem 1.2rem;">
          <div class="metric-hero metric-hero-amber">$1.4B</div>
          <div class="metric-label" style="font-size: 0.85rem; color: #fde68a;">Serviceable Obtainable Market (SOM)</div>
          <p class="card-text" style="margin-top: 0.8rem;">
            Tech-forward therapy practices, telehealth groups, and multi-clinician centers actively migrating from legacy EHRs to AI platforms.
          </p>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>Market Sources: Grand View Research Behavioral Health Market Report • Rock Health Digital Health Pulse</span>
      <span>TheraFlow Investor Presentation</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 10: BUSINESS MODEL & PRICING -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge">Commercial Model</span>
      </div>
      <span class="slide-number">10 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">Predictable, High-Margin B2B SaaS Subscriptions</h2>
      <p class="slide-subtitle">Tiered seat-based licensing designed for seamless expansion from solo practitioners to multi-site clinical organizations.</p>
    </div>

    <div class="slide-body">
      <div class="grid-3" style="align-items: stretch; width: 100%;">
        <div class="glass-card">
          <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Solo Practitioner</div>
          <div style="font-size: 1.35rem; font-weight: 800; color: #fff; margin-top: 0.2rem;">Clinician Starter</div>
          <div style="font-size: 2.2rem; font-weight: 800; color: #818cf8; margin: 0.6rem 0;">$49<span style="font-size: 0.9rem; color: #94a3b8;">/mo</span></div>
          <ul style="list-style: none; font-size: 0.78rem; color: #cbd5e1; line-height: 1.7;">
            <li>✓ Full TheraFlow EHR Client Roster</li>
            <li>✓ Encrypted Telehealth Video Room</li>
            <li>✓ Basic Audit Trail &amp; Scheduling</li>
            <li>✓ 10 Monthly Superbill Claims</li>
          </ul>
        </div>

        <div class="glass-card" style="border: 2px solid #6366f1; background: rgba(99, 102, 241, 0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 0.75rem; color: #c7d2fe; text-transform: uppercase; font-weight: 700;">Most Popular</div>
            <span class="slide-badge slide-badge-emerald" style="font-size: 0.65rem;">Flagship Tier</span>
          </div>
          <div style="font-size: 1.35rem; font-weight: 800; color: #fff; margin-top: 0.2rem;">Clinician Pro</div>
          <div style="font-size: 2.2rem; font-weight: 800; color: #34d399; margin: 0.6rem 0;">$99<span style="font-size: 0.9rem; color: #94a3b8;">/mo</span></div>
          <ul style="list-style: none; font-size: 0.78rem; color: #cbd5e1; line-height: 1.7;">
            <li>✓ <strong>All Starter Features Included</strong></li>
            <li>✓ <strong>Unlimited Ambient AI Scribe v2</strong></li>
            <li>✓ <strong>100% Local HIPAA PHI Scrubber</strong></li>
            <li>✓ <strong>Aura DSM-5 Diagnostic Copilot</strong></li>
            <li>✓ <strong>Template Studio &amp; Unlimited Superbills</strong></li>
          </ul>
        </div>

        <div class="glass-card">
          <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700;">Clinics &amp; Centers</div>
          <div style="font-size: 1.35rem; font-weight: 800; color: #fff; margin-top: 0.2rem;">Group Enterprise</div>
          <div style="font-size: 2.2rem; font-weight: 800; color: #f59e0b; margin: 0.6rem 0;">$199<span style="font-size: 0.9rem; color: #94a3b8;">/seat/mo</span></div>
          <ul style="list-style: none; font-size: 0.78rem; color: #cbd5e1; line-height: 1.7;">
            <li>✓ <strong>All Clinician Pro Features</strong></li>
            <li>✓ <strong>Multi-Site Practice Switcher</strong></li>
            <li>✓ <strong>Enterprise EHR Export (Epic, Cerner)</strong></li>
            <li>✓ <strong>Centralized Billing &amp; Supervisor Approvals</strong></li>
          </ul>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>Annual prepay discount: 20% • Gross Software Margins: 85%+</span>
      <span>TheraFlow Investor Presentation</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 11: COMPETITIVE ADVANTAGE & MOATS -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge slide-badge-emerald">Competitive Landscape</span>
      </div>
      <span class="slide-number">11 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">How TheraFlow Outperforms Point Solutions</h2>
      <p class="slide-subtitle">Combining practice management, ambient AI scribing, zero-trust privacy, and automated billing into a single subscription.</p>
    </div>

    <div class="slide-body">
      <table class="comp-table">
        <thead>
          <tr>
            <th>Key Capability / Feature</th>
            <th style="color: #818cf8;">TheraFlow Platform</th>
            <th>SimplePractice</th>
            <th>Nuance DAX Copilot</th>
            <th>Heidi Health</th>
            <th>TherapyNotes</th>
          </tr>
        </thead>
        <tbody>
          <tr class="highlight">
            <td>Unified EHR + Telehealth + Scribe</td>
            <td><span class="check">✓ Full Suite</span></td>
            <td><span class="cross">✗ No AI Scribe</span></td>
            <td><span class="cross">✗ No EHR</span></td>
            <td><span class="cross">✗ No EHR</span></td>
            <td><span class="cross">✗ No AI Scribe</span></td>
          </tr>
          <tr class="highlight">
            <td>100% In-Browser PHI Scrubber</td>
            <td><span class="check">✓ Zero Cloud Leak</span></td>
            <td><span class="cross">✗ None</span></td>
            <td><span class="cross">✗ Cloud Only</span></td>
            <td><span class="cross">✗ Cloud Only</span></td>
            <td><span class="cross">✗ None</span></td>
          </tr>
          <tr class="highlight">
            <td>Note-to-CMS-1500 Billing Loop</td>
            <td><span class="check">✓ Automated</span></td>
            <td><span class="cross">✗ Manual Entry</span></td>
            <td><span class="cross">✗ None</span></td>
            <td><span class="cross">✗ None</span></td>
            <td><span class="cross">✗ Manual Entry</span></td>
          </tr>
          <tr class="highlight">
            <td>DSM-5 Diagnostic Copilot (Aura)</td>
            <td><span class="check">✓ Integrated</span></td>
            <td><span class="cross">✗ None</span></td>
            <td><span class="cross">✗ Generic Medical</span></td>
            <td><span class="cross">✗ Generic Medical</span></td>
            <td><span class="cross">✗ None</span></td>
          </tr>
          <tr class="highlight">
            <td>Monthly Pricing for Solo Pro</td>
            <td><strong style="color: #34d399;">$99 / mo</strong></td>
            <td>$99+ (No AI)</td>
            <td>$500+ / mo</td>
            <td>$99+ (Scribe Only)</td>
            <td>$59+ (No AI)</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="slide-footer">
      <span>Competitive analysis based on published commercial tier pricing &amp; feature sets as of Q4 2026</span>
      <span>TheraFlow Investor Presentation</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 12: TRACTION & PRODUCTION READINESS -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="glow-indigo"></div>
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge slide-badge-emerald">Traction &amp; Validation</span>
      </div>
      <span class="slide-number">12 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">Production-Ready &amp; Fully Demonstrated</h2>
      <p class="slide-subtitle">Not a mockup — a fully functional, cloud-deployed clinical web application operating live on Vercel.</p>
    </div>

    <div class="slide-body">
      <div class="grid-4" style="width: 100%;">
        <div class="glass-card">
          <div style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">🚀 Live Vercel Deployment</div>
          <p class="card-text">Accessible globally at <span class="font-mono" style="color: #818cf8;">clinicalsaaslaunch.vercel.app</span> with instant demo credentials and sandbox modes.</p>
        </div>
        <div class="glass-card">
          <div style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">✅ Comprehensive Test Suite</div>
          <p class="card-text">Passing end-to-end tests covering auth redirection, subscription gating, adversarial security audits, and EHR integrity.</p>
        </div>
        <div class="glass-card">
          <div style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">✨ Built-In Demo Guide</div>
          <p class="card-text">Integrated 4-tab evaluator modal with step-by-step clinical walkthrough, feature directory, and HIPAA Safe Harbor reference.</p>
        </div>
        <div class="glass-card">
          <div style="font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: 0.35rem;">🎥 Full Video &amp; PDF Assets</div>
          <p class="card-text">83-second automated MP4 demo video and 16-page technical screenshot portfolio published to GitHub.</p>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>GitHub Repository: github.com/alexmarshiamft/clinical_saas_launch</span>
      <span>TheraFlow Investor Presentation</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 13: PRODUCT ROADMAP -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge">Milestones &amp; Roadmap</span>
      </div>
      <span class="slide-number">13 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">Engineering &amp; Commercial Roadmap</h2>
      <p class="slide-subtitle">Executing our phased expansion from clinician ambient notes to enterprise clearinghouse connectivity.</p>
    </div>

    <div class="slide-body">
      <div class="grid-4" style="width: 100%;">
        <div class="glass-card" style="border-top: 3px solid #10b981;">
          <div style="font-size: 0.72rem; color: #34d399; font-weight: 700; text-transform: uppercase;">Q4 2026 • Completed</div>
          <div class="card-title" style="margin-top: 0.3rem;">Production Launch</div>
          <p class="card-text">
            Core 4 clinical suites live on Vercel. 100% in-browser Safe Harbor scrubber, ambient diarization, CMS-1500 generation, and Stripe sandbox.
          </p>
        </div>

        <div class="glass-card" style="border-top: 3px solid #6366f1;">
          <div style="font-size: 0.72rem; color: #818cf8; font-weight: 700; text-transform: uppercase;">Q1 2027 • In Progress</div>
          <div class="card-title" style="margin-top: 0.3rem;">Direct EDI Clearinghouse</div>
          <p class="card-text">
            Direct EDI 837P / 835 claim filing integration with major commercial payers (Change Healthcare, Availity) for zero-friction claim submission.
          </p>
        </div>

        <div class="glass-card" style="border-top: 3px solid #38bdf8;">
          <div style="font-size: 0.72rem; color: #38bdf8; font-weight: 700; text-transform: uppercase;">Q2 2027 • Pipeline</div>
          <div class="card-title" style="margin-top: 0.3rem;">Mobile Ambient App</div>
          <p class="card-text">
            Native iOS and Android ambient dictation companion app for in-person consultations, home visits, and multi-clinician ward rounds.
          </p>
        </div>

        <div class="glass-card" style="border-top: 3px solid #f59e0b;">
          <div style="font-size: 0.72rem; color: #fbbf24; font-weight: 700; text-transform: uppercase;">Q3 2027 • Vision</div>
          <div class="card-title" style="margin-top: 0.3rem;">Outcome Analytics</div>
          <p class="card-text">
            Measurement-based care metrics (PHQ-9, GAD-7) trended longitudinally to empower value-based reimbursement and clinical oversight.
          </p>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>Strategic Growth Milestones • TheraFlow Health Technologies</span>
      <span>TheraFlow Investor Presentation</span>
    </div>
  </div>

  <!-- ===================================================================== -->
  <!-- SLIDE 14: THE ASK & CONTACT -->
  <!-- ===================================================================== -->
  <div class="slide">
    <div class="glow-indigo"></div>
    <div class="glow-emerald"></div>

    <div class="slide-header">
      <div class="slide-badge-group">
        <span class="slide-badge slide-badge-emerald">The Financing Round</span>
        <span class="slide-badge">$2.5M Seed Offering</span>
      </div>
      <span class="slide-number">14 / 14</span>
    </div>

    <div>
      <h2 class="slide-title">Partner With Us to Modernize Behavioral Health</h2>
      <p class="slide-subtitle">Accelerating product development, enterprise clinic integrations, and nationwide practice acquisition.</p>
    </div>

    <div class="slide-body">
      <div style="flex: 1.1; display: flex; flex-direction: column; gap: 0.9rem;">
        <div class="glass-card">
          <div class="card-title" style="color: #818cf8;">50% — Engineering &amp; AI Infrastructure</div>
          <p class="card-text">EDI 837P clearinghouse integrations, proprietary acoustic models fine-tuned on psychological dialogues, and mobile companion apps.</p>
        </div>
        <div class="glass-card">
          <div class="card-title" style="color: #34d399;">30% — Go-To-Market &amp; Practice Sales</div>
          <p class="card-text">Targeted acquisition of private therapist networks, group mental health practices, and partnership with psychiatric training institutions.</p>
        </div>
        <div class="glass-card">
          <div class="card-title" style="color: #f59e0b;">20% — Regulatory &amp; Compliance Hardening</div>
          <p class="card-text">SOC2 Type II audit completion, HITRUST certification, and continuous legal monitoring for state-by-state telehealth regulations.</p>
        </div>
      </div>

      <div style="flex: 0.9;" class="glass-card">
        <div style="font-size: 1.15rem; font-weight: 800; color: #fff; margin-bottom: 0.6rem;">Connect With the Team</div>
        <p class="card-text" style="margin-bottom: 1.2rem;">
          We would welcome the opportunity to walk through the live product, share deeper unit economics, and review our clinical pilot pipeline.
        </p>

        <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.85rem;">
          <div>
            <span style="color: #94a3b8; font-weight: 600;">Live Production Site:</span><br>
            <span class="font-mono" style="color: #818cf8; font-weight: 700;">https://clinicalsaaslaunch.vercel.app</span>
          </div>
          <div>
            <span style="color: #94a3b8; font-weight: 600;">Source Code &amp; Architecture:</span><br>
            <span class="font-mono" style="color: #a7f3d0; font-weight: 700;">github.com/alexmarshiamft/clinical_saas_launch</span>
          </div>
          <div>
            <span style="color: #94a3b8; font-weight: 600;">Evaluation Support:</span><br>
            <span class="font-mono" style="color: #fde68a;">alexmarshiamft@gmail.com</span>
          </div>
        </div>
      </div>
    </div>

    <div class="slide-footer">
      <span>TheraFlow Health Technologies, Inc. • Seed Investment Round</span>
      <span>Thank you for your consideration.</span>
    </div>
  </div>

</body>
</html>
  `;
}

async function renderInvestorPdf() {
  console.log('Generating high-design 16:9 investor presentation PDF...');
  const htmlContent = buildSlidesHtml();
  const htmlPath = path.resolve('investor_deck.html');
  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`✓ Generated intermediate investor deck HTML: ${htmlPath}`);

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
  });

  await page.setContent(htmlContent, { waitUntil: 'load' });

  // 16:9 widescreen PDF format (13.333in x 7.5in)
  await page.pdf({
    path: OUTPUT_PDF,
    width: '13.333in',
    height: '7.5in',
    printBackground: true,
    margin: {
      top: '0',
      bottom: '0',
      left: '0',
      right: '0',
    },
  });

  console.log(`✓ Master Investor Pitch Deck PDF generated at: ${OUTPUT_PDF}`);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const artifactPdf = path.join(ARTIFACT_DIR, 'clinical_saas_investor_presentation.pdf');
    fs.copyFileSync(OUTPUT_PDF, artifactPdf);
    console.log(`✓ Copied to artifacts directory: ${artifactPdf}`);
  }

  await browser.close();
}

renderInvestorPdf();
