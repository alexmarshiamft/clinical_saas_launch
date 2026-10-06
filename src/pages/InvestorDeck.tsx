import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Zap,
  TrendingUp,
  Lock,
  Layers,
  Activity,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  ArrowRight,
  Maximize2,
  Calendar,
  Users,
} from 'lucide-react';

interface Slide {
  id: string;
  badge: string;
  badgeColor?: string;
  title: string;
  subtitle: string;
  render: () => React.ReactNode;
}

export const InvestorDeck: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const slides: Slide[] = [
    // Slide 1: Cover
    {
      id: 'cover',
      badge: 'Seed / Series A Confidential Presentation',
      title: 'TheraFlow Clinical Platform',
      subtitle:
        'The Next-Generation Ambient AI Scribe, Local HIPAA Safe Harbor Engine & Practice Operating System for Behavioral Health.',
      render: () => (
        <div className="flex flex-col justify-center h-full max-w-4xl py-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
              Live on Production
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
              HIPAA Safe Harbor Pattern Scrubber
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4">
            Transforming Mental Health Care with Ambient AI &amp; Zero-Trust Privacy.
          </h1>
          <p className="text-lg text-slate-300 mb-8 max-w-2xl leading-relaxed">
            Therapists spend 40% of their day wrestling with documentation and billing. TheraFlow automates ambient SOAP notes, client-side HIPAA redaction, and CMS-1500 claim generation in one unified clinical OS.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-2xl font-black text-indigo-400">$45B+</div>
              <div className="text-xs text-slate-400 font-semibold uppercase mt-1">Global Addressable Market</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-2xl font-black text-emerald-400">100%</div>
              <div className="text-xs text-slate-400 font-semibold uppercase mt-1">In-Browser Safe Harbor Scrub</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-2xl font-black text-amber-400">$2.5M</div>
              <div className="text-xs text-slate-400 font-semibold uppercase mt-1">Seed Round Offering</div>
            </div>
          </div>
        </div>
      ),
    },

    // Slide 2: Executive Summary
    {
      id: 'exec-summary',
      badge: 'Executive Summary',
      title: 'Unifying the Fragmented Mental Health Practice',
      subtitle: 'Replacing 4 to 6 disconnected subscriptions with an integrated clinical operating system.',
      render: () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full items-center">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-72">
            <div>
              <div className="h-10 w-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center mb-3">
                <Activity className="h-5 w-5" />
              </div>
              <div className="text-3xl font-black text-white">40%</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Clinician Time Lost</div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Providers spend 15+ hours each week on documentation, ICD/CPT coding, and billing instead of direct patient care.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-72">
            <div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="text-3xl font-black text-emerald-400">100%</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Client-Side Privacy</div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Client-side Safe Harbor pattern scrubber targets statutory identifier patterns in-browser before data reaches cloud AI models.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-72">
            <div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="text-3xl font-black text-amber-400">$45B</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Addressable Market</div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Global behavioral health software and ambient scribing adoption compounding at 18.2% CAGR through 2030.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-72">
            <div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
                <DollarSign className="h-5 w-5" />
              </div>
              <div className="text-3xl font-black text-indigo-400">$99</div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Flagship SaaS Seat</div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Predictable, high-margin monthly SaaS model (Starter $49, Pro $99, Enterprise $199/seat) with 85%+ gross margin.
            </p>
          </div>
        </div>
      ),
    },

    // Slide 3: The Crisis
    {
      id: 'crisis',
      badge: 'The Crisis',
      badgeColor: 'amber',
      title: 'Administrative Overload is Paralyzing Behavioral Health',
      subtitle: 'Providers face extreme documentation fatigue, fragmented tools, and acute HIPAA liabilities.',
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-center">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-red-500/30 flex flex-col justify-between h-80">
            <div>
              <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Documentation Burden</div>
              <h3 className="text-xl font-bold text-white mb-2">62% Clinician Burnout Rate</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Therapists spend 2 hours on EHR paperwork for every single hour of patient therapy. Administrative burnout is the #1 reason clinicians leave independent practice.
              </p>
            </div>
            <div className="text-xs font-mono text-red-300 bg-red-950/40 p-2.5 rounded-lg border border-red-900/50">
              Metric: 15.4 hrs/week lost to clerical work
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-amber-500/30 flex flex-col justify-between h-80">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Tool Fragmentation</div>
              <h3 className="text-xl font-bold text-white mb-2">4 to 6 Disconnected Subscriptions</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Practices juggle separate systems: SimplePractice for EHR, Zoom for video, Heidi for scribing, and manual spreadsheets for CMS-1500 billing. Nothing syncs cleanly.
              </p>
            </div>
            <div className="text-xs font-mono text-amber-300 bg-amber-950/40 p-2.5 rounded-lg border border-amber-900/50">
              Result: $350+/mo per clinician in tool chaos
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-pink-500/30 flex flex-col justify-between h-80">
            <div>
              <div className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-2">Regulatory Risk</div>
              <h3 className="text-xl font-bold text-white mb-2">Acute Cloud PHI Exposure</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Commercial cloud AI scribes stream raw patient audio and therapy transcripts to remote cloud LLMs, exposing behavioral health practices to massive HIPAA breach liabilities.
              </p>
            </div>
            <div className="text-xs font-mono text-pink-300 bg-pink-950/40 p-2.5 rounded-lg border border-pink-900/50">
              Statutory Risk: $50,000+ per HIPAA violation
            </div>
          </div>
        </div>
      ),
    },

    // Slide 4: The Solution
    {
      id: 'solution',
      badge: 'The TheraFlow Solution',
      badgeColor: 'emerald',
      title: 'A Unified Clinical Loop with Zero-Trust Privacy',
      subtitle: 'From telehealth session to ambient note, Safe Harbor de-identification to insurance claim.',
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full items-center">
          <div className="p-6 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 h-80 flex flex-col justify-between">
            <div>
              <div className="h-9 w-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm mb-3">1</div>
              <h3 className="text-lg font-bold text-white mb-2">Ambient Session Capture</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Multi-speaker acoustic diarization listens seamlessly during telehealth or in-person therapy sessions, distinguishing therapist from client in real time.
              </p>
            </div>
            <ul className="text-[11px] text-indigo-200 space-y-1 pt-3 border-t border-indigo-900/50">
              <li>✓ Real-time multi-band waveform</li>
              <li>✓ Automatic speaker role tagging</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 h-80 flex flex-col justify-between">
            <div>
              <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm mb-3">2</div>
              <h3 className="text-lg font-bold text-white mb-2">Local Safe Harbor Redaction</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Statutory 18-rule HIPAA de-identification engine executes 100% in client memory. All names, locations, and identifiers are masked before reaching AI models.
              </p>
            </div>
            <ul className="text-[11px] text-emerald-200 space-y-1 pt-3 border-t border-emerald-900/50">
              <li>✓ Zero cloud PHI transmission</li>
              <li>✓ Cryptographic audit log signatures</li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl bg-teal-950/40 border border-teal-500/30 h-80 flex flex-col justify-between">
            <div>
              <div className="h-9 w-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-sm mb-3">3</div>
              <h3 className="text-lg font-bold text-white mb-2">Note to CMS-1500 Billing</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Synthesizes structured SOAP/DAP notes and automatically cross-references therapeutic interventions to ICD-10 and CPT codes for instant insurance reimbursement.
              </p>
            </div>
            <ul className="text-[11px] text-teal-200 space-y-1 pt-3 border-t border-teal-900/50">
              <li>✓ Standard CMS-1500 claim format</li>
              <li>✓ FHIR R4 &amp; SmartText export adapters (Epic/Cerner compatible)</li>
            </ul>
          </div>
        </div>
      ),
    },

    // Slide 5: The 4 Pillars
    {
      id: 'pillars',
      badge: 'Product Architecture',
      title: 'Four Interlocking Clinical Suites',
      subtitle: 'Engineered specifically for behavioral health workflows and solo/group practices.',
      render: () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full items-center">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-76">
            <div>
              <div className="text-xs font-bold text-indigo-400 uppercase">Suite 1</div>
              <h3 className="text-base font-bold text-white mt-1 mb-2">Clinical AI Scribe v2</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Ambient acoustic diarization, real-time waveform visualizer, template studio (SOAP, DAP, Intake H&amp;P), and FHIR R4 export formatting adapters (Epic and Cerner compatible).
              </p>
            </div>
            <div className="text-[11px] text-indigo-300 font-mono">Route: /dashboard/scribe</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-76">
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase">Suite 2</div>
              <h3 className="text-base font-bold text-white mt-1 mb-2">HIPAA PHI Scrubber</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Statutory 18-rule Safe Harbor redaction aid running 100% locally in-browser with Tag, Block, and Asterisk masking plus cryptographic audit trails.
              </p>
            </div>
            <div className="text-[11px] text-emerald-300 font-mono">Route: /dashboard/phi-scrubber</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-76">
            <div>
              <div className="text-xs font-bold text-cyan-400 uppercase">Suite 3</div>
              <h3 className="text-base font-bold text-white mt-1 mb-2">TheraFlow EHR &amp; Telehealth</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Client directory, longitudinal DAP progress charts, encrypted WebRTC telehealth room, multi-view calendar, and CMS-1500 superbill generator.
              </p>
            </div>
            <div className="text-[11px] text-cyan-300 font-mono">Route: /dashboard/ehr</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-76">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase">Suite 4</div>
              <h3 className="text-base font-bold text-white mt-1 mb-2">Aura Diagnostic Copilot</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Indexed DSM-5 psychiatric criteria database, differential diagnosis search, typewriter-style clinical formulation, and persistent floating action orb.
              </p>
            </div>
            <div className="text-[11px] text-amber-300 font-mono">Route: /dashboard/aura</div>
          </div>
        </div>
      ),
    },

    // Slide 6: Market Opportunity
    {
      id: 'tam',
      badge: 'Market Opportunity',
      badgeColor: 'emerald',
      title: 'A $45 Billion Addressable Market at an Inflection Point',
      subtitle: 'Accelerating tailwinds in telehealth adoption and clinician appetite for ambient AI documentation.',
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full items-center">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col justify-between h-80">
            <div>
              <div className="text-3xl font-black text-indigo-400 mb-1">$45.2B</div>
              <div className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-3">Total Addressable Market (TAM)</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Global behavioral health digital infrastructure, EHR, telehealth, and AI clinical documentation software market.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
              Source: Grand View Research (18.2% CAGR)
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-emerald-500/40 text-center flex flex-col justify-between h-80">
            <div>
              <div className="text-3xl font-black text-emerald-400 mb-1">$9.8B</div>
              <div className="text-xs font-bold text-emerald-200 uppercase tracking-wider mb-3">Serviceable Addressable Market (SAM)</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                US outpatient mental health clinicians, solo psychologists, LMFTs, LCSWs, and independent group practices (130,000+ clinics).
              </p>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold pt-3 border-t border-slate-800">
              Immediate High-Intent Target Audience
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 text-center flex flex-col justify-between h-80">
            <div>
              <div className="text-3xl font-black text-amber-400 mb-1">$1.4B</div>
              <div className="text-xs font-bold text-amber-200 uppercase tracking-wider mb-3">Serviceable Obtainable Market (SOM)</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tech-forward therapy networks and private group practices actively seeking unified ambient AI tools to replace legacy systems.
              </p>
            </div>
            <div className="text-[11px] text-slate-400 pt-3 border-t border-slate-800">
              Near-Term 3-Year Attainable Beachhead
            </div>
          </div>
        </div>
      ),
    },

    // Slide 7: Business Model & Pricing
    {
      id: 'pricing',
      badge: 'Commercial Model',
      title: 'High-Margin, Predictable SaaS Subscriptions',
      subtitle: 'Clear seat-based expansion path from solo practitioner to regional multi-site clinical organizations.',
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 h-full items-center">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-80">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">Solo Practice</div>
              <h3 className="text-lg font-bold text-white mt-1">Clinician Starter</h3>
              <div className="text-3xl font-black text-indigo-400 my-2">$49<span className="text-xs text-slate-400">/mo</span></div>
              <ul className="text-xs text-slate-300 space-y-1.5">
                <li>✓ Full EHR Client Roster</li>
                <li>✓ Encrypted Telehealth Video Room</li>
                <li>✓ Basic Audit Trail &amp; Scheduling</li>
                <li>✓ 10 Monthly Superbill Claims</li>
              </ul>
            </div>
            <div className="text-[11px] text-slate-500">Low-friction entry tier for solo therapists</div>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-950/40 border-2 border-indigo-500 flex flex-col justify-between h-80 shadow-lg shadow-indigo-950/50">
            <div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-indigo-300 uppercase">Most Popular</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">Flagship</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-1">Clinician Pro</h3>
              <div className="text-3xl font-black text-emerald-400 my-2">$99<span className="text-xs text-slate-400">/mo</span></div>
              <ul className="text-xs text-slate-200 space-y-1.5">
                <li>✓ <strong>All Starter Features Included</strong></li>
                <li>✓ <strong>Unlimited Ambient AI Scribe v2</strong></li>
                <li>✓ <strong>100% Local HIPAA PHI Pattern Scrubber</strong></li>
                <li>✓ <strong>Aura DSM-5 Diagnostic Copilot</strong></li>
                <li>✓ <strong>Template Studio &amp; Unlimited Superbills</strong></li>
              </ul>
            </div>
            <div className="text-[11px] text-indigo-300 font-semibold">Core revenue growth engine</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-80">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase">Clinics &amp; Centers</div>
              <h3 className="text-lg font-bold text-white mt-1">Group Enterprise</h3>
              <div className="text-3xl font-black text-amber-400 my-2">$199<span className="text-xs text-slate-400">/seat/mo</span></div>
              <ul className="text-xs text-slate-300 space-y-1.5">
                <li>✓ <strong>All Clinician Pro Features</strong></li>
                <li>✓ <strong>Multi-Site Practice Switcher</strong></li>
                <li>✓ <strong>Enterprise EHR Export Adapters (Epic, Cerner compatible)</strong></li>
                <li>✓ <strong>Centralized Billing &amp; Supervisor Approvals</strong></li>
              </ul>
            </div>
            <div className="text-[11px] text-slate-500">Contract sizes $10k - $120k ARR</div>
          </div>
        </div>
      ),
    },

    // Slide 8: Competitive Moat
    {
      id: 'moat',
      badge: 'Competitive Moats',
      badgeColor: 'emerald',
      title: 'Structural Advantages Against Point Solutions',
      subtitle: 'Why standalone AI scribes and legacy EHRs struggle to compete with our integrated architecture.',
      render: () => (
        <div className="overflow-x-auto h-full flex items-center">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/80">
                <th className="p-3 text-slate-400 font-bold uppercase">Capability</th>
                <th className="p-3 text-indigo-400 font-extrabold uppercase bg-indigo-950/40 border-x border-indigo-900/50">TheraFlow Platform</th>
                <th className="p-3 text-slate-400 font-bold uppercase">SimplePractice</th>
                <th className="p-3 text-slate-400 font-bold uppercase">Nuance DAX Copilot</th>
                <th className="p-3 text-slate-400 font-bold uppercase">Heidi Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="bg-indigo-950/10">
                <td className="p-3 font-semibold text-white">Unified EHR + Telehealth + Scribe</td>
                <td className="p-3 font-bold text-emerald-400 bg-indigo-950/40 border-x border-indigo-900/50">✓ Complete Suite</td>
                <td className="p-3 text-red-400 font-semibold">✗ No AI Scribe</td>
                <td className="p-3 text-red-400 font-semibold">✗ No EHR / Billing</td>
                <td className="p-3 text-red-400 font-semibold">✗ Scribe Only</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-white">100% In-Browser PHI Scrubber</td>
                <td className="p-3 font-bold text-emerald-400 bg-indigo-950/40 border-x border-indigo-900/50">✓ Local Pattern Scrubber</td>
                <td className="p-3 text-slate-500">N/A</td>
                <td className="p-3 text-red-400 font-semibold">✗ Cloud Only</td>
                <td className="p-3 text-red-400 font-semibold">✗ Cloud Only</td>
              </tr>
              <tr className="bg-indigo-950/10">
                <td className="p-3 font-semibold text-white">Automatic Note-to-Superbill Loop</td>
                <td className="p-3 font-bold text-emerald-400 bg-indigo-950/40 border-x border-indigo-900/50">✓ Automated CMS-1500</td>
                <td className="p-3 text-slate-400">Manual Entry</td>
                <td className="p-3 text-red-400 font-semibold">✗ None</td>
                <td className="p-3 text-red-400 font-semibold">✗ None</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold text-white">DSM-5 Diagnostic Copilot (Aura)</td>
                <td className="p-3 font-bold text-emerald-400 bg-indigo-950/40 border-x border-indigo-900/50">✓ Built-In DSM-5</td>
                <td className="p-3 text-red-400 font-semibold">✗ None</td>
                <td className="p-3 text-slate-400">Generic Hospital</td>
                <td className="p-3 text-slate-400">Generic Medical</td>
              </tr>
              <tr className="bg-indigo-950/10">
                <td className="p-3 font-semibold text-white">Solo Pro Monthly Cost</td>
                <td className="p-3 font-extrabold text-emerald-400 bg-indigo-950/40 border-x border-indigo-900/50">$99 / mo</td>
                <td className="p-3 text-slate-300">$99+ (No AI)</td>
                <td className="p-3 text-red-400 font-bold">$500+ / mo</td>
                <td className="p-3 text-slate-300">$99+ (Notes Only)</td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },

    // Slide 9: Traction & Readiness
    {
      id: 'traction',
      badge: 'Production Readiness',
      badgeColor: 'emerald',
      title: 'Live, Tested, and Demonstrated on Vercel',
      subtitle: 'Not a concept or wireframe — a fully functioning clinical application operating in production.',
      render: () => (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 h-full items-center">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-72">
            <div>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-3">✓</div>
              <h3 className="text-base font-bold text-white mb-1">Live Vercel Deployment</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Operating globally at <span className="font-mono text-indigo-400">clinicalsaaslaunch.vercel.app</span> with instant evaluation credentials.
              </p>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold">100% Uptime on Edge</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-72">
            <div>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold mb-3">✓</div>
              <h3 className="text-base font-bold text-white mb-1">Full Automated Test Suite</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                E2E suites passing across auth flows, role permissions, adversarial security audits, and subscription paywall gates.
              </p>
            </div>
            <div className="text-[11px] text-indigo-400 font-semibold">Empirical Audit Passing</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-72">
            <div>
              <div className="h-8 w-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold mb-3">✓</div>
              <h3 className="text-base font-bold text-white mb-1">Built-In Demo Guide</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Interactive 4-tab evaluator modal with step-by-step clinical walkthrough, feature catalog, and HIPAA 18 Safe Harbor breakdown.
              </p>
            </div>
            <div className="text-[11px] text-teal-400 font-semibold">Self-Serve Evaluator Activation</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between h-72">
            <div>
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold mb-3">✓</div>
              <h3 className="text-base font-bold text-white mb-1">Demonstration Assets</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                83-second automated MP4 video walkthrough and 16-page technical screenshot portfolio published to GitHub.
              </p>
            </div>
            <div className="text-[11px] text-amber-400 font-semibold">GitHub Source Verified</div>
          </div>
        </div>
      ),
    },

    // Slide 10: Product Roadmap
    {
      id: 'roadmap',
      badge: 'Product Roadmap',
      title: 'Execution & Growth Milestones',
      subtitle: 'From core ambient documentation to nationwide clearinghouse EDI claim routing.',
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full items-center">
          <div className="p-5 rounded-2xl bg-slate-900/60 border-t-4 border-emerald-500 flex flex-col justify-between h-72">
            <div>
              <div className="text-xs font-bold text-emerald-400 uppercase">Q4 2026 • Current</div>
              <h3 className="text-base font-bold text-white mt-1 mb-2">Production Platform</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Core 4 clinical suites live on Vercel. In-browser Safe Harbor scrubber, ambient diarization, CMS-1500 generator, and Stripe sandbox.
              </p>
            </div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase">Complete &amp; Deployed</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border-t-4 border-indigo-500 flex flex-col justify-between h-72">
            <div>
              <div className="text-xs font-bold text-indigo-400 uppercase">Q1 2027 • In Flight</div>
              <h3 className="text-base font-bold text-white mt-1 mb-2">Direct EDI Clearinghouse</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Direct electronic claim submission (EDI 837P / 835) integration with Change Healthcare and Availity for instant adjudication.
              </p>
            </div>
            <div className="text-[10px] text-indigo-400 font-bold uppercase">Engineering Phase</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border-t-4 border-teal-500 flex flex-col justify-between h-72">
            <div>
              <div className="text-xs font-bold text-teal-400 uppercase">Q2 2027 • Next</div>
              <h3 className="text-base font-bold text-white mt-1 mb-2">Mobile Ambient App</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Native iOS &amp; Android companion app for in-person therapy consultations, home visits, and multi-clinician rounds.
              </p>
            </div>
            <div className="text-[10px] text-teal-400 font-bold uppercase">Client App Design</div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border-t-4 border-amber-500 flex flex-col justify-between h-72">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase">Q3 2027 • Vision</div>
              <h3 className="text-base font-bold text-white mt-1 mb-2">Outcome Analytics</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Longitudinal measurement-based care metrics (PHQ-9, GAD-7) trended across sessions for value-based insurance contracts.
              </p>
            </div>
            <div className="text-[10px] text-amber-400 font-bold uppercase">Enterprise Expansion</div>
          </div>
        </div>
      ),
    },

    // Slide 11: The Seed Raise
    {
      id: 'the-ask',
      badge: 'The Seed Offering',
      badgeColor: 'emerald',
      title: 'Raising $2.5M Seed Financing',
      subtitle: 'Accelerating enterprise clearinghouse integrations, mobile apps, and clinical practice sales.',
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-indigo-400">50% — Engineering &amp; AI Infrastructure</span>
                <span className="text-xs font-mono text-slate-400">$1,250,000</span>
              </div>
              <p className="text-xs text-slate-300">
                Direct clearinghouse EDI integrations, behavioral health fine-tuned acoustic models, and native iOS/Android mobile apps.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-emerald-400">30% — Go-To-Market &amp; Practice Sales</span>
                <span className="text-xs font-mono text-slate-400">$750,000</span>
              </div>
              <p className="text-xs text-slate-300">
                Direct acquisition of private therapy clinics, state psychological association partnerships, and CME training sponsorships.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-bold text-amber-400">20% — Security &amp; Compliance Certification</span>
                <span className="text-xs font-mono text-slate-400">$500,000</span>
              </div>
              <p className="text-xs text-slate-300">
                Formal SOC2 Type II audit completion, HITRUST certification, and regulatory counsel for multi-state telehealth billing.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/30 flex flex-col justify-between h-80">
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Connect With Leadership</h3>
              <p className="text-xs text-slate-300 leading-relaxed mb-4">
                We invite you to test the live production platform, review our clinical pilot pipeline, or inspect our source code repository.
              </p>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold">Live Site: </span>
                  <a href="https://clinicalsaaslaunch.vercel.app" target="_blank" rel="noreferrer" className="text-indigo-400 underline font-mono">
                    clinicalsaaslaunch.vercel.app
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">GitHub: </span>
                  <a href="https://github.com/alexmarshiamft/clinical_saas_launch" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-mono">
                    github.com/alexmarshiamft/clinical_saas_launch
                  </a>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Contact: </span>
                  <a href="mailto:alex@alexmarshi.com" className="font-mono text-amber-300 hover:underline">
                    alex@alexmarshi.com
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">TheraFlow Health Technologies, Inc.</span>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Launch Demo App →
              </button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Keyboard navigation (Arrow keys and Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentSlide((prev) => Math.max(prev - 1, 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length]);

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="h-16 px-6 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-indigo-600/30">
              TF
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                TheraFlow
              </span>
              <span className="text-[10px] text-slate-400 ml-1.5 font-mono">INVESTOR DECK</span>
            </div>
          </Link>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <span className="hidden sm:inline text-xs text-slate-400 font-medium">
            Confidential Series Seed Offering
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Download PDF button */}
          <a
            href="/clinical_saas_investor_presentation.pdf"
            download="clinical_saas_investor_presentation.pdf"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            title="Download high-resolution 16:9 PDF deck"
          >
            <Download className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden md:inline">Download Pitch Deck PDF</span>
          </a>

          <Link
            to="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-sm shadow-indigo-600/30"
          >
            <span>Live Clinician Demo</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* Main Slide Stage */}
      <main className="flex-1 flex flex-col justify-center px-6 md:px-16 lg:px-24 py-6 max-w-7xl mx-auto w-full">
        {/* Slide Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                slide.badgeColor === 'emerald'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : slide.badgeColor === 'amber'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              {slide.badge}
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              Slide {currentSlide + 1} of {slides.length}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-snug">
            {slide.title}
          </h2>
          <p className="text-xs md:text-sm text-slate-400 mt-1 max-w-3xl">
            {slide.subtitle}
          </p>
        </div>

        {/* Dynamic Slide Content */}
        <div className="flex-1 min-h-[380px] md:min-h-[440px] flex flex-col justify-center my-2">
          {slide.render()}
        </div>
      </main>

      {/* Bottom Navigation Controller */}
      <footer className="h-16 px-6 md:px-12 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="text-[11px] text-slate-500 hidden sm:block">
          Use <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">←</kbd>{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">→</kbd> or{' '}
          <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">Space</kbd> to navigate
        </div>

        {/* Slide Dots / Progress Indicator */}
        <div className="flex items-center gap-1.5">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === currentSlide
                  ? 'w-7 bg-indigo-500'
                  : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
              title={`Jump to slide ${idx + 1}: ${s.title}`}
            />
          ))}
        </div>

        {/* Prev / Next Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentSlide((prev) => Math.max(prev - 1, 0))}
            disabled={currentSlide === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Prev</span>
          </button>

          <button
            onClick={() => setCurrentSlide((prev) => Math.min(prev + 1, slides.length - 1))}
            disabled={currentSlide === slides.length - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default InvestorDeck;
