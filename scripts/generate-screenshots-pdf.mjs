import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const SCREENSHOT_DIR = path.resolve('screenshots');
const OUTPUT_PDF = path.resolve('clinical_saas_platform_walkthrough.pdf');
const ARTIFACT_DIR = '/Users/alexandermarshi/.gemini/antigravity-ide/brain/a81f747e-6c5b-4196-8698-c13ba9726836';

const pagesData = [
  {
    num: '01',
    file: '01_landing_page.png',
    title: 'Landing Page & Public Showcase',
    route: '/',
    suite: 'Public Portal',
    caption:
      'The public gateway showcasing core platform capabilities, live interactive tool previews, instant demo clinician session launching, and prominent legal notices certifying that all data across the platform is 100% synthetic with zero real Protected Health Information (PHI).',
    highlights: [
      'Instant Demo Clinician one-click evaluation session',
      'Interactive tabbed previews for all 4 clinical tools',
      'Prominent legal synthetic data CYA disclaimers in navbar and footer',
    ],
  },
  {
    num: '02',
    file: '02_demo_guide_modal.png',
    title: 'Interactive Demo & Feature Guide Modal',
    route: '/ (Triggered via ✨ Demo Guide)',
    suite: 'Evaluator Guidance',
    caption:
      'A multi-tab walkthrough modal designed specifically for evaluators, prospective buyers, and clinical reviewers. Includes an interactive 6-step clinical journey, full feature directory, sandbox tier preview, and complete breakdown of the 18 statutory HIPAA Safe Harbor de-identification rules.',
    highlights: [
      'Interactive Clinical Journey with step-by-step progress tracking',
      'Feature Catalog with detailed technical specifications and pricing',
      'Full HIPAA 18 Safe Harbor compliance reference grid',
    ],
  },
  {
    num: '03',
    file: '03_dashboard_command_center.png',
    title: 'Clinician Command Center Dashboard',
    route: '/dashboard',
    suite: 'Practice Operations',
    caption:
      'The central practitioner operational hub displaying today’s clinical appointments, quick-launch tiles for all 4 clinical suites, active patient encounter context bar (with synthetic data badge), and practice profile switcher for multi-site clinics.',
    highlights: [
      'Encounter schedule with instant telehealth join triggers',
      'Header Active Patient context bar with CPT code and MRN tracking',
      'Direct navigation tiles into EHR, Scribe, Aura, and Scrubber',
    ],
  },
  {
    num: '04',
    file: '04_theraflow_ehr_clients.png',
    title: 'TheraFlow Clinical EHR — Client Roster',
    route: '/dashboard/ehr',
    suite: 'TheraFlow EHR Suite',
    caption:
      'The practitioner client directory featuring real-time client search, primary ICD-10 psychiatric diagnostic codes (e.g. F41.1 Generalized Anxiety), standard CPT procedure codes (90837 Psychotherapy), session counters, and intake status indicators.',
    highlights: [
      'Real-time client name and diagnosis code filtering',
      'Quick-action client profiles with direct session launching',
      'Clear indication of intake completion and insurance payer ID',
    ],
  },
  {
    num: '05',
    file: '05_theraflow_client_chart.png',
    title: 'TheraFlow Clinical EHR — Client Chart & DAP Notes',
    route: '/dashboard/ehr (Client Detail)',
    suite: 'TheraFlow EHR Suite',
    caption:
      'Complete electronic health record view for active client Jane Doe. Displays demographic details, active treatment diagnoses, historical DAP (Data, Assessment, Plan) encounter documentation, and longitudinal therapy progress tracking.',
    highlights: [
      'Standardized DAP clinical progress notes with clinician attribution',
      'One-click routing to AI Scribe or PHI Scrubber with active client context',
      'Full encounter history with dates, CPT codes, and clinical assessments',
    ],
  },
  {
    num: '06',
    file: '06_clinical_calendar.png',
    title: 'Clinical Scheduling & Calendar Management',
    route: '/dashboard/calendar',
    suite: 'TheraFlow EHR Suite',
    caption:
      'Practitioner scheduling interface supporting Day, Week, and Month clinical grid views. Color-coded appointment chips display appointment status (Confirmed, Completed, Telehealth) and allow one-click telehealth consultation room launch.',
    highlights: [
      'Interactive Day / Week / Month view toggling',
      'Integrated telehealth appointment badges with direct launch shortcuts',
      'Practice-wide scheduling visibility with clinician assignment',
    ],
  },
  {
    num: '07',
    file: '07_telehealth_room.png',
    title: 'HIPAA Telehealth Video Room',
    route: '/dashboard/telehealth',
    suite: 'TheraFlow EHR Suite',
    caption:
      'Encrypted peer-to-peer virtual consultation suite with high-definition clinician and patient video panes, microphone/camera controls, active session duration timer, and integrated encounter notepad for synchronized clinical documentation.',
    highlights: [
      'Encrypted WebRTC audiovisual consultation streaming',
      'Integrated hardware controls (microphone mute, camera toggle)',
      'Side-by-side clinical notepad for in-session documentation',
    ],
  },
  {
    num: '08',
    file: '08_billing_and_claims.png',
    title: 'Clinical Billing & Insurance Claims Ledger',
    route: '/dashboard/billing',
    suite: 'TheraFlow EHR Suite',
    caption:
      'Practice revenue cycle management console showing itemized billing encounters, real-time insurance claim states (Paid, Submitted, Pending), payer IDs, patient copay tracking, and automated CMS-1500 superbill creation shortcuts.',
    highlights: [
      'Real-time claim status tracking across insurance payers',
      'Revenue summary cards with total billed and paid amounts',
      'One-click CMS-1500 Superbill generation modal trigger',
    ],
  },
  {
    num: '09',
    file: '09_cms1500_superbill_modal.png',
    title: 'Interactive CMS-1500 Superbill Generator',
    route: '/dashboard/billing (Claim Modal)',
    suite: 'TheraFlow EHR Suite',
    caption:
      'Standardized CMS-1500 health insurance claim form generator that automatically maps patient ICD-10 diagnostic codes to CPT procedural codes, calculates total allowable charges, includes provider NPI attribution, and provides printable preview.',
    highlights: [
      'Official CMS-1500 box-by-box electronic claim formatting',
      'Automated ICD-10 to CPT code cross-referencing',
      'Provider NPI, taxonomy, and insurance billing validation',
    ],
  },
  {
    num: '10',
    file: '10_hipaa_audit_logs.png',
    title: 'Immutable HIPAA Compliance Audit Trail',
    route: '/dashboard/audit-logs',
    suite: 'Security & Compliance',
    caption:
      'Cryptographically verified, tamper-evident event log recording every clinician authentication, chart inspection, export, and PHI de-identification operation to fulfill HIPAA Security Rule § 164.312(b) audit control mandates.',
    highlights: [
      'Immutable cryptographic hash verification for each logged event',
      'Detailed event categorization (AUTH, PHI_ACCESS, EXPORT, SYSTEM)',
      'Practitioner IP address, timestamp, and severity classification',
    ],
  },
  {
    num: '11',
    file: '11_clinical_ai_scribe_live.png',
    title: 'Clinical AI Scribe v2 — Live Audio & Diarization',
    route: '/dashboard/scribe',
    suite: 'Clinical AI Scribe v2',
    caption:
      'Real-time ambient clinical transcription interface featuring dynamic multi-band audio waveform visualization, multi-speaker diarization feed distinguishing clinician from patient in real-time, and instant SOAP note synthesis.',
    highlights: [
      'Multi-speaker acoustic diarization (Clinician vs. Patient)',
      'Real-time dynamic multi-band audio frequency waveform display',
      'Instant structured SOAP note generation with ICD-10/CPT coding',
    ],
  },
  {
    num: '12',
    file: '12_clinical_ai_scribe_studio.png',
    title: 'Clinical AI Scribe — Template Studio',
    route: '/dashboard/scribe (Template Studio)',
    suite: 'Clinical AI Scribe v2',
    caption:
      'Clinical documentation customization studio enabling practitioners to tailor documentation structures (SOAP, Intake H&P, DAP, Specialist Referral) and export finalized clinical notes directly to enterprise hospital EHR systems including Epic and Cerner.',
    highlights: [
      'Specialty template library with custom clinical section prompts',
      'One-click FHIR-compatible direct export to Epic Systems and Cerner EHR',
      'Adjustable AI note density and clinical terminology sensitivity',
    ],
  },
  {
    num: '13',
    file: '13_aura_assistant_copilot.png',
    title: 'Aura Diagnostic Assistant & Copilot',
    route: '/dashboard/aura',
    suite: 'Aura Assistant Copilot',
    caption:
      'Intelligent psychiatric diagnostic assistant featuring indexed DSM-5 diagnostic criteria search, clinical differential assistance, automated typewriter-style note formulation, and a persistent floating copilot action orb.',
    highlights: [
      'Comprehensive searchable DSM-5 criteria database',
      'Typewriter clinical note formulation engine with live progress animation',
      'Persistent floating Aura action orb accessible across all dashboard pages',
    ],
  },
  {
    num: '14',
    file: '14_hipaa_phi_scrubber.png',
    title: 'HIPAA Safe Harbor PHI De-Identification Engine',
    route: '/dashboard/phi-scrubber',
    suite: 'HIPAA PHI Scrubber',
    caption:
      'Statutory 18-rule HIPAA Safe Harbor de-identification engine executing 100% locally in the browser with zero cloud PHI leakage. Features side-by-side diff comparison, selectable masking styles (Tag, Block, Asterisk), and forensic audit ledger.',
    highlights: [
      'Interactive side-by-side diff highlighting detected identifiers in real-time',
      'Multiple masking formats: Tag ([NAME]), Block (████), and Asterisk (***)',
      'Forensic Safe Harbor classification breakdown table with JSON export',
    ],
  },
  {
    num: '15',
    file: '15_subscription_pricing.png',
    title: 'Subscription Management & Tier Monetization',
    route: '/dashboard/subscription',
    suite: 'Commercial Billing',
    caption:
      'Commercial SaaS licensing portal showcasing Clinician Starter ($49/mo), Clinician Pro Flagship ($99/mo), and Group Practice Enterprise ($199/mo) plans with monthly/annual billing switch (20% discount calculation) and simulated Stripe checkout.',
    highlights: [
      'Monthly / Annual billing toggle with real-time discount recalculation',
      'Interactive sandbox tier switching with live feature unlock indicators',
      'Resilient Stripe checkout sandbox with automated webhook simulation',
    ],
  },
];

function buildHtml() {
  const pagesHtml = pagesData
    .map((item, idx) => {
      const imgBase64 = fs.readFileSync(path.join(SCREENSHOT_DIR, item.file)).toString('base64');
      const isLast = idx === pagesData.length - 1;

      return `
      <div class="page-container ${isLast ? '' : 'page-break'}">
        <div class="header-bar">
          <div class="header-left">
            <span class="page-num">${item.num} / 15</span>
            <span class="suite-tag">${item.suite}</span>
            <h2 class="page-title">${item.title}</h2>
          </div>
          <div class="header-right">
            <span class="route-badge font-mono">${item.route}</span>
          </div>
        </div>

        <div class="screenshot-frame">
          <img src="data:image/png;base64,${imgBase64}" alt="${item.title}" class="screenshot-img" />
        </div>

        <div class="caption-card">
          <div class="caption-header">
            <span class="caption-label">Page Overview &amp; Functionality</span>
          </div>
          <p class="caption-text">${item.caption}</p>
          <div class="highlights-grid">
            ${item.highlights
              .map(
                (h) => `
              <div class="highlight-item">
                <span class="bullet">✓</span>
                <span class="highlight-text">${h}</span>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <div class="footer-bar">
          <span>Clinical Telehealth &amp; AI Scribe SaaS Platform • Live Deployment: clinicalsaaslaunch.vercel.app</span>
          <span>100% Synthetic Data • HIPAA Safe Harbor Compliant</span>
        </div>
      </div>
    `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Clinical Telehealth & AI Scribe SaaS — Platform Walkthrough</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    /* Cover Page */
    .cover-container {
      width: 8.5in;
      height: 11in;
      padding: 0.8in 0.8in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(145deg, #0b1120 0%, #1e1b4b 50%, #0f172a 100%);
      color: #ffffff;
      box-sizing: border-box;
    }

    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(99, 102, 241, 0.2);
      border: 1px solid rgba(129, 140, 248, 0.4);
      color: #c7d2fe;
      padding: 0.35rem 0.85rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .cover-title-group {
      margin-top: 2rem;
    }

    .cover-title {
      font-size: 2.85rem;
      font-weight: 800;
      line-height: 1.15;
      letter-spacing: -0.03em;
      background: linear-gradient(to right, #ffffff, #e0e7ff, #99f6e4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 1rem;
    }

    .cover-subtitle {
      font-size: 1.15rem;
      color: #cbd5e1;
      line-height: 1.6;
      max-width: 6.5in;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.25rem;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 1rem;
      padding: 1.5rem;
      backdrop-filter: blur(10px);
    }

    .meta-item-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }

    .meta-item-value {
      font-size: 0.95rem;
      font-weight: 700;
      color: #ffffff;
    }

    .cover-disclaimer {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.35);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      color: #fef3c7;
      font-size: 0.78rem;
      line-height: 1.5;
    }

    .cover-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 1rem;
      color: #94a3b8;
      font-size: 0.8rem;
    }

    /* Standard Page */
    .page-container {
      width: 8.5in;
      height: 11in;
      padding: 0.55in 0.6in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box;
      background: #ffffff;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 0.45rem;
      margin-bottom: 0.45rem;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .page-num {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      font-weight: 700;
      color: #ffffff;
      background: #4f46e5;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
    }

    .suite-tag {
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #0d9488;
      background: #ccfbf1;
      padding: 0.2rem 0.5rem;
      border-radius: 0.375rem;
    }

    .page-title {
      font-size: 1.12rem;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .route-badge {
      font-size: 0.72rem;
      color: #64748b;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      padding: 0.2rem 0.55rem;
      border-radius: 0.375rem;
      font-weight: 600;
    }

    .screenshot-frame {
      width: 100%;
      height: 5.65in;
      border-radius: 0.65rem;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.45rem;
    }

    .screenshot-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: top center;
    }

    .caption-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 0.65rem;
      padding: 0.65rem 0.85rem;
      margin-bottom: 0.35rem;
    }

    .caption-header {
      display: flex;
      align-items: center;
      margin-bottom: 0.3rem;
    }

    .caption-label {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #4338ca;
    }

    .caption-text {
      font-size: 0.82rem;
      color: #334155;
      line-height: 1.45;
      margin-bottom: 0.45rem;
    }

    .highlights-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.45rem;
      border-top: 1px dashed #cbd5e1;
      padding-top: 0.4rem;
    }

    .highlight-item {
      display: flex;
      align-items: flex-start;
      gap: 0.35rem;
    }

    .bullet {
      color: #059669;
      font-size: 0.72rem;
      font-weight: 800;
      line-height: 1.3;
    }

    .highlight-text {
      font-size: 0.72rem;
      color: #475569;
      line-height: 1.35;
      font-weight: 500;
    }

    .footer-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 0.35rem;
      color: #94a3b8;
      font-size: 0.68rem;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-container page-break">
    <div>
      <span class="cover-badge">Interactive Technical Evaluation &amp; Tour</span>
      <div class="cover-title-group">
        <h1 class="cover-title">Clinical Telehealth &amp;<br>AI Scribe SaaS Platform</h1>
        <p class="cover-subtitle">
          Comprehensive visual walkthrough and architectural inspection across every suite, modal, and clinical workflow on the live production deployment.
        </p>
      </div>
    </div>

    <div class="cover-meta-grid">
      <div>
        <div class="meta-item-label">Live Deployment URL</div>
        <div class="meta-item-value font-mono">https://clinicalsaaslaunch.vercel.app</div>
      </div>
      <div>
        <div class="meta-item-label">Source Code Repository</div>
        <div class="meta-item-value font-mono">github.com/alexmarshiamft/clinical_saas_launch</div>
      </div>
      <div>
        <div class="meta-item-label">Evaluation Scope</div>
        <div class="meta-item-value">15 High-Resolution Screenshots with Technical Annotations</div>
      </div>
      <div>
        <div class="meta-item-label">Architectural Compliance</div>
        <div class="meta-item-value">HIPAA Safe Harbor 18 De-Identification Standard</div>
      </div>
    </div>

    <div class="cover-disclaimer">
      <strong>LEGAL CYA NOTICE &amp; SYNTHETIC DATA CERTIFICATION:</strong><br>
      All client names, medical record numbers (MRNs), diagnostic codes, dates of birth, consultation audio feeds, and clinical SOAP notes depicted within this document are <strong>100% synthetic and simulated</strong>. No actual human Protected Health Information (PHI) is present, captured, or stored in this demonstration platform.
    </div>

    <div class="cover-footer">
      <span>Prepared for Clinical Leadership &amp; Engineering Review</span>
      <span>Published October 2026</span>
    </div>
  </div>

  <!-- 15 Content Pages -->
  ${pagesHtml}

</body>
</html>
  `;
}

async function renderPdf() {
  console.log('Generating comprehensive PDF walkthrough document...');
  const htmlContent = buildHtml();
  const htmlPath = path.resolve('screenshots_walkthrough.html');
  fs.writeFileSync(htmlPath, htmlContent);
  console.log(`✓ Generated intermediate HTML template: ${htmlPath}`);

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'load' });

  // Generate PDF
  await page.pdf({
    path: OUTPUT_PDF,
    format: 'Letter',
    printBackground: true,
    margin: {
      top: '0',
      bottom: '0',
      left: '0',
      right: '0',
    },
  });

  console.log(`✓ Master PDF walkthrough generated at: ${OUTPUT_PDF}`);

  if (fs.existsSync(ARTIFACT_DIR)) {
    const artifactPdf = path.join(ARTIFACT_DIR, 'clinical_saas_platform_walkthrough.pdf');
    fs.copyFileSync(OUTPUT_PDF, artifactPdf);
    console.log(`✓ Copied to artifacts directory: ${artifactPdf}`);
  }

  await browser.close();
}

renderPdf();
