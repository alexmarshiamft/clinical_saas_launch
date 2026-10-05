/**
 * Feature 8: Client Profile View
 * Comprehensive patient charting with 4 tabs:
 * Demographics, Encounters, Treatment Plans, Notes History
 */

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Target,
  User,
  Video,
  Mail,
  Phone,
  MapPin,
  Shield,
  CreditCard,
  Lock,
  Sparkles,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { useClinicalContext } from '@/lib/clinical-context';
import {
  getClientById,
  getAppointments,
  getNotesByClientId,
  getTreatmentPlanByClientId,
} from './data/theraflow-store';
import {
  ClientRecord,
  CalendarEventRecord,
  DAPNote,
  TreatmentPlan,
} from './types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface ClientProfileViewProps {
  clientId: string;
  onBack?: () => void;
  onNavigateToTelehealth?: (clientId: string) => void;
  onNavigateToCalendar?: (clientId: string) => void;
}

function calculateAge(dobStr: string): number {
  if (!dobStr) return 35;
  const dob = new Date(dobStr);
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

export const ClientProfileView: React.FC<ClientProfileViewProps> = ({
  clientId,
  onBack,
  onNavigateToTelehealth,
  onNavigateToCalendar,
}) => {
  const { activePatient, setActivePatient, sendToPhiScrubber } = useClinicalContext();
  const [client, setClient] = useState<ClientRecord | null>(null);
  const [appointments, setAppointments] = useState<CalendarEventRecord[]>([]);
  const [notes, setNotes] = useState<DAPNote[]>([]);
  const [treatmentPlan, setTreatmentPlan] = useState<TreatmentPlan | null>(null);
  const [activeTab, setActiveTab] = useState('demographics');

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      const c = await getClientById(clientId);
      if (mounted) setClient(c);

      const allAppts = await getAppointments();
      if (mounted) {
        setAppointments(allAppts.filter((a) => a.client_id === clientId));
      }

      const clientNotes = await getNotesByClientId(clientId);
      if (mounted) setNotes(clientNotes);

      const plan = await getTreatmentPlanByClientId(clientId);
      if (mounted) setTreatmentPlan(plan);
    }
    fetchData();
    return () => {
      mounted = false;
    };
  }, [clientId]);

  if (!client) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <p className="text-sm font-semibold mb-3">Loading patient clinical chart...</p>
        <Button variant="outline" onClick={onBack}>
          Return to Patient Roster
        </Button>
      </div>
    );
  }

  const isActiveInContext = activePatient.id === client.id;

  const handleSetActive = () => {
    const fullName = `${client.first_name} ${client.last_name}`;
    setActivePatient({
      id: client.id,
      name: fullName,
      dob: client.date_of_birth,
      age: calculateAge(client.date_of_birth),
      mrn: client.mrn || `#MC-${client.id.slice(0, 5).toUpperCase()}`,
      cptCode: '90837',
      cptDesc: 'Psychotherapy (60m)',
      encounterId: `enc-${client.id}-${Date.now()}`,
      nextAppt: client.recent_session_date ? `Recent: ${client.recent_session_date}` : 'Today at 10:00 AM',
    });
    toast.success(`Active patient chart set to ${fullName}. Synced with Scribe, Aura & Scrubber.`);
  };

  const handleSendToScrubber = (note: DAPNote) => {
    const fullText = `PATIENT: ${client.first_name} ${client.last_name} (${client.mrn})\nDOB: ${client.date_of_birth}\nDATE OF SERVICE: ${note.date_of_service}\n\nDATA:\n${note.d_text}\n\nASSESSMENT:\n${note.a_text}\n\nPLAN:\n${note.p_text}`;
    sendToPhiScrubber(fullText);
    toast.success(`DAP Progress Note dispatched to HIPAA PHI Scrubber!`);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="h-9 w-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
              title="Back to Roster"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-extrabold text-slate-900">
                  {client.first_name} {client.last_name}
                </h1>
                <Badge
                  variant={
                    client.status === 'active'
                      ? 'emerald'
                      : client.status === 'on_hold'
                      ? 'amber'
                      : 'slate'
                  }
                  className="capitalize"
                >
                  {client.status.replace('_', ' ')}
                </Badge>
                {isActiveInContext && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    <Sparkles className="h-3 w-3" /> Active in Scribe &amp; Copilot
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                MRN: {client.mrn || `#MC-${client.id.slice(0, 5).toUpperCase()}`} • DOB:{' '}
                {client.date_of_birth} ({calculateAge(client.date_of_birth)} yrs) • ICD-10:{' '}
                {client.diagnosis_code} ({client.diagnosis_label})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant={isActiveInContext ? 'secondary' : 'default'}
              onClick={handleSetActive}
              disabled={isActiveInContext}
              className="flex items-center gap-1.5"
            >
              {isActiveInContext ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Active Chart
                </>
              ) : (
                'Set as Active Patient'
              )}
            </Button>
          </div>
        </div>

        {/* 4 Clinical Chart Tabs */}
        <div className="pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 max-w-xl">
              <TabsTrigger value="demographics" className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Demographics
              </TabsTrigger>
              <TabsTrigger value="encounters" className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Encounters ({appointments.length})
              </TabsTrigger>
              <TabsTrigger value="treatment-plans" className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" /> Treatment Plan
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Notes History ({notes.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Demographics */}
            <TabsContent value="demographics" className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Contact Coordinates */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-indigo-600" /> Contact Coordinates
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Email:</span>
                      <span className="text-slate-900 font-semibold">{client.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Phone:</span>
                      <span className="text-slate-900 font-mono">{client.phone}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Address:</span>
                      <span className="text-slate-700">{client.address || 'San Francisco, CA'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Emergency Contact:</span>
                      <span className="text-slate-700">Primary Contact on File</span>
                    </div>
                  </div>
                </div>

                {/* Clinical Baseline */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-indigo-600" /> Clinical Baseline
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Primary Diagnosis:</span>
                      <span className="text-indigo-800 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block mt-0.5">
                        {client.diagnosis_code} — {client.diagnosis_label}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Intake Date:</span>
                      <span className="text-slate-900">{client.created_at.split('T')[0]}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Clinical Status:</span>
                      <Badge variant="emerald" className="mt-0.5 capitalize">
                        {client.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Recent Session:</span>
                      <span className="text-slate-900 font-medium">
                        {client.recent_session_date || 'No completed sessions logged'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payer & Billing */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 text-indigo-600" /> Payer &amp; Billing
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium block">Insurance Carrier:</span>
                      <span className="text-slate-900 font-semibold">
                        {client.insurance_payer || 'Self-Pay / Commercial Fee'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Policy / Member ID:</span>
                      <span className="text-slate-900 font-mono">
                        {client.member_id || '#MEM-881920'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Session Fee:</span>
                      <span className="text-emerald-700 font-bold">${client.fee}.00 / session</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block">Default CPT Procedure:</span>
                      <span className="text-slate-900 font-mono">90837 (60m Psychotherapy)</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: Encounters */}
            <TabsContent value="encounters" className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Clinical Encounters &amp; Appointments
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onNavigateToCalendar?.(client.id)}
                >
                  Schedule Appointment
                </Button>
              </div>

              {appointments.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  No appointments found for this patient.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {appointments.map((appt) => (
                    <div
                      key={appt.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{appt.session_type}</span>
                          <Badge
                            variant={
                              appt.status === 'completed'
                                ? 'emerald'
                                : appt.status === 'scheduled'
                                ? 'blue'
                                : 'destructive'
                            }
                            className="capitalize text-[10px]"
                          >
                            {appt.status}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {appt.location}
                          </Badge>
                        </div>
                        <div className="text-slate-500 font-mono text-[11px]">
                          {appt.start_time.split('T')[0]} at{' '}
                          {appt.start_time.split('T')[1]?.slice(0, 5) || '10:00'} UTC
                        </div>
                        {appt.notes && <p className="text-slate-600 text-[11px]">{appt.notes}</p>}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {appt.location === 'Telehealth' && (
                          <Button
                            size="sm"
                            className="flex items-center gap-1.5"
                            onClick={() => onNavigateToTelehealth?.(client.id)}
                          >
                            <Video className="h-3.5 w-3.5" />
                            Join Telehealth Room
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Treatment Plans */}
            <TabsContent value="treatment-plans" className="pt-4">
              {treatmentPlan ? (
                <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        Active Master Treatment Plan
                      </h4>
                      <p className="text-slate-500 text-[11px]">
                        Target Review: {treatmentPlan.target_completion_date} (Cycle:{' '}
                        {treatmentPlan.review_frequency.replace('_', ' ')})
                      </p>
                    </div>
                    <Badge variant="emerald" className="capitalize">
                      {treatmentPlan.status}
                    </Badge>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      Problem Statement:
                    </span>
                    <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                      {treatmentPlan.problem_statement}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block mb-1">Long-Term Goal:</span>
                    <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                      {treatmentPlan.long_term_goals}
                    </p>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block mb-2">
                      Short-Term Objectives:
                    </span>
                    <div className="space-y-2">
                      {treatmentPlan.objectives.map((obj, i) => (
                        <div
                          key={obj.id || i}
                          className="flex items-start gap-2.5 p-2.5 rounded-lg border border-slate-200 bg-slate-50/75"
                        >
                          <span className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1">
                            <p className="text-slate-900 font-medium">{obj.description}</p>
                            <span className="text-slate-500 text-[10px] font-mono">
                              Target Date: {obj.target_date} • Status: {obj.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold text-slate-700 block mb-1">
                      Clinical Interventions:
                    </span>
                    <p className="text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed">
                      {treatmentPlan.interventions}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <p className="mb-2">No active treatment plan created for this patient.</p>
                  <Button size="sm">Create Treatment Plan</Button>
                </div>
              )}
            </TabsContent>

            {/* TAB 4: Notes History */}
            <TabsContent value="notes" className="pt-4">
              {notes.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  No progress notes filed for this patient.
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="p-5 rounded-xl border border-slate-200 bg-white space-y-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            Date of Service: {note.date_of_service}
                          </span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            ({note.session_type})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {note.is_locked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Lock className="h-3 w-3" /> Signed &amp; Locked
                            </span>
                          ) : (
                            <Badge variant="amber" className="text-[10px]">
                              Draft
                            </Badge>
                          )}

                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleSendToScrubber(note)}
                            className="flex items-center gap-1"
                          >
                            <Share2 className="h-3 w-3" />
                            Send to PHI Scrubber
                          </Button>
                        </div>
                      </div>

                      {/* D Section */}
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">
                          Data (D) — Subjective &amp; Observations:
                        </span>
                        <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                          {note.d_text}
                        </p>
                      </div>

                      {/* A Section */}
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">
                          Assessment (A) — Clinical Impressions &amp; Risk:
                        </span>
                        <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                          {note.a_text}
                        </p>
                      </div>

                      {/* P Section */}
                      <div>
                        <span className="font-bold text-slate-700 block mb-0.5">
                          Plan (P) — Directives &amp; Next Steps:
                        </span>
                        <p className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                          {note.p_text}
                        </p>
                      </div>

                      {note.signed_by && (
                        <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 font-mono">
                          Signed by: {note.signed_by} ({note.clinician_credentials || 'MD'}) on{' '}
                          {note.signed_at?.split('T')[0] || note.date_of_service}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default ClientProfileView;
