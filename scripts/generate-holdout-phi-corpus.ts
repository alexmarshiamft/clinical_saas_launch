import fs from 'node:fs';
import path from 'node:path';

export interface HoldoutEntity {
  text: string;
  category: string;
  ruleId: string;
  start: number;
  end: number;
  isStructured: boolean;
  difficulty: 'easy_structured' | 'hard_unstructured';
}

export interface HoldoutSnippet {
  id: string;
  categoryPrimary: string;
  text: string;
  expected_entities: HoldoutEntity[];
}

// Generate distinct holdout corpus with diverse clinical behavioral health narratives
const holdoutSnippets: HoldoutSnippet[] = [];

// Seed realistic clinical vocabularies distinct from prior training/benchmark
const clinicianPool = [
  'Dr. Aris Thorne, MD',
  'Dr. Elena Rostova, PsyD',
  'Marcus Vance, LCSW',
  'Dr. Trupti Patel, DO',
  'Khadija Al-Mansoor, LMFT',
  'Dr. Soren Lindqvist, PhD',
  'Nurse Practitioner Wendy O\'Connor, PMHNP-BC',
  'Dr. Jamal Washington, MD',
];

const patientPool = [
  { first: 'Siobhan', last: 'Gallagher', age: '34' },
  { first: 'Dmitri', last: 'Kovalev', age: '48' },
  { first: 'Zainab', last: 'Farooq', age: '29' },
  { first: 'Mateo', last: 'Villanueva-Cruz', age: '41' },
  { first: 'Ananya', last: 'Chatterjee', age: '22' },
  { first: 'Thurston', last: 'Howell-Vane', age: '67' },
  { first: 'Keiko', last: 'Takahashi', age: '52' },
  { first: 'Deshawn', last: 'Booker', age: '38' },
  { first: 'Leila', last: 'Nouri', age: '26' },
  { first: 'Callum', last: 'MacLeod', age: '45' },
  { first: 'Esperanza', last: 'Reyes-Morales', age: '31' },
  { first: 'Hassan', last: 'El-Sayed', age: '59' },
  { first: 'Gwyneth', last: 'Pritchard', age: '73' },
  { first: 'Jerome', last: 'Duvalier', age: '36' },
  { first: 'Fatima', last: 'Al-Husseini', age: '44' },
  { first: 'Bjoern', last: 'Olafsson', age: '61' },
];

const locationPool = [
  { street: '842 Cumberland Crescent, Apt 4B', city: 'Chattanooga', state: 'TN', zip: '37405', county: 'Hamilton County' },
  { street: '1109 Whispering Pines Way', city: 'Bozeman', state: 'MT', zip: '59715', county: 'Gallatin County' },
  { street: '4502 Coronado Terrace, Suite 12', city: 'Coral Gables', state: 'FL', zip: '33134', county: 'Miami-Dade County' },
  { street: '773 Kingfisher Lane', city: 'Eugene', state: 'OR', zip: '97401', county: 'Lane County' },
  { street: '2044 Meadowbrook Court, Unit 301', city: 'Ann Arbor', state: 'MI', zip: '48104', county: 'Washtenaw County' },
  { street: '918 Sycamore Hollow Rd', city: 'Sedona', state: 'AZ', zip: '86336', county: 'Coconino County' },
  { street: '312 St. Charles Ave, Penthouse 6', city: 'New Orleans', state: 'LA', zip: '70130', county: 'Orleans Parish' },
  { street: '625 Beacon Hill Road', city: 'Burlington', state: 'VT', zip: '05401', county: 'Chittenden County' },
];

const hospitalPool = [
  'Vanderbilt University Psychiatric Hospital',
  'Providence Sacred Heart Medical Center',
  'Baptist Health Behavioral Center',
  'Mayo Clinic St. Marys Hospital',
  'Cedars-Sinai Outpatient Psychiatric Clinic',
  'Johns Hopkins Bayview Community Psychiatry',
  'Pine Rest Christian Mental Health Services',
  'Sheppard Pratt Hospital Health System',
];

const employerPool = [
  'BioTech Dynamics Inc',
  'Pinnacle Aerospace Technologies',
  'Blue Ridge Logistics LLC',
  'Midwest Agricultural Cooperative',
  'Crestview Public School District',
  'Highland Capital Holdings',
];

// Helper to push snippet and calculate precise entity offsets
function addSnippet(
  id: string,
  categoryPrimary: string,
  parts: Array<string | { text: string; category: string; ruleId: string; isStructured: boolean }>
) {
  let fullText = '';
  const entities: HoldoutEntity[] = [];

  for (const part of parts) {
    if (typeof part === 'string') {
      fullText += part;
    } else {
      const start = fullText.length;
      fullText += part.text;
      const end = fullText.length;
      entities.push({
        text: part.text,
        category: part.category,
        ruleId: part.ruleId,
        start,
        end,
        isStructured: part.isStructured,
        difficulty: part.isStructured ? 'easy_structured' : 'hard_unstructured',
      });
    }
  }

  holdoutSnippets.push({
    id,
    categoryPrimary,
    text: fullText,
    expected_entities: entities,
  });
}

let snippetIndex = 1;

// 1. Generate 120 Comprehensive Clinical Encounter Summaries (Multi-entity rich narratives)
for (let i = 0; i < 120; i++) {
  const patient = patientPool[i % patientPool.length];
  const clinician = clinicianPool[i % clinicianPool.length];
  const loc = locationPool[i % locationPool.length];
  const hosp = hospitalPool[i % hospitalPool.length];
  const mrn = `MRN-${200000 + i * 17}`;
  const phone = `(555) ${(234 + i).toString().padStart(3, '0')}-${(1000 + i * 3).toString().padStart(4, '0')}`;
  const email = `${patient.first.toLowerCase()}.${patient.last.toLowerCase()}${i}@outlook-secure.org`;
  const dateStr = `10/${(i % 28) + 1}/2026`;
  const dobStr = `03/${((i * 3) % 27) + 1}/198${(i % 9)}`;

  addSnippet(
    `holdout-rich-${String(snippetIndex++).padStart(4, '0')}`,
    'multi_entity_narrative',
    [
      `Clinical Progress Note recorded on `,
      { text: dateStr, category: 'dates', ruleId: 'dates', isStructured: true },
      ` by treating provider `,
      { text: clinician, category: 'names', ruleId: 'names', isStructured: false },
      `. Client `,
      { text: `${patient.first} ${patient.last}`, category: 'names', ruleId: 'names', isStructured: false },
      `, DOB `,
      { text: dobStr, category: 'dates', ruleId: 'dates', isStructured: true },
      ` (Age: `,
      { text: patient.age, category: 'dates', ruleId: 'dates', isStructured: false },
      `), residing at `,
      { text: loc.street, category: 'geographic_data', ruleId: 'geographic_data', isStructured: true },
      `, `,
      { text: loc.city, category: 'geographic_data', ruleId: 'geographic_data', isStructured: false },
      `, `,
      { text: loc.state, category: 'geographic_data', ruleId: 'geographic_data', isStructured: false },
      ` `,
      { text: loc.zip, category: 'geographic_data', ruleId: 'geographic_data', isStructured: true },
      ` within `,
      { text: loc.county, category: 'geographic_data', ruleId: 'geographic_data', isStructured: false },
      `, presented for CBT individual psychotherapy. Client identifier is recorded under `,
      { text: mrn, category: 'medical_record_numbers', ruleId: 'medical_record_numbers', isStructured: true },
      `. Contact callback validated as `,
      { text: phone, category: 'phone_numbers', ruleId: 'phone_numbers', isStructured: true },
      ` and encrypted portal updates sent to `,
      { text: email, category: 'email_addresses', ruleId: 'email_addresses', isStructured: true },
      `. History notable for prior inpatient stabilization at `,
      { text: hosp, category: 'names', ruleId: 'names', isStructured: false },
      ` following severe panic symptoms. Client was cooperative and oriented x4.`
    ]
  );
}

// 2. Generate 100 Difficult Unstructured Names & Nicknames & Family Members
const relatives = [
  'husband Liam', 'wife Saroja', 'mother Beatrice', 'father Terrence',
  'sister Genevieve', 'brother Vladimir', 'partner Mateo', 'son Zachary',
  'daughter Meilin', 'stepfather Gerald', 'grandmother Yvette', 'uncle Boris'
];

for (let i = 0; i < 100; i++) {
  const patient = patientPool[i % patientPool.length];
  const relative = relatives[i % relatives.length];
  const [relTitle, relName] = relative.split(' ');
  const employer = employerPool[i % employerPool.length];

  addSnippet(
    `holdout-names-${String(snippetIndex++).padStart(4, '0')}`,
    'names',
    [
      `During session, `,
      { text: patient.first, category: 'names', ruleId: 'names', isStructured: false },
      ` described intense interpersonal conflict with `,
      relTitle,
      ` `,
      { text: relName, category: 'names', ruleId: 'names', isStructured: false },
      ` regarding recent changes at work with `,
      { text: employer, category: 'names', ruleId: 'names', isStructured: false },
      `. `,
      { text: patient.first, category: 'names', ruleId: 'names', isStructured: false },
      ` reported feeling unsupported when `,
      { text: relName, category: 'names', ruleId: 'names', isStructured: false },
      ` questioned therapy attendance.`
    ]
  );
}

// 3. Generate 60 HIPAA Safe Harbor Categories: SSNs, Beneficiary IDs & Account Numbers
for (let i = 0; i < 60; i++) {
  const ssn = `${900 + (i % 99)}-${(10 + (i % 80)).toString().padStart(2, '0')}-${(1000 + i * 47).toString().substring(0, 4)}`;
  const policyNum = `MEDICARE-${880000 + i * 23}`;
  const acctNum = `ACT-${10000000 + i * 314}`;

  addSnippet(
    `holdout-financial-${String(snippetIndex++).padStart(4, '0')}`,
    'social_security_numbers',
    [
      `Insurance intake billing verification completed. Subscriber SSN verified on file as `,
      { text: ssn, category: 'social_security_numbers', ruleId: 'social_security_numbers', isStructured: true },
      ` with health plan beneficiary policy `,
      { text: policyNum, category: 'health_plan_beneficiary_numbers', ruleId: 'health_plan_beneficiary_numbers', isStructured: true },
      ` and practice billing account ledger ID `,
      { text: acctNum, category: 'account_numbers', ruleId: 'account_numbers', isStructured: true },
      `. Pre-authorization granted for 12 outpatient sessions.`
    ]
  );
}

// 4. Generate 60 Telephony, Fax Numbers & Electronic Identifiers (URLs, IPs)
for (let i = 0; i < 60; i++) {
  const faxNum = `800-${(555).toString()}-${(3000 + i).toString()}`;
  const ipAddr = `192.168.${(i % 250) + 1}.${(i * 3) % 254 + 1}`;
  const patientPortalUrl = `https://patient-telehealth.portal.care/session/token-${i * 9912}`;

  addSnippet(
    `holdout-electronic-${String(snippetIndex++).padStart(4, '0')}`,
    'electronic_identifiers',
    [
      `Telehealth telehealth telemetry audit check. Video connection initiated via IP address `,
      { text: ipAddr, category: 'ip_addresses', ruleId: 'ip_addresses', isStructured: true },
      ` connecting to encrypted room URL `,
      { text: patientPortalUrl, category: 'urls', ruleId: 'urls', isStructured: true },
      `. Medical records request transmitted via secure clinic fax line `,
      { text: faxNum, category: 'fax_numbers', ruleId: 'fax_numbers', isStructured: true },
      `. Cryptographic handshake verified with 0% packet loss.`
    ]
  );
}

// 5. Generate 60 Medical Devices, Serial Numbers, Biometric & License Numbers
for (let i = 0; i < 60; i++) {
  const licenseNum = `DL-CA-${4800000 + i * 19}`;
  const cpapDevice = `CPAP-RESMED-SN${900000 + i * 43}`;
  const vin = `1HGCR2F8${(i % 9)}HA${100000 + i * 55}`;
  const biometricId = `VOICEPRINT-SHA256-${i * 777123}`;

  addSnippet(
    `holdout-devices-biometrics-${String(snippetIndex++).padStart(4, '0')}`,
    'device_identifiers',
    [
      `Patient identity physically confirmed via state driver's license `,
      { text: licenseNum, category: 'certificate_license_numbers', ruleId: 'certificate_license_numbers', isStructured: true },
      `. Vehicle on arrival noted with VIN `,
      { text: vin, category: 'vehicle_identifiers', ruleId: 'vehicle_identifiers', isStructured: true },
      `. Patient uses nocturnal neuro-monitoring unit `,
      { text: cpapDevice, category: 'device_identifiers', ruleId: 'device_identifiers', isStructured: true },
      ` for obstructive sleep apnea. Audio biometric verification enrolled under ID `,
      { text: biometricId, category: 'biometric_identifiers', ruleId: 'biometric_identifiers', isStructured: true },
      `. Compliance data reviewed with positive response.`
    ]
  );
}

// 6. Generate 60 Unique Identifying Characteristics & Photos/Media Identifiers
for (let i = 0; i < 60; i++) {
  const photoId = `EHR-PHOTO-ASSET-IMG${10000 + i * 13}.JPG`;
  const barcodeGuid = `BARCODE-UUID-${i * 1234567}`;
  const clinicName = hospitalPool[i % hospitalPool.length];

  addSnippet(
    `holdout-unique-identifiers-${String(snippetIndex++).padStart(4, '0')}`,
    'unique_identifiers',
    [
      `Intake triage photo uploaded to clinical chart designated as `,
      { text: photoId, category: 'full_face_photos', ruleId: 'full_face_photos', isStructured: true },
      ` matched to patient wristband wrist identification tag `,
      { text: barcodeGuid, category: 'unique_identifiers', ruleId: 'unique_identifiers', isStructured: true },
      ` generated at `,
      { text: clinicName, category: 'names', ruleId: 'names', isStructured: false },
      `. Triage intake assessment logged and verified by intake nursing supervisor.`
    ]
  );
}

// 7. Generate 100 Geographic Variations (Counties, precincts, rural routes, Canadian/UK/US zip codes)
const geoVariations = [
  { text: 'Arapahoe County', type: 'county' },
  { text: 'Kootenai County', type: 'county' },
  { text: 'Travis County', type: 'county' },
  { text: 'Rural Route 4, Box 212', type: 'street' },
  { text: '90210-4412', type: 'zip' },
  { text: '73301', type: 'zip' },
  { text: 'Sedona', type: 'city' },
  { text: 'Spokane', type: 'city' },
  { text: 'Missoula', type: 'city' },
  { text: 'Asheville', type: 'city' },
];

for (let i = 0; i < 100; i++) {
  const geo1 = geoVariations[i % geoVariations.length];
  const geo2 = geoVariations[(i + 3) % geoVariations.length];
  const patient = patientPool[i % patientPool.length];

  addSnippet(
    `holdout-geographic-${String(snippetIndex++).padStart(4, '0')}`,
    'geographic_data',
    [
      `Client `,
      { text: `${patient.first} ${patient.last}`, category: 'names', ruleId: 'names', isStructured: false },
      ` reports relocating from `,
      { text: geo1.text, category: 'geographic_data', ruleId: 'geographic_data', isStructured: geo1.type === 'zip' },
      ` to new residence in `,
      { text: geo2.text, category: 'geographic_data', ruleId: 'geographic_data', isStructured: geo2.type === 'zip' },
      `. Transportation barriers discussed; client will utilize regional telehealth services when weather impedes travel.`
    ]
  );
}

// 8. Generate 50 Clinical Date Formats (Military dates, written dates, century dates)
const datesList = [
  'October 14th, 2026',
  '14-OCT-2026',
  '2026-11-04',
  'December 22, 2026',
  '04/18/1979',
  'Jan 15, 2025',
  'August 30th, 2026',
  '09-21-2026',
];

for (let i = 0; i < 50; i++) {
  const d1 = datesList[i % datesList.length];
  const d2 = datesList[(i + 2) % datesList.length];
  const patient = patientPool[i % patientPool.length];

  addSnippet(
    `holdout-dates-${String(snippetIndex++).padStart(4, '0')}`,
    'dates',
    [
      `Treatment review conducted for `,
      { text: patient.first, category: 'names', ruleId: 'names', isStructured: false },
      `. Previous psychiatric crisis occurred on `,
      { text: d1, category: 'dates', ruleId: 'dates', isStructured: true },
      `. Next scheduled multidisciplinary case conference set for `,
      { text: d2, category: 'dates', ruleId: 'dates', isStructured: true },
      `. Relapse prevention plan signed and given to client.`
    ]
  );
}

console.log(`Generated ${holdoutSnippets.length} snippets for independent holdout corpus.`);
const totalEntities = holdoutSnippets.reduce((acc, s) => acc + s.expected_entities.length, 0);
console.log(`Total annotated Safe Harbor entities: ${totalEntities}`);

const outputPath = path.resolve(process.cwd(), 'tests/synthetic_phi_holdout_corpus.json');
fs.writeFileSync(outputPath, JSON.stringify(holdoutSnippets, null, 2), 'utf-8');
console.log(`Wrote independent holdout corpus to ${outputPath}`);
