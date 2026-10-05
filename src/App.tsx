/**
 * Unified Clinical Telehealth & AI Scribe SaaS Platform
 * Root Application & React Router Configuration
 */
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { SubscriptionProvider } from '@/lib/subscription';
import { ClinicalContextProvider } from '@/lib/clinical-context';

// Layout & Route Guards
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/guards/ProtectedRoute';
import SubscriptionGate from '@/components/guards/SubscriptionGate';

// Core Pages
import Landing from '@/pages/Landing';
import Login from '@/pages/Login';
import DashboardHome from '@/pages/DashboardHome';
import Subscription from '@/pages/Subscription';
import InvestorDeck from '@/pages/InvestorDeck';

// The 4 Core Integrated Clinical Tool Workspaces
import EhrWorkspace from '@/tools/theraflow/EhrWorkspace';
import ScribeWorkspace from '@/tools/scribe/ScribeWorkspace';
import AuraStudio from '@/tools/aura/AuraStudio';
import PhiScrubberView from '@/tools/phi-scrubber/PhiScrubberView';

import { DemoGuideProvider } from '@/lib/demo-guide-context';
import { DemoGuideModal } from '@/components/demo/DemoGuideModal';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <ClinicalContextProvider>
          <Router>
            <DemoGuideProvider>
              <DemoGuideModal />
              <Routes>
              {/* Public Marketing & Auth Routes */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/investor" element={<InvestorDeck />} />

              {/* Protected Clinical Dashboard Shell */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* Command Center Index */}
                <Route index element={<DashboardHome />} />

                {/* The 4 Core Integrated Clinical Tools (Gated by Subscription) */}
                <Route
                  path="ehr/*"
                  element={
                    <SubscriptionGate
                      requiredTier="starter"
                      featureName="Clinical EHR & Telehealth"
                      headline="Clinical EHR Subscription Required"
                    >
                      <EhrWorkspace />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="scribe"
                  element={
                    <SubscriptionGate
                      requiredTier="pro"
                      featureName="Clinical AI Scribe v2"
                      headline="Clinician Pro Subscription Required"
                    >
                      <ScribeWorkspace />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="scribe/*"
                  element={
                    <SubscriptionGate
                      requiredTier="pro"
                      featureName="Clinical AI Scribe v2"
                      headline="Clinician Pro Subscription Required"
                    >
                      <ScribeWorkspace />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="aura"
                  element={
                    <SubscriptionGate
                      requiredTier="pro"
                      featureName="Aura Assistant Copilot"
                      headline="Clinician Pro Subscription Required"
                    >
                      <AuraStudio />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="aura/*"
                  element={
                    <SubscriptionGate
                      requiredTier="pro"
                      featureName="Aura Assistant Copilot"
                      headline="Clinician Pro Subscription Required"
                    >
                      <AuraStudio />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="phi-scrubber"
                  element={
                    <SubscriptionGate
                      requiredTier="starter"
                      featureName="HIPAA PHI Scrubber"
                      headline="PHI Scrubber Subscription Required"
                    >
                      <PhiScrubberView />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="phi-scrubber/*"
                  element={
                    <SubscriptionGate
                      requiredTier="starter"
                      featureName="HIPAA PHI Scrubber"
                      headline="PHI Scrubber Subscription Required"
                    >
                      <PhiScrubberView />
                    </SubscriptionGate>
                  }
                />

                {/* Practice Operations Aliases */}
                <Route
                  path="calendar"
                  element={
                    <SubscriptionGate
                      requiredTier="starter"
                      featureName="Appointment Calendar"
                      headline="Calendar Subscription Required"
                    >
                      <EhrWorkspace defaultTab="calendar" />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="clients"
                  element={
                    <SubscriptionGate
                      requiredTier="starter"
                      featureName="Client Roster"
                      headline="Client Roster Subscription Required"
                    >
                      <EhrWorkspace defaultTab="clients" />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="clients/:id"
                  element={
                    <SubscriptionGate
                      requiredTier="starter"
                      featureName="Client Roster"
                      headline="Client Roster Subscription Required"
                    >
                      <EhrWorkspace defaultTab="clients" />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="billing"
                  element={
                    <SubscriptionGate
                      requiredTier="starter"
                      featureName="Billing & Claims"
                      headline="Billing Subscription Required"
                    >
                      <EhrWorkspace defaultTab="billing" />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="telehealth"
                  element={
                    <SubscriptionGate
                      requiredTier="starter"
                      featureName="Telehealth Room"
                      headline="Telehealth Subscription Required"
                    >
                      <EhrWorkspace defaultTab="telehealth" />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="telehealth/:id"
                  element={
                    <SubscriptionGate
                      requiredTier="starter"
                      featureName="Telehealth Room"
                      headline="Telehealth Subscription Required"
                    >
                      <EhrWorkspace defaultTab="telehealth" />
                    </SubscriptionGate>
                  }
                />
                <Route
                  path="audit-logs"
                  element={
                    <SubscriptionGate
                      requiredTier="starter"
                      featureName="HIPAA Audit Logs"
                      headline="Audit Logs Subscription Required"
                    >
                      <EhrWorkspace defaultTab="audit-logs" />
                    </SubscriptionGate>
                  }
                />
                <Route path="subscription" element={<Subscription />} />
                <Route
                  path="settings"
                  element={
                    <SubscriptionGate
                      requiredTier="starter"
                      featureName="Practice Settings"
                      headline="Settings Subscription Required"
                    >
                      <EhrWorkspace defaultTab="settings" />
                    </SubscriptionGate>
                  }
                />
              </Route>

              {/* Catch-all Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </DemoGuideProvider>
          </Router>
        </ClinicalContextProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
};

export default App;
