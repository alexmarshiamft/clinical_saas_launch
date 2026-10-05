import React, { useState } from 'react';
import {
  Mic,
  Waves,
  Sparkles,
  FileText,
  Wand2,
  CreditCard,
  Share2,
  Send,
  Database,
  Check,
} from 'lucide-react';
import { useClinicalContext } from '@/lib/clinical-context';
import { Utterance, RecordingState, ClinicalEncounterSample } from './types';
import AudioRecorder from './AudioRecorder';
import DiarizationFeed from './DiarizationFeed';
import PreRecordedEncounters, { CLINICAL_ENCOUNTER_SAMPLES } from './PreRecordedEncounters';
import NoteTemplates from './NoteTemplates';
import TemplateStudio from './TemplateStudio';
import BillingCodingAssistant from './BillingCodingAssistant';
import MultiEhrExportPanel from './MultiEhrExportPanel';

export const ScribeWorkspace: React.FC = () => {
  const {
    activePatient,
    activeEncounterNotes,
    setActivePatient,
    updateNoteField,
    sendToPhiScrubber,
    insertToEhr,
  } = useClinicalContext();

  const [activeTab, setActiveTab] = useState<'feed' | 'templates' | 'studio' | 'billing' | 'export'>('feed');

  // Audio Recording State
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [timerInterval, setTimerInterval] = useState<any>(null);

  // Transcript Turns
  const [transcriptTurns, setTranscriptTurns] = useState<Utterance[]>(() => {
    return CLINICAL_ENCOUNTER_SAMPLES[0].transcript;
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleStartRecording = () => {
    setRecordingState('recording');
    const interval = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  };

  const handlePauseRecording = () => {
    setRecordingState('paused');
    if (timerInterval) clearInterval(timerInterval);
  };

  const handleResumeRecording = () => {
    setRecordingState('recording');
    const interval = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    setTimerInterval(interval);
  };

  const handleStopRecording = () => {
    setRecordingState('stopped');
    if (timerInterval) clearInterval(timerInterval);
  };

  const handleClearRecording = () => {
    if (timerInterval) clearInterval(timerInterval);
    setRecordingState('idle');
    setRecordingSeconds(0);
  };

  const handleToggleSpeaker = (utteranceId: string) => {
    const updated = transcriptTurns.map((u) => {
      if (u.id === utteranceId) {
        const nextRole: 'clinician' | 'patient' = u.role === 'clinician' ? 'patient' : 'clinician';
        return {
          ...u,
          role: nextRole,
          speakerId: nextRole,
          speakerName: nextRole === 'clinician' ? 'Dr. Sarah Chen, MD' : activePatient.name,
        };
      }
      return u;
    });
    setTranscriptTurns(updated);

    // Sync updated dialogue back to activeEncounterNotes.rawTranscript
    const raw = updated
      .map((u) => `[${u.timestamp}] ${u.role === 'clinician' ? 'Dr. Chen:' : `${activePatient.name}:`} ${u.text}`)
      .join('\n');
    updateNoteField('rawTranscript', raw);
  };

  const handleEditUtterance = (utteranceId: string, newText: string) => {
    const updated = transcriptTurns.map((u) => {
      if (u.id === utteranceId) {
        return { ...u, text: newText };
      }
      return u;
    });
    setTranscriptTurns(updated);

    const raw = updated
      .map((u) => `[${u.timestamp}] ${u.role === 'clinician' ? 'Dr. Chen:' : `${activePatient.name}:`} ${u.text}`)
      .join('\n');
    updateNoteField('rawTranscript', raw);
  };

  const handleApplyEncounter = (sample: ClinicalEncounterSample) => {
    setTranscriptTurns(sample.transcript);
    setActivePatient({
      ...activePatient,
      name: sample.patientName,
      mrn: sample.mrn,
      cptCode: sample.cptCode,
    });

    const raw = sample.transcript
      .map((u) => `[${u.timestamp}] ${u.role === 'clinician' ? 'Dr. Chen:' : `${sample.patientName}:`} ${u.text}`)
      .join('\n');

    updateNoteField('rawTranscript', raw);
    updateNoteField('subjective', sample.soapPreview.subjective);
    updateNoteField('objective', sample.soapPreview.objective);
    updateNoteField('assessment', sample.soapPreview.assessment);
    updateNoteField('plan', sample.soapPreview.plan);

    setToastMessage(`✓ Applied ${sample.title} (${sample.patientName}) to chart.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendToScrubber = () => {
    sendToPhiScrubber(activeEncounterNotes.rawTranscript);
    setToastMessage(`✓ Dispatched transcript into HIPAA PHI Scrubber.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCommitToEhr = () => {
    const noteSummary = `SOAP NOTE COMMIT:\nSubjective: ${activeEncounterNotes.subjective}\nAssessment: ${activeEncounterNotes.assessment}`;
    insertToEhr(noteSummary);
    setToastMessage(`✓ Committed SOAP note findings to active EHR chart.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-6 heidi-scribe-theme">
      {/* Container Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        {/* Top Header - Permanent Invariant Strings */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Clinical AI Scribe v2</h2>
              <p className="text-xs text-slate-500">Ambient Multi-Speaker Diarization &amp; SOAP Generator</p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
            AI Diarization Ready
          </span>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'feed'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Waves className="h-3.5 w-3.5" />
            <span>Acoustic Feed &amp; SOAP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'templates'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>6 Note Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('studio')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'studio'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            <span>Template Studio</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('billing')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'billing'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Billing &amp; Coding</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'export'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Multi-EHR Export</span>
          </button>
        </div>

        {/* Global Toast */}
        {toastMessage && (
          <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: Default Acoustic Feed & SOAP Preview (Contains ALL 9 Invariant Strings) */}
        {activeTab === 'feed' && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600 mb-6">
              Real-time acoustic transcription separating clinician and patient speech feeds with automated SOAP note synthesis across 6 medical specialties.
            </p>

            {/* Permanent Invariant Two-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2">
                <div className="text-amber-400 font-bold flex items-center gap-2 mb-2">
                  <Waves className="h-4 w-4" /> Live Acoustic Transcript ({activePatient.name})
                </div>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                  {activeEncounterNotes.rawTranscript}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-100 space-y-3">
                <div className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span>Generated SOAP Preview (CPT {activePatient.cptCode})</span>
                </div>
                <div className="text-xs text-slate-700 space-y-1">
                  <div><strong className="text-slate-900">Subjective:</strong> {activeEncounterNotes.subjective}</div>
                  <div><strong className="text-slate-900">Assessment:</strong> {activeEncounterNotes.assessment}</div>
                </div>

                {/* Direct Action Pipeline Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-purple-100">
                  <button
                    type="button"
                    onClick={handleSendToScrubber}
                    className="px-2.5 py-1 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-900 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Send className="h-3 w-3" />
                    <span>Send to PHI Scrubber</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitToEhr}
                    className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Database className="h-3 w-3" />
                    <span>Commit to EHR Chart</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Audio Recording & Device Controls */}
            <AudioRecorder
              recordingState={recordingState}
              onStart={handleStartRecording}
              onPause={handlePauseRecording}
              onResume={handleResumeRecording}
              onStop={handleStopRecording}
              onClear={handleClearRecording}
              durationSeconds={recordingSeconds}
            />

            {/* Pre-recorded Clinical Encounters Catalog */}
            <PreRecordedEncounters
              onSelectSample={(sample) => {
                handleApplyEncounter(sample);
              }}
              onApplyToChart={(sample) => {
                handleApplyEncounter(sample);
              }}
            />

            {/* Interactive Diarization Feed (Speaker Separation, 1-Click Flip, Inline Edit) */}
            <DiarizationFeed
              transcript={transcriptTurns}
              isRecording={recordingState === 'recording'}
              interimText={recordingState === 'recording' ? '...capturing speech...' : ''}
              onToggleSpeaker={handleToggleSpeaker}
              onEditUtterance={handleEditUtterance}
              activePatientName={activePatient.name}
            />
          </div>
        )}

        {/* TAB 2: 6 Clinical Note Templates & Dual-Engine Synthesis */}
        {activeTab === 'templates' && (
          <NoteTemplates
            transcript={activeEncounterNotes.rawTranscript}
            context={{
              patient_name: activePatient.name,
              mrn: activePatient.mrn,
              dob: activePatient.dob,
              cpt_code: activePatient.cptCode,
              chief_complaint: 'Generalized Anxiety Disorder follow-up',
              encounter_date: new Date().toLocaleDateString(),
              clinician_name: 'Dr. Sarah Chen, MD',
            }}
            onSendToEhr={(note) => insertToEhr(note)}
            onSendToPhiScrubber={(note) => sendToPhiScrubber(note)}
            activePatientCptCode={activePatient.cptCode}
          />
        )}

        {/* TAB 3: Scribe Template Studio (Prompt Engineering, Section Re-ordering, Variable Tokens) */}
        {activeTab === 'studio' && (
          <TemplateStudio
            activeContext={{
              patient_name: activePatient.name,
              mrn: activePatient.mrn,
              dob: activePatient.dob,
              cpt_code: activePatient.cptCode,
              chief_complaint: 'Generalized Anxiety Disorder evaluation',
              encounter_date: new Date().toLocaleDateString(),
              clinician_name: 'Dr. Sarah Chen, MD',
            }}
          />
        )}

        {/* TAB 4: Scribe Billing & Coding Assistant */}
        {activeTab === 'billing' && (
          <BillingCodingAssistant
            transcript={activeEncounterNotes.rawTranscript}
          />
        )}

        {/* TAB 5: Multi-EHR Export Adapters */}
        {activeTab === 'export' && (
          <MultiEhrExportPanel
            onSendToEhr={(text) => insertToEhr(text)}
            onSendToPhiScrubber={(text) => sendToPhiScrubber(text)}
          />
        )}
      </div>
    </div>
  );
};

export default ScribeWorkspace;
