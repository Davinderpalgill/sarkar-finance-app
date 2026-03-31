import React, {
  createContext, useContext, useState, useRef,
  useCallback, useEffect, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOUR_KEY = 'sarkar_tour_completed_v1';
const PAD      = 8; // spotlight padding around element

export interface StepMeasure {
  x: number; y: number; width: number; height: number;
}

export interface TourStepDef {
  id: string;
  title: string;
  description: string;
}

export const TOUR_STEPS: TourStepDef[] = [
  {
    id: 'hero',
    title: 'Monthly Overview',
    description: 'Your total spent, income and savings for the month — all in one card. Tap the arrows to browse past months.',
  },
  {
    id: 'categories',
    title: 'Where Did It Go?',
    description: 'Your top spending categories at a glance. Tap any category row to see the transactions behind it.',
  },
  {
    id: 'fab',
    title: 'Log an Expense',
    description: 'Tap + anytime to quickly add an expense manually. It takes less than 10 seconds.',
  },
  {
    id: 'import',
    title: 'Auto-Import Transactions',
    description: 'Connect Gmail or bank SMS to auto-import transactions — no manual entry needed.',
  },
  {
    id: 'tab_spends',
    title: 'Spends Tab',
    description: 'View, search and filter all your transactions by month, category, or account.',
  },
  {
    id: 'tab_analytics',
    title: 'Analytics Tab',
    description: 'Category trends, top merchants, savings rate and 10+ financial reports.',
  },
  {
    id: 'tab_plan',
    title: 'Budget & AI Coach',
    description: 'Set monthly budgets and get AI-powered insights on your spending habits.',
  },
];

interface TourContextType {
  active: boolean;
  stepIndex: number;
  spotlight: (StepMeasure & { padded: StepMeasure }) | null;
  currentStep: TourStepDef | null;
  reportMeasure: (id: string, m: StepMeasure) => void;
  next: () => void;
  skip: () => void;
  resetTour: () => void;
}

const TourContext = createContext<TourContextType>({
  active: false, stepIndex: 0, spotlight: null, currentStep: null,
  reportMeasure: () => {}, next: () => {}, skip: () => {}, resetTour: () => {},
});

function padMeasure(m: StepMeasure): StepMeasure {
  return { x: m.x - PAD, y: m.y - PAD, width: m.width + PAD * 2, height: m.height + PAD * 2 };
}

export function TourProvider({ children }: { children: ReactNode }) {
  const [active,     setActive]     = useState(false);
  const [stepIndex,  setStepIndex]  = useState(0);
  const [spotlight,  setSpotlight]  = useState<(StepMeasure & { padded: StepMeasure }) | null>(null);
  const measuresRef = useRef<Map<string, StepMeasure>>(new Map());

  useEffect(() => {
    AsyncStorage.getItem(TOUR_KEY).then(val => {
      if (!val) setActive(true);
    });
  }, []);

  const currentStep = active ? TOUR_STEPS[stepIndex] ?? null : null;

  const reportMeasure = useCallback((id: string, m: StepMeasure) => {
    measuresRef.current.set(id, m);
    // If this is the current step, update spotlight immediately
    setStepIndex(si => {
      const step = TOUR_STEPS[si];
      if (step && step.id === id) {
        setSpotlight({ ...m, padded: padMeasure(m) });
      }
      return si;
    });
  }, []);

  const advanceTo = useCallback((index: number) => {
    if (index >= TOUR_STEPS.length) {
      AsyncStorage.setItem(TOUR_KEY, '1');
      setActive(false);
      setStepIndex(0);
      setSpotlight(null);
      return;
    }
    setStepIndex(index);
    const id = TOUR_STEPS[index].id;
    const m = measuresRef.current.get(id);
    setSpotlight(m ? { ...m, padded: padMeasure(m) } : null);
  }, []);

  const next = useCallback(() => {
    setStepIndex(si => {
      advanceTo(si + 1);
      return si; // advanceTo calls setStepIndex internally
    });
  }, [advanceTo]);

  // simpler next — just increment and lookup stored measure
  const nextStep = useCallback(() => {
    setStepIndex(si => {
      const nextIdx = si + 1;
      if (nextIdx >= TOUR_STEPS.length) {
        AsyncStorage.setItem(TOUR_KEY, '1');
        setActive(false);
        setSpotlight(null);
        return 0;
      }
      const id = TOUR_STEPS[nextIdx].id;
      const m = measuresRef.current.get(id);
      setSpotlight(m ? { ...m, padded: padMeasure(m) } : null);
      return nextIdx;
    });
  }, []);

  const skip = useCallback(() => {
    AsyncStorage.setItem(TOUR_KEY, '1');
    setActive(false);
    setStepIndex(0);
    setSpotlight(null);
  }, []);

  const resetTour = useCallback(() => {
    AsyncStorage.removeItem(TOUR_KEY).then(() => {
      setStepIndex(0);
      setSpotlight(null);
      setActive(true);
    });
  }, []);

  return (
    <TourContext.Provider value={{
      active, stepIndex, spotlight, currentStep,
      reportMeasure, next: nextStep, skip, resetTour,
    }}>
      {children}
    </TourContext.Provider>
  );
}

export const useTour = () => useContext(TourContext);
