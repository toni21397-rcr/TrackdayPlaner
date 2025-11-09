import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { driver, Driver, Config as DriverConfig } from 'driver.js';
import 'driver.js/dist/driver.css';
import { TutorialId, tutorials } from '@/lib/tutorials';

const STORAGE_KEY = 'trackday-tutorials.completed';

interface TutorialContextValue {
  startTour: (tutorialId: TutorialId) => void;
  resetTutorial: (tutorialId: TutorialId) => void;
  resetAllTutorials: () => void;
  isTutorialCompleted: (tutorialId: TutorialId) => boolean;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

const getCompletedTutorials = (): Record<string, boolean> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const setTutorialCompleted = (tutorialId: TutorialId, completed: boolean) => {
  try {
    const current = getCompletedTutorials();
    current[tutorialId] = completed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

export function TutorialProvider({ children }: { children: ReactNode }) {
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    // Initialize Driver.js with custom theme matching Trackday Planner design
    const driverConfig: DriverConfig = {
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done!',
      popoverClass: 'trackday-tutorial-popover',
      animate: true,
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      onDestroyStarted: () => {
        if (driverRef.current) {
          driverRef.current.destroy();
        }
      },
    };

    driverRef.current = driver(driverConfig);

    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
      }
    };
  }, []);

  const startTour = (tutorialId: TutorialId) => {
    if (!driverRef.current) return;

    const tutorial = tutorials[tutorialId];
    if (!tutorial) {
      console.warn(`Tutorial '${tutorialId}' not found`);
      return;
    }

    // Update Driver config with tutorial steps
    driverRef.current.setConfig({
      steps: tutorial.steps,
      onDestroyed: () => {
        setTutorialCompleted(tutorialId, true);
      },
    });

    driverRef.current.drive();
  };

  const resetTutorial = (tutorialId: TutorialId) => {
    setTutorialCompleted(tutorialId, false);
  };

  const resetAllTutorials = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently fail
    }
  };

  const isTutorialCompleted = (tutorialId: TutorialId): boolean => {
    const completed = getCompletedTutorials();
    return !!completed[tutorialId];
  };

  const value: TutorialContextValue = {
    startTour,
    resetTutorial,
    resetAllTutorials,
    isTutorialCompleted,
  };

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}
