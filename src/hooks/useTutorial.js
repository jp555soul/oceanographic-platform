// useTutorial.js (Updated)
import { useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Hook for managing tutorial state, progress, and completion
 * @returns {object} Tutorial management state and functions
 */
export const useTutorial = () => {
  // --- Tutorial State ---
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialMode, setTutorialMode] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(() => {
    return !localStorage.getItem('ocean-monitor-tutorial-completed');
  });

  // --- Tutorial Configuration ---
  const [tutorialConfig, setTutorialConfig] = useState({
    autoStart: true,
    skipEnabled: true,
    highlightEnabled: true,
    animationsEnabled: true,
    keyboardNavigation: true
  });

  // --- Tutorial Progress ---
  const [tutorialProgress, setTutorialProgress] = useState({
    startTime: null,
    completedSteps: [],
    skippedSteps: [],
    timeSpentPerStep: {}
  });

  // --- Tutorial Steps Definition ---
  const tutorialSteps = useMemo(() => [
    {
      id: 0,
      title: "Welcome to Ocean Monitor",
      content: "This interactive tutorial will guide you through the platform's features. You can navigate using the buttons or arrow keys.",
      target: null,
      position: "center",
      skippable: false
    },
    {
      id: 1,
      title: "Control Panel",
      content: "Control oceanographic models, depths, and playback settings. Select different areas and parameters to analyze.",
      target: '[data-tutorial="control-panel"]',
      position: "bottom",
      skippable: true
    },
    {
      id: 2,
      title: "Interactive Map",
      content: "Visualize oceanographic data with real-time station markers. Click stations for detailed analysis.",
      target: '[data-tutorial="map-container"]',
      position: "left",
      skippable: true
    },
    {
      id: 3,
      title: "Data Panels",
      content: "View environmental data, charts, and real-time measurements. Monitor temperature, salinity, and current conditions.",
      target: '[data-tutorial="data-panels"]',
      position: "top",
      skippable: true
    },
    {
      id: 4,
      title: "Analysis Output",
      content: "Track AI analysis responses with source indicators. Export data and view response history.",
      target: '[data-tutorial="output-module"]',
      position: "left",
      skippable: true
    },
    {
      id: 5,
      title: "CubeAI Assistant",
      content: "Chat with our AI assistant for oceanographic insights. Ask about currents, waves, temperature, and safety assessments.",
      target: '[data-tutorial="chatbot"]',
      position: "left",
      skippable: true
    }
  ], []);

  // --- Toggle tutorial [FIXED] ---
  const handleTutorialToggle = useCallback(() => {
    setShowTutorial(currentState => {
      const newState = !currentState;
      setTutorialMode(newState);
      
      // If we are opening the tutorial, reset its state
      if (newState) {
        setTutorialStep(0);
        setTutorialProgress(prev => ({
          ...prev,
          startTime: new Date().toISOString(),
          completedSteps: [],
          skippedSteps: []
        }));
      }
      return newState;
    });
  }, []);

  // --- Step navigation ---
  const goToStep = useCallback((stepIndex) => {
    const validStep = Math.max(0, Math.min(stepIndex, tutorialSteps.length - 1));
    const currentTime = new Date().toISOString();
    
    // Record time spent on current step
    if (tutorialProgress.startTime && tutorialStep !== validStep) {
      const stepStartTime = tutorialProgress.timeSpentPerStep[tutorialStep]?.startTime;
      if (stepStartTime) {
        const timeSpent = Date.now() - new Date(stepStartTime).getTime();
        setTutorialProgress(prev => ({
          ...prev,
          timeSpentPerStep: {
            ...prev.timeSpentPerStep,
            [tutorialStep]: {
              ...prev.timeSpentPerStep[tutorialStep],
              endTime: currentTime,
              duration: timeSpent
            }
          }
        }));
      }
    }
    
    setTutorialStep(validStep);
    
    // Mark step as completed
    if (validStep > tutorialStep) {
      setTutorialProgress(prev => ({
        ...prev,
        completedSteps: [...new Set([...prev.completedSteps, tutorialStep])],
        timeSpentPerStep: {
          ...prev.timeSpentPerStep,
          [validStep]: {
            startTime: currentTime
          }
        }
      }));
    }
  }, [tutorialStep, tutorialSteps.length, tutorialProgress.startTime, tutorialProgress.timeSpentPerStep]);

  const nextStep = useCallback(() => {
    if (tutorialStep < tutorialSteps.length - 1) {
      goToStep(tutorialStep + 1);
    } else {
      handleTutorialComplete();
    }
  }, [tutorialStep, tutorialSteps.length, goToStep]);

  const prevStep = useCallback(() => {
    if (tutorialStep > 0) {
      goToStep(tutorialStep - 1);
    }
  }, [tutorialStep, goToStep]);

  const skipStep = useCallback(() => {
    const currentStep = tutorialSteps[tutorialStep];
    if (currentStep?.skippable) {
      setTutorialProgress(prev => ({
        ...prev,
        skippedSteps: [...prev.skippedSteps, tutorialStep]
      }));
      nextStep();
    }
  }, [tutorialStep, tutorialSteps, nextStep]);

  // --- Complete tutorial ---
  const handleTutorialComplete = useCallback(() => {
    const endTime = new Date().toISOString();
    const totalDuration = tutorialProgress.startTime 
      ? Date.now() - new Date(tutorialProgress.startTime).getTime()
      : 0;

    localStorage.setItem('ocean-monitor-tutorial-completed', 'true');
    localStorage.setItem('ocean-monitor-tutorial-stats', JSON.stringify({
      completedAt: endTime,
      totalDuration,
      stepsCompleted: tutorialProgress.completedSteps.length,
      stepsSkipped: tutorialProgress.skippedSteps.length,
      timeSpentPerStep: tutorialProgress.timeSpentPerStep
    }));

    setIsFirstTimeUser(false);
    setShowTutorial(false);
    setTutorialMode(false);
    setTutorialStep(0);
  }, [tutorialProgress]);

  // --- Reset tutorial ---
  const resetTutorial = useCallback(() => {
    localStorage.removeItem('ocean-monitor-tutorial-completed');
    localStorage.removeItem('ocean-monitor-tutorial-stats');
    setIsFirstTimeUser(true);
    setTutorialStep(0);
    setTutorialProgress({
      startTime: null,
      completedSteps: [],
      skippedSteps: [],
      timeSpentPerStep: {}
    });
  }, []);

  // --- Update configuration ---
  const updateTutorialConfig = useCallback((newConfig) => {
    setTutorialConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // --- Keyboard navigation ---
  const handleKeyboardNavigation = useCallback((event) => {
    if (!showTutorial || !tutorialConfig.keyboardNavigation) return;

    switch (event.key) {
      case 'ArrowRight':
      case ' ':
        event.preventDefault();
        nextStep();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        prevStep();
        break;
      case 'Escape':
        event.preventDefault();
        handleTutorialToggle(); // Use toggle function to close
        break;
      case 's':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          skipStep();
        }
        break;
    }
  }, [showTutorial, tutorialConfig.keyboardNavigation, nextStep, prevStep, skipStep, handleTutorialToggle]);

  // --- Tutorial analytics ---
  const tutorialAnalytics = useMemo(() => {
    const currentStep = tutorialSteps[tutorialStep];
    const totalSteps = tutorialSteps.length;
    const progressPercent = (tutorialStep / (totalSteps - 1)) * 100;
    
    return {
      currentStep: tutorialStep + 1,
      totalSteps,
      progressPercent: Math.round(progressPercent),
      isComplete: tutorialStep === totalSteps - 1,
      canGoBack: tutorialStep > 0,
      canGoForward: tutorialStep < totalSteps - 1,
      canSkip: currentStep?.skippable || false,
      stepInfo: currentStep
    };
  }, [tutorialStep, tutorialSteps]);

  // --- Auto-start for first-time users ---
  useEffect(() => {
    if (isFirstTimeUser && tutorialConfig.autoStart && !showTutorial) {
      const timer = setTimeout(() => {
        handleTutorialToggle(); // Use toggle to open
      }, 2000); // 2 second delay
      
      return () => clearTimeout(timer);
    }
  }, [isFirstTimeUser, tutorialConfig.autoStart, showTutorial, handleTutorialToggle]);

  // --- Tutorial statistics ---
  const getTutorialStats = useCallback(() => {
    try {
      const stats = localStorage.getItem('ocean-monitor-tutorial-stats');
      return stats ? JSON.parse(stats) : null;
    } catch (error) {
      return null;
    }
  }, []);

  // --- Return public API ---
  return {
    // State
    showTutorial,
    tutorialStep,
    tutorialMode,
    isFirstTimeUser,
    tutorialSteps,
    
    // Configuration
    tutorialConfig,
    updateTutorialConfig,
    
    // Progress
    tutorialProgress,
    tutorialAnalytics,
    
    // Controls
    handleTutorialToggle,
    nextStep,
    prevStep,
    skipStep,
    goToStep,
    handleTutorialComplete,
    resetTutorial,
    
    // Keyboard support
    handleKeyboardNavigation,
    
    // Analytics
    getTutorialStats,
    
    // Computed values
    isActive: showTutorial,
    currentStepInfo: tutorialSteps[tutorialStep],
    isLastStep: tutorialStep === tutorialSteps.length - 1,
    isFirstStep: tutorialStep === 0,
    progressPercent: tutorialAnalytics.progressPercent
  };
};