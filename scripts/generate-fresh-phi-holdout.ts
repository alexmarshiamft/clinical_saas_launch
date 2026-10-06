/**
 * Generator for Fresh Blind Synthetic PHI Holdout Corpus
 * 
 * Generates 250 entirely new, synthetic clinical vignettes and snippets
 * completely independent from:
 * - CHAL-1.1a, CHAL-2.2, CHAL-4.1
 * - SCHED-2.2, CONF-4.1
 * - Prior adversarial examples
 * - Old gold standard and old 610-snippet holdout
 * 
 * Freezes the output to `tests/synthetic_phi_fresh_holdout_corpus.json`.
 */

import fs from 'fs';
import path from 'path';

interface EntityAnnotation {
  text: string;
  category: string;
  ruleId: string;
  start: number;
  end: number;
  isStructured: boolean;
  difficulty: 'easy_structured' | 'medium_hybrid' | 'hard_unstructured';
}

interface Snippet {
  id: string;
  categoryPrimary: string;
  text: string;
  expected_entities: EntityAnnotation[];
}

interface CorpusBuilder {
  text: (str: string) => string;
  mark: (
    str: string,
    category: string,
    ruleId: string,
    isStructured: boolean,
    difficulty?: 'easy_structured' | 'medium_hybrid' | 'hard_unstructured'
  ) => string;
}

const firstNames = [
  'Liam', 'Olivia', 'Noah', 'Emma', 'Oliver', 'Charlotte', 'Elijah', 'Amelia',
  'James', 'Ava', 'William', 'Sophia', 'Benjamin', 'Isabella', 'Lucas', 'Mia',
  'Henry', 'Evelyn', 'Theodore', 'Harper', 'Jack', 'Camila', 'Levi', 'Gianna',
  'Alexander', 'Abigail', 'Jackson', 'Luna', 'Mateo', 'Ella', 'Daniel', 'Elizabeth',
  'Michael', 'Sofia', 'Mason', 'Emily', 'Sebastian', 'Avery', 'Ethan', 'Mila',
  'Logan', 'Arya', 'Owen', 'Chloe', 'Samuel', 'Layla', 'Jacob', 'Grace',
  'Asher', 'Nora', 'Aiden', 'Riley', 'John', 'Zoey', 'Joseph', 'Penelope'
];

const lastNames = [
  'Callahan', 'Donovan', 'Montoya', 'Kowalski', 'MacDonald', 'O\'Connor', 'Navarro',
  'Vanderbilt', 'Sinclair', 'Abernathy', 'Fitzgerald', 'Montgomery', 'Kensington',
  'Harrington', 'Mercer', 'Castillo', 'Lindqvist', 'Sutherland', 'Blackwood',
  'Sterling', 'Patterson', 'Carrington', 'Decker', 'Holloway', 'Stafford',
  'Bellingham', 'Winslow', 'Kaufman', 'Prescott', 'Thornton', 'Davenport',
  'Gallagher', 'Whitmore', 'Lancaster', 'Kingsley', 'Ashford', 'Fairchild'
];

const streets = [
  'Pine Ridge Way', 'Magnolia Crossing', 'Harbor View Blvd', 'Sycamore Terrace',
  'Crestwood Park Lane', 'Willowbrook Drive', 'Oakhaven Circle', 'Birchwood Glen',
  'Highland Ridge Ave', 'Meadowlark Trail', 'Fox Hollow Rd', 'Cedar Valley Ct'
];

const cities = [
  { city: 'Spokane', state: 'WA', zip: '99201' },
  { city: 'Boise', state: 'ID', zip: '83702' },
  { city: 'Tucson', state: 'AZ', zip: '85701' },
  { city: 'Boulder', state: 'CO', zip: '80302' },
  { city: 'Madison', state: 'WI', zip: '53703' },
  { city: 'Lincoln', state: 'NE', zip: '68508' },
  { city: 'Knoxville', state: 'TN', zip: '37902' },
  { city: 'Asheville', state: 'NC', zip: '28801' },
  { city: 'Savannah', state: 'GA', zip: '31401' },
  { city: 'Eugene', state: 'OR', zip: '97401' },
  { city: 'Reno', state: 'NV', zip: '89501' },
  { city: 'Burlington', state: 'VT', zip: '05401' },
];

const emailDomains = [
  'secure-behavioral-health.net', 'pacific-therapy-portal.org', 'crestview-clinical.com',
  'summit-mindcare.org', 'telehealth-connect-secure.io', 'mountain-wellness-ehr.org'
];

function buildCorpus(): Snippet[] {
  const snippets: Snippet[] = [];
  let idCounter = 1;

  function addSnippet(
    categoryPrimary: string,
    builderFn: (b: CorpusBuilder) => void
  ) {
    const annotations: EntityAnnotation[] = [];
    const id = `fresh-holdout-${String(idCounter++).padStart(4, '0')}`;
    let fullText = '';

    const b: CorpusBuilder = {
      text: (str: string) => {
        fullText += str;
        return str;
      },
      mark: (str, category, ruleId, isStructured, difficulty = isStructured ? 'easy_structured' : 'hard_unstructured') => {
        const start = fullText.length;
        fullText += str;
        const end = fullText.length;
        annotations.push({
          text: str,
          category,
          ruleId,
          start,
          end,
          isStructured,
          difficulty,
        });
        return str;
      },
    };

    builderFn(b);

    snippets.push({
      id,
      categoryPrimary,
      text: fullText,
      expected_entities: annotations,
    });
  }

  // 1. Structured Multi-Entity Clinical Intakes (50 snippets)
  for (let i = 0; i < 50; i++) {
    const fn = firstNames[i % firstNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    const docFn = firstNames[(i + 15) % firstNames.length];
    const docLn = lastNames[(i + 7) % lastNames.length];
    const loc = cities[i % cities.length];
    const street = `${100 + i * 17} ${streets[i % streets.length]}`;
    const year = 1970 + (i % 35);
    const month = String(1 + (i % 12)).padStart(2, '0');
    const day = String(1 + (i % 28)).padStart(2, '0');
    const dob = `${month}/${day}/${year}`;
    const phone = `(555) ${String(200 + i).padStart(3, '0')}-${String(1000 + i * 23).slice(-4)}`;
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}@${emailDomains[i % emailDomains.length]}`;
    const mrn = `MRN-9${String(10000 + i * 83).slice(-5)}`;
    const ssn = `458-29-${String(1000 + i * 47).slice(-4)}`;

    addSnippet('multi_entity_intake', (b) => {
      b.text('Intake Clinical Encounter Summary\n');
      b.text('Attending Clinician: ');
      b.mark(`Dr. ${docFn} ${docLn}, MD`, 'names', 'NAME', false);
      b.text('\nPatient Name: ');
      b.mark(`${fn} ${ln}`, 'names', 'NAME', true);
      b.text('\nDate of Birth: ');
      b.mark(dob, 'dates', 'DATE', true);
      b.text('\nAddress: ');
      b.mark(street, 'geographic', 'GEOGRAPHIC', false);
      b.text(', ');
      b.mark(loc.city, 'geographic', 'GEOGRAPHIC', true);
      b.text(', ');
      b.mark(loc.state, 'geographic', 'GEOGRAPHIC', true);
      b.text(' ');
      b.mark(loc.zip, 'geographic', 'GEOGRAPHIC', true);
      b.text('\nCallback Telephone: ');
      b.mark(phone, 'phone', 'PHONE', true);
      b.text('\nPortal Email: ');
      b.mark(email, 'email', 'EMAIL', true);
      b.text('\nChart ID: ');
      b.mark(mrn, 'mrn', 'MRN', true);
      b.text('\nSSN Reference: ');
      b.mark(ssn, 'ssn', 'SSN', true);
      b.text('\nClinical impression: Patient endorsed mild episodic insomnia and work-related distress. Affect full, cognition intact, goal-directed speech.');
    });
  }

  // 2. Unstructured Narrative Therapy Progress Notes (50 snippets)
  for (let i = 0; i < 50; i++) {
    const fn = firstNames[(i + 20) % firstNames.length];
    const ln = lastNames[(i + 12) % lastNames.length];
    const relFn = firstNames[(i + 5) % firstNames.length];
    const relLn = ln;
    const relType = ['mother', 'father', 'spouse', 'brother', 'sister', 'uncle', 'aunt'][i % 7];
    const loc = cities[(i + 3) % cities.length];
    const phone = `(555) ${String(300 + i).padStart(3, '0')}-${String(2000 + i * 19).slice(-4)}`;
    const visitDate = `October ${1 + (i % 25)}, 2026`;

    addSnippet('unstructured_narrative', (b) => {
      b.text('Therapy Session Note — ');
      b.mark(visitDate, 'dates', 'DATE', false);
      b.text('\nToday met with client ');
      b.mark(`${fn} ${ln}`, 'names', 'NAME', false);
      b.text(` for 53-minute individual outpatient psychotherapy. Discussion centered on relational friction with ${relType} `);
      b.mark(`${relFn} ${relLn}`, 'names', 'NAME', false);
      b.text(` regarding relocation plans from `);
      b.mark(loc.city, 'geographic', 'GEOGRAPHIC', false);
      b.text('. Client reported practicing progressive muscle relaxation three times this week with good symptom relief. Emergency phone verification confirmed as ');
      b.mark(phone, 'phone', 'PHONE', false);
      b.text('. Next session scheduled for next Wednesday at 2:00 PM via secure telehealth.');
    });
  }

  // 3. Billing, Claims, Insurance & Financial Postings (40 snippets)
  for (let i = 0; i < 40; i++) {
    const fn = firstNames[(i + 8) % firstNames.length];
    const ln = lastNames[(i + 22) % lastNames.length];
    const policyId = `POL-98${String(100000 + i * 311).slice(-6)}`;
    const acctNo = `ACCT-88${String(10000 + i * 149).slice(-5)}`;
    const claimNo = `CLM-2026-${String(50000 + i * 73).slice(-5)}`;
    const dateStr = `2026-10-${String(1 + (i % 28)).padStart(2, '0')}`;

    addSnippet('billing_and_claims', (b) => {
      b.text('Remittance Advice & Explanation of Benefits\n');
      b.text('Date of Adjudication: ');
      b.mark(dateStr, 'dates', 'DATE', true);
      b.text('\nSubscriber: ');
      b.mark(`${fn} ${ln}`, 'names', 'NAME', true);
      b.text('\nHealth Plan Policy ID: ');
      b.mark(policyId, 'health_plan_beneficiary', 'HEALTH_PLAN', true);
      b.text('\nPatient Account Number: ');
      b.mark(acctNo, 'account_numbers', 'ACCOUNT_NUM', true);
      b.text('\nClaim Number: ');
      b.mark(claimNo, 'unique_id', 'UNIQUE_ID', true);
      b.text('\nService Code: 90837 | Charge: $185.00 | Allowed: $142.50 | Paid: $120.00 | Co-pay: $22.50');
    });
  }

  // 4. Specialized Safe Harbor Identifiers: Web URLs, IP, Biometrics, Devices, Vehicles, Licenses (60 snippets)
  for (let i = 0; i < 60; i++) {
    const fn = firstNames[(i + 14) % firstNames.length];
    const ln = lastNames[(i + 9) % lastNames.length];
    const ip = `198.51.100.${10 + (i % 200)}`;
    const devSerial = `DEV-SN-8921${String(1000 + i * 17).slice(-4)}`;
    const vin = `1HGCR2F83HA${String(100000 + i * 71).slice(-6)}`;
    const lic = `MED-LIC-WA-${String(40000 + i * 13).slice(-5)}`;
    const photo = `patient_chart_face_${fn.toLowerCase()}_${ln.toLowerCase()}.jpg`;
    const portalUrl = `https://portal.secure-clinic.org/client/${fn.toLowerCase()}-${ln.toLowerCase()}`;
    const barcode = `BARCODE-TOX-${String(900000 + i * 29).slice(-6)}`;

    addSnippet('specialized_safe_harbor', (b) => {
      b.text('Ancillary Clinical & Telehealth Audit Record\n');
      b.text('Client: ');
      b.mark(`${fn} ${ln}`, 'names', 'NAME', true);
      b.text('\nTelehealth Session IP: ');
      b.mark(ip, 'ip_address', 'IP_ADDRESS', true);
      b.text('\nSecure Portal URL: ');
      b.mark(portalUrl, 'web_urls', 'WEB_URL', true);
      b.text('\nDiagnostic Device Serial: ');
      b.mark(devSerial, 'device_identifiers', 'DEVICE_ID', true);
      b.text('\nVehicle Transport VIN: ');
      b.mark(vin, 'vehicle_identifiers', 'VEHICLE_ID', true);
      b.text('\nAttending License: ');
      b.mark(lic, 'certificate_license', 'LICENSE', true);
      b.text('\nIntake Photo Attachment: ');
      b.mark(photo, 'photo_id', 'PHOTO_ID', true);
      b.text('\nLab Specimen Tracking: ');
      b.mark(barcode, 'unique_id', 'UNIQUE_ID', true);
      b.text('\nIdentity Verification: Completed via ');
      b.mark('biometric fingerprint scan', 'biometric', 'BIOMETRIC', false);
      b.text(' protocol.');
    });
  }

  // 5. Negative Controls (True Negatives / No PHI) (50 snippets)
  const clinicalNegativeCases = [
    'Client presented with acute agitation and tremors consistent with DSM-5-TR criteria for F41.1 (Generalized Anxiety Disorder). Recommended cognitive reframing exercises.',
    'Pharmacotherapy titration: Increased Sertraline from 50mg PO daily to 100mg PO daily with breakfast. Patient informed of potential GI side effects and black-box warning.',
    'Laboratory evaluation reviewed: CBC normal, TSH 2.14 mIU/L, Free T4 1.1 ng/dL, Serum B12 640 pg/mL, Vitamin D 38 ng/mL, fasting blood glucose 92 mg/dL.',
    'Session focused on behavioral activation: Client agreed to walk for 20 minutes on Mondays, Wednesdays, and Fridays, recording mood ratings on a 1 to 10 scale.',
    'Psychometric evaluation results: PHQ-9 score: 14 (Moderate Depression), GAD-7 score: 11 (Moderate Anxiety), PCL-5 total score: 22 (sub-threshold for PTSD).',
    'Intervention: Implemented diaphragmatic breathing exercises (4-4-6 cadence) and sensory grounding (5-4-3-2-1 technique) during acute distress episode in clinic.',
    'Sleep hygiene education provided: Discontinue blue-light screens 60 minutes prior to bedtime, eliminate afternoon caffeine intake after 12:00 PM, maintain 68°F bedroom temperature.',
    'Therapeutic alliance is strong. Client was attentive, engaged, and receptive to homework assignments involving thought records and cognitive distortion identification.',
    'Differential diagnosis: Bipolar II disorder versus Major Depressive Disorder with anxious distress. Rule out secondary mood disturbance secondary to hypothyroidism.',
    'Treatment plan update: Goal 1: Reduce weekly panic frequency from 4 episodes to 1 or fewer over next 8 weeks using interoceptive exposure exercises.',
  ];

  for (let i = 0; i < 50; i++) {
    const text = clinicalNegativeCases[i % clinicalNegativeCases.length];
    snippets.push({
      id: `fresh-holdout-${String(idCounter++).padStart(4, '0')}`,
      categoryPrimary: 'negative_control_no_phi',
      text,
      expected_entities: [],
    });
  }

  return snippets;
}

const outputPath = path.resolve(process.cwd(), 'tests/synthetic_phi_fresh_holdout_corpus.json');
const corpus = buildCorpus();
fs.writeFileSync(outputPath, JSON.stringify(corpus, null, 2), 'utf-8');

console.log(`✓ Generated ${corpus.length} fresh synthetic holdout snippets.`);
console.log(`Saved frozen holdout corpus to: ${outputPath}`);
