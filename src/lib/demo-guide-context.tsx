import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type DemoGuideTab = 'journey' | 'catalog' | 'sandbox' | 'compliance';

export interface DemoGuideContextType {
  isOpen: boolean;
  activeTab: DemoGuideTab;
  activeFeatureId: string | null;
  journeyStep: number;
  openGuide: (tab?: DemoGuideTab, featureId?: string) => void;
  closeGuide: () => void;
  setActiveTab: (tab: DemoGuideTab) => void;
  setActiveFeatureId: (id: string | null) => void;
  setJourneyStep: (step: number) => void;
  nextJourneyStep: () => void;
  prevJourneyStep: () => void;
}

const DemoGuideContext = createContext<DemoGuideContextType>({
  isOpen: false,
  activeTab: 'journey',
  activeFeatureId: null,
  journeyStep: 0,
  openGuide: () => {},
  closeGuide: () => {},
  setActiveTab: () => {},
  setActiveFeatureId: () => {},
  setJourneyStep: () => {},
  nextJourneyStep: () => {},
  prevJourneyStep: () => {},
});

export const DemoGuideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<DemoGuideTab>('journey');
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [journeyStep, setJourneyStep] = useState(0);

  const openGuide = useCallback((tab: DemoGuideTab = 'journey', featureId?: string) => {
    setActiveTab(tab);
    if (featureId) setActiveFeatureId(featureId);
    setIsOpen(true);
  }, []);

  const closeGuide = useCallback(() => {
    setIsOpen(false);
  }, []);

  const nextJourneyStep = useCallback(() => {
    setJourneyStep((prev) => Math.min(prev + 1, 5));
  }, []);

  const prevJourneyStep = useCallback(() => {
    setJourneyStep((prev) => Math.max(prev - 1, 0));
  }, []);

  // Global keyboard shortcut ('?' or 'Shift + /') to toggle the demo guide
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <DemoGuideContext.Provider
      value={{
        isOpen,
        activeTab,
        activeFeatureId,
        journeyStep,
        openGuide,
        closeGuide,
        setActiveTab,
        setActiveFeatureId,
        setJourneyStep,
        nextJourneyStep,
        prevJourneyStep,
      }}
    >
      {children}
    </DemoGuideContext.Provider>
  );
};

export function useDemoGuide() {
  const context = useContext(DemoGuideContext);
  if (!context) {
    throw new Error('useDemoGuide must be used within a DemoGuideProvider');
  }
  return context;
}
