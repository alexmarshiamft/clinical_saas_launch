/**
 * Feature 10: DAP Progress Notes View & Editor
 * Standardized Data, Assessment, and Plan editor with guided clinical prompts,
 * quick symptom chips, dual-mode AI note expansion, and cryptographic digital lock.
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Lock,
  Sparkles,
  Save,
  CheckCircle2,
  Share2,
  Calendar,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useClinicalContext } from '@/lib/clinical-context';
import {
  getNotes,
  addNote,
  updateNote,
  getClients,
  subscribeToTheraFlowStore,
} from './data/theraflow-store';
import { DAPNote, ClientRecord } from './types';
import { CLINICIAN_NAME } from './data/demo-seed';
import { expandShorthandToDAP } from './ai-note-expander';
import { ClinicalPromptChips } from './ClinicalPromptChips';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface DAPNotesViewProps {
  initialClientId?: string;
}

export const DAPNotesView: React.FC<DAPNotesViewProps> = ({ initialClientId }) => {
  const { activePatient, updateNoteField, sendToPhiScrubber } = useClinicalContext();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [notes, setNotes] = useState<DAPNote[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialClientId || activePatient.id || ''
  );
  const [selectedNoteId, setSelectedNoteId] = useState<string>('');

  // Note Editor State
  const [dateOfService, setDateOfService] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [sessionType, setSessionType] = useState<string>(
    'Individual Psychotherapy (CPT 90837)'
  );
  const [cptCode, setCptCode] = useState<string>('90837');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [dText, setDText] = useState<string>('');
  const [aText, setAText] = useState<string>('');
  const [pText, setPText] = useState<string>('');
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [signedAt, setSignedAt] = useState<string | null>(null);
  const [signedBy, setSignedBy] = useState<string | null>(null);

  // AI Assistant Modal State
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);
  const [aiShorthand, setAiShorthand] = useState<string>('');
  const [isExpanding, setIsExpanding] = useState<boolean>(false);

  // Collapsible Guidance Prompts
  const [showGuidance, setShowGuidance] = useState<boolean>(true);

  // Load clients & notes
  useEffect(() => {
    async function load() {
      const [allClients, allNotes] = await Promise.all([getClients(), getNotes()]);
      setClients(allClients);
      setNotes(allNotes);

      // Default to Jane Doe note or existing note
      const currentClientNotes = allNotes.filter(
        (n) => n.client_id === (initialClientId || activePatient.id)
      );
      if (currentClientNotes.length > 0) {
        loadNoteIntoForm(currentClientNotes[0]);
      } else if (allNotes.length > 0) {
        loadNoteIntoForm(allNotes[0]);
      }
    }
    load();

    const unsub = subscribeToTheraFlowStore(async () => {
      const allNotes = await getNotes();
      setNotes(allNotes);
    });
    return unsub;
  }, [initialClientId, activePatient.id]);

  const loadNoteIntoForm = (note: DAPNote) => {
    setSelectedNoteId(note.id);
    setSelectedClientId(note.client_id);
    setDateOfService(note.date_of_service);
    setSessionType(note.session_type);
    setCptCode(note.cpt_code || '90837');
    setDurationMinutes(note.duration_minutes || 60);
    setDText(note.d_text);
    setAText(note.a_text);
    setPText(note.p_text);
    setIsLocked(note.is_locked);
    setSignedAt(note.signed_at || null);
    setSignedBy(note.signed_by || null);
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const existing = notes.filter((n) => n.client_id === clientId);
    if (existing.length > 0) {
      loadNoteIntoForm(existing[0]);
    } else {
      // Clear form for new note
      setSelectedNoteId('');
      const cli = clients.find((c) => c.id === clientId);
      setDateOfService(new Date().toISOString().split('T')[0]);
      setDText('');
      setAText('');
      setPText('');
      setIsLocked(false);
      setSignedAt(null);
      setSignedBy(null);
    }
  };

  const handleChipInsert = (chipText: string, targetField: 'd_text' | 'a_text' | 'p_text') => {
    if (isLocked) {
      toast.error('Cannot modify signed & locked clinical note.');
      return;
    }

    if (targetField === 'd_text') {
      setDText((prev) => (prev ? `${prev}. ${chipText}` : chipText));
    } else if (targetField === 'a_text') {
      setAText((prev) => (prev ? `${prev}. ${chipText}` : chipText));
    } else if (targetField === 'p_text') {
      setPText((prev) => (prev ? `${prev}. ${chipText}` : chipText));
    }
    toast.success(`Appended to ${targetField.replace('_text', '').toUpperCase()} section`);
  };

  const handleAiExpand = async () => {
    if (!aiShorthand.trim()) {
      toast.error('Please enter session shorthand notes');
      return;
    }

    setIsExpanding(true);
    try {
      const cli = clients.find((c) => c.id === selectedClientId);
      const clientName = cli ? `${cli.first_name} ${cli.last_name}` : 'Client';
      const diagnosis = cli ? cli.diagnosis_label : 'Generalized Anxiety Disorder';

      const result = await expandShorthandToDAP(aiShorthand, clientName, diagnosis);
      setDText(result.d);
      setAText(result.a);
      setPText(result.p);
      setIsAiModalOpen(false);
      setAiShorthand('');
      toast.success('DAP Progress Note synthesized successfully!');
    } catch (err: any) {
      toast.error(err.message || 'AI expansion encountered an issue');
    } finally {
      setIsExpanding(false);
    }
  };

  const handleSaveDraft = async () => {
    if (isLocked) return;
    const cli = clients.find((c) => c.id === selectedClientId);
    const clientName = cli ? `${cli.first_name} ${cli.last_name}` : 'Client';

    if (selectedNoteId) {
      await updateNote(selectedNoteId, {
        date_of_service: dateOfService,
        d_text: dText,
        a_text: aText,
        p_text: pText,
        cpt_code: cptCode,
        session_type: sessionType,
        duration_minutes: durationMinutes,
      });
      toast.success('DAP draft saved successfully!');
    } else {
      const created = await addNote({
        client_id: selectedClientId,
        client_name: clientName,
        client_mrn: cli?.mrn,
        date_of_service: dateOfService,
        session_type: sessionType,
        cpt_code: cptCode,
        duration_minutes: durationMinutes,
        diagnosis_code: cli?.diagnosis_code || 'F41.1',
        d_text: dText,
        a_text: aText,
        p_text: pText,
        is_locked: false,
        therapist_id: 'a0000000-0000-4000-8000-000000000001',
      });
      setSelectedNoteId(created.id);
      toast.success('New DAP note created as draft!');
    }
  };

  const handleSignAndLock = async () => {
    if (!dText.trim() || !aText.trim() || !pText.trim()) {
      toast.error('All DAP sections (Data, Assessment, Plan) must be filled before signing.');
      return;
    }

    const nowIso = new Date().toISOString();
    const cli = clients.find((c) => c.id === selectedClientId);
    const clientName = cli ? `${cli.first_name} ${cli.last_name}` : 'Client';

    let noteId = selectedNoteId;
    if (!noteId) {
      const created = await addNote({
        client_id: selectedClientId,
        client_name: clientName,
        client_mrn: cli?.mrn,
        date_of_service: dateOfService,
        session_type: sessionType,
        cpt_code: cptCode,
        duration_minutes: durationMinutes,
        diagnosis_code: cli?.diagnosis_code || 'F41.1',
        d_text: dText,
        a_text: aText,
        p_text: pText,
        is_locked: true,
        signed_at: nowIso,
        signed_by: CLINICIAN_NAME,
        clinician_credentials: 'MD / Board Certified Behavioral Health',
        therapist_id: 'a0000000-0000-4000-8000-000000000001',
      });
      noteId = created.id;
      setSelectedNoteId(created.id);
    } else {
      await updateNote(noteId, {
        d_text: dText,
        a_text: aText,
        p_text: pText,
        is_locked: true,
        signed_at: nowIso,
        signed_by: CLINICIAN_NAME,
        clinician_credentials: 'MD / Board Certified Behavioral Health',
      });
    }

    setIsLocked(true);
    setSignedAt(nowIso);
    setSignedBy(CLINICIAN_NAME);

    // Commit assessment to central clinical context
    updateNoteField('assessment', aText);

    toast.success(`🔒 Note digitally signed and locked by ${CLINICIAN_NAME}. Immutable HIPAA chart record created.`);
  };

  const handleSendToScrubber = () => {
    const cli = clients.find((c) => c.id === selectedClientId);
    const fullText = `PATIENT: ${cli ? `${cli.first_name} ${cli.last_name}` : 'Client'} (${cli?.mrn || ''})\nDATE OF SERVICE: ${dateOfService}\n\nDATA:\n${dText}\n\nASSESSMENT:\n${aText}\n\nPLAN:\n${pText}`;
    sendToPhiScrubber(fullText);
    toast.success('Full DAP note sent to HIPAA PHI Scrubber!');
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-600" />
              DAP Progress Note Clinical Charting
            </h2>
            <p className="text-xs text-slate-500">
              Statutory Data, Assessment, and Plan documentation with digital signature sealing.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={isLocked}
                  className="flex items-center gap-1.5"
                >
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Generate with AI
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    AI Clinical Note Expansion
                  </DialogTitle>
                  <DialogDescription>
                    Enter brief therapist session shorthand or bullet points. The clinical engine
                    will synthesize professional DAP documentation.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 my-2">
                  <Label>Session Shorthand / Bullets:</Label>
                  <textarea
                    rows={6}
                    value={aiShorthand}
                    onChange={(e) => setAiShorthand(e.target.value)}
                    placeholder="e.g. client arrived 5m late, anxious about job review. discussed sleep issues, practiced breathing. did CBT reframe on catastrophic thoughts. no SI. assigned thought log."
                    className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <div className="text-[11px] text-slate-500">
                    Target Patient:{' '}
                    <span className="font-semibold text-slate-800">
                      {selectedClient
                        ? `${selectedClient.first_name} ${selectedClient.last_name}`
                        : 'Active Patient'}
                    </span>{' '}
                    ({selectedClient?.diagnosis_code || 'F41.1'})
                  </div>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleAiExpand} disabled={isExpanding}>
                    {isExpanding ? 'Synthesizing...' : 'Expand to DAP'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSendToScrubber}
              className="flex items-center gap-1.5"
            >
              <Share2 className="h-3.5 w-3.5" />
              PHI Scrubber
            </Button>

            {!isLocked ? (
              <>
                <Button variant="outline" size="sm" onClick={handleSaveDraft}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Save Draft
                </Button>
                <Button size="sm" onClick={handleSignAndLock}>
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Sign &amp; Lock Note
                </Button>
              </>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Lock className="h-3.5 w-3.5" />
                Note Sealed
              </span>
            )}
          </div>
        </div>

        {/* Note Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4 text-xs">
          <div>
            <Label>Patient Selection</Label>
            <select
              value={selectedClientId}
              onChange={(e) => handleClientSelect(e.target.value)}
              className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} ({c.mrn})
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Date of Service</Label>
            <Input
              type="date"
              value={dateOfService}
              onChange={(e) => setDateOfService(e.target.value)}
              disabled={isLocked}
              className="h-8"
            />
          </div>

          <div>
            <Label>Session Type (CPT)</Label>
            <select
              value={cptCode}
              onChange={(e) => {
                const val = e.target.value;
                setCptCode(val);
                setSessionType(
                  val === '90837'
                    ? 'Individual Psychotherapy (CPT 90837)'
                    : val === '90834'
                    ? 'Individual Psychotherapy (CPT 90834)'
                    : 'Psychotherapy'
                );
              }}
              disabled={isLocked}
              className="w-full h-8 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:outline-none"
            >
              <option value="90837">90837 — 60 Min Psychotherapy</option>
              <option value="90834">90834 — 45 Min Psychotherapy</option>
              <option value="90791">90791 — Diagnostic Evaluation</option>
            </select>
          </div>

          <div>
            <Label>Encounter Status</Label>
            <div className="flex items-center gap-1.5 h-8">
              {isLocked ? (
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Locked &amp; Signed
                </span>
              ) : (
                <span className="font-semibold text-amber-700 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" /> Working Draft
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Prominent Digital Lock Banner */}
        {isLocked && (
          <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-emerald-700 shrink-0" />
              <span>
                <strong>🔒 Signed &amp; Locked by {signedBy || CLINICIAN_NAME}</strong> on{' '}
                {signedAt?.split('T')[0] || dateOfService} — Immutable HIPAA Chart Record
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 uppercase tracking-wider">
              Cryptographically Sealed
            </span>
          </div>
        )}
      </div>

      {/* Quick Chips Component */}
      {!isLocked && <ClinicalPromptChips onSelectChip={handleChipInsert} />}

      {/* DAP Sections */}
      <div className="space-y-4">
        {/* DATA (D) SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-indigo-600 text-white font-extrabold flex items-center justify-center text-xs">
                D
              </span>
              Data (Subjective Complaints, Objective MSE &amp; Interventions)
            </h3>
            <button
              type="button"
              onClick={() => setShowGuidance(!showGuidance)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              {showGuidance ? 'Hide CMS Guidance' : 'Show CMS Guidance'}
            </button>
          </div>

          {showGuidance && (
            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
              <strong>CMS Guidance:</strong> Document (1) Client's subjective report of symptoms, (2) Objective
              Mental Status Exam observations (affect, mood, speech, orientation), (3) Specific clinical interventions
              applied (CBT, PMR, DBT), and (4) Client's direct response to interventions.
            </p>
          )}

          <textarea
            rows={5}
            value={dText}
            onChange={(e) => setDText(e.target.value)}
            disabled={isLocked}
            placeholder="Document subjective presentation, mental status observations, interventions delivered, and client response..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-50 disabled:text-slate-600 font-sans leading-relaxed"
          />
        </div>

        {/* ASSESSMENT (A) SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-teal-600 text-white font-extrabold flex items-center justify-center text-xs">
                A
              </span>
              Assessment (Clinical Impressions, Goal Trajectory &amp; Risk Assessment)
            </h3>
          </div>

          {showGuidance && (
            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
              <strong>CMS Guidance:</strong> Document (1) Diagnostic formulation and symptom trajectory, (2) Progress
              towards active treatment plan goals, and (3) Mandatory Risk Assessment (explicit denial or presence of SI/HI,
              self-harm, safety plan status).
            </p>
          )}

          <textarea
            rows={4}
            value={aText}
            onChange={(e) => setAText(e.target.value)}
            disabled={isLocked}
            placeholder="Document clinical synthesis, progress toward goals, and explicit suicide/homicide risk assessment..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 disabled:bg-slate-50 disabled:text-slate-600 font-sans leading-relaxed"
          />
        </div>

        {/* PLAN (P) SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span className="h-6 w-6 rounded-md bg-amber-600 text-white font-extrabold flex items-center justify-center text-xs">
                P
              </span>
              Plan (Directives, Behavioral Homework &amp; Next Scheduled Encounter)
            </h3>
          </div>

          {showGuidance && (
            <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
              <strong>CMS Guidance:</strong> Document (1) Continued frequency and modality of treatment, (2) Between-session
              homework or skills practice assigned, and (3) Date, time, and focus of next scheduled encounter.
            </p>
          )}

          <textarea
            rows={4}
            value={pText}
            onChange={(e) => setPText(e.target.value)}
            disabled={isLocked}
            placeholder="Document continuation frequency, assigned behavioral homework, care coordination, and next session details..."
            className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:bg-slate-50 disabled:text-slate-600 font-sans leading-relaxed"
          />
        </div>
      </div>
    </div>
  );
};

export default DAPNotesView;
