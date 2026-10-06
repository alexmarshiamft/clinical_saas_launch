import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCREENSHOT_DIR = path.join(ROOT, 'screenshots');
const OUTPUT_PDF = path.join(ROOT, 'clinical_saas_platform_walkthrough.pdf');
const REPO_URL = 'https://github.com/alexmarshiamft/clinical_saas_launch';
const RELEASE_TAG = 'v1.1.2-acquisition-accuracy';
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const link = (url, label) => `<a href="${escape(url)}">${escape(label)}</a>`;
const list = (items) => `<ul>${items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>`;
const card = (title, text) => `<article class="card"><h3>${escape(title)}</h3><p>${escape(text)}</p></article>`;
const note = (text) => `<div class="note">${escape(text)}</div>`;

const pagesData = [
  { file: '01_landing_page.png', title: 'Landing page and public showcase', route: '/', suite: 'Public portal', status: 'Historical synthetic UI',
    caption: 'Public entry point, clinical-tool previews, and evaluator demo launch. This image preserves historical presentation, including older privacy and compliance wording. It does not verify current deployment, vendor contracts, or absence of PHI from user-supplied data.',
    highlights: ['Demo launch and navigation UI', 'Four clinical tool previews', 'Use synthetic input for evaluation'],
    source: 'src/pages/Landing.tsx; src/components/demo/DemoGuideModal.tsx' },
  { file: '02_demo_guide_modal.png', title: 'Demo guide and feature catalog', route: '/ (Demo Guide)', suite: 'Evaluator guidance', status: 'Historical synthetic UI',
    caption: 'Guide modal with clinical journey, feature directory, subscription sandbox, and redaction-category reference. Its feature descriptions are not independent verification. Speaker diarization, connected EHR export, and compliance badges require the limits described in this document.',
    highlights: ['Guided clinical journey', 'Feature and subscription previews', 'Reference grid for identifier categories'],
    source: 'src/components/demo/DemoGuideModal.tsx' },
  { file: '03_dashboard_command_center.png', title: 'Clinician dashboard', route: '/dashboard', suite: 'Practice operations', status: 'Implemented UI / synthetic records',
    caption: 'Navigation hub with appointments, tool launch tiles, encounter context, and practice profile controls. Displayed counts and patient details are fixture data. The screenshot is not evidence of a connected clinical practice or production multi-site deployment.',
    highlights: ['Synthetic encounter context', 'EHR, Scribe, Aura, and Scrubber navigation', 'Appointment and practice controls'],
    source: 'src/pages/DashboardHome.tsx; src/components/layout/Header.tsx' },
  { file: '04_theraflow_ehr_clients.png', title: 'EHR client roster', route: '/dashboard/ehr', suite: 'Clinical EHR', status: 'Implemented UI / synthetic records',
    caption: 'Client directory with filtering, diagnostic and procedure labels, session counts, and intake status. These controls are implemented for evaluation. Persistence, permissions, and clinical workflows must be verified in a buyer-configured deployment.',
    highlights: ['Client search and filtering', 'Chart and encounter navigation', 'Fixture diagnosis and procedure labels'],
    source: 'src/tools/theraflow/ClientsView.tsx; src/tools/theraflow/EhrWorkspace.tsx' },
  { file: '05_theraflow_client_chart.png', title: 'Client chart and progress notes', route: '/dashboard/ehr (client detail)', suite: 'Clinical EHR', status: 'Implemented UI / synthetic records',
    caption: 'Synthetic client chart showing demographics, diagnostic labels, and DAP notes. Source code includes note-author and signed-note controls; the image alone cannot establish persistence, audit coverage, or clinical record compliance.',
    highlights: ['DAP documentation UI', 'Clinical-tool handoff controls', 'Historical encounter fixture data'],
    source: 'src/tools/theraflow/ClientProfileView.tsx; supabase/migrations/' },
  { file: '06_clinical_calendar.png', title: 'Clinical scheduling calendar', route: '/dashboard/calendar', suite: 'Clinical EHR', status: 'Implemented UI / synthetic records',
    caption: 'Day, week, and month scheduling views with appointment chips and room-launch shortcuts. Telehealth badges route to the evaluation room; they do not establish a working remote consultation with a second participant.',
    highlights: ['Calendar view controls', 'Appointment and clinician labels', 'Evaluation-room launch shortcuts'],
    source: 'src/tools/theraflow/CalendarView.tsx' },
  { file: '07_telehealth_room.png', title: 'Telehealth evaluation room', route: '/dashboard/telehealth', suite: 'Telehealth sandbox', status: 'Loopback simulation',
    caption: 'Local camera/microphone controls, session timer, and notepad around a WebRTC loopback demonstration. The meeting API returns simulated metadata. This is not a verified remote video-consultation service, executed BAA, or independently certified HIPAA deployment.',
    highlights: ['Local media or synthetic fallback', 'Camera/microphone toggles and timer', 'Remote signaling and relay integration unfinished'],
    source: 'src/tools/theraflow/webrtc-provider.ts; src/tools/theraflow/TelehealthView.tsx; server.ts' },
  { file: '08_billing_and_claims.png', title: 'Billing and claims workspace', route: '/dashboard/billing', suite: 'Clinical billing', status: 'Implemented UI / simulated statuses',
    caption: 'Encounter ledger, amounts, payer labels, and claim states shown with synthetic records. There is no implemented 837P generator or clearinghouse transport in the reviewed source. The displayed statuses are not live payer acknowledgments or settlement evidence.',
    highlights: ['Synthetic billed and paid summaries', 'Encounter and copay tracking UI', 'Claim transmission remains integration work'],
    source: 'src/tools/theraflow/BillingView.tsx; src/tools/theraflow/data/demo-seed.ts' },
  { file: '09_cms1500_superbill_modal.png', title: 'Superbill reimbursement modal', route: '/dashboard/billing (claim modal)', suite: 'Clinical billing', status: 'Implemented form / synthetic input',
    caption: 'Reimbursement-statement modal and text export using fixture demographics, ICD-10/CPT labels, and provider information. The source implements a superbill statement, not a verified official 33-box CMS-1500 form editor. No payer acceptance or clinical coding correctness is established.',
    highlights: ['Superbill preview and reimbursement text', 'Charge and provider information fields', 'Validate format with target counterparties'],
    source: 'src/tools/theraflow/SuperbillModal.tsx' },
  { file: '10_hipaa_audit_logs.png', title: 'Audit event viewer', route: '/dashboard/audit-logs', suite: 'Security controls', status: 'Implemented logging / deployment limits',
    caption: 'Event viewer and export controls. The server implements HMAC-signed, hash-chained audit records and tenant filtering. These are tamper-evidence mechanisms; the screenshot does not prove universal event coverage, immutable infrastructure, retention controls, or HIPAA compliance.',
    highlights: ['Event category and timestamp display', 'Audit export and verification controls', 'Storage durability requires deployment review'],
    source: 'src/tools/theraflow/AuditLogsView.tsx; src/lib/audit.ts; server.ts' },
  { file: '11_clinical_ai_scribe_live.png', title: 'Scribe transcript and note workspace', route: '/dashboard/scribe', suite: 'Clinical Scribe', status: 'Synthetic / browser speech path',
    caption: 'Transcript feed, audio visualization, speaker labels, and note-generation controls. Browser recognition labels speakers by conversational heuristics; synthetic fixtures also demonstrate the UI. Acoustic speaker identification and cloud-provider accuracy have not been established.',
    highlights: ['Synthetic utterance feed', 'Browser SpeechRecognition when supported', 'Recognition privacy depends on the browser vendor'],
    source: 'src/tools/scribe/ScribeWorkspace.tsx; src/tools/scribe/audio-transcription-provider.ts' },
  { file: '12_clinical_ai_scribe_studio.png', title: 'Scribe templates and export formatters', route: '/dashboard/scribe (template studio)', suite: 'Clinical Scribe', status: 'Implemented templates / file export',
    caption: 'Documentation templates, prompt customization, and export-format controls. Epic SmartText, Cerner text, and FHIR-shaped JSON are generated for download or clipboard. They are not authenticated writebacks to hospital EHR systems and are not verified interoperability.',
    highlights: ['SOAP, intake, DAP, and referral templates', 'Note-density and prompt controls', 'EHR output formatting for review'],
    source: 'src/tools/scribe/NoteTemplates.tsx; src/tools/scribe/MultiEhrExportPanel.tsx; src/tools/scribe/utils/ehrExportAdapters.ts' },
  { file: '13_aura_assistant_copilot.png', title: 'Aura note-assistance interface', route: '/dashboard/aura', suite: 'Aura assistant', status: 'Implemented assistance / clinician review',
    caption: 'Searchable diagnostic examples, criteria controls, typewriter note display, and floating assistant UI. The bundled reference is limited and is not a comprehensive DSM database. Suggested documentation is assistance and requires qualified clinician review.',
    highlights: ['Bundled diagnostic reference examples', 'Criteria and note-assistance UI', 'Clinical validity is not established by UI tests'],
    source: 'src/tools/aura/AuraStudio.tsx; src/tools/aura/data/dsm5-database.ts' },
  { file: '14_hipaa_phi_scrubber.png', title: 'Heuristic PHI redaction aid', route: '/dashboard/phi-scrubber', suite: 'Privacy tooling', status: 'Implemented heuristics / known misses',
    caption: 'Browser redaction UI with 18 identifier-category rule definitions, diff view, masking styles, and category reports. Category coverage does not establish removal of every identifier. Historical holdout results include missed entities; human review remains necessary.',
    highlights: ['Local pattern matching and diff view', 'Tag, block, and asterisk masking', 'No guarantee of complete de-identification'],
    source: 'src/tools/phi-scrubber/engine.ts; src/tools/phi-scrubber/safeHarborRules.ts; phi_scrubber_holdout_results.json' },
  { file: '15_subscription_pricing.png', title: 'Subscription plans and sandbox switching', route: '/dashboard/subscription', suite: 'Commercial UI', status: 'Configuration / sandbox checkout',
    caption: 'Subscription tier selection, monthly/annual display, and evaluation checkout. Current plan configuration is Starter $49/$39, Pro $99/$79, and Practice Group $249/$199 (monthly/annual monthly-equivalent). Historical image labels may differ. These are configured prices, not validated revenue.',
    highlights: ['Tier selection and route gating', 'Simulation when Stripe is unconfigured', 'Configured Stripe path needs live vendor validation'],
    source: 'src/lib/subscription.tsx; server.ts' },
];

function page(title, label, content, className = '') {
  return `<section class="page ${className}"><header><span class="label">${escape(label)}</span><span>TheraFlow | Buyer review</span></header><h1>${escape(title)}</h1><main>${content}</main><footer><span>Synthetic evaluation | Historical images, corrected annotations</span><span class="page-number"></span></footer></section>`;
}

function buildHtml() {
  const contents = [
    page('Clinical platform walkthrough', 'Acquisition accuracy candidate', `<p class="lead">Fifteen historical synthetic screenshots with factual annotations, release provenance, and evidence limits.</p><div class="grid">${card('Purpose', 'Help a buyer inspect the existing UI and distinguish working code from simulations and unimplemented vendor connections.')}${card('Candidate release', RELEASE_TAG)}${card('Source', 'github.com/alexmarshiamft/clinical_saas_launch')}${card('Prepared', 'October 6, 2026')}</div>${note('Screenshots were already in the repository and were not recaptured for this accuracy release. Capture-time deployment and source SHA are not established. Some embedded UI labels contain older marketing claims; corrected captions and scope notes govern the evaluation.')}`, 'cover'),
    page('Read the evidence within its scope', 'Evaluation boundaries', `<div class="grid">${card('Working code', 'Clinical workspaces, note templates, redaction heuristics, security checks, compensation math, ledger validation, and text/JSON export formatting.')}${card('Sandbox behavior', 'Synthetic patient and financial records, WebRTC loopback, heuristic browser speaker labels, treasury simulation and synthetic claim statuses, and unconfigured subscription checkout.')}${card('Vendor work', 'Remote telehealth, verified speech diarization, clearinghouse transport/remittances, hospital EHR connectivity, live payroll tax filing, and bank settlement remain unverified or unfinished.')}${card('Production prerequisites', 'Verify identity, persistence, durable audit storage, backups, monitoring, and agreements. Move Gemini secrets/calls behind a server boundary; a configured key is embedded by Vite into client assets.')}</div>${note('No independent security or HIPAA certification, production readiness for patient PHI, or absolute privacy guarantee is established by these materials. Browser speech recognition may use browser-vendor services.')}${list(['Historical images illustrate UI, not current deployment state or vendor connectivity.', 'Synthetic fixtures do not prevent a user from entering real data; evaluate only with synthetic inputs.', 'Practice OS finance modules are documented in the handoff and deck; the 15 screenshots focus on earlier clinical workspaces.'])}`),
    ...pagesData.map((item,index) => {
      const screenshotFile = path.join(SCREENSHOT_DIR, item.file);
      if (!fs.existsSync(screenshotFile)) throw new Error(`Missing historical screenshot: ${screenshotFile}`);
      const base64 = fs.readFileSync(screenshotFile).toString('base64');
      return page(item.title, `${String(index+1).padStart(2,'0')} / 15 | ${item.suite}`, `<div class="meta"><code>${escape(item.route)}</code><span>${escape(item.status)}</span></div><figure><img src="data:image/png;base64,${base64}" alt="${escape(item.title)}"><figcaption>Historical synthetic screenshot; not recaptured. Embedded UI claims may be outdated.</figcaption></figure><article class="caption"><h2>Implemented behavior and limits</h2><p>${escape(item.caption)}</p><div class="highlights">${item.highlights.map((item)=>`<div>${escape(item)}</div>`).join('')}</div></article><p class="source">Source: ${escape(item.source)}</p>`, 'screenshot-page');
    }),
    page('Test and database evidence', 'Verification scope', `<h2>Immutable baseline CI</h2><p>Runs 37514914857 (master) and 37514932475 (remediation-pass-2) passed on snapshot 515cefe320b46b9e50695849dd23ce0c2b93cd63.</p><table><tbody>${[['Client security','26 / 26'],['Server security / tenant isolation','29 / 29'],['Empirical server stress','28 / 28'],['EHR','30 / 30'],['Scribe','61 / 61'],['Aura / PHI scrubber','85 / 85'],['Financial / security invariants','Passing; inspect logs']].map(([a,b])=>`<tr><td>${escape(a)}</td><td>${escape(b)}</td></tr>`).join('')}</tbody></table>${note('Those historical CI runs did not execute the migration pipeline. Published v1.1.1 runs 37519919273 and 37519932172 include the original migration harness at fd9e2b3e442016f4dc9e85b893bb092b68393a97. The v1.1.2 candidate strengthens database assertions and requires its own matching branch/PR CI evidence.')}<h2>Database counting methodology</h2><p>Two migration files define 31 unique public tables plus the auth.users standalone-PostgreSQL compatibility shim: 32 total CREATE TABLE targets. They contain 59 CREATE POLICY statements; one policy is dropped, leaving 58 active policies after both migrations are applied. Verify installed assets through pg_tables and pg_policies in a disposable database.</p><p class="links">${link(`${REPO_URL}/actions/runs/37514914857`, 'Master snapshot CI')} | ${link(`${REPO_URL}/actions/runs/37514932475`, 'Remediation snapshot CI')} | ${link(`${REPO_URL}/releases/tag/v1.1.1-acquisition-package`, 'Published v1.1.1 evidence')}</p>`),
    page('Release provenance and privacy limits', 'Buyer verification', `<h2>Release references</h2><div class="hash"><span>Core remediation commit</span><code>4113573e982e6176ea8c71c3deb2862f44a6f11e</code><span>Preserved baseline: v1.1.0-security-remediated</span><code>515cefe320b46b9e50695849dd23ce0c2b93cd63</code><span>Preserved package: v1.1.1-acquisition-package</span><code>fd9e2b3e442016f4dc9e85b893bb092b68393a97</code><span>Resolve candidate commit after publication</span><code>git rev-parse ${RELEASE_TAG}^{commit}</code></div><p>The baseline annotated tag is unsigned. v1.1.2-acquisition-accuracy is a candidate. Tag resolution succeeds only after publication. Matching branch/PR CI evidence must identify the tested candidate SHA; the PDF avoids embedding its own enclosing commit SHA.</p><h2>Redaction is assistive</h2><p>The earlier recorded holdout evaluated 610 synthetic snippets / 3,410 entities: 81.64% recall with 626 missed entities. The fresh report evaluated 250 snippets / 1,540 entities: 92.79% recall with 111 missed entities. These distinct historical synthetic overlap-based evaluations are not real-world recall estimates; precision counts are not reconciled here.</p><p>The Scribe and DAP outbound LLM paths call a sanitization gateway that aborts on engine errors or known context name/MRN leftovers. It cannot reject identifiers it fails to detect. Clinician review and deployment privacy safeguards remain required.</p><p class="source">Sources: phi_scrubber_holdout_results.json (2026-10-05); THERAFLOW_REMEDIATION_PASS2_REPORT.md Section M; src/tools/phi-scrubber/phi-privacy-gateway.ts</p><p class="links">${link(REPO_URL, 'Source repository')} | ${link(`${REPO_URL}/releases/tag/v1.1.1-acquisition-package`, 'Preserved published package')}</p>`),
  ];
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>TheraFlow platform walkthrough</title><style>
    *{box-sizing:border-box;margin:0;padding:0}@page{size:Letter;margin:0}body{font-family:Arial,Helvetica,sans-serif;color:#1a2940;-webkit-print-color-adjust:exact;print-color-adjust:exact;background:#e8edf5}
    .page{width:8.5in;height:11in;padding:42px 51px 30px;background:#fff;break-after:page;display:flex;flex-direction:column;gap:16px}.page:last-child{break-after:auto}header{display:flex;justify-content:space-between;font-size:10px;color:#697a94;text-transform:uppercase;letter-spacing:.8px;gap:12px}.label{color:#087f78;font-weight:bold}h1{font-size:27px;line-height:1.12;letter-spacing:-.5px}main{flex:1;min-height:0;display:flex;flex-direction:column;gap:17px}h2{font-size:16px;line-height:1.3;color:#263954}p,li{font-size:13px;line-height:1.6;color:#42516a}ul{padding-left:18px;display:flex;flex-direction:column;gap:10px}.lead{font-size:22px;line-height:1.5;color:#cad7ef}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.card{background:#f0f5fa;border:1px solid #d1dbe8;border-radius:10px;padding:20px}.card h3{font-size:16px;margin-bottom:8px;color:#223950}.card p{font-size:13px;line-height:1.55}.note{background:#fff6df;border:1px solid #e2cb96;border-radius:8px;padding:15px 18px;font-size:12px;line-height:1.6;color:#755827}
    footer{display:flex;justify-content:space-between;gap:12px;border-top:1px solid #d3deec;padding-top:11px;font-size:9px;color:#72839d}.cover{background:linear-gradient(130deg,#142239,#203958);color:#fff}.cover h1{font-size:43px;line-height:1.1;margin-top:70px}.cover main{justify-content:center;gap:24px}.cover .label{color:#7de5d5}.cover header,.cover footer{color:#c3d2e9}.cover .card{background:#2b425e;border-color:#4c617e}.cover .card h3{color:#f6fbff}.cover .card p{color:#cfddf1}.cover .note{background:#494333;color:#ffe5ad;border-color:#8b805f}
    .meta{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:11px;color:#53716f}.meta code{font-size:11px;overflow-wrap:anywhere;font-family:Menlo,Consolas,monospace;color:#5c6b83;background:#edf2f7;padding:7px 9px;border-radius:5px}.screenshot-page main{gap:17px;justify-content:flex-start}figure{margin-top:5px}figure img{display:block;width:100%;height:auto;max-height:4.65in;object-fit:contain;border:1px solid #c5d0df;border-radius:7px}figcaption{margin-top:9px;color:#745d36;background:#fff8e8;padding:7px 9px;font-size:10px;line-height:1.4;border-radius:4px}
    .caption{background:#f3f7fb;border:1px solid #d6e0ec;border-radius:9px;padding:19px 20px;display:flex;flex-direction:column;gap:14px}.caption h2{font-size:12px;text-transform:uppercase;color:#087b73;letter-spacing:.5px}.caption p{font-size:13px;line-height:1.65}.highlights{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding-top:13px;border-top:1px solid #d4deeb}.highlights div{font-size:11px;line-height:1.5;color:#516a86;padding-left:10px;border-left:2px solid #28a499}.source{font-size:10px;line-height:1.55;overflow-wrap:anywhere;color:#7586a0}.links{font-size:11px;line-height:1.7;overflow-wrap:anywhere}a{color:#126ea6;text-decoration:underline}
    table{border-collapse:collapse;width:100%;font-size:13px}td{border-bottom:1px solid #d4dfeb;padding:8px 12px;background:#f3f7fb}td:last-child{width:35%;font-weight:bold}.hash{display:flex;flex-direction:column;gap:9px}.hash span{font-size:11px;text-transform:uppercase;color:#537388;font-weight:bold}.hash code{font-family:Menlo,Consolas,monospace;font-size:11px;background:#eff4fa;border:1px solid #d4dfed;padding:10px;border-radius:5px;overflow-wrap:anywhere}
  </style></head><body>${contents.map((content,index)=>content.replace('<span class="page-number"></span>',`<span class="page-number">${index+1} / ${contents.length}</span>`)).join('')}</body></html>`;
}

async function renderPdf() {
  const html = buildHtml();
  fs.writeFileSync(path.join(ROOT, 'screenshots_walkthrough.html'), html);
  const chrome = process.env.CHROME_PATH || (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
  const browser = await chromium.launch({ ...(chrome ? { executablePath: chrome } : {}), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const overflows = await page.locator('.page').evaluateAll((elements) => elements.flatMap((element,index) => element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1 ? [index + 1] : []));
    if (overflows.length) throw new Error(`Walkthrough page overflow: ${overflows.join(', ')}`);
    await page.pdf({ path: OUTPUT_PDF, format: 'Letter', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
    fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true });
    fs.copyFileSync(OUTPUT_PDF, path.join(ROOT, 'public', path.basename(OUTPUT_PDF)));
    console.log(`Generated 19-page annotated walkthrough: ${OUTPUT_PDF}`);
  } finally { await browser.close(); }
}

renderPdf().catch((error) => { console.error(error); process.exitCode = 1; });
