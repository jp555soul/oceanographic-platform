import React from 'react';
import { Waves, Database, Activity, RefreshCw } from 'lucide-react';

const LoadingScreen = ({ 
  title = "Loading Oceanographic Data", 
  message = "Loading data...",
  type = "data", // "data", "processing", "connecting", "custom"
  progress = null, // Optional progress percentage (0-100)
  details = null // Optional array of loading steps
}) => {
  
  // Different animation types based on loading context
  const getLoadingAnimation = () => {
    switch (type) {
      case "data":
        return (
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-blue-400/30 rounded-full animate-ping"></div>
            <div className="absolute inset-2 border-4 border-blue-400/50 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-400 animate-pulse" />
            </div>
          </div>
        );
      
      case "processing":
        return (
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-green-400/30 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-green-400/50 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Activity className="w-6 h-6 text-green-400 animate-pulse" />
            </div>
          </div>
        );
      
      case "connecting":
        return (
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-cyan-400/30 rounded-full animate-ping"></div>
            <div className="absolute inset-2 border-4 border-cyan-400/50 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Waves className="w-6 h-6 text-cyan-400 animate-bounce" />
            </div>
          </div>
        );
      
      default:
        return (
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-blue-400/30 rounded-full animate-ping"></div>
            <div className="absolute inset-2 border-4 border-blue-400/50 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          </div>
        );
    }
  };

  const getColorScheme = () => {
    switch (type) {
      case "data":
        return {
          title: "text-blue-300",
          message: "text-slate-400",
          progress: "bg-blue-400"
        };
      case "processing":
        return {
          title: "text-green-300",
          message: "text-slate-400",
          progress: "bg-green-400"
        };
      case "connecting":
        return {
          title: "text-cyan-300",
          message: "text-slate-400",
          progress: "bg-cyan-400"
        };
      default:
        return {
          title: "text-blue-300",
          message: "text-slate-400",
          progress: "bg-blue-400"
        };
    }
  };

  const colors = getColorScheme();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        
        {/* Loading Animation */}
        {getLoadingAnimation()}

        {/* Title */}
        <h2 className={`text-lg md:text-xl font-semibold ${colors.title} mb-2`}>
          {title}
        </h2>

        {/* Main Message */}
        <p className={`text-sm md:text-base ${colors.message} mb-4`}>
          {message}
        </p>

        {/* Progress Bar (if provided) */}
        {progress !== null && (
          <div className="mb-4">
            <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${colors.progress} transition-all duration-300 ease-out`}
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              ></div>
            </div>
            <div className="text-xs text-slate-500">
              {Math.round(progress)}% Complete
            </div>
          </div>
        )}

        {/* Loading Details/Steps (if provided) */}
        {details && details.length > 0 && (
          <div className="text-left bg-slate-800/50 rounded-lg p-4 mt-4">
            <div className="text-xs font-semibold text-slate-300 mb-2">Loading Progress:</div>
            <div className="space-y-1">
              {details.map((detail, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-slate-400">
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    detail.status === 'completed' ? 'bg-green-400' :
                    detail.status === 'loading' ? 'bg-yellow-400 animate-pulse' :
                    detail.status === 'error' ? 'bg-red-400' :
                    'bg-slate-600'
                  }`}></div>
                  <span className={
                    detail.status === 'completed' ? 'text-green-300' :
                    detail.status === 'loading' ? 'text-yellow-300' :
                    detail.status === 'error' ? 'text-red-300' :
                    'text-slate-400'
                  }>
                    {detail.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USM/BlueMovement Branding */}
        <div className="mt-8 text-xs text-slate-500 space-y-1">
          <div>University of Southern Mississippi</div>
          <div>Roger F. Wicker Center for Ocean Enterprise</div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
            <div>Powered by Bluemvmt Technology</div>
            <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
          </div>
        </div>

        {/* Pulsing Background Effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/5 rounded-full animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/5 rounded-full animate-pulse delay-1000"></div>
        </div>
      </div>
    </div>
  );
};

// Pre-configured loading screen variants
export const DataLoadingScreen = (props) => (
  <LoadingScreen 
    type="data"
    title="Loading Oceanographic Data"
    message="Loading data..."
    {...props}
  />
);

export const ProcessingScreen = (props) => (
  <LoadingScreen 
    type="processing"
    title="Processing Data"
    message="Analyzing oceanographic measurements..."
    {...props}
  />
);

export const ConnectingScreen = (props) => (
  <LoadingScreen 
    type="connecting"
    title="Connecting to Ocean Systems"
    message="Establishing connection to monitoring stations..."
    {...props}
  />
);

// Example usage with detailed steps
export const DetailedLoadingScreen = (props) => {
  const loadingSteps = [
    { message: "Scanning data directory...", status: "completed" },
    { message: "Loading API data...", status: "loading" },
    { message: "Validating coordinates...", status: "pending" },
    { message: "Generating station data...", status: "pending" },
    { message: "Initializing map interface...", status: "pending" }
  ];

  return (
    <LoadingScreen 
      type="data"
      title="Initializing Ocean Monitor"
      message="Setting up oceanographic data platform..."
      details={loadingSteps}
      progress={40}
      {...props}
    />
  );
};

export default LoadingScreen;