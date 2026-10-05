import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { Lock } from 'lucide-react';
import { AuraFloatingOrb } from '@/tools/aura/AuraFloatingOrb';

export const AppLayout: React.FC = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 font-sans">
      {/* Sidebar (Responsive) */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        {/* Page View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Confidentiality / Synthetic Data Legal CYA Banner */}
        <footer className="bg-amber-50/80 border-t border-amber-200 py-2.5 px-4 text-center shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-center gap-2 text-[11px] text-amber-950 font-medium">
            <Lock className="h-3.5 w-3.5 text-amber-700 shrink-0" />
            <span>
              <strong>LEGAL NOTICE &amp; SYNTHETIC DATA DISCLAIMER:</strong> All patient records, clinical notes, audio transcripts, MRNs, and names in this demonstration are 100% fictional, synthetic, and computer-generated. None of the data is real, and NO actual Protected Health Information (PHI) is present or processed. Any resemblance to real persons is purely coincidental.
            </span>
          </div>
        </footer>
      </div>

      {/* Global In-Workflow Aura Floating Action Orb */}
      <AuraFloatingOrb />
    </div>
  );
};

export default AppLayout;
