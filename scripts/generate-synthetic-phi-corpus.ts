import fs from 'node:fs';
import path from 'node:path';

export interface GoldStandardEntity {
  text: string;
  category: string;
  ruleId: string;
  start: number;
  end: number;
  isStructured: boolean;
  difficulty: 'easy_structured' | 'hard_unstructured';
}

export interface GoldStandardSnippet {
  id: string;
  categoryPrimary: string;
  text: string;
  expected_entities: GoldStandardEntity[];
}

// Helper to assemble text with annotations
function buildSnippet(
  id: string,
  categoryPrimary: string,
  prefix: string,
  entityText: string,
  suffix: string,
  ruleId: string,
  category: string,
  isStructured: boolean,
  extraEntities: Array<{ text: string; ruleId: string; category: string; isStructured: boolean }> = []
): GoldStandardSnippet {
  const fullText = `${prefix}${entityText}${suffix}`;
  const start = prefix.length;
  const end = start + entityText.length;

  const expected_entities: GoldStandardEntity[] = [
    {
      text: entityText,
      category,
      ruleId,
      start,
      end,
      isStructured,
      difficulty: isStructured ? 'easy_structured' : 'hard_unstructured',
    },
  ];

  // Scan extra entities if any
  for (const extra of extraEntities) {
    let searchFrom = 0;
    let idx = fullText.indexOf(extra.text, searchFrom);
    while (idx !== -1) {
      // avoid exact duplicate start/end
      if (!expected_entities.some((e) => e.start === idx && e.end === idx + extra.text.length)) {
        expected_entities.push({
          text: extra.text,
          category: extra.category,
          ruleId: extra.ruleId,
          start: idx,
          end: idx + extra.text.length,
          isStructured: extra.isStructured,
          difficulty: extra.isStructured ? 'easy_structured' : 'hard_unstructured',
        });
        break;
      }
      searchFrom = idx + 1;
      idx = fullText.indexOf(extra.text, searchFrom);
    }
  }

  // Sort by start
  expected_entities.sort((a, b) => a.start - b.start);

  return {
    id,
    categoryPrimary,
    text: fullText,
    expected_entities,
  };
}

export function generateCorpus(): GoldStandardSnippet[] {
  const snippets: GoldStandardSnippet[] = [];
  let count = 0;
  const nextId = (prefix: string) => `${prefix}-${String(++count).padStart(3, '0')}`;

  // ==========================================
  // CATEGORY 1: NAMES (35 snippets)
  // Easy structured vs Hard unstructured
  // ==========================================
  // Structured
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Clinical intake note. Patient Name: ', 'Jonathan Higgins', ', presenting with acute insomnia.', 'NAME', 'Names', true));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Emergency evaluation. Pt: ', 'Maria Santos', ', accompanied by spouse.', 'NAME', 'Names', true));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Intake completed by Dr. ', 'Sarah Chen, MD', ' at outpatient clinic.', 'NAME', 'Names', true));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Primary Clinician: ', 'Robert Zimmerman, LCSW', ' reviewed treatment plan.', 'NAME', 'Names', true));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Client Name: ', 'Arthur Pendelton Jr', ' signed telehealth consent.', 'NAME', 'Names', true));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Signed by Attending: ', 'Victoria Sterling, PhD', ' following diagnostic interview.', 'NAME', 'Names', true));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Resident: ', 'Benjamin Vance', ' reports improvement with CBT homework.', 'NAME', 'Names', true));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Dictated by: ', 'Marcus Aurelius Brooks, DO', ' on evening rounds.', 'NAME', 'Names', true));

  // Hard unstructured: Unlabeled full names
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'During the 50-minute session, ', 'Jonathan Higgins', ' discussed his grief regarding the sudden loss of his brother.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'On physical exam, ', 'Elizabeth Montgomery', ' exhibited psychomotor slowing and flat affect.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Collateral interview was conducted with ', 'Gregory House', ' regarding observed confusion.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Today ', 'Alexander Marshi', ' participated in behavioral activation exercises.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Therapist reviewed homework logs submitted by ', 'Rachel Green-Geller', ' prior to session.', 'NAME', 'Names', false));

  // Hard unstructured: First names only
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'When asked about recent panic attacks, ', 'Sarah', ' reported that crowds trigger hyperventilation.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Client stated that ', 'Michael', ' has been distant and argumentative since last Friday.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Phone check-in with ', 'David', ' regarding medication adherence and side effects.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Patient lives with her mother ', 'Elena', ' who assists with meal preparation.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Therapist observed that ', 'Christopher', ' appeared restless and avoided eye contact.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Session focused on conflict between patient and partner ', 'Jessica', ' over financial decisions.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Spoke briefly with patient daughter ', 'Hannah', ' to confirm discharge transportation.', 'NAME', 'Names', false));

  // Hard unstructured: Accented & hyphenated names
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Intake session for ', 'José García', ' focusing on adjustment disorder following relocation.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Chart notes for ', 'Renée Müller', ' indicate satisfactory response to sertraline.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Patient identified as ', 'François Dubois', ', presenting with chronic fatigue and anhedonia.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Met with ', 'Ana-María Velásquez', ' to establish treatment goals for PTSD.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Psychiatric evaluation for ', 'Jean-Luc Picard', ' following acute occupational burnout.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Follow-up encounter with ', 'Chloë O’Connor', ' regarding social anxiety in collegiate settings.', 'NAME', 'Names', false));

  // Hard unstructured: Lowercase names in narrative
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'session opened with ', 'david smith', ' expressing worry about upcoming quarterly review.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'telehealth check-in: ', 'sarah jenkins', ' logged in from workplace parking lot.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'clinician noted that ', 'marcus vance', ' has missed two consecutive somatic tracking sessions.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'crisis plan reviewed with ', 'emily watson', ' after brief panic episode.', 'NAME', 'Names', false));

  // Family / Relatives / Unlabeled third parties
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Patient reports that his uncle ', 'Walter White', ' recently passed away.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Collateral call placed to employer supervisor ', 'Franklin Richards', ' for disability verification.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Emergency contact listed as sibling ', 'Claire Redfield', ', residing out of state.', 'NAME', 'Names', false));
  snippets.push(buildSnippet(nextId('NAME'), 'Names', 'Patient expressed guilt over recent dispute with cousin ', 'Mateo Hernandez', ' regarding inheritance.', 'NAME', 'Names', false));

  // ==========================================
  // CATEGORY 2: GEOGRAPHIC SUBDIVISIONS (30 snippets)
  // Street addresses, City+State+Zip vs Cities, Counties, Hospitals, Employers
  // ==========================================
  // Structured Street + City/State/Zip
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Patient resides at ', '742 Evergreen Terrace', ', Springfield, OR 97477.', 'GEOGRAPHIC', 'Geographic Subdivisions', true, [
    { text: 'Springfield, OR 97477', ruleId: 'GEOGRAPHIC', category: 'Geographic Subdivisions', isStructured: true },
  ]));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Mailing Address: ', '1048 West Elm Street', ', Apt 4B, Chicago, IL 60614.', 'GEOGRAPHIC', 'Geographic Subdivisions', true, [
    { text: 'Chicago, IL 60614', ruleId: 'GEOGRAPHIC', category: 'Geographic Subdivisions', isStructured: true },
  ]));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Billing location verified as ', '1200 Beacon Boulevard', ', Boston, MA 02115.', 'GEOGRAPHIC', 'Geographic Subdivisions', true, [
    { text: 'Boston, MA 02115', ruleId: 'GEOGRAPHIC', category: 'Geographic Subdivisions', isStructured: true },
  ]));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Emergency dispatch sent to ', '452 Ocean Avenue', ', Santa Monica, CA 90401.', 'GEOGRAPHIC', 'Geographic Subdivisions', true, [
    { text: 'Santa Monica, CA 90401', ruleId: 'GEOGRAPHIC', category: 'Geographic Subdivisions', isStructured: true },
  ]));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Patient lives at ', '8910 Mountain View Road', ', Denver, CO 80202.', 'GEOGRAPHIC', 'Geographic Subdivisions', true, [
    { text: 'Denver, CO 80202', ruleId: 'GEOGRAPHIC', category: 'Geographic Subdivisions', isStructured: true },
  ]));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Client relocated to ', '90210', ' earlier this spring.', 'GEOGRAPHIC', 'Geographic Subdivisions', true));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Residence ZIP code: ', '30303', ' confirmed during intake.', 'GEOGRAPHIC', 'Geographic Subdivisions', true));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Home Address: 55 Wall Street, New York, NY 10005', '55 Wall Street, New York, NY 10005', '', 'GEOGRAPHIC', 'Geographic Subdivisions', true));

  // Hard unstructured: Cities alone without state/zip
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Client recently moved from ', 'Seattle', ' to start a new job in marketing.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Patient reports that severe agoraphobia prevents her from driving across ', 'Portland', ' for appointments.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Travel history: client experienced panic attack during flight to ', 'Atlanta', ' last week.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Patient is currently living in temporary housing in ', 'Austin', ' after losing apartment.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Follow-up will occur remotely while client visits family in ', 'Miami', ' next month.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Client works remotely from home in ', 'Minneapolis', ' and reports isolation.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));

  // Hard unstructured: Counties, Precincts, Neighborhoods
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Court-mandated treatment supervised by probation officer in ', 'Cook County', '.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Social worker conducted home safety assessment in ', 'Orange County', '.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Patient resides in ', 'Maricopa County', ' and receives local community health subsidies.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Encounter occurred at client residence in the ', 'Ballard', ' neighborhood.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Client was hospitalized in ', 'King County', ' following acute suicidal crisis in 2022.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));

  // Hard unstructured: Hospitals, Clinics, Facilities (Geographic Safe Harbor subset)
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Client was previously admitted to ', 'Cedars-Sinai Medical Center', ' for observation.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Records requested from psychiatric inpatient unit at ', 'Bellevue Hospital', '.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Referred by attending physician at ', 'Mayo Clinic', ' for specialized DBT.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Past detoxification completed at ', 'Betty Ford Center', ' in 2021.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Transfer evaluation received from ', 'Massachusetts General Hospital', '.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));

  // Hard unstructured: Employers & Universities (Geographic identifier under HIPAA)
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Patient experiences extreme performance anxiety working as software engineer at ', 'Google', '.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Occupational stressor: client recently laid off from ', 'Boeing', ' after 15 years.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Patient is currently a full-time undergraduate sophomore at ', 'Stanford University', '.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Shift work at ', 'Amazon Fulfillment Center', ' severely exacerbates circadian disruption.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'Client reports workplace harassment while employed at ', 'Target', ' retail store.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));
  snippets.push(buildSnippet(nextId('GEOG'), 'Geographic Subdivisions', 'High school senior attending ', 'Lincoln High School', ' struggling with attendance.', 'GEOGRAPHIC', 'Geographic Subdivisions', false));

  // ==========================================
  // CATEGORY 3: DATES & AGES 90+ (30 snippets)
  // Standard dates, naturally expressed dates, ages 90+, standalone years
  // ==========================================
  // Structured MM/DD/YYYY & ISO dates
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Patient date of birth: ', '04/12/1988', ', verified during registration.', 'DATE', 'Dates', true));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Encounter occurred on ', '2024-03-15', ' via secure telehealth.', 'DATE', 'Dates', true));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Hospital discharge date documented as ', '11/28/2023', '.', 'DATE', 'Dates', true));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Next scheduled follow-up: ', '08/04/2025', ' at 2:00 PM.', 'DATE', 'Dates', true));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Treatment plan anniversary date: ', '2025-10-01', '.', 'DATE', 'Dates', true));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Intake evaluation completed on ', 'January 14, 2024', '.', 'DATE', 'Dates', true));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Prior suicide attempt occurred on ', '15 October 2022', ' per psychiatric history.', 'DATE', 'Dates', true));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Medication changed on ', 'Dec 5, 2023', ' due to gastrointestinal intolerance.', 'DATE', 'Dates', true));

  // Structured Ages 90+
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Patient is a ', '92-year-old', ' retired schoolteacher presenting with mild cognitive decline.', 'DATE', 'Dates', true));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Clinical assessment of ', '95 y/o', ' female residing in assisted living.', 'DATE', 'Dates', true));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Geriatric consultation for ', '101 years old', ' male experiencing sleep fragmentation.', 'DATE', 'Dates', true));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Patient age: ', '94 yo', ' with supportive caregiver present.', 'DATE', 'Dates', true));

  // Hard unstructured: Natural dates without years
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Client stated that depressive episode began abruptly on ', 'October 14th', ' following marital separation.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Last self-harm incident occurred on ', 'March 3rd', ' using superficial cutting.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Follow-up appointment booked for ', 'June 22', ' at outpatient clinic.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Patient reported panic attack at concert on ', 'August 9th', '.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Sober since ', 'May 1st', ', attending 12-step meetings weekly.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Client missed previous appointment on ', 'February 18', ' due to car trouble.', 'DATE', 'Dates', false));

  // Hard unstructured: Standalone birth/event years
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Patient was born in ', '1974', ' in Michigan and reports chaotic childhood.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'First psychiatric hospitalization took place in ', '1998', ' following manic episode.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Client graduated college in ', '2016', ' and relocated to California.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Parental divorce occurred in ', '2005', ', contributing to attachment insecurity.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Motor vehicle accident in ', '2019', ' precipitated ongoing PTSD symptoms.', 'DATE', 'Dates', false));

  // Hard unstructured: Natural language relative dates
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Client reported insomnia started on ', 'last Thanksgiving', ' after family argument.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Patient experienced severe anxiety around ', 'Christmas Eve', ' due to isolation.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Relapse with alcohol on ', 'New Year’s Day', ' following party.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Symptoms escalated around ', 'Labor Day weekend', ' during transition to college.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Saw primary care physician on ', 'yesterday morning', ' for blood work.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Client reported crying spell on ', 'Monday evening', ' after receiving performance appraisal.', 'DATE', 'Dates', false));
  snippets.push(buildSnippet(nextId('DATE'), 'Dates', 'Agreed to practice grounding skills by ', 'Friday', ' before next session.', 'DATE', 'Dates', false));

  // ==========================================
  // CATEGORY 4: TELEPHONE NUMBERS (20 snippets)
  // Formatted, unformatted, extensions, international
  // ==========================================
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Primary Phone: ', '(415) 555-0192', ', client prefers text reminders.', 'PHONE', 'Telephone Numbers', true));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Emergency Contact Tel: ', '206-555-0144', ' (spouse cell).', 'PHONE', 'Telephone Numbers', true));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Therapist reached client at ', '312.555.0188', ' following missed session.', 'PHONE', 'Telephone Numbers', true));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Mobile: ', '+1-800-555-0199', ' listed on face sheet.', 'PHONE', 'Telephone Numbers', true));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Cell phone: ', '617-555-0123', ' verified with client.', 'PHONE', 'Telephone Numbers', true));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Client left voicemail from ', '(212) 555-0177', ' requesting prescription refill.', 'PHONE', 'Telephone Numbers', true));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Home phone number: ', '503-555-0165', ', voicemail left.', 'PHONE', 'Telephone Numbers', true));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Clinician called ', '+1 (650) 555-0131', ' to conduct crisis check.', 'PHONE', 'Telephone Numbers', true));

  // Hard unstructured: Unformatted phone numbers without punctuation
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Client provided callback number ', '4155550192', ' during triage call.', 'PHONE', 'Telephone Numbers', false));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Spouse contact listed as ', '2065550188', ' in intake paperwork.', 'PHONE', 'Telephone Numbers', false));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Direct clinician line: ', '9175550143', ' provided for urgent coordination.', 'PHONE', 'Telephone Numbers', false));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Pharmacy contacted via ', '3035550199', ' regarding escitalopram refill.', 'PHONE', 'Telephone Numbers', false));

  // Hard unstructured: Phone numbers with extensions
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Work number provided: ', '(415) 555-0199 ext. 402', ' for daytime messages.', 'PHONE', 'Telephone Numbers', false));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Employer HR department reached at ', '800-555-0122 x104', '.', 'PHONE', 'Telephone Numbers', false));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Clinic reception: ', '212-555-0180 extension 12', ' for billing inquiries.', 'PHONE', 'Telephone Numbers', false));

  // Hard unstructured: Embedded in prose without labels
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Client told therapist to text him at ', '510-555-0142', ' if the link fails.', 'PHONE', 'Telephone Numbers', false));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'I received a message from ', '(718) 555-0166', ' stating she was running late.', 'PHONE', 'Telephone Numbers', false));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Please return call to ', '310-555-0183', ' regarding laboratory results.', 'PHONE', 'Telephone Numbers', false));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Patient dialed crisis hotline at ', '800-273-8255', ' during severe distress.', 'PHONE', 'Telephone Numbers', false));
  snippets.push(buildSnippet(nextId('PHONE'), 'Telephone Numbers', 'Collateral call made to ', '(619) 555-0112', ' to speak with psychiatrist.', 'PHONE', 'Telephone Numbers', false));

  // ==========================================
  // CATEGORY 5: FAX NUMBERS (15 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Records requested via Fax: ', '415-555-0190', '.', 'FAX', 'Fax Numbers', true));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Clinic Facsimile: ', '(206) 555-0182', ', attention medical records.', 'FAX', 'Fax Numbers', true));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'FX: ', '312-555-0174', ' sent to insurance pre-authorization department.', 'FAX', 'Fax Numbers', true));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Confidential Fax: ', '617-555-0139', ' for psychiatry records release.', 'FAX', 'Fax Numbers', true));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Faxed treatment summary to ', '212-555-0191', ' per patient authorization.', 'FAX', 'Fax Numbers', true));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Primary Care Provider Fax: ', '(503) 555-0140', '.', 'FAX', 'Fax Numbers', true));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Facsimile number: ', '+1-800-555-0145', ' confirmed with pharmacy.', 'PHONE', 'Telephone Numbers', true)); // Can trigger phone or fax
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Fax: ', '917-555-0162', ' transmitted at 14:30.', 'FAX', 'Fax Numbers', true));

  // Hard unstructured: Fax in prose without "Fax:" label
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Transmission sent to medical records department at ', '415-555-0189', ' (telecopier line).', 'FAX', 'Fax Numbers', false));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Clinician transmitted discharge summary to ', '(206) 555-0155', ' via secure e-fax.', 'FAX', 'Fax Numbers', false));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Sent copy of psychiatric evaluation to ', '310-555-0173', ' for disability determination.', 'FAX', 'Fax Numbers', false));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Documentation forwarded to ', '503-555-0128', ' at county mental health court.', 'FAX', 'Fax Numbers', false));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Treatment coordination sent to attending telecopier at ', '617-555-0198', '.', 'FAX', 'Fax Numbers', false));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Records forwarded to physician office via ', '800-555-0134', '.', 'FAX', 'Fax Numbers', false));
  snippets.push(buildSnippet(nextId('FAX'), 'Fax Numbers', 'Psychological testing report routed to ', '(718) 555-0119', '.', 'FAX', 'Fax Numbers', false));

  // ==========================================
  // CATEGORY 6: EMAIL ADDRESSES (15 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Patient Email: ', 'jane.doe@gmail.com', ', portal invitation sent.', 'EMAIL', 'Email Addresses', true));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Contact email: ', 'robert.smith1984@yahoo.com', ' on registration file.', 'EMAIL', 'Email Addresses', true));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Supervising clinician: ', 'dr.chen@clinicalhealth.org', ' reviewed case notes.', 'EMAIL', 'Email Addresses', true));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Emergency collateral: ', 'm.higgins_family@outlook.com', '.', 'EMAIL', 'Email Addresses', true));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Billing coordinator: ', 'billing@theraflowsystems.com', ' sent claim receipt.', 'EMAIL', 'Email Addresses', true));

  // Hard unstructured: Mixed case, institutional subdomains, prose context
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Client requested that homework worksheets be forwarded to ', 'Alexander.Marshi@med.stanford.edu', '.', 'EMAIL', 'Email Addresses', false));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Discharge coordinator reached via ', 'counseling-services@subdomain.ucsf.health', ' for aftercare placement.', 'EMAIL', 'Email Addresses', false));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Patient emailed therapist at ', 'support+intake_992@therapyprovider.io', ' describing acute panic symptoms.', 'EMAIL', 'Email Addresses', false));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Send clinical summary directly to ', 'MARIA_SANTOS_1990@HOTMAIL.COM', ' per signed consent.', 'EMAIL', 'Email Addresses', false));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Parent contact confirmed as ', 'john.q.public.sr@alumni.harvard.edu', ' for minor patient check-in.', 'EMAIL', 'Email Addresses', false));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Client reported phishing email received at ', 'sarah-jenkins88@icloud.com', '.', 'EMAIL', 'Email Addresses', false));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'EAP referral coordinator: ', 'eap_referrals@boeing.corp.internal', ' authorized 6 sessions.', 'EMAIL', 'Email Addresses', false));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Follow-up email dispatched to ', 'david_k_vance@protonmail.ch', ' with crisis safety plan.', 'EMAIL', 'Email Addresses', false));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Insurance authorization received from ', 'appeals@bcbs-california.com', ' granting coverage.', 'EMAIL', 'Email Addresses', false));
  snippets.push(buildSnippet(nextId('EMAIL'), 'Email Addresses', 'Client stated her primary inbox is ', 'emily.rose.watson@me.com', ' for telehealth links.', 'EMAIL', 'Email Addresses', false));

  // ==========================================
  // CATEGORY 7: SOCIAL SECURITY NUMBERS (15 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Patient SSN: ', '123-45-6789', ', verified against insurance card.', 'SSN', 'Social Security Numbers', true));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Social Security Number: ', '456-78-9012', ' on disability application.', 'SSN', 'Social Security Numbers', true));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'SSN# ', '987-65-4321', ' documented on Medicaid enrollment form.', 'SSN', 'Social Security Numbers', true));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Verified SSN: ', '321-65-4987', ' for state vocational rehabilitation subsidy.', 'SSN', 'Social Security Numbers', true));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Patient Social Security: ', '555-12-3456', ' entered into hospital billing database.', 'SSN', 'Social Security Numbers', true));

  // Hard unstructured: Space-separated, unpunctuated, unlabeled in prose
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Patient provided government identifier ', '219 45 8821', ' during financial screening.', 'SSN', 'Social Security Numbers', false));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Intake coordinator recorded nine-digit tax number ', '401-88-2194', ' on intake packet.', 'SSN', 'Social Security Numbers', false));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Federal benefit verification lists recipient number ', '312-99-4018', ' for supplemental security income.', 'SSN', 'Social Security Numbers', false));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Patient recalled her identification number as ', '602-11-9482', ' when asked by registrar.', 'SSN', 'Social Security Numbers', false));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Tax ID documented for client: ', '184-72-9014', ' on financial assistance affidavit.', 'SSN', 'Social Security Numbers', false));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Client refused to provide full social, stating last four digits are connected to ', '481-29-3019', '.', 'SSN', 'Social Security Numbers', false));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Hospital face sheet records taxpayer identifier ', '519-38-2041', ' under patient demographics.', 'SSN', 'Social Security Numbers', false));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'State disability claims filed under SSN ', '294-81-0492', ' following clinical evaluation.', 'SSN', 'Social Security Numbers', true));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'SSN: ', '109-28-3746', ' verified with Social Security Administration.', 'SSN', 'Social Security Numbers', true));
  snippets.push(buildSnippet(nextId('SSN'), 'Social Security Numbers', 'Identity verification confirmed matching record for ', '384-91-8273', '.', 'SSN', 'Social Security Numbers', false));

  // ==========================================
  // CATEGORY 8: MEDICAL RECORD NUMBERS (20 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Patient MRN: ', 'MRN-882194', ', charted in outpatient EHR.', 'MRN', 'Medical Record Numbers', true));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Medical Record Number: ', 'MC-90281-A', ' referenced on pathology order.', 'MRN', 'Medical Record Numbers', true));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Assigned hospital chart #', 'MC-48192', ' on acute admission.', 'MRN', 'Medical Record Numbers', true));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'MR# ', '9928172', ' linked to clinical psychology registry.', 'MRN', 'Medical Record Numbers', true));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Client Chart ID: ', 'MRN-104928', ' reviewed during multidisciplinary rounds.', 'MRN', 'Medical Record Numbers', true));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Medical Record #: ', '8819204', ' active in system.', 'MRN', 'Medical Record Numbers', true));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Hospital file: #', 'MC-12048', ' transferred to outpatient clinic.', 'MRN', 'Medical Record Numbers', true));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Encounter documented under MRN: ', 'MRN-391048', '.', 'MRN', 'Medical Record Numbers', true));

  // Hard unstructured: Hospital chart codes without "MRN:" prefix
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Records pulled from legacy archives under identifier ', 'UCLA-992148', ' for longitudinal review.', 'MRN', 'Medical Record Numbers', false));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Patient clinical file cataloged as ', 'KP-NORTH-48192', ' in regional Kaiser network.', 'MRN', 'Medical Record Numbers', false));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Prior psychiatric admission tracked as ', 'CEDARS-88192-PSY', ' in hospital registry.', 'MRN', 'Medical Record Numbers', false));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Cross-referenced encounter with inpatient tracking code ', 'MAYO-CHART-10492', '.', 'MRN', 'Medical Record Numbers', false));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Billing specialist matched encounter to patient file ', 'BWH-99210-B', ' for copay processing.', 'MRN', 'Medical Record Numbers', false));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Laboratory specimen flagged under chart tag ', 'NYP-MED-38192', '.', 'MRN', 'Medical Record Numbers', false));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Electronic health index references record ', 'SUTTER-771928', ' for medication reconciliation.', 'MRN', 'Medical Record Numbers', false));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Prior discharge summary cataloged under ', 'JHH-PSYCH-8821', ' at Johns Hopkins.', 'MRN', 'Medical Record Numbers', false));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Outpatient psychiatry tracking index: ', 'UPMC-BEHAV-49102', '.', 'MRN', 'Medical Record Numbers', false));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Clinical records released under chart code ', 'STAN-MED-849102', ' per patient request.', 'MRN', 'Medical Record Numbers', false));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'VA hospital file identified as ', 'VA-PBN-481920', ' in veteran database.', 'MRN', 'Medical Record Numbers', false));
  snippets.push(buildSnippet(nextId('MRN'), 'Medical Record Numbers', 'Emergency department triage file numbered ', 'ED-REC-994812', ' during crisis intake.', 'MRN', 'Medical Record Numbers', false));

  // ==========================================
  // CATEGORY 9: HEALTH PLAN BENEFICIARY NUMBERS (18 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Health Plan Member ID: ', 'BCBS-XY882194', ', deductible met for calendar year.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', true));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Insurance Policy Number: ', 'AETNA-99281729', ' requires pre-authorization.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', true));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Medicare Beneficiary ID: ', '1EG4-TE5-MK72', ' verified on CMS portal.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', true));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Coverage ID: ', 'CIGNA-881920491', ', copay $25 per psychotherapy encounter.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', true));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Medicaid ID Number: ', 'MEDICAID-9928104', ' active for mental health parity.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', true));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Policy #: ', 'UHC-8819204928', ' linked to optum behavioral health.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', true));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Claim Number: ', 'CLM-992817482', ' submitted for CPT 90837.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', true));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Insurance Group Number: ', 'GRP-881920', ' under employer benefit plan.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', true));

  // Hard unstructured: Carrier member IDs without "Member ID:" prefix
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Psychotherapy claims billed against subscriber policy ', 'BCBS-CA-9948201', '.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', false));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Patient insurance card displays subscriber code ', 'AET-W99281748', ' on front face.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', false));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Prior authorization approved by payer under reference ', 'HUMANA-AUTH-882194', '.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', false));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Secondary coverage verified under insurance account ', 'MEDICARE-PARTB-48192', '.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', false));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Client presented card for commercial policy ', 'KAISER-HMO-491029', ' during check-in.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', false));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Mental health parity claim routed to payer contract ', 'MAGELLAN-BH-882104', '.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', false));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Eligibility verified for TRICARE beneficiary under identifier ', 'TRICARE-WEST-481920', '.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', false));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Payer claims coordinator confirmed coverage for policy ', 'AMBETTER-994821', '.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', false));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Pre-certification granted under insurance docket ', 'CIG-BEHAV-882194', '.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', false));
  snippets.push(buildSnippet(nextId('HLTH'), 'Health Plan Numbers', 'Patient presented Medicaid HMO card bearing number ', 'CAL-OPTIMA-882194', '.', 'HEALTH_PLAN_NUM', 'Health Plan Numbers', false));

  // ==========================================
  // CATEGORY 10: ACCOUNT NUMBERS (15 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Patient Account Number: ', 'ACCT-88219-491', ', statement sent to collections.', 'ACCOUNT_NUM', 'Account Numbers', true));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Billing Account #: ', 'ACT-99281748', ' reflects zero outstanding balance.', 'ACCOUNT_NUM', 'Account Numbers', true));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Clinic Acct Number: ', 'ACC-48192048', ' linked to Stripe auto-pay.', 'ACCOUNT_NUM', 'Account Numbers', true));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Credit Card Number: ', '4111-2222-3333-4444', ' charged for $50 copay.', 'ACCOUNT_NUM', 'Account Numbers', true));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Mastercard: ', '5500-1122-3344-5566', ' on file for telehealth cancellations.', 'ACCOUNT_NUM', 'Account Numbers', true));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'American Express: ', '3782-822463-10005', ' billed for psychiatric evaluation.', 'ACCOUNT_NUM', 'Account Numbers', true));

  // Hard unstructured: Bank account numbers and payment ledger IDs
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Direct debit authorized from patient checking ledger ', '882194820194', ' for sliding-scale fee.', 'ACCOUNT_NUM', 'Account Numbers', false));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Client provided ACH routing code 121000358 and account ', '99482019284', ' for wire refund.', 'ACCOUNT_NUM', 'Account Numbers', false));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Hospital payment voucher processed under ledger ID ', 'HOSP-LEDGER-99214', '.', 'ACCOUNT_NUM', 'Account Numbers', false));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Patient self-pay deposit credited to internal ledger ', 'FIN-ACCT-881920', '.', 'ACCOUNT_NUM', 'Account Numbers', false));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Overpayment of $120 returned to client debit profile ', '4028-9912-4821-3910', '.', 'ACCOUNT_NUM', 'Account Numbers', false));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'HSA card debited for psychiatric follow-up: ', '4912-3849-1029-4810', '.', 'ACCOUNT_NUM', 'Account Numbers', false));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Wire transfer reference for private billing: ', 'WIRE-ACCT-9928174', '.', 'ACCOUNT_NUM', 'Account Numbers', false));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Third-party trustee issued payment from escrow account ', 'ESCROW-4819204', '.', 'ACCOUNT_NUM', 'Account Numbers', false));
  snippets.push(buildSnippet(nextId('ACCT'), 'Account Numbers', 'Guarantor payment profile cataloged under index ', 'GUAR-ACCT-882194', '.', 'ACCOUNT_NUM', 'Account Numbers', false));

  // ==========================================
  // CATEGORY 11: CERTIFICATE / LICENSE NUMBERS (18 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Attending Physician NPI: ', '1234567890', ', verified with NPPES.', 'LICENSE_NUM', 'Certificate / License Numbers', true));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'DEA License Number: ', 'AB1234567', ' authorized for schedule II prescriptions.', 'LICENSE_NUM', 'Certificate / License Numbers', true));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'State Medical License: ', 'C123456', ' issued by Medical Board of California.', 'LICENSE_NUM', 'Certificate / License Numbers', true));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Driver License Number: ', 'DL-W8821948', ' inspected for state residency.', 'LICENSE_NUM', 'Certificate / License Numbers', true));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'NPI: ', '1987654321', ' on CMS-1500 box 24J.', 'LICENSE_NUM', 'Certificate / License Numbers', true));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Provider License Number: ', 'LCSW-88219', ' in good standing.', 'LICENSE_NUM', 'Certificate / License Numbers', true));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'DEA #: ', 'XY9876543', ' on electronic prescription.', 'LICENSE_NUM', 'Certificate / License Numbers', true));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Board Certificate: ', 'CERT-992817', ' in Adult Psychiatry.', 'LICENSE_NUM', 'Certificate / License Numbers', true));

  // Hard unstructured: Clinical license numbers embedded without "NPI:" or "License:" prefix
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Supervising psychologist registered under professional credential ', 'PSY-CA-29104', '.', 'LICENSE_NUM', 'Certificate / License Numbers', false));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Therapist holds marriage and family therapy credential ', 'LMFT-104928', ' in Oregon.', 'LICENSE_NUM', 'Certificate / License Numbers', false));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Prescription routed under federal narcotics registration ', 'BK4910294', ' to local pharmacy.', 'LICENSE_NUM', 'Certificate / License Numbers', false));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Clinician billing credential verified via National Provider identifier ', '1029384756', '.', 'LICENSE_NUM', 'Certificate / License Numbers', false));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Client produced Department of Motor Vehicles identification ', 'CA-ID-D8821940', '.', 'LICENSE_NUM', 'Certificate / License Numbers', false));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Emergency medical technician credential on file as ', 'EMT-PARAMED-48192', '.', 'LICENSE_NUM', 'Certificate / License Numbers', false));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Professional clinical counselor authorized under credential ', 'LPCC-882194', '.', 'LICENSE_NUM', 'Certificate / License Numbers', false));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Registered nursing license cataloged under state roster as ', 'RN-NY-491029', '.', 'LICENSE_NUM', 'Certificate / License Numbers', false));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Physician assistant supervised under credential ', 'PA-C-881920', ' in psychiatry clinic.', 'LICENSE_NUM', 'Certificate / License Numbers', false));
  snippets.push(buildSnippet(nextId('LIC'), 'Certificate / License Numbers', 'Pharmacy board registration confirmed under permit ', 'PHARM-LIC-99281', '.', 'LICENSE_NUM', 'Certificate / License Numbers', false));

  // ==========================================
  // CATEGORY 12: VEHICLE IDENTIFIERS (15 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'Vehicle Identification Number: ', '1HGCR2F83HA123456', ', involved in rollover collision.', 'VEHICLE_ID', 'Vehicle Identifiers', true));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'VIN: ', '4S4BRBNC5H1234567', ' documented on auto trauma claim.', 'VEHICLE_ID', 'Vehicle Identifiers', true));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'Vehicle ID: ', '1FTFW1ED4KF123456', ' inspected by traffic investigator.', 'VEHICLE_ID', 'Vehicle Identifiers', true));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'License Plate: ', '7XYZ123', ' registered in California.', 'VEHICLE_ID', 'Vehicle Identifiers', true));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'Plate #: ', '3ABC890', ' noted on hospital security footage.', 'VEHICLE_ID', 'Vehicle Identifiers', true));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'VIN number: ', '2T1BR32E8FC123456', ' on vehicle insurance appraisal.', 'VEHICLE_ID', 'Vehicle Identifiers', true));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'State Plate: ', 'WA-892XYZ', ' parked in clinical garage.', 'VEHICLE_ID', 'Vehicle Identifiers', true));

  // Hard unstructured: VIN / Plate embedded without explicit keyword prefix
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'Patient driving a silver Toyota sedan chassis ', 'JT2BF22K1W0123456', ' experienced sudden panic.', 'VEHICLE_ID', 'Vehicle Identifiers', false));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'Automobile collision occurred while operating vehicle with 17-digit serial ', 'WAUZZZ8K0BA123456', '.', 'VEHICLE_ID', 'Vehicle Identifiers', false));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'Patient car identified in parking structure bearing tag ', '8MNP492', ' during wellness check.', 'VEHICLE_ID', 'Vehicle Identifiers', false));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'Security patrol logged client vehicle registration ', '6TRK819', ' outside outpatient clinic.', 'VEHICLE_ID', 'Vehicle Identifiers', false));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'Discharge escort accompanied patient to blue Honda civic displaying tag ', '5WXY901', '.', 'VEHICLE_ID', 'Vehicle Identifiers', false));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'Auto injury insurance liability tied to vehicle identification ', 'JM1BL1H54A1123456', '.', 'VEHICLE_ID', 'Vehicle Identifiers', false));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'Police welfare report references client pickup truck registration ', '9XYZ882', '.', 'VEHICLE_ID', 'Vehicle Identifiers', false));
  snippets.push(buildSnippet(nextId('VEH'), 'Vehicle Identifiers', 'Subaru outback involved in traumatic accident identified by chassis code ', '4S3BNAA69L1123456', '.', 'VEHICLE_ID', 'Vehicle Identifiers', false));

  // ==========================================
  // CATEGORY 13: DEVICE IDENTIFIERS (15 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Pacemaker Serial Number: ', 'PAC-882194-MD', ' implanted in 2021.', 'DEVICE_ID', 'Device Identifiers', true));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Medical Device Serial: ', 'SN-992817482', ' checked for electromagnetic interference.', 'DEVICE_ID', 'Device Identifiers', true));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'UDI Number: ', 'UDI-0100643169007222', ' logged in surgical record.', 'DEVICE_ID', 'Device Identifiers', true));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'CPAP Device Serial: ', 'CPAP-881920-RES', ' compliant with nocturnal pressure protocol.', 'DEVICE_ID', 'Device Identifiers', true));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Holter Monitor ID: ', 'HOLTER-99214', ' worn for 48 hours to evaluate palpitation.', 'DEVICE_ID', 'Device Identifiers', true));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Hardware Serial #: ', 'SN-48192049', ' on neurological stimulator.', 'DEVICE_ID', 'Device Identifiers', true));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Sensor ID: ', 'DEXCOM-G7-88219', ' transmitting continuous glucose telemetry.', 'DEVICE_ID', 'Device Identifiers', true));

  // Hard unstructured: Embedded without explicit "Serial Number:" prefix
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Vagus nerve stimulator model Cyberonics programmed to pulse rate using hardware tag ', 'VNS-STIM-882194', '.', 'DEVICE_ID', 'Device Identifiers', false));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Deep brain stimulation pulse generator cataloged under device inventory code ', 'DBS-ACTIVA-99281', '.', 'DEVICE_ID', 'Device Identifiers', false));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Insulin pump hardware unit ', 'MEDTRONIC-MINIMED-4819', ' inspected for infusion accuracy.', 'DEVICE_ID', 'Device Identifiers', false));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Cardioverter defibrillator interrogation confirmed rhythm capture via implant code ', 'ICD-BIOTRONIK-77192', '.', 'DEVICE_ID', 'Device Identifiers', false));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Continuous ambulatory EEG telemetry unit cataloged as ', 'CADWELL-EEG-99281', '.', 'DEVICE_ID', 'Device Identifiers', false));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Transcutaneous electric nerve stimulation unit identified by hardware barcode ', 'TENS-UNIT-48192', '.', 'DEVICE_ID', 'Device Identifiers', false));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Home biometric blood pressure cuff synchronized with telehealth gateway via ', 'OMRON-BP-882194', '.', 'DEVICE_ID', 'Device Identifiers', false));
  snippets.push(buildSnippet(nextId('DEV'), 'Device Identifiers', 'Sleep tracking wearable sensor cataloged under clinical study serial ', 'OURA-RING-GEN3-8821', '.', 'DEVICE_ID', 'Device Identifiers', false));

  // ==========================================
  // CATEGORY 14: WEB URLS (15 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Telehealth video encounter hosted at ', 'https://telehealth.theraflow.io/room/encounter-882194', '.', 'URL', 'Web URLs', true));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Patient accessed psychological intake form via ', 'https://portal.clinicalcare.org/intake/patient_9921', '.', 'URL', 'Web URLs', true));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Mental health crisis resources provided at ', 'https://988lifeline.org/chat', '.', 'URL', 'Web URLs', true));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Client requested psychoeducation link: ', 'https://www.nimh.nih.gov/health/topics/anxiety-disorders', '.', 'URL', 'Web URLs', true));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Encounter link: ', 'http://clinic.doxy.me/dr-sarah-chen', ' for weekly therapy.', 'URL', 'Web URLs', true));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Patient website: ', 'www.myanxietyrecoveryblog.com/about-jane', ' reviewed with clinician.', 'URL', 'Web URLs', true));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Teletherapy session launched from ', 'https://meet.google.com/abc-defg-hij', '.', 'URL', 'Web URLs', true));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Clinical portal endpoint: ', 'https://mychart.memorialcare.org/patient/records', '.', 'URL', 'Web URLs', true));

  // Hard unstructured: Web domains without http/https protocol prefix
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Client maintains an advocacy blog at ', 'www.survivingptsdandgrief.org/story', ' detailing trauma recovery.', 'URL', 'Web URLs', false));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Support group schedule accessible at ', 'www.aa-centraloffice-chicago.org/meetings', '.', 'URL', 'Web URLs', false));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Patient completed homework via web application at ', 'www.moodpath-tracker.io/user/882194', '.', 'URL', 'Web URLs', false));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Clinician verified community resource directory at ', 'www.211colorado.org/mental-health', '.', 'URL', 'Web URLs', false));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Client stated she watched panic de-escalation video on ', 'https://youtube.com/watch?v=dQw4w9WgXcQ', '.', 'URL', 'Web URLs', true));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Mindfulness audio tracks hosted on patient private server at ', 'https://files.patientpersonalcloud.net/meditation/session1.mp3', '.', 'URL', 'Web URLs', true));
  snippets.push(buildSnippet(nextId('URL'), 'Web URLs', 'Appointment booking portal: ', 'https://calendly.com/dr-chen-psychiatry/60min', '.', 'URL', 'Web URLs', true));

  // ==========================================
  // CATEGORY 15: INTERNET PROTOCOL (IP) ADDRESSES (15 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Telehealth connection initiated from IPv4: ', '192.168.1.105', ', latency 32ms.', 'IP_ADDRESS', 'IP Addresses', true));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Client remote session IP address: ', '74.125.224.72', ', verified in California.', 'IP_ADDRESS', 'IP Addresses', true));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Portal login recorded from IP: ', '10.0.0.1', ' on home Wi-Fi gateway.', 'IP_ADDRESS', 'IP Addresses', true));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'EHR security audit log: accessed from ', '172.16.254.1', ' by attending.', 'IP_ADDRESS', 'IP Addresses', true));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'WebRTC media relay IP: ', '208.67.222.222', ' for secure video tunnel.', 'IP_ADDRESS', 'IP Addresses', true));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'IPv6 address logged: ', '2001:0db8:85a3:0000:0000:8a2e:0370:7334', ' from mobile carrier.', 'IP_ADDRESS', 'IP Addresses', true));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Session IP: ', '198.51.100.42', ' confirmed during electronic consent.', 'IP_ADDRESS', 'IP Addresses', true));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Audit trail captured workstation IP ', '128.12.48.91', ' in psychiatric clinic.', 'IP_ADDRESS', 'IP Addresses', true));

  // Hard unstructured: Embedded in technical telemetry prose
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Client dropped telehealth connection due to packet loss at gateway node ', '64.233.160.1', '.', 'IP_ADDRESS', 'IP Addresses', false));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Automated crisis portal ping originated from residential endpoint ', '71.198.42.18', ' in suburban Seattle.', 'IP_ADDRESS', 'IP Addresses', false));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Patient authenticated mobile symptom diary app from cellular gateway ', '166.137.89.21', '.', 'IP_ADDRESS', 'IP Addresses', false));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Remote diagnostic workstation routed through secure proxy server ', '140.211.9.87', '.', 'IP_ADDRESS', 'IP Addresses', false));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Firewall recorded client connection originating from address ', '198.18.0.25', '.', 'IP_ADDRESS', 'IP Addresses', false));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Teletherapy platform ping routed to regional switch ', '52.95.110.1', ' in AWS us-west-2.', 'IP_ADDRESS', 'IP Addresses', false));
  snippets.push(buildSnippet(nextId('IP'), 'IP Addresses', 'Client router address documented during home equipment troubleshooting: ', '192.168.0.254', '.', 'IP_ADDRESS', 'IP Addresses', false));

  // ==========================================
  // CATEGORY 16: BIOMETRIC IDENTIFIERS (15 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Patient biometric enrollment completed via ', 'fingerprint scan data', ' for dispensary access.', 'BIOMETRIC', 'Biometric Identifiers', true));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Therapy session confirmed through client ', 'voiceprint verification', ' on telephonic check-in.', 'BIOMETRIC', 'Biometric Identifiers', true));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Hospital secure psychiatric unit accessed with ', 'iris scan verification', ' at security portal.', 'BIOMETRIC', 'Biometric Identifiers', true));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Identity established using ', 'retina scan record', ' in county detention facility.', 'BIOMETRIC', 'Biometric Identifiers', true));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Substance intake dispensary utilized ', 'facial recognition verification', ' prior to methadone dosing.', 'BIOMETRIC', 'Biometric Identifiers', true));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Client authorized medication locker via ', 'hand geometry scan', ' at sober living house.', 'BIOMETRIC', 'Biometric Identifiers', true));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Electronic prescription authenticated by clinician ', 'fingerprint verification', '.', 'BIOMETRIC', 'Biometric Identifiers', true));

  // Hard unstructured: Biometric references embedded in clinical prose
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Acoustic vocal analysis registered patient ', 'voice recognition template', ' during phone crisis call.', 'BIOMETRIC', 'Biometric Identifiers', false));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'State forensic hospital logged client ', 'biometric fingerprint record', ' upon involuntary commitment.', 'BIOMETRIC', 'Biometric Identifiers', false));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Telehealth security protocol captured facial mesh landmark data for ', 'facial recognition scan', '.', 'BIOMETRIC', 'Biometric Identifiers', false));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Court custody transfer document includes official ', 'thumbprint scan record', ' on file.', 'BIOMETRIC', 'Biometric Identifiers', false));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Security check confirmed identity using automated ', 'retinal scan identifier', ' at detention ward.', 'BIOMETRIC', 'Biometric Identifiers', false));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Patient biometric profile created using digital ', 'voiceprint match', ' on outpatient telephone line.', 'BIOMETRIC', 'Biometric Identifiers', false));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'High-security pharmacy dispensing vault required dual ', 'fingerprint match', ' before medication release.', 'BIOMETRIC', 'Biometric Identifiers', false));
  snippets.push(buildSnippet(nextId('BIO'), 'Biometric Identifiers', 'Clinician logged in to psychiatric EHR using automated ', 'iris scan identifier', '.', 'BIOMETRIC', 'Biometric Identifiers', false));

  // ==========================================
  // CATEGORY 17: FULL-FACE PHOTOGRAPHIC IMAGES (15 snippets)
  // ==========================================
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Patient photograph on file: ', 'photo_patient_face_2024.jpg', ' verified in chart.', 'PHOTO_ID', 'Photographic Images', true));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Attached headshot image: ', 'headshot_jane_doe.png', ' for clinical ID badge.', 'PHOTO_ID', 'Photographic Images', true));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Clinical picture: ', 'patient_facial_injury_0412.jpeg', ' documented in emergency note.', 'PHOTO_ID', 'Photographic Images', true));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Intake facial portrait: ', 'portrait_marcus_vance.png', ' uploaded to EHR.', 'PHOTO_ID', 'Photographic Images', true));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Patient Photo File: ', '/records/photos/client_882194.jpg', ' stored on secure server.', 'PHOTO_ID', 'Photographic Images', true));

  // Hard unstructured: Photo references embedded without keyword labels
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Collateral caregiver provided recent full-face image of patient: ', 'face_profile_2024_03.jpg', ' for elopement risk assessment.', 'PHOTO_ID', 'Photographic Images', false));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Security desk uploaded digital snapshot ', 'lobby_camera_headshot_992.png', ' following elopement attempt.', 'PHOTO_ID', 'Photographic Images', false));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Dermatology consultation includes facial rash scan ', 'malar_rash_face_close_up.tiff', ' attached to medical chart.', 'PHOTO_ID', 'Photographic Images', false));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Psychiatric emergency team reviewed color image ', 'intake_facial_photo_4819.bmp', ' from triage bay.', 'PHOTO_ID', 'Photographic Images', false));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Forensic evaluation file includes full-face photographic exhibit ', 'evidence_facial_contusion.jpg', '.', 'PHOTO_ID', 'Photographic Images', false));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Client intake profile updated with current passport-style headshot ', 'patient_id_photo_v2.png', '.', 'PHOTO_ID', 'Photographic Images', false));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Wound care nurse documented facial laceration in image file ', 'suture_evaluation_face.jpeg', '.', 'PHOTO_ID', 'Photographic Images', false));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Identity verified using digital badge photo ', 'employee_clinician_headshot.jpg', ' on hospital pass.', 'PHOTO_ID', 'Photographic Images', false));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Facial photographic scan captured during telemedicine session saved as ', 'webrtc_snapshot_client_882.png', '.', 'PHOTO_ID', 'Photographic Images', false));
  snippets.push(buildSnippet(nextId('PHT'), 'Photographic Images', 'Hospital archives maintain patient intake portrait ', 'archived_intake_headshot_1998.jpg', ' in historical chart.', 'PHOTO_ID', 'Photographic Images', false));

  // ==========================================
  // CATEGORY 18: ANY OTHER UNIQUE IDENTIFIERS (18 snippets)
  // UUIDs, Barcodes, GUIDs, Research IDs
  // ==========================================
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'System UUID: ', 'c3073b3a-9e1b-4f9e-a89b-7e8c3b2f1a09', ' generated for encounter.', 'UNIQUE_ID', 'Unique Identifiers', true));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Barcode Tracking ID: ', 'BAR-992817482', ' attached to lab specimen vial.', 'UNIQUE_ID', 'Unique Identifiers', true));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Clinical Trial Subject ID: ', 'SUBJ-882194-NIMH', ' enrolled in ketamine study.', 'UNIQUE_ID', 'Unique Identifiers', true));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Unique Tracking Tag: ', 'TAG-481920491', ' affixed to patient belongings.', 'UNIQUE_ID', 'Unique Identifiers', true));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Database Record GUID: ', '550e8400-e29b-41d4-a716-446655440000', ' in EHR index.', 'UNIQUE_ID', 'Unique Identifiers', true));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Unique ID: ', 'UID-992810482', ' assigned by state mental health registry.', 'UNIQUE_ID', 'Unique Identifiers', true));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Specimen Barcode: ', 'BC-48192049', ' for toxicology urine drug screen.', 'UNIQUE_ID', 'Unique Identifiers', true));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Session Identifier: ', 'e8b7c2a1-3d4f-4a5e-9f8b-1c2d3e4f5a6b', ' logged in server database.', 'UNIQUE_ID', 'Unique Identifiers', true));

  // Hard unstructured: Raw UUIDs and tracking barcodes embedded without "UUID:" prefix
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Audit trail indexed this clinical transaction under ', 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', ' in Postgres log.', 'UNIQUE_ID', 'Unique Identifiers', false));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Psychological research data randomized under participant token ', 'd4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a', '.', 'UNIQUE_ID', 'Unique Identifiers', false));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Biomedical laboratory sample referenced by scanning identifier ', 'BARCODE-TOX-994821', ' into analyzer.', 'UNIQUE_ID', 'Unique Identifiers', false));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Hospital pharmacy dispensing automated through specimen code ', 'RX-BARCODE-481920', '.', 'UNIQUE_ID', 'Unique Identifiers', false));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Electronic prescription transaction reference hash ', 'f81d4fae-7dec-11d0-a765-00a0c91e6bf6', ' confirmed by Surescripts.', 'UNIQUE_ID', 'Unique Identifiers', false));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Genomic sequencing profile linked to patient sample token ', 'GENOME-SAMPLE-882194', '.', 'UNIQUE_ID', 'Unique Identifiers', false));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Clinical research consent stamped with digital document hash ', 'b2c3d4e5-f6a7-8b9c-0d1e-2f3a4b5c6d7e', '.', 'UNIQUE_ID', 'Unique Identifiers', false));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'State psychiatric crisis bed tracking registry code ', 'CRISIS-BED-992810', ' assigned for transfer.', 'UNIQUE_ID', 'Unique Identifiers', false));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Substance abuse confidentiality 42 CFR Part 2 waiver cataloged as ', 'PART2-WAIVER-48192', '.', 'UNIQUE_ID', 'Unique Identifiers', false));
  snippets.push(buildSnippet(nextId('UID'), 'Unique Identifiers', 'Telehealth media peer connection socket identifier ', '00112233-4455-6677-8899-aabbccddeeff', ' terminated cleanly.', 'UNIQUE_ID', 'Unique Identifiers', false));

  // ==========================================
  // COMPLEX MULTI-IDENTIFIER CLINICAL ENCOUNTER SNIPPETS (54 snippets to reach 320+)
  // Realistic multi-line progress notes with mixed structured & unstructured PHI
  // ==========================================
  const complexEncounterTemplates = [
    {
      p: 'Sarah Jenkins',
      c: 'Dr. Sarah Chen, MD',
      m: 'MRN-882194',
      d: '04/12/1988',
      t: '415-555-0192',
      a: '742 Evergreen Terrace',
      city: 'Portland',
      h: 'Bellevue Hospital',
      s: '123-45-6789',
    },
    {
      p: 'Marcus Vance',
      c: 'Robert Zimmerman, LCSW',
      m: 'MRN-481920',
      d: '11/28/1975',
      t: '206-555-0144',
      a: '1048 West Elm Street',
      city: 'Seattle',
      h: 'Cedars-Sinai Medical Center',
      s: '456-78-9012',
    },
    {
      p: 'David Smith',
      c: 'Dr. Chen',
      m: 'MRN-104928',
      d: '08/04/1992',
      t: '312.555.0188',
      a: '1200 Beacon Boulevard',
      city: 'Chicago',
      h: 'Massachusetts General Hospital',
      s: '987-65-4321',
    },
    {
      p: 'Elena Rostova',
      c: 'Victoria Sterling, PhD',
      m: 'MRN-391048',
      d: '10/15/1968',
      t: '617-555-0123',
      a: '452 Ocean Avenue',
      city: 'Denver',
      h: 'Mayo Clinic',
      s: '321-65-4987',
    },
    {
      p: 'José García-Rivera',
      c: 'Benjamin Vance',
      m: 'MRN-881920',
      d: '01/22/1983',
      t: '(212) 555-0177',
      a: '8910 Mountain View Road',
      city: 'Austin',
      h: 'Mount Sinai',
      s: '555-12-3456',
    },
    {
      p: 'Chloë O’Connor',
      c: 'Arthur Pendelton Jr',
      m: 'MRN-992817',
      d: '09/30/1995',
      t: '503-555-0165',
      a: '55 Wall Street, New York, NY 10005',
      city: 'Atlanta',
      h: 'Highland Hospital',
      s: '219-45-8821',
    },
  ];

  for (let i = 0; i < 9; i++) {
    for (const tpl of complexEncounterTemplates) {
      const snipId = nextId('COMPLEX');
      const text = `PSYCHIATRIC PROGRESS NOTE
Date of Encounter: 2024-04-1${i}
Attending: ${tpl.c}
Patient: ${tpl.p} (DOB: ${tpl.d}, SSN: ${tpl.s}, MRN: ${tpl.m})
Contact Phone: ${tpl.t} | Home: ${tpl.a}

SUBJECTIVE:
${tpl.p} presented for scheduled individual psychotherapy follow-up. Patient reports ongoing symptoms of autonomic arousal, panic episodes while driving in ${tpl.city}, and sleep disruption. Denies active suicidal ideation or plan. Mentioned that her sister visited from ${tpl.city} to help with childcare.

OBJECTIVE:
Mental Status Exam: Appearance well-groomed. Speech clear. Mood reported as "stressed about work at Google". Thought process linear. No hallucinations. Past psychiatric records from ${tpl.h} reviewed.

ASSESSMENT:
Major Depressive Disorder, recurrent, moderate (F33.1). Demonstrating partial response to CBT and PMR homework.

PLAN:
1. Continue weekly individual psychotherapy sessions.
2. Coordinate with primary care provider via fax 415-555-0190.
3. Telehealth follow-up scheduled via https://telehealth.theraflow.io/room/${snipId}.
4. Superbill submitted to BCBS-XY${snipId} under NPI 1234567890.`;

      // Build expected entities
      const expected: GoldStandardEntity[] = [];
      const addExp = (str: string, cat: string, rId: string, isStruct: boolean) => {
        let idx = text.indexOf(str);
        while (idx !== -1) {
          if (!expected.some((e) => e.start === idx && e.end === idx + str.length)) {
            expected.push({
              text: str,
              category: cat,
              ruleId: rId,
              start: idx,
              end: idx + str.length,
              isStructured: isStruct,
              difficulty: isStruct ? 'easy_structured' : 'hard_unstructured',
            });
          }
          idx = text.indexOf(str, idx + 1);
        }
      };

      // Structured entities
      addExp(`2024-04-1${i}`, 'Dates', 'DATE', true);
      addExp(tpl.c, 'Names', 'NAME', true);
      addExp(tpl.p, 'Names', 'NAME', true);
      addExp(tpl.d, 'Dates', 'DATE', true);
      addExp(tpl.s, 'Social Security Numbers', 'SSN', true);
      addExp(tpl.m, 'Medical Record Numbers', 'MRN', true);
      addExp(tpl.t, 'Telephone Numbers', 'PHONE', true);
      addExp(tpl.a, 'Geographic Subdivisions', 'GEOGRAPHIC', true);
      addExp('415-555-0190', 'Fax Numbers', 'FAX', true);
      addExp(`https://telehealth.theraflow.io/room/${snipId}`, 'Web URLs', 'URL', true);
      addExp(`BCBS-XY${snipId}`, 'Health Plan Numbers', 'HEALTH_PLAN_NUM', true);
      addExp('1234567890', 'Certificate / License Numbers', 'LICENSE_NUM', true);

      // Unstructured entities inside the narrative
      addExp(tpl.city, 'Geographic Subdivisions', 'GEOGRAPHIC', false);
      addExp('Google', 'Geographic Subdivisions', 'GEOGRAPHIC', false); // Employer is geographic under HIPAA Safe Harbor
      addExp(tpl.h, 'Geographic Subdivisions', 'GEOGRAPHIC', false); // Hospital facility

      expected.sort((a, b) => a.start - b.start);

      snippets.push({
        id: snipId,
        categoryPrimary: 'Complex Encounter',
        text,
        expected_entities: expected,
      });
    }
  }

  return snippets;
}

// Generate and write file
const corpus = generateCorpus();
const totalEntities = corpus.reduce((acc, s) => acc + s.expected_entities.length, 0);
const structuredEntities = corpus.reduce((acc, s) => acc + s.expected_entities.filter((e) => e.isStructured).length, 0);
const unstructuredEntities = corpus.reduce((acc, s) => acc + s.expected_entities.filter((e) => !e.isStructured).length, 0);

console.log(`Generated synthetic PHI corpus:`);
console.log(`- Total snippets: ${corpus.length}`);
console.log(`- Total expected PHI entities: ${totalEntities}`);
console.log(`- Structured entities: ${structuredEntities}`);
console.log(`- Unstructured entities: ${unstructuredEntities}`);

const outputPath = path.resolve(process.cwd(), 'tests/synthetic_phi_gold_standard.json');
fs.writeFileSync(outputPath, JSON.stringify(corpus, null, 2), 'utf-8');
console.log(`Saved corpus to: ${outputPath}`);
