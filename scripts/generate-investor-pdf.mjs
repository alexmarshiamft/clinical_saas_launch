import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Repository-relative output, with no external artifact directory or remote fonts.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_PDF = path.join(ROOT, 'clinical_saas_investor_presentation.pdf');
const REPO_URL = 'https://github.com/alexmarshiamft/clinical_saas_launch';
const RELEASE_TAG = 'v1.1.2-acquisition-accuracy';
const BASELINE_SHA = '515cefe320b46b9e50695849dd23ce0c2b93cd63';
const PUBLISHED_PACKAGE_SHA = 'fd9e2b3e442016f4dc9e85b893bb092b68393a97';
const CORE_SHA = '4113573e982e6176ea8c71c3deb2862f44a6f11e';
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const paragraph = (text, className = '') => `<p class="${className}">${escape(text)}</p>`;
const list = (items) => `<ul>${items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>`;
const card = (title, text, accent = '') => `<article class="card ${accent}"><h3>${escape(title)}</h3>${paragraph(text)}</article>`;
const grid = (cards, columns = 2) => `<div class="grid cols-${columns}">${cards.join('')}</div>`;
const note = (text) => `<div class="note">${escape(text)}</div>`;
const link = (url, label) => `<a href="${escape(url)}">${escape(label)}</a>`;
const screenshot = (filename, caption) => {
  const file = path.join(ROOT, 'screenshots', filename);
  if (!fs.existsSync(file)) throw new Error(`Missing historical screenshot: ${file}`);
  return `<figure><img src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}" alt="${escape(caption)}"><figcaption>${escape(caption)}</figcaption></figure>`;
};

const slides = [
  {
    label: 'Acquisition review candidate', title: 'TheraFlow Clinical Platform', subtitle: 'Clinical workflows, practice finance logic, and a documented security-remediation snapshot.',
    content: `<div class="cover-copy">${paragraph('Buyer diligence package', 'eyebrow')}${paragraph('Evaluate the implemented software and its evidence before connecting clinical or financial vendors.', 'lead')}${grid([card('Clinical workspaces', 'EHR, scheduling, documentation, assistant, and heuristic PHI redaction.'), card('Practice operations', 'Compensation calculations, treasury simulation, payroll preparation, and double-entry ledger logic.')])}${note('Synthetic evaluation scope. Real patient PHI and live regulated operations require further engineering, agreements, and verification.')}</div>`,
  },
  {
    label: 'What a buyer receives', title: 'A source repository with inspectable assets', subtitle: 'The package documents code and synthetic workflows. Commercial rights and ownership require transaction diligence.',
    content: grid([
      card('Application source', 'React 19 / TypeScript / Vite SPA, Express 4 API, clinical tools, and Practice OS modules.'),
      card('Data and authorization definitions', 'Two SQL migrations with table definitions, RLS policies, and clinical-note write-protection triggers.'),
      card('Algorithms and adapters', 'Integer-cent compensation and money allocation logic, ledger validation, note templates, export formatters, and provider scaffolds.'),
      card('Evaluation materials', 'Automated tests, synthetic corpora, buyer handoff, acquisition-readiness memo, and annotated historical screenshots.'),
    ]),
  },
  {
    label: 'Architecture', title: 'Separate the application from its vendor rails', subtitle: 'Schema and adapter code demonstrate design intent; a configured deployment must be verified end to end.',
    content: `<div class="architecture">${card('1. Browser application', 'Clinical UI, local/synthetic state, redaction rules, formatting tools, and browser media controls.')}${card('2. Express API', 'JWT checks, role restrictions, tenant checks, financial workflow routes, and signed audit records.')}${card('3. Persistence and vendors', 'PostgreSQL/Supabase schemas and selected SDK paths. Persistence wiring, vendor activation, and operating controls remain buyer work.')}</div>${note('The browser redaction engine runs locally. Browser speech recognition may use browser-vendor services; local audio processing is not guaranteed.')}<div class="sources">Source: package.json; server.ts; src/lib/; src/tools/; supabase/migrations/</div>`,
  },
  {
    label: 'Implemented clinical workflows', title: 'Working code for the clinical workspace', subtitle: 'These are implemented functions evaluated with synthetic records; test success does not establish clinical accuracy.',
    content: `<div class="split"><div>${list(['Client roster, charts, scheduling, DAP notes, and treatment-plan UI.', 'Clinical note templates with deterministic fallback and a configurable Gemini path.', 'Aura criteria examples and note-assistance UI, requiring clinician review.', 'Superbill reimbursement modal and text export; no implemented 837P claim generation or live clearinghouse submission.'])}${note('Export adapters generate Epic/Cerner text and FHIR-shaped JSON for download or clipboard. They do not prove interoperability with a hospital EHR.')}</div>${screenshot('05_theraflow_client_chart.png', 'Historical synthetic chart screenshot; not recaptured for this accuracy release.')}</div>`,
  },
  {
    label: 'Implemented finance logic', title: 'Clinical-to-financial workflow logic', subtitle: 'Calculations and ledger invariants are real code. Bank transfers and tax filings are simulated or unfinished.',
    content: `${grid([card('Compensation', 'Tiered revenue splits, CPT flat rates, bonuses, and payroll-preparation calculations.'), card('Money allocation', 'Selected allocation paths use integer cents and basis points to conserve amounts within the tested bounds.'), card('General ledger', 'Double-entry journal validation, balance checks, reversal logic, and tax-reserve bookkeeping.'), card('Workflow cascade', 'Synthetic encounter-to-payment-to-compensation-to-payroll demonstrations with traceable ledger events.')])}${note('No live bank accounts, ACH settlement, payroll tax filing, or real funds movement is established by these simulations.')}`,
  },
  {
    label: 'Sandbox boundaries', title: 'Interactive demonstrations with explicit limits', subtitle: 'Visible behavior must be distinguished from a connected external service.',
    content: grid([
      card('Telehealth', 'Camera/microphone controls and WebRTC loopback. The meeting API returns simulated metadata; this is not a verified remote consultation service.'),
      card('Speech and speaker labels', 'Synthetic utterances or browser SpeechRecognition with conversational heuristics. Acoustic diarization accuracy is not established.'),
      card('Claims and invoice checkout', 'Claim statuses are synthetic UI data. Clearinghouse transmission and remittance ingestion are absent. Invoice checkout returns a simulated session rather than collecting a payment.'),
      card('Subscriptions and treasury', 'Subscription checkout simulates when Stripe is unconfigured; the configured SDK path needs vendor testing. Treasury accounts and disbursements are synthetic.'),
    ]),
  },
  {
    label: 'Integration opportunities', title: 'Vendor activation needs engineering and verification', subtitle: 'Adding credentials alone does not turn scaffolds into complete production integrations.',
    content: `${grid([card('Remote telehealth and speech', 'Implement and verify session signaling, remote participant authorization, relay/media behavior, and a selected speech/diarization provider.'), card('Insurance and EHR', 'Build authenticated clearinghouse transmission/remittance ingestion and hospital-authorized API connectivity. Validate generated formats with counterparties.'), card('Payroll and banking', 'Complete commercial onboarding, provider-specific authentication, settlement/reconciliation, failure handling, and any tax-filing workflows.'), card('Infrastructure and identity', 'Deploy both migrations, configure auth claims and secrets, verify persistence, backups, monitoring, and relevant vendor agreements.')])}${note('Do not infer executed BAAs, vendor approval, regulatory certification, or operational launch readiness from source-level adapters.')}`,
  },
  {
    label: 'Privacy evidence', title: 'Heuristic redaction is an aid with measured misses', subtitle: 'Eighteen category definitions are not proof of complete identifier removal.',
    content: `<div class="grid cols-2"><article class="card metric"><strong>81.64%</strong><h3>Recorded earlier holdout recall</h3>${paragraph('610 synthetic snippets / 3,410 annotated entities. 2,784 matched; 626 missed. Source: phi_scrubber_holdout_results.json.')}</article><article class="card metric"><strong>92.79%</strong><h3>Recorded fresh holdout recall</h3>${paragraph('250 synthetic snippets / 1,540 annotated entities. 1,429 matched; 111 missed. Source: THERAFLOW_REMEDIATION_PASS2_REPORT.md, Section M.')}</article></div>${paragraph('These are distinct historical synthetic corpora with overlap-based matching. Scores are not real-world recall estimates; recorded precision counts are not reconciled here.', 'small')}${note('The Scribe and DAP LLM paths invoke a sanitization gateway and abort on engine errors or known context name/MRN leftovers. Undetected identifiers can still pass. Clinician review and deployment privacy controls remain necessary.')}`,
  },
  {
    label: 'Documented security remediation', title: 'SEC-01, SEC-02, and SEC-03 controls implemented', subtitle: 'Core remediation reference: 4113573e982e6176ea8c71c3deb2862f44a6f11e.',
    content: `${grid([card('SEC-01: API and tenant boundaries', 'Authentication and role checks on identified endpoints; cross-practice request tampering rejected; practice state and financial routes clamp access to the caller tenant.'), card('SEC-02: Audit isolation', 'Legacy records are assigned to the demo practice instead of leaking across tenants. Audit writes, reads, and exports enforce practice boundaries.'), card('SEC-03: Clinical-note writes', 'RLS and triggers restrict draft-note modification to its author or authorized practice administrators; signed-note mutations and author reassignment are blocked.'), card('Evidence limits', 'Automated tests support the documented scenarios. They are not a third-party security certification, penetration test, HIPAA determination, or guarantee of zero vulnerabilities.')])}<div class="sources">Source: server.ts; tests/server-security-and-tenant-isolation.test.ts; supabase/migrations/20261005_unified_practice_os.sql</div>`,
  },
  {
    label: 'Database methodology', title: '31 public tables; 58 active RLS policies', subtitle: 'Counts separate migration statements from the resulting catalog after both SQL files are applied.',
    content: `${grid([card('31 public application tables', 'Unique public CREATE TABLE targets across the initial and remediation migrations.'), card('32 total table targets', 'The 31 public tables plus auth.users, a standalone-PostgreSQL compatibility shim.'), card('59 CREATE POLICY statements', 'Unique CREATE POLICY statements counted across both migration files.'), card('58 active catalog policies', 'One broad clinical_notes policy is dropped and replaced by four granular policies. The final PostgreSQL catalog contains 58 policies.')])}${note('Method: apply both migrations to a disposable PostgreSQL database and inspect pg_tables / pg_policies. Catalog counts establish installed assets, not an assessment of all authorization paths.')}<div class="sources">Source: supabase/migrations/20261005_init_schema.sql; supabase/migrations/20261005_unified_practice_os.sql; tests/migration-pipeline.test.ts</div>`,
  },
  {
    label: 'Historical CI evidence', title: 'Passing suites on the immutable baseline snapshot', subtitle: 'Verified snapshot runs: 37514914857 (master) and 37514932475 (remediation-pass-2).',
    content: `<table><thead><tr><th>Suite</th><th>Passing checks in snapshot logs</th></tr></thead><tbody>${[['Client route/storage security', '26 / 26'], ['Server security / tenant isolation', '29 / 29'], ['Empirical server stress', '28 / 28'], ['EHR', '30 / 30'], ['Scribe', '61 / 61'], ['Aura / PHI scrubber', '85 / 85'], ['Financial / security invariants', 'Passing; inspect run logs']].map(([a,b])=>`<tr><td>${escape(a)}</td><td>${escape(b)}</td></tr>`).join('')}</tbody></table>${note('These historical runs did not execute the database migration test. Published v1.1.1 runs 37519919273 and 37519932172 include the original migration harness. The v1.1.2 candidate strengthens catalog/RLS assertions; use matching branch/PR CI evidence when completed.')}<div class="sources">${link(`${REPO_URL}/actions/runs/37514914857`, 'Master snapshot run')} | ${link(`${REPO_URL}/actions/runs/37514932475`, 'Remediation snapshot run')} | ${link(`${REPO_URL}/releases/tag/v1.1.1-acquisition-package`, 'Published v1.1.1 evidence')}</div>`,
  },
  {
    label: 'Release provenance', title: 'Preserve the baseline and resolve the corrected tag', subtitle: 'v1.1.2-acquisition-accuracy is a release candidate. Preserve both existing published tags.',
    content: `<div class="provenance">${paragraph('Core security remediation', 'eyebrow')}<code>${CORE_SHA}</code>${paragraph('Immutable baseline: v1.1.0-security-remediated', 'eyebrow')}<code>${BASELINE_SHA}</code>${paragraph('Published package: v1.1.1-acquisition-package', 'eyebrow')}<code>${PUBLISHED_PACKAGE_SHA}</code>${paragraph(`Candidate acquisition accuracy release: ${RELEASE_TAG}`, 'eyebrow')}<code>git rev-parse ${RELEASE_TAG}^{commit}</code></div>${paragraph('The baseline annotated tag is unsigned. It is preserved; this package does not claim cryptographic signing or independent certification.', 'small')}${note('Candidate tag resolution succeeds only after publication. This PDF does not embed its enclosing commit SHA. Branch/PR CI evidence must identify the exact tested candidate commit before a new release is tagged.')}<div class="sources">${link(REPO_URL, 'Source repository')} | ${link(`${REPO_URL}/releases/tag/v1.1.1-acquisition-package`, 'Preserved published package')}</div>`,
  },
  {
    label: 'Deployment requirements', title: 'Start with a synthetic-data evaluation', subtitle: 'Node 22 and the documented configuration provide a starting point; validate the entire chosen hosting setup.',
    content: `${grid([card('Install and build', 'Use the lockfile, run npm ci, npm run typecheck, and npm run build. Review server and SPA hosting requirements.'), card('Identity and secrets', 'Set strong JWT and audit secrets; configure Supabase auth claims, tenant membership, and access rules. Verify demo-mode behavior is appropriate.'), card('Persistence and operations', 'Apply both migrations and verify each persistence path, durable audit storage, backup/restore, alerting, and incident response.'), card('Before patient or money flows', 'Move Gemini calls/secrets behind a server boundary: vite.config.ts embeds a configured key in client assets. Complete privacy/security, clinical, vendor-contract, and operating-control reviews.')])}${note('The existing public demo URL is a discovery reference, not evidence that a frozen release is deployed or that patient PHI can be processed safely.')}`,
  },
  {
    label: 'Buyer review path', title: 'A reviewable acquisition snapshot', subtitle: 'Software value rests on inspectable code, bounded evidence, and clear remaining work.',
    content: `${grid([card('1. Read the handoff', 'BUYER_HANDOFF.md and ACQUISITION_READINESS.md define the functional boundaries and deployment work.'), card('2. Reproduce the evidence', 'Follow release notes to the tested SHA and CI runs. Re-run synthetic suites and the PostgreSQL migration pipeline.'), card('3. Inspect the workspaces', 'Use the walkthrough to identify workflows. Historical screenshots illustrate UI only and may contain older marketing language.'), card('4. Scope the transaction', 'Verify ownership, licenses, dependencies, deployment design, integration effort, and commercial assumptions before purchase.')])}<div class="sources">${link(REPO_URL, 'Repository and current branch/PR evidence')} | ${link(`${REPO_URL}/releases/tag/v1.1.1-acquisition-package`, 'Preserved published package')}</div>`,
  },
];

function buildSlidesHtml() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>TheraFlow acquisition review</title><style>
    *{box-sizing:border-box;margin:0;padding:0} @page{size:13.333in 7.5in;margin:0}
    body{font-family:Arial,Helvetica,sans-serif;color:#f5f7fb;background:#111827;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .slide{width:13.333in;height:7.5in;padding:44px 60px 28px;display:flex;flex-direction:column;gap:18px;background:linear-gradient(120deg,#101827,#172443);break-after:page;position:relative}
    .slide:last-child{break-after:auto}.header{display:flex;justify-content:space-between;color:#a9b9d5;font-size:12px;letter-spacing:1px;text-transform:uppercase}.label{color:#67e8d5;font-weight:bold}
    h1{font-size:37px;line-height:1.1;letter-spacing:-.8px} h2{font-size:32px;line-height:1.1;letter-spacing:-.4px} .subtitle{margin-top:10px;color:#bdc9df;font-size:16px;line-height:1.4}
    .body{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;gap:18px}.grid{display:grid;gap:16px}.cols-2{grid-template-columns:repeat(2,1fr)}.cols-3{grid-template-columns:repeat(3,1fr)}
    .card{background:#22314b;border:1px solid #3b4b68;border-radius:12px;padding:22px 24px}.card h3{font-size:19px;margin-bottom:10px;color:#f5f7fb}.card p{font-size:15px;line-height:1.45;color:#c5d1e6}
    .note{background:#403829;border:1px solid #8e7851;border-radius:8px;color:#ffe2a2;font-size:14px;line-height:1.45;padding:14px 18px}.sources{color:#a9bad4;font-size:11px;line-height:1.5;overflow-wrap:anywhere}a{color:#b4d9fc;text-decoration:underline}
    .footer{border-top:1px solid #465775;padding-top:12px;font-size:11px;color:#abbad1;display:flex;justify-content:space-between;gap:12px}.eyebrow{text-transform:uppercase;color:#75ead7;font-size:12px;font-weight:bold;letter-spacing:1.5px}.lead{font-size:23px;line-height:1.45;color:#d4deef;margin:16px 0 24px}.cover-copy{max-width:1050px}.cover-copy .note{margin-top:20px}
    .architecture{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.architecture .card{border-top:3px solid #62dbc8;min-height:180px}.split{display:grid;grid-template-columns:1fr 1.12fr;gap:28px;align-items:center}ul{padding-left:20px;display:flex;flex-direction:column;gap:15px}li{color:#d3dded;font-size:16px;line-height:1.45}.split .note{margin-top:20px}
    figure{display:flex;flex-direction:column;gap:9px}figure img{width:100%;border:1px solid #536383;border-radius:8px}figcaption{color:#a8b9d2;font-size:11px;line-height:1.4}.metric strong{font-size:45px;letter-spacing:-1px;color:#7ee3d6}.metric h3{margin:12px 0}.small{color:#b8c6db;font-size:13px;line-height:1.5}
    table{width:100%;border-collapse:collapse;font-size:15px;background:#20314b;border-radius:8px;overflow:hidden}th,td{padding:10px 18px;text-align:left;border-bottom:1px solid #445571}th{color:#8be6d9;font-size:13px;text-transform:uppercase}td:last-child{width:40%;font-weight:bold}
    .provenance{display:grid;grid-template-columns:1fr;gap:10px}code{font-family:Menlo,Consolas,monospace;font-size:17px;color:#e0e9f9;background:#22324c;border:1px solid #435778;padding:12px 16px;border-radius:7px}.provenance .eyebrow{margin-top:6px}
  </style></head><body>${slides.map((slide,index)=>`<section class="slide"><div class="header"><span class="label">${escape(slide.label)}</span><span>TheraFlow | Acquisition accuracy candidate</span></div><div>${index===0?`<h1>${escape(slide.title)}</h1>`:`<h2>${escape(slide.title)}</h2>`}<p class="subtitle">${escape(slide.subtitle)}</p></div><div class="body">${slide.content}</div><footer class="footer"><span>Synthetic evaluation | No independent security or HIPAA certification</span><span>October 6, 2026 | ${String(index+1).padStart(2,'0')} / ${slides.length}</span></footer></section>`).join('')}</body></html>`;
}

async function renderInvestorPdf() {
  const html = buildSlidesHtml();
  fs.writeFileSync(path.join(ROOT, 'investor_deck.html'), html);
  const chrome = process.env.CHROME_PATH || (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);
  const browser = await chromium.launch({ ...(chrome ? { executablePath: chrome } : {}), headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const overflows = await page.locator('.slide').evaluateAll((elements) => elements.flatMap((element,index) => element.scrollHeight > element.clientHeight + 1 || element.scrollWidth > element.clientWidth + 1 ? [index + 1] : []));
    if (overflows.length) throw new Error(`Deck page overflow: ${overflows.join(', ')}`);
    await page.pdf({ path: OUTPUT_PDF, width: '13.333in', height: '7.5in', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
    fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true });
    fs.copyFileSync(OUTPUT_PDF, path.join(ROOT, 'public', path.basename(OUTPUT_PDF)));
    console.log(`Generated ${slides.length}-page acquisition deck: ${OUTPUT_PDF}`);
  } finally { await browser.close(); }
}

renderInvestorPdf().catch((error) => { console.error(error); process.exitCode = 1; });
