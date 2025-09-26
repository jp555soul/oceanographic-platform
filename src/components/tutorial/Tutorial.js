import React, { useState, useEffect, useRef } from 'react';
import TutorialModal from './TutorialModal'; // Import the reusable modal component
import { TUTORIAL_STEPS } from './TutorialSteps'; // Import the centralized tutorial steps
import {
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  RotateCcw
} from 'lucide-react';

const Tutorial = ({
  isOpen = false,
  onClose,
  onComplete,
  tutorialStep = 0,
  onStepChange,
  className = ""
}) => {
  const [currentStep, setCurrentStep] = useState(tutorialStep);
  const [isAnimating, setIsAnimating] = useState(false);
  const [completedSteps, setCompletedSteps] = useState(new Set());
  
  // Use the imported, centralized tutorial steps
  const tutorialSteps = TUTORIAL_STEPS;
  const currentStepData = tutorialSteps[currentStep];

  // Handle step navigation
  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < tutorialSteps.length) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(stepIndex);
        setCompletedSteps(prev => new Set([...prev, currentStep]));
        onStepChange?.(stepIndex);
        setIsAnimating(false);
      }, 150);
    }
  };

  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);

  const completeTutorial = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    onComplete?.();
    // Removed onClose?.() since onComplete should handle closing the tutorial
  };

  const restartTutorial = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    onStepChange?.(0);
  };
  
  // Handle keyboard navigation (now simplified as TutorialModal handles Escape)
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          if (currentStepData.actions.includes('next')) nextStep();
          break;
        case 'ArrowLeft':
          if (currentStepData.actions.includes('prev')) prevStep();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentStep, currentStepData]);

  if (!isOpen) return null;
  
  const StepIcon = currentStepData.icon;

  return (
    // Use the TutorialModal component for the main structure
    <TutorialModal
      isOpen={isOpen}
      onClose={onClose}
      title={currentStepData.title}
      className={className}
    >
      {/* All modal content is passed as children */}
      <div className="flex flex-col h-full">
        {/* Header content (subtitle) */}
        <div className="px-4 pb-2 border-b border-slate-700/50">
           <p className="text-xs text-slate-400">
             Step {currentStep + 1} of {tutorialSteps.length}: {currentStepData.subtitle}
           </p>
        </div>
      
        {/* Progress Bar */}
        <div className="px-4 py-2">
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-400">Progress</span>
            <span className="text-xs text-blue-300">
              {Math.round(((currentStep + 1) / tutorialSteps.length) * 100)}%
            </span>
          </div>
        </div>

        {/* Content */}
        <div className={`p-4 transition-opacity duration-150 flex-1 overflow-y-auto ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
          <div className="max-h-64 overflow-y-auto">
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
              {currentStepData.content}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-4 border-t border-slate-700/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            {currentStepData.actions.includes('prev') && (
              <button
                onClick={prevStep}
                disabled={currentStep === 0}
                className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
            )}

            {currentStepData.actions.includes('restart') && (
              <button
                onClick={restartTutorial}
                className="flex items-center gap-2 px-3 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors text-sm"
              >
                <RotateCcw className="w-4 h-4" />
                Restart
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStepData.actions.includes('next') && (
              <button
                onClick={nextStep}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-medium"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {currentStepData.actions.includes('complete') && (
              <button
                onClick={completeTutorial}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Complete Tutorial
              </button>
            )}
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-center gap-2 p-4 pt-0">
          {tutorialSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => goToStep(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentStep
                  ? 'bg-blue-400 w-6'
                  : completedSteps.has(index)
                  ? 'bg-green-500'
                  : 'bg-slate-600 hover:bg-slate-500'
              }`}
              aria-label={`Go to step ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </TutorialModal>
  );
};

export default Tutorial;