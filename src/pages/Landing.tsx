import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Stethoscope,
  Mic,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Zap,
  Activity,
  Check,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useDemoGuide } from '@/lib/demo-guide-context';

export const Landing: React.FC = () => {
  const { user, loginAsDemo } = useAuth();
  const { openGuide } = useDemoGuide();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'ehr' | 'scribe' | 'aura' | 'phi'>('scribe');

  const handleInstantDemo = () => {
    loginAsDemo();
    navigate('/dashboard');
  };

  const coreTools = [
    {
      id: 'ehr',
      name: 'Clinical EHR & Telehealth',
      tag: 'Practice OS',
      icon: Stethoscope,
      headline: 'Complete Clinical Management Without Administrative Fatigue',
      description: 'Streamline patient charting, DSM-5 progress notes, interactive scheduling, and HD browser-based telehealth with automated billing and CMS-1500 Superbills.',
      highlights: [
        'DAP and SOAP Clinical Progress Notes',
        'Interactive Drag-and-Drop Appointment Calendar',
        'Built-in WebRTC Telehealth Video Sessions',
        'CMS-1500 Superbill & Client Invoicing Engine',
      ],
    },
    {
      id: 'scribe',
      name: 'Clinical AI Scribe v2',
      tag: 'Ambient Diarization',
      icon: Mic,
      headline: 'Next-Generation Multi-Speaker Ambient Scribe',
      description: 'Listen to clinical consultations and separate clinician and patient acoustic feeds in real time. Generates structured SOAP notes across 6 medical specialties.',
      highlights: [
        'Dual-Speaker Real-Time Acoustic Diarization',
        '6 Standard Formats: SOAP, H&P, Referral, Aftercare',
        'Interactive Template Studio for Custom Formats',
        'Automated ICD-10 & CPT Billing Code Suggester',
      ],
    },
    {
      id: 'aura',
      name: 'Aura Assistant',
      tag: 'In-Workflow Copilot',
      icon: Sparkles,
      headline: 'Non-Invasive Clinical Decision Support Everywhere',
      description: 'A floating assistant accessible across every screen in your EHR. Instant DSM-5 criteria verification, medical snippet expansions, and typewriter note generation.',
      highlights: [
        'Floating Assistant Orb & Shadow DOM Isolation',
        'Real-time Audio Visualizer & Dictation Capture',
        'DSM-5 Differential Diagnostic Search',
        'Typewriter Streaming Note Formulator',
      ],
    },
    {
      id: 'phi',
      name: 'HIPAA PHI Scrubber',
      tag: '18 Safe Harbor',
      icon: ShieldCheck,
      headline: 'Zero-Leak Statutory 18-Rule HIPAA Redaction',
      description: 'De-identify clinical narratives and notes in seconds before sharing. Enforces all 18 HIPAA Safe Harbor statutory identifiers with side-by-side diff and audit table.',
      highlights: [
        'Strict 18 Statutory Safe Harbor Regex Classifiers',
        'Synchronized Side-by-Side Redacted Diff Viewer',
        'Forensic Redaction Audit Logs with Confidence Scoring',
        'Client-Side Execution: Zero Unredacted Cloud Leakage',
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Announcement Bar */}
      <div className="bg-indigo-900 text-indigo-100 px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2">
        <span className="bg-indigo-700 text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
          New Release
        </span>
        <span>The 4 Core Clinical Tools are now unified into TheraFlow Clinical OS.</span>
        <button onClick={handleInstantDemo} className="underline font-bold hover:text-white cursor-pointer">
          Launch Live Clinician Demo →
        </button>
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              TheraFlow <span className="text-indigo-600">OS</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            <a href="#tools" className="hover:text-indigo-600 transition-colors">The 4 Tools</a>
            <a href="#pipeline" className="hover:text-indigo-600 transition-colors">Clinical Pipeline</a>
            <a href="#security" className="hover:text-indigo-600 transition-colors">HIPAA Security</a>
            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <NavLink
                to="/dashboard"
                className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm"
              >
                Go to Dashboard
              </NavLink>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-3 py-2"
                >
                  Sign In
                </NavLink>
                <NavLink
                  to="/investor"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/90 border border-slate-200 text-slate-700 font-bold text-xs transition-all"
                  title="View Series Seed Investor Presentation"
                >
                  <TrendingUp className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Investor Deck</span>
                </NavLink>
                <button
                  onClick={() => openGuide('journey')}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-sm flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 text-indigo-600" />
                  <span>Feature Guide</span>
                </button>
                <button
                  onClick={handleInstantDemo}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Zap className="h-4 w-4" />
                  <span>Instant Demo</span>
                </button>
                <NavLink
                  to="/login"
                  className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  Start Free Trial
                </NavLink>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold mb-6">
            <ShieldCheck className="h-4 w-4 text-indigo-600" />
            <span>Client-Side Safe Harbor Pattern Scrubber • Complete Telehealth Ecosystem</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 max-w-5xl mx-auto leading-tight">
            The Complete Telehealth &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-500">
              Clinical AI Scribe
            </span>{' '}
            Ecosystem.
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Replace four fragmented software subscriptions with one unified clinical operating system.
            Ambient multi-speaker diarization, in-workflow AI copilot, 18-rule PHI redaction, and complete EHR practice management.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={handleInstantDemo}
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-indigo-600 text-white font-bold text-base hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 group transition-all cursor-pointer"
            >
              <Zap className="h-5 w-5 text-indigo-200 group-hover:scale-110 transition-transform" />
              <span>Launch Demo Clinician (Dr. Sarah Chen, MD)</span>
            </button>
            <button
              onClick={() => openGuide('journey')}
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 border border-indigo-200 font-bold text-base shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <span>Explore Feature Guide</span>
            </button>
            <NavLink
              to="/login"
              className="w-full sm:w-auto px-6 py-4 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-base hover:bg-slate-50 shadow-sm flex items-center justify-center gap-2 transition-all"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="h-5 w-5 text-slate-400" />
            </NavLink>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> No credit card for demo
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> HIPAA BAA ready templates
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-600" /> Zero cloud data retention
            </span>
          </div>
        </div>
      </section>

      {/* The 4 Core Applications Interactive Showcase */}
      <section id="tools" className="py-20 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Four World-Class Tools. One Unified Workspace.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Each application was engineered for clinical excellence and integrated with shared patient context.
            </p>
          </div>

          {/* Tool Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
            {coreTools.map((tool) => {
              const Icon = tool.icon;
              const isSelected = activeTab === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTab(tool.id as any)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tool.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tool Showcase Card */}
          {(() => {
            const current = coreTools.find((t) => t.id === activeTab)!;
            return (
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 lg:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-100 text-indigo-800 text-xs font-bold uppercase tracking-wider mb-4">
                    {current.tag}
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight mb-4">
                    {current.headline}
                  </h3>
                  <p className="text-slate-600 text-base leading-relaxed mb-6">
                    {current.description}
                  </p>
                  <div className="space-y-3 mb-8">
                    {current.highlights.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                          <Check className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-sm font-semibold text-slate-800">{item}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handleInstantDemo}
                    className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-sm flex items-center gap-2 cursor-pointer"
                  >
                    <span>Try {current.name} in Demo</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Mockup Preview Box */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-md">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <div className="h-3 w-3 rounded-full bg-amber-400" />
                      <div className="h-3 w-3 rounded-full bg-emerald-400" />
                      <span className="text-xs font-mono text-slate-600 ml-2">
                        {current.name} Preview
                      </span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">
                      Clinical Verified
                    </span>
                  </div>

                  {activeTab === 'scribe' && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg">
                        <div className="font-bold text-indigo-900 mb-1 flex items-center justify-between">
                          <span>🎙️ Clinician Acoustic Feed</span>
                          <span className="text-[10px] text-indigo-600 font-mono">00:14:22</span>
                        </div>
                        <p className="text-slate-700">"How have your sleep patterns been since we adjusted your evening wind-down routine?"</p>
                      </div>
                      <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-lg">
                        <div className="font-bold text-purple-900 mb-1 flex items-center justify-between">
                          <span>👤 Patient (Jane Doe)</span>
                          <span className="text-[10px] text-purple-600 font-mono">00:14:29</span>
                        </div>
                        <p className="text-slate-700">"Much better. I fell asleep within 20 minutes on Tuesday and woke up without palpitations."</p>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                        <div className="font-bold text-emerald-900 mb-1">✨ Automated SOAP Note (Subjective)</div>
                        <p className="text-slate-700 font-mono text-[11px]">
                          Patient reports significant sleep onset latency reduction (&lt;20 min) and cessation of nocturnal palpitations following stimulus control implementation.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'phi' && (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg font-mono">
                        <div className="font-bold text-rose-800 mb-1">Raw Note (Contains PHI):</div>
                        <p className="text-slate-700">
                          Jane Doe (DOB: 04/12/1988) called from (415) 555-0199 regarding her appointment on 10/05/2026.
                        </p>
                      </div>
                      <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg font-mono">
                        <div className="font-bold text-cyan-800 mb-1">18 Safe Harbor Redacted Note:</div>
                        <p className="text-slate-800">
                          <span className="bg-cyan-200 px-1 rounded text-cyan-900 font-bold">[NAME]</span> (DOB:{' '}
                          <span className="bg-cyan-200 px-1 rounded text-cyan-900 font-bold">[DATE]</span>) called from{' '}
                          <span className="bg-cyan-200 px-1 rounded text-cyan-900 font-bold">[PHONE]</span> regarding her appointment on{' '}
                          <span className="bg-cyan-200 px-1 rounded text-cyan-900 font-bold">[DATE]</span>.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'aura' && (
                    <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3 text-xs">
                      <div className="flex items-center justify-between text-amber-400 font-bold">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4" /> Aura Copilot DSM-5 Suggester
                        </span>
                        <span className="text-[10px] bg-amber-400/20 px-2 py-0.5 rounded text-amber-300">Active</span>
                      </div>
                      <p className="text-slate-300">
                        Based on discussion of panic frequency (&gt;3x/wk) and avoidance behavior, consider evaluation against <strong>Panic Disorder (F41.0)</strong> criteria A and B.
                      </p>
                      <div className="bg-slate-800 p-2.5 rounded-lg text-emerald-400 font-mono text-[11px]">
                        Suggested CPT: 90837 (60m Individual Psychotherapy)
                      </div>
                    </div>
                  )}

                  {activeTab === 'ehr' && (
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-lg">
                        <span className="font-bold text-slate-800">10:00 AM • Jane Doe</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                          Telehealth In-Room
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-2.5 bg-slate-100 rounded-lg">
                        <span className="font-bold text-slate-800">11:30 AM • Marcus Vance</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-semibold">
                          In-Person Charted
                        </span>
                      </div>
                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-900 font-medium">
                        CMS-1500 Superbill generated and queued for export.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Transparent, Value-Driven Pricing for Every Practice
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Unlock the entire clinical ecosystem with instant Stripe checkout (test mode enabled).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter Plan */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Solo Starter</div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-extrabold text-slate-900">$49</span>
                  <span className="text-slate-600 text-sm">/ month</span>
                </div>
                <p className="text-sm text-slate-600 mb-6">
                  Perfect for solo counselors and private practitioners needing basic practice management.
                </p>
                <div className="space-y-3 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Core TheraFlow EHR &amp; Calendar</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Client Invoicing &amp; Superbills</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Basic PHI Scrubber (25 docs/mo)</div>
                  <div className="flex items-center gap-2.5 text-slate-600"><Check className="h-4 w-4 text-slate-400" /> Scribe v2 limited to 5 sessions/mo</div>
                </div>
              </div>
              <NavLink
                to="/login"
                className="mt-8 block w-full text-center py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors"
              >
                Choose Starter
              </NavLink>
            </div>

            {/* Clinician Pro (Flagship) */}
            <div className="bg-indigo-900 text-white rounded-3xl p-8 border-2 border-indigo-500 shadow-xl relative flex flex-col justify-between transform md:-translate-y-2">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 text-[11px] font-black uppercase px-4 py-1 rounded-full shadow-md">
                Most Popular • All 4 Tools Unlocked
              </div>
              <div>
                <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">Clinician Pro</div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-extrabold text-white">$99</span>
                  <span className="text-indigo-200 text-sm">/ month</span>
                </div>
                <p className="text-sm text-indigo-100 mb-6">
                  The flagship suite for full-time clinicians wanting zero documentation backlog.
                </p>
                <div className="space-y-3 text-xs font-semibold text-indigo-100">
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-amber-300" /> Full TheraFlow EHR &amp; Telehealth</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-amber-300" /> Unlimited Clinical AI Scribe v2 Diarization</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-amber-300" /> Aura Assistant Floating In-Workflow Copilot</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-amber-300" /> Unlimited 18 Safe Harbor PHI Redactions</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-amber-300" /> HIPAA BAA Handoff Package Included</div>
                </div>
              </div>
              <button
                onClick={handleInstantDemo}
                className="mt-8 block w-full text-center py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-md transition-all cursor-pointer"
              >
                Start Free Pro Trial
              </button>
            </div>

            {/* Practice Group Plan */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Practice Group</div>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-extrabold text-slate-900">$249</span>
                  <span className="text-slate-600 text-sm">/ month</span>
                </div>
                <p className="text-sm text-slate-600 mb-6">
                  For multi-clinician clinics and behavioral health group practices.
                </p>
                <div className="space-y-3 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> 5 Clinician Licenses Included</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Centralized Multi-Provider Billing</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Custom Practice Clinical Note Templates</div>
                  <div className="flex items-center gap-2.5"><Check className="h-4 w-4 text-emerald-600" /> Group Practice HIPAA Audit Table Export</div>
                </div>
              </div>
              <NavLink
                to="/login"
                className="mt-8 block w-full text-center py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm transition-colors"
              >
                Contact Sales
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-600 space-y-4">
          <p className="font-semibold text-slate-700">
            TheraFlow Clinical OS — Merging Practice Management, AI Scribing, Clinical Copilot &amp; HIPAA Redaction.
          </p>
          <p>
            DISCLAIMER: TheraFlow is clinical software assisting healthcare professionals. AI-generated notes must be reviewed and signed by a licensed practitioner.
          </p>
          <p className="max-w-3xl mx-auto text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3 leading-normal">
            <strong>LEGAL NOTICE &amp; SYNTHETIC DEMO DATA:</strong> All patient profiles, case narratives, clinical encounters, dates, medical record numbers (MRNs), contact details, and transcripts displayed on this site and within the demo sandbox are <strong>100% synthetic, fictitious, and simulated</strong>. None of the data is real, no actual patients or persons are portrayed, and <strong>NO actual Protected Health Information (PHI)</strong> is processed or stored. Any resemblance to real persons is purely coincidental.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 font-medium text-slate-600">
            <NavLink to="/investor" className="text-indigo-600 font-bold hover:underline flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>Investor Presentation</span>
            </NavLink>
            <a href="#security" className="hover:underline">HIPAA Compliance</a>
            <a href="#privacy" className="hover:underline">Privacy Policy</a>
            <a href="#terms" className="hover:underline">Terms of Service</a>
            <a href="#baa" className="hover:underline">Request BAA</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
