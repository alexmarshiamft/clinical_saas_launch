import { SafeHarborRuleDefinition } from './types';

export const SAFE_HARBOR_RULES: SafeHarborRuleDefinition[] = [
  // 1. Names
  {
    ruleId: 'NAME',
    ruleNumber: 1,
    statutoryName: 'Names',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(A)',
    tagToken: '[NAME]',
    description: 'Patient, clinician, provider, and relative personal names',
    isDirectIdentifier: true,
    baseConfidence: 0.95,
    patterns: [
      {
        name: 'labeled_patient_name',
        regex: /(?:Patient|Client|Pt\.?|Subject|Resident|Member)\s*(?:Name)?\s*[:#]\s*([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+(?:\s+(?:Jr|Sr|II|III|IV)\.?)?)/gi,
        extractGroup: 1,
        customConfidence: 0.98,
      },
      {
        name: 'titled_clinician_name',
        regex: /\b(?:Dr\.|Dr|Doctor|Prof\.|Mr\.|Mrs\.|Ms\.|Miss)\s+([A-Z][a-z]{1,20}(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{1,20}(?:,\s*(?:MD|DO|PhD|PsyD|NP|PA|RN|LCSW|LMFT))?)\b/g,
        extractGroup: 1,
        customConfidence: 0.96,
      },
      {
        name: 'dictated_author_signature',
        regex: /(?:Attending(?:\s+Physician)?|Referring(?:\s+Physician)?|Primary\s+Clinician|Primary\s+Care|Dictated\s+by|Signed\s+by|Author|Transcribed\s+by)\s*[:#]?\s*([A-Z][a-z]{1,20}(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]{1,20}(?:,\s*(?:MD|DO|PhD|PsyD|NP|PA|RN|LCSW|LMFT))?)/gi,
        extractGroup: 1,
        customConfidence: 0.96,
      },
    ],
  },

  // 2. Geographic Subdivisions
  {
    ruleId: 'GEOGRAPHIC',
    ruleNumber: 2,
    statutoryName: 'Geographic Subdivisions',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(B)',
    tagToken: '[LOCATION]',
    description: 'Street address, city, county, precinct, and ZIP codes',
    isDirectIdentifier: false,
    baseConfidence: 0.92,
    patterns: [
      {
        name: 'street_address_full',
        regex: /\b\d{1,5}\s+[A-Z][a-zA-Z0-9\.\s]{1,30}\s+(?:Street|St\.?|Avenue|Ave\.?|Boulevard|Blvd\.?|Road|Rd\.?|Drive|Dr\.?|Court|Ct\.?|Lane|Ln\.?|Way|Terrace|Ter\.?|Circle|Cir\.?|Place|Pl\.?)\b/gi,
        customConfidence: 0.95,
      },
      {
        name: 'city_state_zip',
        regex: /\b[A-Z][a-zA-Z\s]{2,25},\s*(?:AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\s+\d{5}(?:-\d{4})?\b/g,
        customConfidence: 0.96,
      },
      {
        name: 'labeled_residence_address',
        regex: /(?:Address|Residence\s+Address|Home\s+Address)\s*[:#]?\s*([^,\n\r]+,\s*[^,\n\r]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)/gi,
        extractGroup: 1,
        customConfidence: 0.97,
      },
      {
        name: 'standalone_zip_code',
        regex: /\b\d{5}(?:-\d{4})?\b/g,
        customConfidence: 0.88,
        customTag: '[ZIP]',
      },
    ],
  },

  // 3. Dates & Ages 90+
  {
    ruleId: 'DATE',
    ruleNumber: 3,
    statutoryName: 'Dates',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(C)',
    tagToken: '[DATE]',
    description: 'All date elements (birth, admit, discharge, encounter) and ages over 89',
    isDirectIdentifier: false,
    baseConfidence: 0.98,
    patterns: [
      {
        name: 'mm_dd_yyyy_slash_dash',
        regex: /\b(?:0?[1-9]|1[0-2])[/\-.](?:0?[1-9]|[12]\d|3[01])[/\-.](?:19|20)\d{2}\b/g,
        customConfidence: 0.99,
      },
      {
        name: 'iso_yyyy_mm_dd',
        regex: /\b(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])\b/g,
        customConfidence: 0.99,
      },
      {
        name: 'month_word_day_year',
        regex: /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2}\b/gi,
        customConfidence: 0.98,
      },
      {
        name: 'day_month_word_year',
        regex: /\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(?:19|20)\d{2}\b/gi,
        customConfidence: 0.98,
      },
      {
        name: 'age_90_plus',
        regex: /\b(?:9[0-9]|1[0-9]{2})[-\s]*(?:years?[-\s]*(?:old)?|y\/?o)\b/gi,
        customConfidence: 0.95,
        customTag: '[AGE_90+]',
      },
    ],
  },

  // 4. Telephone Numbers
  {
    ruleId: 'PHONE',
    ruleNumber: 4,
    statutoryName: 'Telephone Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(D)',
    tagToken: '[PHONE]',
    description: 'Telephone contact numbers',
    isDirectIdentifier: true,
    baseConfidence: 0.98,
    patterns: [
      {
        name: 'us_standard_phone',
        regex: /(?<!\d)(?:\+?1[-.\s]?)?(?:\([2-9]\d{2}\)[-.\s]?|[2-9]\d{2}[-.\s])[2-9]\d{2}[-.\s]\d{4}(?!\d)/g,
        customConfidence: 0.98,
      },
      {
        name: 'labeled_phone_number',
        regex: /(?:Phone|Telephone|Tel|Cell|Mobile|Primary\s+Phone|Emergency\s+Contact)\s*[:#]?\s*(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/gi,
        customConfidence: 0.99,
      },
    ],
  },

  // 5. Fax Numbers
  {
    ruleId: 'FAX',
    ruleNumber: 5,
    statutoryName: 'Fax Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(E)',
    tagToken: '[FAX]',
    description: 'Facsimile transmission telephone numbers',
    isDirectIdentifier: true,
    baseConfidence: 0.98,
    patterns: [
      {
        name: 'labeled_fax_number',
        regex: /\b(?:Fax|Facsimile|FX)\s*[:#]?\s*(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}\b/gi,
        customConfidence: 0.99,
      },
    ],
  },

  // 6. Email Addresses
  {
    ruleId: 'EMAIL',
    ruleNumber: 6,
    statutoryName: 'Email Addresses',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(F)',
    tagToken: '[EMAIL]',
    description: 'Electronic mail addresses',
    isDirectIdentifier: true,
    baseConfidence: 0.99,
    patterns: [
      {
        name: 'rfc5322_email',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
        customConfidence: 0.99,
      },
    ],
  },

  // 7. Social Security Numbers
  {
    ruleId: 'SSN',
    ruleNumber: 7,
    statutoryName: 'Social Security Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(G)',
    tagToken: '[SSN]',
    description: 'US Social Security Numbers (SSN)',
    isDirectIdentifier: true,
    baseConfidence: 0.99,
    patterns: [
      {
        name: 'standard_ssn_validated',
        regex: /\b(?!000|666|9\d{2})\d{3}[-\s](?!00)\d{2}[-\s](?!0000)\d{4}\b/g,
        customConfidence: 0.99,
      },
      {
        name: 'labeled_ssn',
        regex: /\b(?:SSN|Social\s+Security(?:\s+(?:Number|#|No\.?))?)\s*[:#]?\s*\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/gi,
        customConfidence: 0.99,
      },
    ],
  },

  // 8. Medical Record Numbers
  {
    ruleId: 'MRN',
    ruleNumber: 8,
    statutoryName: 'Medical Record Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(H)',
    tagToken: '[MRN]',
    description: 'Patient medical record numbers and clinical chart identifiers',
    isDirectIdentifier: true,
    baseConfidence: 0.98,
    patterns: [
      {
        name: 'labeled_mrn',
        regex: /\b(?:MRN?|MR#|Medical\s+Record\s*(?:Number|#|No\.?))\s*[:#]?\s*[A-Z0-9][\w\-]{3,15}\b/gi,
        customConfidence: 0.98,
      },
      {
        name: 'mc_prefixed_mrn',
        regex: /#MC-\d{4,8}\b/gi,
        customConfidence: 0.99,
      },
    ],
  },

  // 9. Health Plan Beneficiary Numbers
  {
    ruleId: 'HEALTH_PLAN_NUM',
    ruleNumber: 9,
    statutoryName: 'Health Plan Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(I)',
    tagToken: '[HEALTH_PLAN_NUM]',
    description: 'Health plan, insurance, policy, and beneficiary identifiers',
    isDirectIdentifier: true,
    baseConfidence: 0.96,
    patterns: [
      {
        name: 'labeled_insurance_member_id',
        regex: /\b(?:Health\s+Plan|Beneficiary|Member|Policy|Group|Insurance|Coverage|Claim)\s*(?:ID|Number|No\.?|#)\s*[:#]?\s*[A-Z0-9][\w\-]{4,20}\b/gi,
        customConfidence: 0.97,
      },
      {
        name: 'carrier_prefix_id',
        regex: /\b(?:BCBS|AETNA|CIGNA|UHC|HUMANA|MEDICARE|MEDICAID)[-\s]?[A-Z0-9]{5,15}\b/gi,
        customConfidence: 0.96,
      },
    ],
  },

  // 10. Account Numbers
  {
    ruleId: 'ACCOUNT_NUM',
    ruleNumber: 10,
    statutoryName: 'Account Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(J)',
    tagToken: '[ACCOUNT_NUM]',
    description: 'Patient billing accounts and financial payment cards',
    isDirectIdentifier: true,
    baseConfidence: 0.95,
    patterns: [
      {
        name: 'labeled_account_number',
        regex: /\b(?:Acct\.?|Account)\s*(?:No\.?|Number|#)\s*[:#]?\s*[A-Z0-9][\w\-]{4,19}\b/gi,
        customConfidence: 0.96,
      },
      {
        name: 'credit_debit_card_number',
        regex: /\b(?:4\d{3}|5[1-5]\d{2}|6011|3[47]\d{2})[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,4}\b/g,
        customConfidence: 0.97,
      },
    ],
  },

  // 11. Certificate / License Numbers
  {
    ruleId: 'LICENSE_NUM',
    ruleNumber: 11,
    statutoryName: 'Certificate / License Numbers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(K)',
    tagToken: '[LICENSE_NUM]',
    description: 'Medical licenses, NPI, DEA registrations, and driver licenses',
    isDirectIdentifier: true,
    baseConfidence: 0.97,
    patterns: [
      {
        name: 'national_provider_identifier_npi',
        regex: /\bNPI\s*[:#]?\s*\d{10}\b/gi,
        customConfidence: 0.99,
      },
      {
        name: 'dea_registration_number',
        regex: /\bDEA(?:\s+License)?\s*(?:No\.?|Number|#)?\s*[:#]?\s*[A-Z]{2}\d{7}\b/gi,
        customConfidence: 0.98,
      },
      {
        name: 'license_certificate_number',
        regex: /\b(?:License|Licence|Cert(?:ificate)?|Driver'?s?\s+License|UPIN)\s*(?:No\.?|Number|#)?\s*[:#]?\s*[A-Z0-9][\w\-]{3,18}\b/gi,
        customConfidence: 0.95,
      },
    ],
  },

  // 12. Vehicle Identifiers & Serial Numbers
  {
    ruleId: 'VEHICLE_ID',
    ruleNumber: 12,
    statutoryName: 'Vehicle Identifiers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(L)',
    tagToken: '[VEHICLE_ID]',
    description: 'Vehicle Identification Numbers (VIN) and license plates',
    isDirectIdentifier: true,
    baseConfidence: 0.97,
    patterns: [
      {
        name: 'iso_vin_17_char',
        regex: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
        customConfidence: 0.98,
      },
      {
        name: 'labeled_vin',
        regex: /\b(?:VIN|Vehicle\s+ID)\s*[:#]?\s*[A-HJ-NPR-Z0-9]{10,17}\b/gi,
        customConfidence: 0.98,
      },
      {
        name: 'license_plate',
        regex: /\b(?:Plate|License\s+Plate)\s*[:#]?\s*[A-Z0-9]{2,8}\b/gi,
        customConfidence: 0.95,
      },
    ],
  },

  // 13. Device Identifiers & Serial Numbers
  {
    ruleId: 'DEVICE_ID',
    ruleNumber: 13,
    statutoryName: 'Device Identifiers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(M)',
    tagToken: '[DEVICE_ID]',
    description: 'Medical device serial numbers, UDI, pacemakers, and hardware telemetry',
    isDirectIdentifier: true,
    baseConfidence: 0.95,
    patterns: [
      {
        name: 'medical_device_serial_udi',
        regex: /\b(?:Serial|Device(?:\s+Serial)?|Implant|Pacemaker|Sensor|Hardware|Gateway|Monitor|UDI|Holter)\s*(?:No\.?|Number|#|ID|Serial)?\s*[:#]?\s*[A-Z0-9][\w\-]{4,22}\b/gi,
        customConfidence: 0.96,
      },
    ],
  },

  // 14. Web URLs
  {
    ruleId: 'URL',
    ruleNumber: 14,
    statutoryName: 'Web URLs',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(N)',
    tagToken: '[URL]',
    description: 'Universal Resource Locators (URLs) and web endpoints',
    isDirectIdentifier: true,
    baseConfidence: 0.99,
    patterns: [
      {
        name: 'http_https_url',
        regex: /\bhttps?:\/\/[^\s<>"']+/gi,
        customConfidence: 0.99,
      },
      {
        name: 'www_web_domain',
        regex: /\bwww\.[a-zA-Z0-9\-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?/gi,
        customConfidence: 0.99,
      },
    ],
  },

  // 15. Internet Protocol (IP) Addresses
  {
    ruleId: 'IP_ADDRESS',
    ruleNumber: 15,
    statutoryName: 'IP Addresses',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(O)',
    tagToken: '[IP_ADDRESS]',
    description: 'IPv4 and IPv6 internet protocol addresses',
    isDirectIdentifier: true,
    baseConfidence: 0.99,
    patterns: [
      {
        name: 'ipv4_octet_bounded',
        regex: /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
        customConfidence: 0.99,
      },
      {
        name: 'ipv6_hex_groups',
        regex: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
        customConfidence: 0.99,
      },
    ],
  },

  // 16. Biometric Identifiers
  {
    ruleId: 'BIOMETRIC',
    ruleNumber: 16,
    statutoryName: 'Biometric Identifiers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(P)',
    tagToken: '[BIOMETRIC]',
    description: 'Fingerprints, voiceprints, iris scans, and biometric verification references',
    isDirectIdentifier: true,
    baseConfidence: 0.92,
    patterns: [
      {
        name: 'biometric_narrative_keyword',
        regex: /\b(?:fingerprint|retina|iris|voiceprint|voice\s+recognition|hand\s+geometry|facial\s+recognition)\s*(?:id|identifier|scan|data|record|template|match|verification)?\b/gi,
        customConfidence: 0.92,
      },
    ],
  },

  // 17. Full-Face Photographic Images
  {
    ruleId: 'PHOTO_ID',
    ruleNumber: 17,
    statutoryName: 'Photographic Images',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(Q)',
    tagToken: '[PHOTO_ID]',
    description: 'Full-face patient photographs and clinical image file paths',
    isDirectIdentifier: true,
    baseConfidence: 0.94,
    patterns: [
      {
        name: 'photo_file_path_or_url',
        regex: /\b(?:photo(?:graph)?|image|picture|headshot|portrait)\s*(?:of\s+patient|file|path|url)?\s*[:#]?\s*[\/\w\.-]+\.(?:jpg|jpeg|png|tiff|bmp|dcm|dicom)\b/gi,
        customConfidence: 0.95,
      },
      {
        name: 'labeled_patient_photo',
        regex: /(?:Patient\s+photo(?:graph)?(?:\s+file)?|Headshot\s+image)\s*[:#]?\s*[^\s,;]+/gi,
        customConfidence: 0.94,
      },
    ],
  },

  // 18. Any Other Unique Identifying Number, Characteristic, or Code
  {
    ruleId: 'UNIQUE_ID',
    ruleNumber: 18,
    statutoryName: 'Unique Identifiers',
    cfrReference: '45 CFR § 164.514(b)(2)(i)(R)',
    tagToken: '[UNIQUE_ID]',
    description: 'UUIDs, tracking tags, barcodes, and clinical research patient IDs',
    isDirectIdentifier: true,
    baseConfidence: 0.94,
    patterns: [
      {
        name: 'standard_uuid',
        regex: /\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g,
        customConfidence: 0.98,
      },
      {
        name: 'barcode_tracking_uid',
        regex: /\b(?:Barcode|Tracking\s+ID|Tracking\s+Tag|Unique\s+ID|Subject\s+ID|UID)\s*(?:#|No\.?|Number)?\s*[:#]?\s*[A-Z0-9][\w\-]{4,30}\b/gi,
        customConfidence: 0.95,
      },
    ],
  },
];
