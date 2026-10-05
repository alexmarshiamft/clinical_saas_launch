import { Patient } from '@/lib/clinical-context';

export function getActivePatientSample(patient: Patient): string {
  return `${patient.name} (DOB: ${patient.dob}) presented for CPT ${patient.cptCode} psychotherapy. Patient phone: (415) 555-0199.`;
}

export const PRESET_FULL_18 = `CLINICAL CONSULTATION & ADMISSION SUMMARY
================================================================================
Patient Name: Jane Elizabeth Doe                          DOB: 03/14/1932 (Age 94)
MRN: 00734821                                            SSN: 123-45-6789
Phone: (555) 867-5309                                    Fax: 555-234-5678
Email: jane.doe@healthmail.org                           Health Plan ID: BCBS-XY9812345
Account Number: ACCT-9918274                             Credit Card: 4111-2222-3333-4444

Attending Physician: Dr. Michael R. Chen, MD             NPI: 1234567890
Referring Physician: Dr. Patricia O'Sullivan             DEA License: AS1234563
Driver's License: DL-CA-98127419                         Vehicle VIN: 1HGBH41JXMN109186

Admission Date: January 14, 2026                         Discharge Date: 01/17/2026
Service Encounter Date: 2026-01-14

Residence Address: 742 Evergreen Terrace, Springfield, IL 62704-1234
IP Address of Telehealth Session: 192.168.1.42
Patient Portal URL: https://portal.health-system.com/patient/78423

Device Details: Medtronic Pacemaker Serial # DEV-789-XYZ-001 (UDI: 00888444111222)
Biometric Verification: Voiceprint biometric voice recognition match confirmed at 09:15 AM.
Clinical Imagery: Full-face photographic image archived at /records/photos/doe_jane_2026.jpg.
Unique Tracking Tag: Barcode UID # BIO-REF-99281-XYZ.

CLINICAL IMPRESSION:
The 94-year-old female presents with acute shortness of breath and episodic tachycardia.
Dictated by Dr. Michael R. Chen at St. Jude Memorial Hospital on 01/15/2026.`;

export const PRESET_INTAKE_NOTE = `OUTPATIENT PSYCHIATRIC INTAKE NOTE
================================================================================
Client: Robert 'Bob' Vance                               DOB: 11/04/1984
Primary Phone: 212-555-0199                              Emergency Contact: 212-555-0144
Email: bob.vance@refrigeration.com                       Member ID: AETNA-W9928174

Address: 404 Industrial Way, Scranton, PA 18503
Primary Clinician: Dr. Linda Freeman, PsyD               NPI: 9876543210
Encounter Date: October 28, 2025
Prior Hospitalization: 05/12/2019 at Scranton Regional Medical Center (MRN 883921).

CHIEF COMPLAINT:
Client self-refers following increased panic attacks while driving company truck (License Plate: 7XYZ89).
Reports high stress regarding pending tax audit (SSN: 987-65-4321).`;

export const PRESET_TELEHEALTH_TELEMETRY = `REMOTE PATIENT MONITORING (RPM) TELEMETRY LOG
================================================================================
Transmission Timestamp: 2026-02-10T14:32:00Z
Gateway Device Serial Number: SN-GW-9948271
Cardiac Holter Monitor ID: HOLTER-MED-771239
Patient Identifier: PT-99201-B                           SSN: 123-45-6789
Home Hub IP Address: 10.0.4.155                          Firmware Host: https://telemetry.sync-health.io/v2/stream

Telemetry originated from subscriber: Alice M. Walker, 12 Elm Court, Austin, TX 78701.
Clinician on call: Dr. Aaron Hayes (Cell: 512-555-8833).`;
