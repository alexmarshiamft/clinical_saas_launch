import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Sparkles,
  Stethoscope,
  Mic,
  ShieldCheck,
  Calendar,
  CreditCard,
  Video,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  Play,
  Layers,
  Zap,
  Info,
  ExternalLink,
  Shield,
  Crown,
  Activity,
  User,
  RefreshCw,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { useDemoGuide, DemoGuideTab } from '@/lib/demo-guide-context';
import { useSubscription, SubscriptionTier, SUBSCRIPTION_PLANS, getTierBadgeInfo } from '@/lib/subscription';
import { useClinicalContext, DEFAULT_PATIENT, Patient } from '@/lib/clinical-context';
import { useAuth } from '@/lib/auth';

const SAMPLE_PHI_TEXT = `CLINICAL CONSULTATION NOTE
PATIENT NAME: Jane Marilyn Doe
DOB: April 12, 1988 (Age: 38)
SSN: 000-45-6789
MRN: #MC-88219
ADDRESS: 450 Sutter Street, Suite 1200, San Francisco, CA 94108
PHONE: (415) 555-0199 | FAX: (415) 555-0198
EMAIL: jane.m.doe@californiahealth-sample.org
EMPLOYER: Bay Area Tech Innovations Inc.
HEALTH PLAN ID: BCBS-CA-9948201A | GROUP #: GRP-88412
ACCOUNT NUMBER: ACCT-99120485
ENCOUNTER DATE: October 05, 2026 at 10:00 AM
FACILITY: UCSF Parnassus Medical Pavilion, Room 402B
DEVICE SERIAL #: MED-PACEMAKER-SN-88294-X
IP ADDRESS: 192.168.1.104 | PORTAL URL: https://patient.bayareaclinic.org/portal/jane-doe
BIOMETRIC IDENTIFIER: Right retina scan verified (ID: RET-9941-A)

CHIEF COMPLAINT & SUBJECTIVE:
Jane Doe presents for a follow-up cognitive behavioral therapy session. Reports worsening panic attacks and somatic anxiety when commuting over the Golden Gate Bridge to her office in downtown San Francisco. Her spouse, Robert Doe, noted increased insomnia over the past 3 weeks.

OBJECTIVE & CLINICAL FINDINGS:
Blood Pressure: 128/82 mmHg, Pulse: 78 bpm. Mental status exam shows intact orientation to person, place, and time. Affect congruent with anxious mood. Speech fluent without latency. Denies suicidal or homicidal ideation.

ASSESSMENT:
1. Generalized Anxiety Disorder (ICD-10 F41.1) with secondary agoraphobia (F40.00).
2. Primary Insomnia associated with chronic workplace stress (G47.00).

PLAN & RECOMMENDATIONS:
Continue weekly individual psychotherapy (CPT 90837). Refill Sertraline 50mg daily. Patient will follow up with Dr. Sarah Chen, MD on October 19, 2026.`;

const SAMPLE_SCRIBE_TRANSCRIPT = `[00:00] Dr. Sarah Chen: Good morning Jane, thank you for joining our telehealth session today. How have things been since we adjusted your sleep schedule?
[00:08] Jane Doe: Good morning Dr. Chen. The stimulus control routine helped quite a bit—I fell asleep in under 20 minutes on four nights this week. But my morning anxiety before meetings is still quite intense.
[00:22] Dr. Sarah Chen: That is meaningful progress on the sleep onset latency. Let's look closer at the morning anxiety. What somatic sensations do you experience around 8:00 AM?
[00:32] Jane Doe: Chest tightness, rapid breathing, and catastrophic thoughts about missing deadlines. It usually lasts about 30 to 45 minutes until I get to my desk.
[00:46] Dr. Sarah Chen: Let's introduce a diaphragmatic breathing cycle right when that physical sensation peaks. We will also maintain our weekly 60-minute CBT protocol under CPT 90837.`;

export const DemoGuideModal: React.FC = () => {
  const { isOpen, closeGuide, activeTab, setActiveTab, journeyStep, setJourneyStep, nextJourneyStep, prevJourneyStep } = useDemoGuide();
  const { tier, status, updateTier, isSubscribed } = useSubscription();
  const clinical = useClinicalContext();
  const { user, loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLaunchStep = (path: string, options?: { injectPhi?: boolean; injectTranscript?: boolean }) => {
    if (!user) loginAsDemo();

    if (options?.injectPhi) {
      clinical.sendToPhiScrubber(SAMPLE_PHI_TEXT);
    }
    if (options?.injectTranscript) {
      clinical.updateNoteField('rawTranscript', SAMPLE_SCRIBE_TRANSCRIPT);
    }

    closeGuide();
    navigate(path);
  };

  const handleTierChange = (newTier: SubscriptionTier) => {
    updateTier(newTier);
  };

  const samplePatients: Patient[] = [
    {
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
    },
    {
      id: 'p-102',
      name: 'Marcus Vance',
      dob: '11/03/1992',
      age: 34,
      phone: '(415) 555-0144',
      mrn: '#MC-91042',
      cptCode: '90834',
      cptDesc: 'Psychotherapy (45m)',
      encounterTime: '11:30 AM',
      nextAppt: 'Today at 11:30 AM',
      encounterId: 'enc-marcus-vance-90834',
    },
    {
      id: 'p-103',
      name: 'Elena Rostova',
      dob: '07/22/1985',
      age: 41,
      phone: '(415) 555-0177',
      mrn: '#MC-77312',
      cptCode: '90791',
      cptDesc: 'Intake Evaluation (90m)',
      encounterTime: '02:00 PM',
      nextAppt: 'Today at 2:00 PM',
      encounterId: 'enc-elena-rostova-90791',
    },
  ];

  // Clinical Journey Steps
  const journeySteps = [
    {
      step: 1,
      title: 'Patient Intake & Calendar',
      category: 'TheraFlow EHR',
      icon: Calendar,
      color: 'indigo',
      path: '/dashboard/calendar',
      description: 'Review the interactive appointment calendar, select active patients, and view client history and insurance coverage.',
      demoAction: 'Open Appointment Calendar',
      highlights: [
        'Interactive weekly and monthly calendar views with real-time slot booking',
        'Automatic CPT billing codes mapped per session duration (90837, 90834, 90791)',
        'Unified active patient encounter context synced across all tools in the header',
      ],
    },
    {
      step: 2,
      title: 'HD Telehealth Video Room',
      category: 'TheraFlow EHR',
      icon: Video,
      color: 'teal',
      path: '/dashboard/telehealth',
      description: 'Launch the browser-based, encrypted WebRTC clinical telehealth consultation room with live patient feed.',
      demoAction: 'Enter Telehealth Room',
      highlights: [
        'Browser-based HD video consultation with integrated mute, camera, and screen share controls',
        'Side-by-side clinical charting panel directly alongside the patient stream',
        'Zero plugins required, designed for strict clinical privacy',
      ],
    },
    {
      step: 3,
      title: 'Ambient AI Scribe Diarization',
      category: 'Clinical AI Scribe v2',
      icon: Mic,
      color: 'purple',
      path: '/dashboard/scribe',
      description: 'Experience real-time dual-speaker acoustic diarization separating clinician and patient voices with instant SOAP generation.',
      demoAction: 'Launch Ambient AI Scribe',
      injectTranscript: true,
      highlights: [
        'Acoustic waveform visualizer with live clinician vs. patient voice isolation',
        '6 specialized clinical note templates (SOAP, H&P, Referral, Aftercare, Specialty, Requisition)',
        'Automated ICD-10 diagnostic & CPT billing code reconciler with one-click chart sync',
        'Multi-EHR export adapters for Epic, Cerner, Athena, and clipboard',
      ],
    },
    {
      step: 4,
      title: 'Aura In-Workflow Copilot',
      category: 'Aura Assistant',
      icon: Sparkles,
      color: 'amber',
      path: '/dashboard/aura',
      description: 'Use the floating decision support copilot accessible anywhere in your workflow with DSM-5 search and typewriter SOAP notes.',
      demoAction: 'Launch Aura Copilot',
      highlights: [
        'Persistent floating action orb accessible across every EHR screen with Shadow DOM isolation',
        'DSM-5 differential diagnostic search and clinical evidence verification',
        'Typewriter streaming SOAP notes formulation with simulated dictation waveform',
        'One-click push directly to active EHR chart and PHI Scrubber',
      ],
    },
    {
      step: 5,
      title: '18 Safe Harbor PHI De-identification',
      category: 'HIPAA PHI Scrubber',
      icon: ShieldCheck,
      color: 'cyan',
      path: '/dashboard/phi-scrubber',
      description: 'Scrub 18 statutory HIPAA identifiers with synchronized side-by-side diff, entity tags, and forensic audit logs before sharing.',
      demoAction: 'Test PHI Scrubber Engine',
      injectPhi: true,
      highlights: [
        'Strict 18 statutory HIPAA Safe Harbor regex pattern engine executed 100% client-side in-browser',
        'Interactive masking styles: semantic Tag [PATIENT_NAME], Block ████, or Asterisk ***',
        'Forensic Redaction Audit Table with confidence scores, exact character offsets, and JSON export',
        'Cross-tool clinical pipeline: seamless flow from Scribe & Aura directly into Scrubber',
      ],
    },
    {
      step: 6,
      title: 'EHR Charting & CMS-1500 Billing',
      category: 'TheraFlow EHR',
      icon: CreditCard,
      color: 'emerald',
      path: '/dashboard/billing',
      description: 'Complete the encounter by locking DAP progress notes, generating patient invoices, and producing CMS-1500 Superbills.',
      demoAction: 'View Invoices & Superbills',
      highlights: [
        'One-click CMS-1500 compliant insurance Superbill generation with ICD-10 and CPT codes',
        'Automated patient invoice creation with payment status tracking and Stripe integration',
        'HIPAA cryptographic audit log registering every chart edit and export event',
      ],
    },
  ];

  const currentJourney = journeySteps[journeyStep];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="demo-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
        {/* Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-indigo-900/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="demo-guide-title" className="text-lg font-bold tracking-tight text-white">
                  TheraFlow Clinical Platform — Demo &amp; Feature Guide
                </h2>
                <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  Interactive Tour
                </span>
              </div>
              <p className="text-xs text-indigo-200/80">
                Explore the 4 unified clinical suites, run the complete clinical journey, or simulate subscription tiers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700">
              <kbd className="font-mono text-indigo-300">?</kbd> to toggle
            </span>
            <button
              onClick={closeGuide}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Close guide"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Prominent Legal Disclaimer / Synthetic Data CYA Banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-start sm:items-center gap-2.5 text-xs text-amber-950 shrink-0">
          <ShieldAlert className="h-4 w-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
          <div className="leading-snug">
            <strong>LEGAL NOTICE &amp; SYNTHETIC DATA DISCLAIMER:</strong> All clinical data, patient profiles (e.g. <em>Jane Doe, Marcus Vance, Elena Rostova</em>), MRNs, dates, clinical notes, and transcripts throughout this platform are <strong>100% synthetic, fictional, and simulated</strong>. None of the data is real, no real persons are portrayed, and <strong>NO actual Protected Health Information (PHI)</strong> is present or stored. Any resemblance to real persons is purely coincidental.
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0 select-none">
          <button
            onClick={() => setActiveTab('journey')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'journey'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
            }`}
          >
            <Play className="h-4 w-4" />
            <span>Interactive Clinical Journey</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-bold">
              6 Steps
            </span>
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'catalog'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Feature Catalog &amp; Suites</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-semibold">
              4 Tools + OS
            </span>
          </button>

          <button
            onClick={() => setActiveTab('sandbox')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'sandbox'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Live Sandbox &amp; Tiers</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              Active: {tier.toUpperCase()}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('compliance')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'compliance'
                ? 'bg-white text-indigo-600 border-indigo-600 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 border-transparent hover:bg-slate-100/60'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>HIPAA 18 Safe Harbor Spec</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {/* ============================================================== */}
          {/* TAB 1: INTERACTIVE CLINICAL JOURNEY                             */}
          {/* ============================================================== */}
          {activeTab === 'journey' && (
            <div className="space-y-6">
              {/* Stepper Timeline Navigation */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Clinical Encounter Lifecycle
                  </span>
                  <span className="text-xs font-semibold text-indigo-600">
                    Step {journeyStep + 1} of {journeySteps.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {journeySteps.map((s, idx) => {
                    const IconComponent = s.icon;
                    const isActive = journeyStep === idx;
                    const isCompleted = journeyStep > idx;
                    return (
                      <button
                        key={s.step}
                        onClick={() => setJourneyStep(idx)}
                        className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                          isActive
                            ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 shadow-sm'
                            : isCompleted
                            ? 'bg-emerald-50/50 border-emerald-200 text-slate-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isActive
                                ? 'bg-indigo-600 text-white'
                                : isCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {isCompleted ? <Check className="h-3 w-3" /> : s.step}
                          </span>
                          <IconComponent
                            className={`h-4 w-4 ${
                              isActive ? 'text-indigo-600' : isCompleted ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          />
                        </div>
                        <div className="text-[11px] font-bold leading-tight truncate">{s.title}</div>
                        <div className="text-[9px] text-slate-500 font-medium truncate">{s.category}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Step Showcase Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-md p-6 relative overflow-hidden">
                <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                        Step {currentJourney.step} of 6 • {currentJourney.category}
                      </span>
                      <span className="text-xs text-slate-500">• Route: {currentJourney.path}</span>
                    </div>

                    <div>
                      <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
                        {currentJourney.title}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                        {currentJourney.description}
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Key Features to Observe in this Demo:
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-600">
                        {currentJourney.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Step Action Buttons */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <button
                        onClick={() =>
                          handleLaunchStep(currentJourney.path, {
                            injectPhi: currentJourney.injectPhi,
                            injectTranscript: currentJourney.injectTranscript,
                          })
                        }
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-200 hover:shadow-lg transition-all cursor-pointer"
                      >
                        <Play className="h-4 w-4 fill-white" />
                        <span>{currentJourney.demoAction}</span>
                        <ArrowRight className="h-4 w-4" />
                      </button>

                      {currentJourney.injectPhi && (
                        <button
                          onClick={() => {
                            clinical.sendToPhiScrubber(SAMPLE_PHI_TEXT);
                            closeGuide();
                            navigate('/dashboard/phi-scrubber');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-800 font-bold text-xs hover:bg-cyan-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ShieldCheck className="h-4 w-4 text-cyan-600" />
                          <span>Pre-load Chart with 18 PHI Rules</span>
                        </button>
                      )}

                      {currentJourney.injectTranscript && (
                        <button
                          onClick={() => {
                            clinical.updateNoteField('rawTranscript', SAMPLE_SCRIBE_TRANSCRIPT);
                            closeGuide();
                            navigate('/dashboard/scribe');
                          }}
                          className="px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 font-bold text-xs hover:bg-purple-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Mic className="h-4 w-4 text-purple-600" />
                          <span>Pre-load Diarized Audio</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Right side helper info */}
                  <div className="w-full lg:w-72 bg-gradient-to-b from-indigo-50/80 to-slate-50 p-4 rounded-xl border border-indigo-100 shrink-0 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                      <User className="h-4 w-4 text-indigo-600" />
                      <span>Active Encounter Context</span>
                    </div>

                    <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                      <div className="font-bold text-slate-800">{clinical.activePatient.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        DOB: {clinical.activePatient.dob} ({clinical.activePatient.age || 38} yo)
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        MRN: {clinical.activePatient.mrn} • CPT: {clinical.activePatient.cptCode}
                      </div>
                      <div className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold inline-block">
                        Encounter Synced Across 4 Suites
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500 leading-normal">
                      Every tool in TheraFlow shares this live context so patient notes, audio transcripts, and claims flow automatically without double-entry.
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-indigo-100">
                      <button
                        onClick={prevJourneyStep}
                        disabled={journeyStep === 0}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Previous step"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <span className="text-[11px] font-bold text-slate-500">
                        {journeyStep + 1} / {journeySteps.length}
                      </span>
                      <button
                        onClick={nextJourneyStep}
                        disabled={journeyStep === journeySteps.length - 1}
                        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        title="Next step"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: FEATURE CATALOG & THE 4 CORE TOOLS                       */}
          {/* ============================================================== */}
          {activeTab === 'catalog' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TOOL 1: EHR & TELEHEALTH */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Starter &amp; Pro
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">TheraFlow Clinical EHR &amp; Telehealth</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Full clinical practice operating system for solo practitioners and group clinics. Charting, scheduling, video consultations, and billing in one unified interface.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider mb-1">
                        Key Capabilities:
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Interactive Appointment Calendar (drag-and-drop slots)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Client Roster with clinical case files and contact info</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>DAP Progress Notes &amp; Treatment Plan builder</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Encrypted WebRTC Telehealth Room with side-by-side charting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>CMS-1500 Superbill &amp; patient invoice generator</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleLaunchStep('/dashboard/ehr')}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Explore EHR Roster</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleLaunchStep('/dashboard/calendar')}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      View Calendar →
                    </button>
                  </div>
                </div>

                {/* TOOL 2: CLINICAL AI SCRIBE V2 */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
                        <Mic className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                        Pro Tier
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Clinical AI Scribe v2</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Ambient listening engine with dual-speaker acoustic diarization that isolates clinician and patient voices in real time, automatically formatting structured notes.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider mb-1">
                        Key Capabilities:
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span>Real-Time Waveform &amp; Acoustic Voice Separation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span>6 Specialty Templates (SOAP, H&amp;P, Referral, Aftercare, etc.)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span>Interactive Template Studio to design custom note structures</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span>Automated ICD-10 diagnostic &amp; CPT billing code reconciler</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span>Multi-EHR Export Adapters (Epic, Cerner, Athena, Clipboard)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleLaunchStep('/dashboard/scribe', { injectTranscript: true })}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Launch Scribe Workspace</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleLaunchStep('/dashboard/scribe/templates')}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Template Studio →
                    </button>
                  </div>
                </div>

                {/* TOOL 3: AURA ASSISTANT COPILOT */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                        Pro Tier
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">Aura Assistant Copilot</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        In-workflow clinical decision support assistant available via fullscreen studio or floating action orb accessible across every screen in the EHR.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider mb-1">
                        Key Capabilities:
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Floating Action Orb overlay with Shadow DOM CSS isolation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>DSM-5 Differential Diagnostic criteria verification</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Simulated Audio Visualizer &amp; Dictation Capture</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>Typewriter Streaming Note Formulator with clinical snippets</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span>One-click bridge into PHI Scrubber and TheraFlow notes</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleLaunchStep('/dashboard/aura')}
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Aura Studio</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <span className="text-xs text-slate-500">
                      Look for bottom-right orb ✦
                    </span>
                  </div>
                </div>

                {/* TOOL 4: HIPAA PHI SCRUBBER */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-10 w-10 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                        Starter &amp; Pro
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-slate-900">HIPAA Safe Harbor PHI Scrubber</h3>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        Statutory 18-rule HIPAA Safe Harbor redaction aid running 100% locally in your browser to scrub known identifier patterns before transmission.
                      </p>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="font-semibold text-slate-900 text-[11px] uppercase tracking-wider mb-1">
                        Key Capabilities:
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                        <span>All 18 Statutory HIPAA Safe Harbor regex classifications</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                        <span>Synchronized side-by-side redacted diff viewer</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                        <span>3 Masking Styles: Semantic Tags, Blackout Block, Asterisks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                        <span>Forensic Entity Taxonomy Table with confidence scores &amp; JSON</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                        <span>Cross-tool clinical bridge receiving notes directly from Aura/Scribe</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleLaunchStep('/dashboard/phi-scrubber', { injectPhi: true })}
                      className="text-xs font-bold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Test PHI Scrubber (Pre-loaded)</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleLaunchStep('/dashboard/audit-logs')}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      Audit Logs →
                    </button>
                  </div>
                </div>
              </div>

              {/* Underlying Infrastructure & SaaS Engines */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Underlying Platform Infrastructure
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                      <CreditCard className="h-4 w-4 text-indigo-600" />
                      <span>Stripe 3-Tier Billing</span>
                    </div>
                    <p className="text-slate-600">
                      Starter ($49), Clinician Pro ($99), Practice Group ($249) with sandbox simulation and dynamic &lt;SubscriptionGate&gt; route protection.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Dual-Engine Authentication</span>
                    </div>
                    <p className="text-slate-600">
                      Supabase Auth for production JWT sessions paired with a 1-click deterministic demo clinician profile (Dr. Sarah Chen, MD).
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                      <Layers className="h-4 w-4 text-purple-600" />
                      <span>Scoped CSS &amp; Shadow DOM</span>
                    </div>
                    <p className="text-slate-600">
                      Tailwind CSS v4 with .heidi-scribe-theme scoping and Shadow DOM encapsulation preventing any global CSS bleed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 3: DEMO SANDBOX CONTROLS & TEST TOOLS                       */}
          {/* ============================================================== */}
          {activeTab === 'sandbox' && (
            <div className="space-y-6">
              {/* SECTION 1: SIMULATE SUBSCRIPTION TIERS */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span>Simulate Subscription Tiers (Live Gate Testing)</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Switch tiers to test how feature access gates react. Notice that Starter locks Scribe &amp; Aura, while Pro unlocks all 4 suites.
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-semibold block">CURRENT TIER</span>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      {tier.toUpperCase()} ({status})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* STARTER */}
                  <div
                    onClick={() => handleTierChange('starter')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      tier === 'starter'
                        ? 'border-sky-500 bg-sky-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">Starter Tier</span>
                      <span className="text-xs font-mono font-bold text-sky-700">$49/mo</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Unlocks EHR &amp; PHI Scrubber. Locks Scribe &amp; Aura.</p>
                    <div className="mt-2 text-[10px] font-bold text-sky-700">
                      {tier === 'starter' ? '✓ Currently Active' : 'Click to Simulate Starter →'}
                    </div>
                  </div>

                  {/* PRO */}
                  <div
                    onClick={() => handleTierChange('pro')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      tier === 'pro'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">Clinician Pro (Flagship)</span>
                      <span className="text-xs font-mono font-bold text-indigo-700">$99/mo</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Unlocks all 4 suites: EHR, Scribe v2, Aura, PHI Scrubber.</p>
                    <div className="mt-2 text-[10px] font-bold text-indigo-700">
                      {tier === 'pro' ? '✓ Currently Active' : 'Click to Simulate Pro →'}
                    </div>
                  </div>

                  {/* GROUP */}
                  <div
                    onClick={() => handleTierChange('group')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      tier === 'group'
                        ? 'border-purple-600 bg-purple-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-slate-900">Practice Group</span>
                      <span className="text-xs font-mono font-bold text-purple-700">$249/mo</span>
                    </div>
                    <p className="text-[11px] text-slate-500">Multi-provider license with centralized practice billing.</p>
                    <div className="mt-2 text-[10px] font-bold text-purple-700">
                      {tier === 'group' ? '✓ Currently Active' : 'Click to Simulate Group →'}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2: ACTIVE PATIENT ENCOUNTER SWITCHER */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <User className="h-4 w-4 text-indigo-600" />
                    <span>Select Active Patient Encounter</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Click any patient to instantly bind their MRN, DOB, and CPT billing code into the global clinical context.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {samplePatients.map((p) => {
                    const isSelected = clinical.activePatient.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => clinical.setActivePatient(p)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/60 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{p.name}</span>
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-indigo-600" />}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          DOB: {p.dob} • {p.mrn}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          <span className="font-semibold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                            CPT: {p.cptCode}
                          </span>
                          <span className="text-slate-500">{p.encounterTime}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 3: PRE-LOAD SAMPLE CLINICAL TEST DATA */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-teal-600" />
                    <span>Pre-loaded Test Scenarios</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Quickly inject complex test narratives with PHI identifiers or dual-speaker audio transcripts into the tools.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Preset 1: PHI Rich Note */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-900">
                          18 Safe Harbor HIPAA Audit Payload
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">
                          18 Identifiers
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mb-3">
                        Contains patient name, SSN, MRN, address, phone, email, device serial #, IP address, retinal biometric, and medical encounter dates.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          clinical.sendToPhiScrubber(SAMPLE_PHI_TEXT);
                          closeGuide();
                          navigate('/dashboard/phi-scrubber');
                        }}
                        className="px-3.5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Send Directly to PHI Scrubber</span>
                      </button>
                      <button
                        onClick={() => handleCopy(SAMPLE_PHI_TEXT, 'phi')}
                        className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'phi' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedKey === 'phi' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Preset 2: Dual Speaker Scribe Audio Transcript */}
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-900">
                          Dual-Speaker Diarization Acoustic Feed
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          Audio &amp; Text
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mb-3">
                        Simulated consultation between Dr. Sarah Chen and Jane Doe discussing sleep onset latency, CBT homework, and panic symptom management.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          clinical.updateNoteField('rawTranscript', SAMPLE_SCRIBE_TRANSCRIPT);
                          closeGuide();
                          navigate('/dashboard/scribe');
                        }}
                        className="px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Mic className="h-3.5 w-3.5" />
                        <span>Load into AI Scribe v2</span>
                      </button>
                      <button
                        onClick={() => handleCopy(SAMPLE_SCRIBE_TRANSCRIPT, 'scribe')}
                        className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                      >
                        {copiedKey === 'scribe' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        <span>{copiedKey === 'scribe' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 4: HIPAA 18 SAFE HARBOR SPECIFICATION                       */}
          {/* ============================================================== */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-emerald-600" />
                      <span>Statutory 18 HIPAA Safe Harbor Identifier Checklist</span>
                    </h3>
                    <p className="text-xs text-slate-600 mt-1">
                      Under 45 CFR § 164.514(b)(2), health information is de-identified only when all 18 specified identifiers of the individual or of relatives, employers, or household members are removed.
                    </p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    18 / 18 Protected
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2">
                  {[
                    { id: '1', name: 'Names of Individuals', rule: 'First, middle, last, aliases', category: 'Identity' },
                    { id: '2', name: 'Geographic Subdivisions', rule: 'Street addresses, cities, counties, ZIP codes', category: 'Location' },
                    { id: '3', name: 'Dates', rule: 'Birth, admission, discharge, death dates & ages >89', category: 'Temporal' },
                    { id: '4', name: 'Telephone Numbers', rule: 'Standard domestic & international formats', category: 'Contact' },
                    { id: '5', name: 'Fax Numbers', rule: 'Clinical fax & transmission numbers', category: 'Contact' },
                    { id: '6', name: 'Email Addresses', rule: 'Personal, institutional, patient portal emails', category: 'Contact' },
                    { id: '7', name: 'Social Security Numbers', rule: 'SSN (standard 9-digit hyphenated & raw)', category: 'Government' },
                    { id: '8', name: 'Medical Record Numbers (MRN)', rule: 'Hospital, clinic & EHR patient IDs', category: 'Clinical' },
                    { id: '9', name: 'Health Plan Beneficiary Numbers', rule: 'Insurance policy, member & group IDs', category: 'Financial' },
                    { id: '10', name: 'Account Numbers', rule: 'Billing, bank & patient account numbers', category: 'Financial' },
                    { id: '11', name: 'Certificate / License Numbers', rule: 'Driver licenses, DEA #, clinical licenses', category: 'Government' },
                    { id: '12', name: 'Vehicle Identifiers (VIN & Plates)', rule: 'License plate numbers & VINs', category: 'Asset' },
                    { id: '13', name: 'Device Identifiers & Serial Numbers', rule: 'Pacemakers, insulin pumps, medical hardware', category: 'Device' },
                    { id: '14', name: 'Web Universal Resource Locators (URLs)', rule: 'Patient portals, clinic web addresses', category: 'Network' },
                    { id: '15', name: 'Internet Protocol (IP) Addresses', rule: 'IPv4 and IPv6 network identifiers', category: 'Network' },
                    { id: '16', name: 'Biometric Identifiers', rule: 'Fingerprints, retinal scans, voiceprints', category: 'Biometric' },
                    { id: '17', name: 'Full-Face Photographic Images', rule: 'Facial photographs & comparable images', category: 'Biometric' },
                    { id: '18', name: 'Any Other Unique Identifying Characteristic', rule: 'Custom barcodes, GUIDs, cryptographic keys', category: 'Unique ID' },
                  ].map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/50 hover:border-emerald-300 transition-colors flex items-start gap-2.5 text-xs"
                    >
                      <span className="h-5 w-5 rounded-md bg-emerald-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        {item.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 leading-tight truncate">{item.name}</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{item.rule}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs space-y-2 mt-4">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Client-Side Local Sandbox Guarantee</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    The HIPAA PHI Scrubber operates entirely within the clinician&apos;s browser memory. Raw patient narratives are parsed, analyzed, and redacted before any data can be transferred or exported. Every redaction event is recorded in an immutable forensic audit log.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>
              Logged in as: <strong>{user?.email || 'Dr. Sarah Chen, MD (Demo)'}</strong> • Tier: <strong>{tier.toUpperCase()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                closeGuide();
                navigate('/dashboard');
              }}
              className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Go to Command Center
            </button>
            <button
              onClick={() => {
                closeGuide();
                navigate('/dashboard/ehr');
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
            >
              <span>Explore Live Platform</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoGuideModal;
