import React, { createContext, useContext, useState } from 'react';

export interface Patient {
  id: string;
  name: string;
  dob: string;
  mrn: string;
  cptCode: string;
  encounterId?: string;
  age?: number;
  phone?: string;
  cptDesc?: string;
  encounterTime?: string;
  nextAppt?: string;
}

export interface EncounterNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  rawTranscript: string;
}

export interface EhrNotePayload {
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  format?: 'soap' | 'dap' | string;
  data?: string;
}

export type EhrNoteInput = Partial<EncounterNotes> | EhrNotePayload | string;

export interface ClinicalContextType {
  activePatient: Patient;
  setActivePatient: (patient: Patient) => void;
  activeEncounterNotes: EncounterNotes;
  updateNoteField: (field: keyof EncounterNotes | string, text: string) => void;
  sendToPhiScrubber: (text: string) => void;
  insertToEhr: (note: EhrNoteInput) => void;
  scrubberInputText: string;
  clearScrubberInput: () => void;
}

export const DEFAULT_PATIENT: Patient = {
  id: 'p-101',
  name: 'Jane Doe',
  dob: '04/12/1988',
  age: 38,
  phone: '(415) 555-0199',
  mrn: '#MC-88219',
  cptCode: '90837',
  cptDesc: 'Psychotherapy (60m)',
  encounterTime: '10:00 AM',
  nextAppt: 'Today at 10:00 AM',
  encounterId: 'enc-jane-doe-90837',
};

const DEFAULT_NOTES: EncounterNotes = {
  subjective: 'Patient reports reduced anxiety episodes, improved sleep onset, and compliance with daily mindfulness exercises.',
  objective: 'Alert and oriented x4. Affect congruent, mood euthymic. Speech normal in rate and rhythm. No psychomotor agitation.',
  assessment: 'Generalized Anxiety Disorder (F41.1) demonstrating moderate symptom remission under active CBT protocol.',
  plan: 'Continue weekly 60-minute individual CBT psychotherapy (CPT 90837). Practice progressive muscle relaxation twice daily.',
  rawTranscript: '[00:00] Dr. Chen: Good morning Jane, how did the stimulus control exercises work this week?\n[00:08] Jane Doe: Dr. Chen, it really made a difference. I fell asleep in under 20 minutes.',
};

const ClinicalContext = createContext<ClinicalContextType>({
  activePatient: DEFAULT_PATIENT,
  setActivePatient: () => {},
  activeEncounterNotes: DEFAULT_NOTES,
  updateNoteField: () => {},
  sendToPhiScrubber: () => {},
  insertToEhr: () => {},
  scrubberInputText: '',
  clearScrubberInput: () => {},
});

export const ClinicalContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePatient, setActivePatient] = useState<Patient>(DEFAULT_PATIENT);
  const [activeEncounterNotes, setActiveEncounterNotes] = useState<EncounterNotes>(DEFAULT_NOTES);
  const [scrubberInputText, setScrubberInputText] = useState<string>('');

  const updateNoteField = (field: keyof EncounterNotes | string, text: string) => {
    setActiveEncounterNotes((prev) => ({
      ...prev,
      [field]: text,
    }));
  };

  const sendToPhiScrubber = (text: string) => {
    setScrubberInputText(text);
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        const EventCtor = (window as unknown as { CustomEvent?: typeof CustomEvent }).CustomEvent || (typeof CustomEvent !== 'undefined' ? CustomEvent : null);
        if (EventCtor) {
          window.dispatchEvent(
            new EventCtor('clinical:send-to-phi-scrubber', {
              detail: { text, patient: activePatient, timestamp: new Date().toISOString() },
            })
          );
        }
      } catch {
        // Safe fallback in mock/JSDOM environments
      }
    }
  };

  const clearScrubberInput = () => {
    setScrubberInputText('');
  };

  const insertToEhr = (note: EhrNoteInput) => {
    // 1. Synchronously update activeEncounterNotes
    if (typeof note === 'string') {
      setActiveEncounterNotes((prev) => ({
        ...prev,
        assessment: prev.assessment ? `${prev.assessment}\n\n${note}` : note,
      }));
    } else {
      const payload = note as EhrNotePayload;
      setActiveEncounterNotes((prev) => ({
        ...prev,
        subjective: payload.subjective ?? (payload.format === 'dap' ? payload.data ?? prev.subjective : prev.subjective),
        objective: payload.objective ?? prev.objective,
        assessment: payload.assessment ?? prev.assessment,
        plan: payload.plan ?? prev.plan,
      }));
    }

    // 2. Asynchronously populate TheraFlow active note store
    (async () => {
      try {
        const { getNotes, addNote, updateNote } = await import('@/tools/theraflow/data/theraflow-store');
        const notes = await getNotes();
        const existingDraft = notes.find((n) => n.client_id === activePatient.id && !n.is_locked);
        const therapistId = 'a0000000-0000-4000-8000-000000000001';

        if (typeof note === 'string') {
          if (existingDraft) {
            await updateNote(existingDraft.id, {
              a_text: existingDraft.a_text ? `${existingDraft.a_text}\n\n${note}` : note,
            });
          } else {
            await addNote({
              client_id: activePatient.id,
              therapist_id: therapistId,
              client_name: activePatient.name,
              client_mrn: activePatient.mrn,
              date_of_service: new Date().toISOString().split('T')[0],
              session_type: `Psychotherapy (${activePatient.cptCode})`,
              duration_minutes: 60,
              cpt_code: activePatient.cptCode,
              diagnosis_code: 'F41.1',
              d_text: 'Clinical Encounter Note',
              a_text: note,
              p_text: 'Continue active treatment protocol',
              is_locked: false,
            });
          }
        } else {
          const payload = note as EhrNotePayload;
          const dText = payload.data || [payload.subjective, payload.objective].filter(Boolean).join('\n\n');
          if (existingDraft) {
            await updateNote(existingDraft.id, {
              d_text: dText || existingDraft.d_text,
              a_text: payload.assessment || existingDraft.a_text,
              p_text: payload.plan || existingDraft.p_text,
            });
          } else {
            await addNote({
              client_id: activePatient.id,
              therapist_id: therapistId,
              client_name: activePatient.name,
              client_mrn: activePatient.mrn,
              date_of_service: new Date().toISOString().split('T')[0],
              session_type: `Psychotherapy (${activePatient.cptCode})`,
              duration_minutes: 60,
              cpt_code: activePatient.cptCode,
              diagnosis_code: 'F41.1',
              d_text: dText || 'Clinical documentation',
              a_text: payload.assessment || '',
              p_text: payload.plan || '',
              is_locked: false,
            });
          }
        }
      } catch {
        // Safe fallback in isolated environments without localStorage
      }
    })();
  };

  return (
    <ClinicalContext.Provider
      value={{
        activePatient,
        setActivePatient,
        activeEncounterNotes,
        updateNoteField,
        sendToPhiScrubber,
        insertToEhr,
        scrubberInputText,
        clearScrubberInput,
      }}
    >
      {children}
    </ClinicalContext.Provider>
  );
};

export const useClinicalContext = (): ClinicalContextType => {
  const context = useContext(ClinicalContext);
  if (!context) {
    throw new Error('useClinicalContext must be used within a ClinicalContextProvider');
  }
  return context;
};
