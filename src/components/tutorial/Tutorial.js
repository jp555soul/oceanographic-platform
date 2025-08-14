import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Eye,
  MessageCircle,
  Activity,
  Map,
  BarChart3,
  Settings,
  MousePointer,
  Navigation,
  Waves,
  CheckCircle,
  RotateCcw,
  HelpCircle
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
  const tutorialRef = useRef(null);

  // Tutorial steps configuration
  const tutorialSteps = [
    {
      id: 'welcome',
      title: 'Welcome to Coastal Oceanographic Monitor',
      description: 'Your comprehensive platform for ocean data analysis and visualization.',
      content: `This interactive tutorial will guide you through all the features of the Coastal Oceanographic Monitor. 
      
      You'll learn how to:
      • Navigate and control the ocean data visualization
      • Interact with the 3D map and station data
      • Analyze environmental parameters
      • Use the AI assistant for insights
      
      The tutorial takes about 5 minutes to complete.`,
      icon: Waves,
      target: null,
      position: 'center',
      actions: ['next']
    },
    {
      id: 'control-panel',
      title: 'Control Panel Overview',
      description: 'Master the data controls and animation settings.',
      content: `The Control Panel is your command center for ocean data exploration:

      🎯 **Study Area**: Select geographic regions (MSP, USM, MBL)
      🌊 **Ocean Model**: Choose between NGOSF2, ROMS, HYCOM models
      📊 **Parameters**: View Current Speed, Temperature, Salinity, Wave Height
      📅 **Date/Time**: Navigate through temporal data
      ⚡ **Animation**: Play, pause, and control playback speed
      📏 **Depth**: Select measurement depth from surface to deep water
      
      Try changing the playback speed or selecting different parameters to see real-time updates.`,
      icon: Settings,
      target: '[data-tutorial="control-panel"]',
      position: 'bottom',
      actions: ['prev', 'next'],
      highlight: true
    },
    {
      id: 'map-interaction',
      title: 'Interactive Ocean Map',
      description: 'Explore stations, currents, and environmental layers.',
      content: `The interactive map is the heart of ocean data visualization:

      🗺️ **Map Controls**: Use the Ocean Controls panel to customize layers
      🎯 **Station Markers**: Click colored dots to select monitoring stations
      🌬️ **Wind Layers**: Toggle wind particles and vectors
      🌊 **Ocean Layers**: Enable bathymetry and sea surface temperature
      📍 **HoloOcean POV**: Green marker shows 3D simulation viewpoint
      
      **Try this**: Click on any station marker to see detailed information and data charts.
      
      **Map Features**:
      • Zoom and pan to explore different regions
      • Switch map styles (Satellite, Dark, Outdoors)
      • Enable globe auto-rotation for global view`,
      icon: Map,
      target: '[data-tutorial="map-container"]',
      position: 'right',
      actions: ['prev', 'next'],
      highlight: true
    },
    {
      id: 'data-panels',
      title: 'Environmental Data Analysis',
      description: 'Monitor real-time conditions and trends.',
      content: `The Data Panels provide comprehensive environmental monitoring:

      📊 **Environmental Data**: 
      • Temperature, Salinity, Pressure readings
      • Real-time sensor depth information
      • Data quality indicators

      📈 **Time Series Charts**:
      • Current Speed trends over time
      • Sound Speed variations
      • Wave Height patterns
      • Temperature fluctuations
      
      🎮 **HoloOcean 3D Visualization**:
      • Immersive underwater environment
      • Interactive depth profiling
      • Real-time parameter visualization
      
      **Pro Tip**: Adjust the time range (12h/24h/48h) to see different trend patterns.`,
      icon: BarChart3,
      target: '[data-tutorial="data-panels"]',
      position: 'left',
      actions: ['prev', 'next'],
      highlight: true
    },
    {
      id: 'output-module',
      title: 'Analysis Output Module',
      description: 'Review AI analysis and export data.',
      content: `The Output Module tracks your analysis history:

      📝 **Response History**: All AI analysis responses are saved here
      🔍 **Filter Options**: Sort by charts, tables, or text analysis
      📊 **Interactive Charts**: Responses include relevant data visualizations
      💾 **Export Features**: Download analysis as JSON files
      🔄 **Analysis Context**: Each response includes parameter and depth info
      
      **Features**:
      • Expand/collapse for more space
      • Copy responses to clipboard
      • Track analysis over time
      • Review context for each insight`,
      icon: Activity,
      target: '[data-tutorial="output-module"]',
      position: 'left',
      actions: ['prev', 'next'],
      highlight: true
    },
    {
      id: 'chatbot',
      title: 'AI Assistant (BlueAI)',
      description: 'Get intelligent insights about ocean conditions.',
      content: `BlueAI is your oceanographic analysis expert:

      🤖 **Natural Language Queries**: Ask questions in plain English
      📊 **Context-Aware Analysis**: Responses use your current settings
      🔍 **Specialized Knowledge**: Marine science, safety, forecasting
      ⚡ **Real-Time Data**: Analysis based on current frame and parameters
      
      **Try asking**:
      • "What are the current conditions?"
      • "Analyze wave patterns"
      • "Is it safe for small boats?"
      • "Predict the next 6 hours"
      • "Compare temperature trends"
      
      **Quick Tips**:
      • Click the blue chat button (bottom-right)
      • Use suggested prompts for quick analysis
      • Responses appear in both chat and Output Module`,
      icon: MessageCircle,
      target: '[data-tutorial="chatbot"]',
      position: 'left',
      actions: ['prev', 'next'],
      highlight: true
    },
    {
      id: 'advanced-features',
      title: 'Advanced Features',
      description: 'Power user tips and hidden features.',
      content: `Unlock the full potential of the platform:

      🎯 **Station Analysis**: 
      • Click stations → "Analyze Station Data" for detailed reports
      • Export station data as CSV files
      • View data quality and validation status

      🌍 **Global Ocean Exploration**:
      • Use "Global View" button for worldwide perspective
      • Enable auto-rotation for continuous exploration
      • Switch between projection modes

      ⚙️ **Data Management**:
      • Refresh data using header controls
      • Monitor connection status and data quality
      • Switch between CSV and API data sources
      
      📱 **Mobile Optimization**:
      • Touch-friendly controls on tablets/phones
      • Responsive layout adapts to screen size
      • Swipe gestures for map navigation`,
      icon: Eye,
      target: null,
      position: 'center',
      actions: ['prev', 'next']
    },
    {
      id: 'completion',
      title: 'Tutorial Complete!',
      description: 'You\'re ready to explore ocean data like a pro.',
      content: `🎉 **Congratulations!** You've completed the tutorial.

      **What you've learned**:
      ✅ Control Panel navigation and settings
      ✅ Interactive map features and station data
      ✅ Environmental data analysis tools
      ✅ AI assistant capabilities
      ✅ Advanced features and power user tips

      **Next Steps**:
      • Explore real ocean data with different parameters
      • Try various map layers and visualization modes
      • Ask BlueAI complex oceanographic questions
      • Analyze specific stations in your region of interest
      
      **Need Help Later?**
      Click the Settings button in the header and select "Tutorial" to restart this guide anytime.
      
      Happy exploring! 🌊`,
      icon: CheckCircle,
      target: null,
      position: 'center',
      actions: ['prev', 'complete', 'restart']
    }
  ];

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
    onClose?.();
  };

  const restartTutorial = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    onStepChange?.(0);
  };

  // Handle spotlight effect for targeted elements
  useEffect(() => {
    if (isOpen && currentStepData.target && currentStepData.highlight) {
      const targetElement = document.querySelector(currentStepData.target);
      if (targetElement) {
        targetElement.classList.add('tutorial-highlight');
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
      }

      return () => {
        const elements = document.querySelectorAll('.tutorial-highlight');
        elements.forEach(el => el.classList.remove('tutorial-highlight'));
      };
    }
  }, [isOpen, currentStep, currentStepData.target, currentStepData.highlight]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowRight':
        case 'Enter':
          if (currentStep < tutorialSteps.length - 1) nextStep();
          break;
        case 'ArrowLeft':
          if (currentStep > 0) prevStep();
          break;
        case 'Escape':
          onClose?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentStep]);

  // Auto-advance after user reads step (optional)
  useEffect(() => {
    if (isOpen && currentStepData.autoAdvance) {
      const timer = setTimeout(() => {
        if (currentStep < tutorialSteps.length - 1) {
          nextStep();
        }
      }, currentStepData.autoAdvance);

      return () => clearTimeout(timer);
    }
  }, [isOpen, currentStep, currentStepData.autoAdvance]);

  if (!isOpen) return null;

  const getPositionClasses = () => {
    switch (currentStepData.position) {
      case 'left':
        return 'left-4 top-1/2 transform -translate-y-1/2';
      case 'right':
        return 'right-4 top-1/2 transform -translate-y-1/2';
      case 'bottom':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'top':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    }
  };

  const StepIcon = currentStepData.icon;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50">
        
        {/* Tutorial Modal */}
        <div 
          ref={tutorialRef}
          className={`fixed ${getPositionClasses()} max-w-md md:max-w-lg bg-slate-800/95 backdrop-blur-md border border-blue-400/50 rounded-xl shadow-2xl ${className}`}
        >
          
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <StepIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-300 text-sm md:text-base">
                  {currentStepData.title}
                </h3>
                <p className="text-xs text-slate-400">
                  Step {currentStep + 1} of {tutorialSteps.length}
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1 rounded"
              aria-label="Close tutorial"
            >
              <X className="w-5 h-5" />
            </button>
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
          <div className={`p-4 transition-opacity duration-150 ${isAnimating ? 'opacity-50' : 'opacity-100'}`}>
            <div className="mb-3">
              <p className="text-sm text-slate-400 mb-2">
                {currentStepData.description}
              </p>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                {currentStepData.content}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between p-4 border-t border-slate-700/50">
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

        {/* Keyboard shortcuts hint */}
        <div className="fixed bottom-4 left-4 bg-slate-800/80 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">←</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">→</kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-xs">Esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial Styles */}
      <style jsx>{`
        .tutorial-highlight {
          position: relative;
          z-index: 1000;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5),
                      0 0 0 8px rgba(59, 130, 246, 0.2);
          border-radius: 8px;
          animation: tutorialPulse 2s ease-in-out infinite;
        }

        @keyframes tutorialPulse {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5),
                        0 0 0 8px rgba(59, 130, 246, 0.2);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.6),
                        0 0 0 16px rgba(59, 130, 246, 0.1);
          }
        }
      `}</style>
    </>
  );
};

export default Tutorial;