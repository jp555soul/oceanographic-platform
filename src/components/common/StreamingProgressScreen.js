import React from 'react';
import { Database, Activity, FileText, CheckCircle, XCircle, Loader } from 'lucide-react';

/**
 * StreamingProgressScreen - Shows progress while streaming large CSV files
 * Displays file-by-file progress, total progress, and allows cancellation
 */
const StreamingProgressScreen = ({ 
  progress, 
  errors = [], 
  onCancel, 
  dataQuality 
}) => {
  const {
    currentFile,
    currentFileIndex,
    totalFiles,
    processedRows,
    totalProcessedRows,
    estimatedTotalRows,
    isComplete,
    errors: progressErrors
  } = progress;

  // Calculate progress percentage
  const currentFileProgress = estimatedTotalRows 
    ? Math.min(100, (processedRows / estimatedTotalRows) * 100)
    : 0;
  
  const overallProgress = totalFiles > 0 
    ? Math.min(100, ((currentFileIndex + (currentFileProgress / 100)) / totalFiles) * 100)
    : currentFileProgress;

  // Format numbers for display
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Get status message
  const getStatusMessage = () => {
    if (isComplete) return 'Streaming complete! Loading final data...';
    if (currentFile) return `Processing ${currentFile}...`;
    return 'Initializing data streaming...';
  };

  // Get file progress details
  const getFileProgressText = () => {
    if (totalFiles > 1) {
      return `File ${currentFileIndex + 1} of ${totalFiles}`;
    }
    return 'Processing file';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-blue-400/30 rounded-full animate-ping"></div>
            <div className="absolute inset-2 border-4 border-blue-400/50 rounded-full animate-pulse"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Database className="w-6 h-6 text-blue-400 animate-pulse" />
            </div>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold text-blue-300 mb-2">
            Streaming Ocean Data
          </h1>
          <p className="text-slate-400 text-base md:text-lg">
            {getStatusMessage()}
          </p>
        </div>

        {/* Main Progress Card */}
        <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 md:p-8 mb-6">
          
          {/* File Progress Section */}
          {currentFile && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300 font-medium">{getFileProgressText()}</span>
                </div>
                <span className="text-blue-400 font-mono text-sm">
                  {formatNumber(processedRows)} rows
                </span>
              </div>
              
              <div className="text-slate-400 text-sm mb-3 truncate">
                📄 {currentFile}
              </div>
              
              {/* File Progress Bar */}
              <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden mb-4">
                <div 
                  className="absolute left-0 top-0 h-full bg-blue-400 transition-all duration-300 ease-out"
                  style={{ width: `${currentFileProgress}%` }}
                />
                {currentFileProgress > 0 && (
                  <div className="absolute right-1 top-0 h-full w-1 bg-white/60 animate-pulse" />
                )}
              </div>
              
              {currentFileProgress > 0 && (
                <div className="text-right text-slate-400 text-xs">
                  {currentFileProgress.toFixed(1)}% of current file
                </div>
              )}
            </div>
          )}

          {/* Overall Progress Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-white font-semibold">Overall Progress</span>
              </div>
              <span className="text-cyan-400 font-mono">
                {formatNumber(totalProcessedRows)} total rows
              </span>
            </div>
            
            {/* Overall Progress Bar */}
            <div className="relative h-4 bg-slate-700 rounded-full overflow-hidden mb-3">
              <div 
                className="absolute left-0 top-0 h-full bg-blue-400 transition-all duration-500 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            </div>
            
            <div className="flex justify-between text-sm text-slate-400">
              <span>{overallProgress.toFixed(1)}% complete</span>
              {estimatedTotalRows && (
                <span>~{formatNumber(estimatedTotalRows)} estimated rows</span>
              )}
            </div>
          </div>

          {/* Data Quality Preview */}
          {dataQuality && totalProcessedRows > 0 && (
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Data Quality</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    dataQuality.score >= 75 ? 'bg-green-400' :
                    dataQuality.score >= 50 ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <span className="text-white font-medium">{dataQuality.status}</span>
                </div>
              </div>
              <div className="text-slate-400 text-sm mt-1">
                {dataQuality.stations} stations • {formatNumber(dataQuality.measurements)} measurements
              </div>
            </div>
          )}
        </div>

        {/* Error Messages */}
        {(errors.length > 0 || progressErrors.length > 0) && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center mb-2">
              <XCircle className="w-5 h-5 text-red-400 mr-2" />
              <span className="text-red-300 font-medium">Processing Warnings</span>
            </div>
            <div className="space-y-1">
              {[...errors, ...progressErrors].map((error, index) => (
                <div key={index} className="text-red-200 text-sm">
                  • {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          {!isComplete && onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          )}
          
          {isComplete && (
            <div className="flex items-center space-x-2 text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">Ready to explore!</span>
            </div>
          )}
        </div>

        {/* USM/BlueMovement Branding */}
        <div className="mt-8 text-center text-xs text-slate-500 space-y-1">
          <div>University of Southern Mississippi</div>
          <div>Roger F. Wicker Center for Ocean Enterprise</div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
            <div>Powered by Bluemvmt Technology</div>
            <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
          </div>
        </div>

        {/* Technical Details */}
        {totalProcessedRows > 0 && (
          <div className="mt-8 text-center">
            <details className="text-slate-400 text-sm">
              <summary className="cursor-pointer hover:text-slate-300 transition-colors">
                Technical Details
              </summary>
              <div className="mt-2 space-y-1 text-xs font-mono bg-slate-900/50 rounded-lg p-3 mt-3">
                <div>Files: {currentFileIndex + 1}/{totalFiles}</div>
                <div>Rows Processed: {totalProcessedRows.toLocaleString()}</div>
                <div>Current File Rows: {processedRows.toLocaleString()}</div>
                {estimatedTotalRows && (
                  <div>Estimated Total: {estimatedTotalRows.toLocaleString()}</div>
                )}
                <div>Status: {isComplete ? 'Complete' : 'Processing'}</div>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamingProgressScreen;