import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

const slides = [
  {
    title: 'TheraFlow OS',
    subtitle: 'Behavioral health software assets for acquisition evaluation',
    points: [
      'Clinical EHR, Scribe, Aura and PHI pattern scrubber interfaces.',
      'Practice workforce, compensation, payroll and treasury workflows.',
      'Source, migrations, tests, synthetic fixtures and buyer documents.',
      'Evaluation uses synthetic data; real-patient operation is not established.',
    ],
  },
  {
    title: 'Implemented clinical workflows',
    subtitle: 'Reusable interfaces and engines',
    points: [
      'Client roster, appointments, DAP notes and treatment plans.',
      'Clinical templates, deterministic note synthesis and diagnostic reference UI.',
      'Superbill reimbursement statements and EHR text/JSON exports.',
      'Payer acceptance and live hospital exchange require separate validation.',
    ],
  },
  {
    title: 'Practice operations',
    subtitle: 'Working calculations with sandbox financial services',
    points: [
      'Workforce data and clinician compensation rules.',
      'Integer cents/basis-point allocation helpers and balanced double-entry journals.',
      'Simulated treasury accounts, payroll batches and ACH settlement.',
      'Live banking, payroll tax filing and clearinghouse transport remain integration work.',
    ],
  },
  {
    title: 'Simulation boundaries',
    subtitle: 'What the evaluation experience demonstrates',
    points: [
      'Telehealth uses local media/loopback and synthetic meeting sessions.',
      'Browser speech uses manual/demo speaker attribution; cloud diarization is not validated.',
      'Invoice checkout and claim acknowledgments are simulated.',
      'Subscription Stripe and Gemini SDK paths exist; live operation is not evidenced.',
    ],
  },
  {
    title: 'Security and privacy evidence',
    subtitle: 'Documented finding remediation and finite automated tests',
    points: [
      'API authentication, role checks and tenant boundaries implemented.',
      'Tenant-scoped audit access and clinical-note write protections implemented.',
      'PHI pattern heuristics miss identifiers; gateway rejects detected residuals and errors.',
      'No independent HIPAA/security certification or real-PHI readiness claim.',
    ],
  },
  {
    title: 'Verification and database assets',
    subtitle: 'Evidence is scoped to the tested release',
    points: [
      'Historical release CI: client26/26, server29/29, stress28/28, EHR30/30, Scribe61/61, Aura85/85.',
      'Typecheck, build and financial/security invariants passed in the historical snapshot.',
      '31 public tables plus auth shim;59 policy creation statements yield58 active public policies.',
      'Corrected CI adds PostgreSQL-backed migration verification; exact SHA/run IDs accompany the release.',
    ],
  },
  {
    title: 'Buyer deployment work',
    subtitle: 'Integration opportunities after the acquisition snapshot',
    points: [
      'Complete durable persistence, identity lifecycle, hosted audit storage and backups.',
      'Move configured browser AI credentials behind a server-side secret boundary.',
      'Validate privacy, security and appropriate operating agreements before real data.',
      'Next project: polished synthetic staging; live vendor work follows buyer demand.',
    ],
  },
];

export const InvestorDeck: React.FC = () => {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setCurrent(value => Math.min(value + 1, slides.length - 1));
      if (event.key === 'ArrowLeft') setCurrent(value => Math.max(value - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const slide = slides[current];
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 px-6 py-5">
        <Link to="/" className="font-bold text-xl">TheraFlow <span className="text-slate-400 text-sm">Acquisition evaluation</span></Link>
        <div className="flex gap-5 text-sm">
          <a href="/clinical_saas_investor_presentation.pdf" download className="flex items-center gap-2"><Download size={16} /> Buyer PDF</a>
          <Link to="/dashboard" className="text-indigo-300">Synthetic demo</Link>
        </div>
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-16 flex flex-col justify-center">
        <p className="uppercase text-sm tracking-widest text-indigo-300 mb-6">Buyer review</p>
        <h1 className="text-4xl md:text-6xl font-bold mb-5">{slide.title}</h1>
        <p className="text-xl text-slate-400 mb-10">{slide.subtitle}</p>
        <ul className="space-y-5 text-lg text-slate-200">
          {slide.points.map(point => <li key={point} className="rounded-xl border border-slate-800 bg-slate-900 p-5">{point}</li>)}
        </ul>
      </main>
      <footer className="border-t border-slate-800 px-6 py-5 flex items-center justify-between">
        <button aria-label="Previous slide" disabled={current === 0} onClick={() => setCurrent(current - 1)} className="p-2 disabled:opacity-30"><ChevronLeft /></button>
        <span className="text-slate-400 text-sm">{current + 1} / {slides.length} - Synthetic evaluation only</span>
        <button aria-label="Next slide" disabled={current === slides.length - 1} onClick={() => setCurrent(current + 1)} className="p-2 disabled:opacity-30"><ChevronRight /></button>
      </footer>
    </div>
  );
};

export default InvestorDeck;
