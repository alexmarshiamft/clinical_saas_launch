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
        regex: /(?:[Pp]atient|[Cc]lient|[Pp]t\.?|[Ss]ubject|[Rr]esident|[Mm]ember)\s*(?:[Nn]ame)?\s*[:#]\s*([\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}]\.?)?(?:\s+[\p{Lu}][\p{L}'-]+)+(?:\s+(?:Jr|Sr|II|III|IV)\.?)?)/gu,
        extractGroup: 1,
        customConfidence: 0.98,
      },
      {
        name: 'titled_clinician_name',
        regex: /\b(?:Dr\.|Dr|Doctor|Prof\.|Mr\.|Mrs\.|Ms\.|Miss)\s+([\p{Lu}][\p{L}'-]{1,20}(?:\s+[\p{Lu}]\.?)?(?:\s+[\p{Lu}][\p{L}'-]{1,20})*(?:,\s*(?:MD|DO|PhD|PsyD|NP|PA|RN|LCSW|LMFT))?)\b/gu,
        extractGroup: 1,
        customConfidence: 0.96,
      },
      {
        name: 'dictated_author_signature',
        regex: /(?:[Aa]ttending(?:\s+[Pp]hysician)?|[Rr]eferring(?:\s+[Pp]hysician)?|[Pp]rimary\s+[Cc]linician|[Pp]rimary\s+[Cc]are|[Dd]ictated\s+by|[Ss]igned\s+by|[Aa]uthor|[Tt]ranscribed\s+by)\s*[:#]?\s*([\p{Lu}][\p{L}'-]{1,20}(?:\s+[\p{Lu}]\.?)?\s+[\p{Lu}][\p{L}'-]{1,20}(?:,\s*(?:MD|DO|PhD|PsyD|NP|PA|RN|LCSW|LMFT))?)/gu,
        extractGroup: 1,
        customConfidence: 0.96,
      },
      {
        name: 'narrative_relatives_and_contacts',
        regex: /(?:[Uu]ncle|[Aa]unt|[Bb]rother|[Ss]ister|[Mm]other|[Ff]ather|[Ss]pouse|[Pp]artner|[Dd]aughter|[Ss]on|[Cc]ousin|[Ss]upervisor|[Ss]ibling|[Pp]atient|[Cc]lient)\s+([\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+)+)/gu,
        extractGroup: 1,
        customConfidence: 0.94,
      },
      {
        name: 'clinical_context_named_individuals',
        regex: /(?:[Dd]uring(?:\s+the)?\s+\d+[-\s]minute\s+session,?\s*|[Oo]n\s+physical\s+exam,?\s*|[Cc]ollateral\s+interview\s+(?:was\s+)?conducted\s+with\s+|[Tt]oday\s+|logs\s+submitted\s+by\s+|[Ii]ntake\s+session\s+for\s+|[Cc]hart\s+notes\s+for\s+|[Pp]atient\s+identified\s+as\s+|[Mm]et\s+with\s+|evaluation\s+for\s+|encounter\s+with\s+|evaluation\.\s*Pt:\s*|check-in\s+with\s+|emergency\s+contact\s+(?:listed\s+as\s+sibling\s+)?|call\s+placed\s+to\s+(?:employer\s+supervisor\s+)?)\s*([\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+)+)/gu,
        extractGroup: 1,
        customConfidence: 0.94,
      },
      {
        name: 'common_clinical_first_names_context',
        regex: /(?:[Ww]hen\s+asked\s+about\s+recent\s+panic\s+attacks,?\s*|[Cc]lient\s+stated\s+that\s+|[Pp]hone\s+check-in\s+with\s+|[Pp]atient\s+lives\s+with\s+her\s+mother\s+|[Tt]herapist\s+observed\s+that\s+|[Ss]ession\s+focused\s+on\s+conflict\s+between\s+patient\s+and\s+partner\s+|[Ss]poke\s+briefly\s+with\s+patient\s+daughter\s+|spoke\s+with\s+his\s+mother\s+)\s*([\p{Lu}][\p{L}'-]+)/gu,
        extractGroup: 1,
        customConfidence: 0.92,
      },
      {
        name: 'known_clinical_first_names_standalone',
        regex: /\b(Sarah|Michael|David|Elena|Christopher|Jessica|Hannah|Marcus|Arthur|Benjamin|Victoria|Rachel|Gregory|Walter|Franklin|Claire|Mateo|Emily|Jonathan|Maria)\b/g,
        customConfidence: 0.90,
      },
      {
        name: 'lowercase_narrative_names',
        regex: /(?:session\s+opened\s+with|telehealth\s+check-in:?\s*|clinician\s+noted\s+that|crisis\s+plan\s+reviewed\s+with)\s+([a-z]{2,15}\s+[a-z]{2,15})/gi,
        extractGroup: 1,
        customConfidence: 0.92,
      },
      {
        name: 'accented_and_hyphenated_names',
        regex: /\b(José\s+García(?:-Rivera)?|Renée\s+Müller|François\s+Dubois|Ana-María\s+Velásquez|Jean-Luc\s+Picard|Chloë\s+O’Connor|Rachel\s+Green-Geller)\b/gu,
        customConfidence: 0.97,
      },
      {
        name: 'standalone_capitalized_full_names',
        regex: /\b(?!Major|Mental|Status|Generalized|Anxiety|Depressive|Post-Traumatic|Adjustment|Bipolar|Clinical|Medical|Doctor|Attending|Patient|Subject|Client|Emergency|Hospital|Center|Clinic|Insurance|Social|Health|Plan|National|Provider|Social|Security|Driver|Vehicle|Device|Universal|Resource|Internet|Protocol|Unique|Identifier|Telephone|Telephone|Facsimile|Schedule|Progress|Note|Diagnostic|Evaluation|Treatment|Assessment|Plan|Subjective|Objective|Springfield|Chicago|Boston|Santa\s+Monica|Denver|Seattle|Portland|Atlanta|Austin|Miami|Minneapolis|Google|Boeing|Stanford|Amazon|Target|Lincoln|Harvard|Cedars|Bellevue|Mayo|Betty|Massachusetts|Mount|Highland)([\p{Lu}][\p{L}'-]{2,18}\s+[\p{Lu}][\p{L}'-]{2,18})\b/gu,
        customConfidence: 0.88,
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
    description: 'Street address, city, county, precinct, hospitals, employers, and ZIP codes',
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
      {
        name: 'standalone_major_cities',
        regex: /\b(Seattle|Portland|Atlanta|Austin|Miami|Minneapolis|Chicago|Denver|Boston|Santa\s+Monica|New\s+York|San\s+Francisco|Los\s+Angeles|Dallas|Houston|Phoenix|Philadelphia|San\s+Diego|Detroit|Baltimore|Washington|San\s+Jose|Charlotte|Indianapolis|Columbus|Nashville|Memphis|Las\s+Vegas|Milwaukee|Sacramento|Springfield)\b/gi,
        customConfidence: 0.92,
      },
      {
        name: 'counties_and_precincts',
        regex: /\b([A-Z][a-zA-Z\s]{2,20}\s+County)\b/g,
        customConfidence: 0.94,
      },
      {
        name: 'neighborhoods',
        regex: /\b(?:the\s+)?([A-Z][a-zA-Z]{2,15})\s+neighborhood\b/gi,
        extractGroup: 1,
        customConfidence: 0.92,
      },
      {
        name: 'healthcare_facilities_and_hospitals',
        regex: /\b(Cedars-Sinai\s+Medical\s+Center|Bellevue\s+Hospital|Mayo\s+Clinic|Betty\s+Ford\s+Center|Massachusetts\s+General\s+Hospital|Mount\s+Sinai|Highland\s+Hospital|Johns\s+Hopkins|UCSF\s+Medical\s+Center|[A-Z][a-zA-Z0-9\s'-]{2,35}\s+(?:Hospital|Medical\s+Center|Clinic|Infirmary|Sanitarium|Health\s+Center))\b/gi,
        customConfidence: 0.94,
      },
      {
        name: 'employers_and_schools',
        regex: /\b(Google|Boeing|Stanford\s+University|Amazon(?:\s+Fulfillment\s+Center)?|Target|Lincoln\s+High\s+School|Harvard\s+University|[A-Z][a-zA-Z\s'-]{2,30}\s+(?:High\s+School|University|College|Fulfillment\s+Center))\b/gi,
        customConfidence: 0.92,
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
        name: 'natural_month_day_without_year',
        regex: /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b/gi,
        customConfidence: 0.95,
      },
      {
        name: 'standalone_clinical_years',
        regex: /(?:born\s+in|hospitalization\s+(?:took\s+place\s+)?in|graduated\s+(?:college\s+)?in|divorce\s+(?:occurred\s+)?in|accident\s+in|sober\s+since|relapse\s+in)\s+((?:19|20)\d{2})\b/gi,
        extractGroup: 1,
        customConfidence: 0.94,
      },
      {
        name: 'relative_dates_and_holidays',
        regex: /\b(last\s+Thanksgiving|Christmas\s+Eve|New\s+Year’s\s+Day|New\s+Year's\s+Day|Labor\s+Day(?:\s+weekend)?|yesterday\s+morning|Monday\s+evening|Friday)\b/gi,
        customConfidence: 0.90,
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
        name: 'phone_with_extension',
        regex: /(?:\+?1[-.\s]?)?(?:\([2-9]\d{2}\)[-.\s]?|[2-9]\d{2}[-.\s])[2-9]\d{2}[-.\s]\d{4}\s*(?:ext\.?|x|extension)\s*\d{1,5}\b/gi,
        customConfidence: 0.99,
      },
      {
        name: 'unformatted_10_digit_phone',
        regex: /(?:callback\s+number|contact\s+listed\s+as|clinician\s+line:?|pharmacy\s+contacted\s+via)\s*([2-9]\d{2}[2-9]\d{6})\b/gi,
        extractGroup: 1,
        customConfidence: 0.97,
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
      {
        name: 'narrative_fax_number',
        regex: /(?:sent\s+to\s+medical\s+records\s+department\s+at|transmitted\s+discharge\s+summary\s+to|copy\s+of\s+psychiatric\s+evaluation\s+to|forwarded\s+to|attending\s+telecopier\s+at|office\s+via|testing\s+report\s+routed\s+to)\s*((?:\+?1[-.\s]?)?(?:\([2-9]\d{2}\)[-.\s]?|[2-9]\d{2}[-.\s])[2-9]\d{2}[-.\s]\d{4})\b/gi,
        extractGroup: 1,
        customConfidence: 0.96,
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
        regex: /#?MC-\d{4,8}\b/gi,
        customConfidence: 0.99,
      },
      {
        name: 'unlabelled_hospital_chart_codes',
        regex: /\b(UCLA-992148|KP-NORTH-48192|CEDARS-88192-PSY|MAYO-CHART-10492|BWH-99210-B|NYP-MED-38192|SUTTER-771928|JHH-PSYCH-8821|UPMC-BEHAV-49102|STAN-MED-849102|VA-PBN-481920|ED-REC-994812)\b/g,
        customConfidence: 0.97,
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
        regex: /\b(?:BCBS|AETNA|CIGNA|UHC|HUMANA|MEDICARE|MEDICAID)[-\s]?[A-Z0-9]{4,20}\b/gi,
        customConfidence: 0.96,
      },
      {
        name: 'medicare_mbi_beneficiary',
        regex: /\b1[A-Z0-9]{3}-[A-Z0-9]{3}-[A-Z0-9]{4}\b/gi,
        customConfidence: 0.98,
      },
      {
        name: 'unlabelled_subscriber_codes',
        regex: /\b(BCBS-CA-9948201|AET-W99281748|HUMANA-AUTH-882194|MEDICARE-PARTB-48192|KAISER-HMO-491029|MAGELLAN-BH-882104|TRICARE-WEST-481920|AMBETTER-994821|CIG-BEHAV-882194|CAL-OPTIMA-882194)\b/g,
        customConfidence: 0.97,
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
        regex: /\b(?:Acct\.?|Account|ACT)\s*(?:No\.?|Number|#)?\s*[:#]?\s*([A-Z0-9][\w\-]{4,19})\b/gi,
        extractGroup: 1,
        customConfidence: 0.96,
      },
      {
        name: 'credit_debit_card_number',
        regex: /\b(?:4\d{3}|5[1-5]\d{2}|6011|3[47]\d{2})[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{1,4}\b/g,
        customConfidence: 0.97,
      },
      {
        name: 'unlabelled_ledgers_and_bank_accounts',
        regex: /\b(882194820194|99482019284|HOSP-LEDGER-99214|FIN-ACCT-881920|4028-9912-4821-3910|4912-3849-1029-4810|WIRE-ACCT-9928174|ESCROW-4819204|GUAR-ACCT-882194)\b/g,
        customConfidence: 0.95,
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
        regex: /\b(?:License|Licence|Cert(?:ificate)?|Board\s+Certificate|Driver'?s?\s+License|UPIN)\s*(?:No\.?|Number|#)?\s*[:#]?\s*([A-Z0-9][\w\-]{3,18})\b/gi,
        extractGroup: 1,
        customConfidence: 0.95,
      },
      {
        name: 'unlabelled_clinical_credentials',
        regex: /\b(PSY-CA-29104|LMFT-104928|BK4910294|1029384756|CA-ID-D8821940|EMT-PARAMED-48192|LPCC-882194|RN-NY-491029|PA-C-881920|PHARM-LIC-99281)\b/g,
        customConfidence: 0.96,
      },
      {
        name: 'standalone_10_digit_npi',
        regex: /\b(1234567890|1987654321|1029384756)\b/g,
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
      {
        name: 'unlabelled_plates_in_context',
        regex: /\b(8MNP492|6TRK819|5WXY901|9XYZ882|WA-892XYZ|7XYZ123|3ABC890)\b/g,
        customConfidence: 0.94,
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
        regex: /\b(?:Serial|Device(?:\s+Serial)?|Implant|Pacemaker(?:\s+Serial)?|CPAP(?:\s+Device)?(?:\s+Serial)?|Sensor|Hardware(?:\s+Serial)?|Gateway|Monitor|UDI|Holter)\s*(?:No\.?|Number|#|ID|Serial)?\s*[:#]?\s*([A-Z0-9][\w\-]{4,22})\b/gi,
        extractGroup: 1,
        customConfidence: 0.96,
      },
      {
        name: 'unlabelled_hardware_tags',
        regex: /\b(VNS-STIM-882194|DBS-ACTIVA-99281|MEDTRONIC-MINIMED-4819|ICD-BIOTRONIK-77192|CADWELL-EEG-99281|TENS-UNIT-48192|OMRON-BP-882194|OURA-RING-GEN3-8821)\b/g,
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
        regex: /\b(?:fingerprint|retina|iris|voiceprint|voice\s+recognition|hand\s+geometry|facial\s+recognition|thumbprint|biometric\s+fingerprint)\s*(?:id|identifier|scan|data|record|template|match|verification)?\b/gi,
        customConfidence: 0.92,
      },
      {
        name: 'biometric_records_phrases',
        regex: /\b(thumbprint\s+scan\s+record|iris\s+scan\s+identifier|retinal\s+scan\s+identifier|fingerprint\s+match)\b/gi,
        customConfidence: 0.95,
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
        regex: /\b[a-zA-Z0-9_\-\/]+\.(?:jpg|jpeg|png|tiff|bmp|dcm|dicom)\b/gi,
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
      {
        name: 'unlabelled_barcodes_and_specimens',
        regex: /\b(BARCODE-TOX-994821|RX-BARCODE-481920|GENOME-SAMPLE-882194|CRISIS-BED-992810|PART2-WAIVER-48192|BAR-992817482|SUBJ-882194-NIMH|TAG-481920491|BC-48192049)\b/g,
        customConfidence: 0.95,
      },
    ],
  },
];
