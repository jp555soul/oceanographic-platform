import React from 'react';
import { 
  AlertTriangle, 
  Database, 
  Wifi, 
  MapPin, 
  RefreshCw, 
  Settings, 
  FileText, 
  ExternalLink,
  Home,
  HelpCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';

const ErrorScreen = ({
  type = "general", // "no-data", "network", "validation", "map", "csv", "api", "general"
  title,
  message,
  details,
  onRetry,
  onGoHome,
  showContactInfo = true,
  customActions = []
}) => {

  // Error type configurations
  const getErrorConfig = () => {
    switch (type) {
      case "no-data":
        return {
          icon: Database,
          iconColor: "text-red-400",
          bgColor: "from-red-900/20 to-red-800/10",
          borderColor: "border-red-500/30",
          title: title || "No Data Available",
          message: message || "No CSV files found in public/data/ and API endpoint is not available.",
          suggestions: [
            "Add CSV files to the public/data/ folder",
            "Configure API endpoint at /api/oceanographic-data", 
            "Check browser console for detailed error messages",
            "Verify CSV file format matches expected structure"
          ]
        };
      
      case "network":
        return {
          icon: Wifi,
          iconColor: "text-orange-400",
          bgColor: "from-orange-900/20 to-orange-800/10", 
          borderColor: "border-orange-500/30",
          title: title || "Network Connection Error",
          message: message || "Unable to connect to data sources or external services.",
          suggestions: [
            "Check your internet connection",
            "Verify API endpoints are accessible",
            "Check firewall and proxy settings",
            "Try refreshing the page"
          ]
        };

      case "validation":
        return {
          icon: AlertCircle,
          iconColor: "text-yellow-400",
          bgColor: "from-yellow-900/20 to-yellow-800/10",
          borderColor: "border-yellow-500/30", 
          title: title || "Data Validation Error",
          message: message || "The loaded data contains invalid or corrupted information.",
          suggestions: [
            "Check CSV file format and column headers",
            "Verify latitude/longitude coordinates are valid",
            "Ensure date/time fields are properly formatted",
            "Remove any special characters or empty rows"
          ]
        };

      case "map":
        return {
          icon: MapPin,
          iconColor: "text-purple-400",
          bgColor: "from-purple-900/20 to-purple-800/10",
          borderColor: "border-purple-500/30",
          title: title || "Map Initialization Error", 
          message: message || "Unable to initialize the interactive map component.",
          suggestions: [
            "Check Mapbox access token configuration",
            "Verify WebGL support in your browser",
            "Clear browser cache and reload",
            "Try using a different browser"
          ]
        };

      case "csv":
        return {
          icon: FileText,
          iconColor: "text-blue-400",
          bgColor: "from-blue-900/20 to-blue-800/10",
          borderColor: "border-blue-500/30", 
          title: title || "CSV Processing Error",
          message: message || "Failed to process CSV files in the data directory.",
          suggestions: [
            "Ensure CSV files have proper headers (lat, lon, time, etc.)",
            "Check for invalid characters or encoding issues",
            "Verify file permissions and accessibility", 
            "Use comma-separated values format"
          ]
        };

      case "api":
        return {
          icon: Settings,
          iconColor: "text-indigo-400", 
          bgColor: "from-indigo-900/20 to-indigo-800/10",
          borderColor: "border-indigo-500/30",
          title: title || "API Connection Error",
          message: message || "Unable to connect to the oceanographic data API.",
          suggestions: [
            "Verify API endpoint URL is correct",
            "Check API authentication credentials",
            "Confirm API server is running and accessible",
            "Review API rate limits and quotas"
          ]
        };

      default:
        return {
          icon: XCircle,
          iconColor: "text-red-400",
          bgColor: "from-red-900/20 to-slate-800/10",
          borderColor: "border-red-500/30",
          title: title || "Application Error", 
          message: message || "An unexpected error occurred while running the oceanographic platform.",
          suggestions: [
            "Try refreshing the browser page",
            "Clear browser cache and cookies",
            "Check browser console for error details",
            "Contact support if the issue persists"
          ]
        };
    }
  };

  const config = getErrorConfig();
  const IconComponent = config.icon;

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
      <div className={`text-center max-w-2xl w-full bg-gradient-to-b ${config.bgColor} border ${config.borderColor} rounded-lg p-6 md:p-8`}>
        
        {/* Error Icon */}
        <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-slate-800 rounded-full flex items-center justify-center">
            <IconComponent className={`w-8 h-8 md:w-10 md:h-10 ${config.iconColor}`} />
          </div>
          <div className="absolute inset-0 border-2 border-slate-600 rounded-full animate-pulse"></div>
        </div>

        {/* Title */}
        <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
          {config.title}
        </h2>

        {/* Main Message */}
        <p className="text-sm md:text-base text-slate-300 mb-6 leading-relaxed">
          {config.message}
        </p>

        {/* Error Details (if provided) */}
        {details && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-semibold text-slate-200 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Error Details
            </h4>
            <div className="text-sm text-slate-400 font-mono bg-slate-900/50 p-3 rounded border overflow-x-auto">
              {typeof details === 'string' ? details : JSON.stringify(details, null, 2)}
            </div>
          </div>
        )}

        {/* Suggested Solutions */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4 mb-6 text-left">
          <h4 className="font-semibold text-slate-200 mb-3 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-400" />
            Suggested Solutions
          </h4>
          <ul className="space-y-2">
            {config.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-slate-300">
                <span className="text-blue-400 mt-1">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          )}
          
          {onGoHome && (
            <button
              onClick={onGoHome}
              className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 px-6 py-3 rounded-lg transition-colors font-medium"
            >
              <Home className="w-4 h-4" />
              Go Home
            </button>
          )}

          {/* Custom Actions */}
          {customActions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium ${action.className || 'bg-slate-700 hover:bg-slate-600'}`}
            >
              {action.icon && <action.icon className="w-4 h-4" />}
              {action.label}
            </button>
          ))}
        </div>

        {/* Contact Information */}
        {showContactInfo && (
          <div className="mt-8 pt-6 border-t border-slate-700">
            <div className="text-xs text-slate-400 space-y-1">
              <div className="font-semibold text-slate-300 mb-2">Need Additional Help?</div>
              <div>University of Southern Mississippi</div>
              <div>Roger F. Wicker Center for Ocean Enterprise</div>
              <div className="flex items-center justify-center gap-4 mt-3">
                <a 
                  href="#" 
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Documentation
                </a>
                <a 
                  href="#" 
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                  Support
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Subtle Background Effect */}
        <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-red-500/5 rounded-full"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/5 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

// Pre-configured error screen variants
export const NoDataError = (props) => (
  <ErrorScreen type="no-data" {...props} />
);

export const NetworkError = (props) => (
  <ErrorScreen type="network" {...props} />
);

export const DataValidationError = (props) => (
  <ErrorScreen type="validation" {...props} />
);

export const MapError = (props) => (
  <ErrorScreen type="map" {...props} />
);

export const CSVError = (props) => (
  <ErrorScreen type="csv" {...props} />
);

export const APIError = (props) => (
  <ErrorScreen type="api" {...props} />
);

// Example usage with custom actions
export const CustomActionError = (props) => {
  const customActions = [
    {
      label: "Download Sample Data",
      icon: FileText,
      onClick: () => console.log("Download sample data"),
      className: "bg-green-600 hover:bg-green-700"
    },
    {
      label: "Contact Support", 
      icon: ExternalLink,
      onClick: () => window.open('mailto:support@usm.edu'),
      className: "bg-blue-600 hover:bg-blue-700"
    }
  ];

  return (
    <ErrorScreen 
      type="no-data"
      customActions={customActions}
      {...props} 
    />
  );
};

export default ErrorScreen;