import React, { useRef, useEffect, useState } from 'react';
import { 
  ChevronDown, 
  MessageCircle, 
  BarChart3, 
  Table, 
  FileText, 
  Download, 
  Copy, 
  Share2,
  TrendingUp,
  Activity,
  Clock,
  Database,
  Eye,
  Maximize2,
  Minimize2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
  AlertTriangle,
  RefreshCw,
  Server,
  Globe
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const OutputModule = ({
  // Chat messages (filtered to show only AI responses)
  chatMessages = [],
  
  // Time series data for charts
  timeSeriesData = [],
  
  // Current state for context
  currentFrame = 0,
  selectedParameter = 'Current Speed',
  selectedDepth = 0,
  
  // Display options
  showCharts = true,
  showTables = true,
  showScrollButton = true,
  maxResponses = 50,
  
  // Collapse/expand functionality
  isCollapsed = true,
  onToggleCollapse,
  
  // Callbacks
  onExportResponse,
  onCopyResponse,
  onShareResponse,
  
  // Styling
  className = "",
  
  // Loading states
  isTyping = false,
  typingMessage = "Processing..."
}) => {
  
  const outputScrollRef = useRef(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [expandedResponse, setExpandedResponse] = useState(null);
  const [responseFilter, setResponseFilter] = useState('api'); // Changed from 'all' to 'api'
  const [apiMetrics, setApiMetrics] = useState({
    totalApiResponses: 0,
    totalLocalResponses: 0,
    successRate: 0,
    avgResponseTime: 0
  });
  
  // Auto-scroll functionality
  const scrollOutputToBottom = () => {
    if (outputScrollRef.current) {
      outputScrollRef.current.scrollTop = outputScrollRef.current.scrollHeight;
    }
  };

  const handleOutputScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollToBottom(!isNearBottom);
  };

  // Auto-scroll when new responses are added or when typing starts
  useEffect(() => {
    scrollOutputToBottom();
  }, [chatMessages.filter(msg => !msg.isUser).length, isTyping]);

  // Calculate API metrics
  useEffect(() => {
    const aiResponses = chatMessages.filter(msg => !msg.isUser); // Removed system filter
    const apiResponses = aiResponses.filter(msg => msg.source === 'api');
    const localResponses = aiResponses.filter(msg => msg.source === 'local');
    
    setApiMetrics({
      totalApiResponses: apiResponses.length,
      totalLocalResponses: localResponses.length,
      successRate: aiResponses.length > 0 ? (apiResponses.length / aiResponses.length * 100).toFixed(1) : 0,
      avgResponseTime: 0 // Could be calculated if response times are tracked
    });
  }, [chatMessages]);

  // Filter responses based on type
  const getFilteredResponses = () => {
    const aiResponses = chatMessages.filter(msg => !msg.isUser);
    
    switch (responseFilter) {
      case 'api':
        return aiResponses.filter(msg => msg.source === 'api');
      case 'local':
        return aiResponses.filter(msg => msg.source === 'local');
      case 'charts':
        return aiResponses.filter(msg => 
          msg.content.toLowerCase().includes('chart') || 
          msg.content.toLowerCase().includes('trend') ||
          msg.content.toLowerCase().includes('analysis')
        );
      case 'tables':
        return aiResponses.filter(msg => 
          msg.content.toLowerCase().includes('data') ||
          msg.content.toLowerCase().includes('measurement') ||
          msg.content.toLowerCase().includes('temperature')
        );
      case 'text':
        return aiResponses.filter(msg => 
          !msg.content.toLowerCase().includes('chart') && 
          !msg.content.toLowerCase().includes('data') &&
          !msg.content.toLowerCase().includes('trend')
        );
      default:
        return aiResponses;
    }
  };

  // Determine response type for styling and icons
  const getResponseType = (content, source) => {
    const lowerContent = content.toLowerCase();
    
    // Source-based styling
    if (source === 'api') {
      return { type: 'api', icon: Server, color: 'text-green-400', bgColor: 'bg-green-900/20', borderColor: 'border-green-500/30' };
    }
    if (source === 'local') {
      return { type: 'local', icon: WifiOff, color: 'text-yellow-400', bgColor: 'bg-yellow-900/20', borderColor: 'border-yellow-500/30' };
    }
    if (source === 'error') {
      return { type: 'error', icon: AlertTriangle, color: 'text-red-400', bgColor: 'bg-red-900/20', borderColor: 'border-red-500/30' };
    }
    
    // Content-based styling for other messages
    if (lowerContent.includes('chart') || lowerContent.includes('trend') || lowerContent.includes('wave')) {
      return { type: 'chart', icon: BarChart3, color: 'text-cyan-400', bgColor: 'bg-cyan-900/20', borderColor: 'border-cyan-500/30' };
    }
    if (lowerContent.includes('data') || lowerContent.includes('temperature') || lowerContent.includes('environmental')) {
      return { type: 'table', icon: Table, color: 'text-emerald-400', bgColor: 'bg-emerald-900/20', borderColor: 'border-emerald-500/30' };
    }
    if (lowerContent.includes('analysis') || lowerContent.includes('forecast') || lowerContent.includes('predict')) {
      return { type: 'analysis', icon: TrendingUp, color: 'text-purple-400', bgColor: 'bg-purple-900/20', borderColor: 'border-purple-500/30' };
    }
    return { type: 'text', icon: FileText, color: 'text-slate-400', bgColor: 'bg-slate-700/20', borderColor: 'border-slate-500/30' };
  };

  // Generate chart component based on response content
  const generateResponseChart = (response, index) => {
    const lowerContent = response.content.toLowerCase();
    
    if (lowerContent.includes('current') || lowerContent.includes('flow')) {
      return (
        <div className="bg-slate-600/50 rounded p-2 md:p-3 mt-2">
          <div className="text-xs text-slate-400 mb-2">Current Speed Analysis</div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={timeSeriesData.slice(-12)}>
              <Line 
                type="monotone" 
                dataKey="currentSpeed" 
                stroke="#22d3ee" 
                strokeWidth={2}
                dot={false}
              />
              <XAxis hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value) => [`${value?.toFixed(3)} m/s`, 'Current Speed']}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    if (lowerContent.includes('wave') || lowerContent.includes('swell')) {
      return (
        <div className="bg-slate-600/50 rounded p-2 md:p-3 mt-2">
          <div className="text-xs text-slate-400 mb-2">Wave Height Trends</div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={timeSeriesData.slice(-8)}>
              <Bar 
                dataKey="waveHeight" 
                fill="#10b981"
                opacity={0.7}
              />
              <XAxis hide />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1f2937', 
                  border: '1px solid #374151',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}
                formatter={(value) => [`${value?.toFixed(2)} m`, 'Wave Height']}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return null;
  };

  // Generate data table based on response content
  const generateResponseTable = (response, index) => {
    const lowerContent = response.content.toLowerCase();
    
    if ((lowerContent.includes('data') || lowerContent.includes('temperature') || lowerContent.includes('environmental')) && timeSeriesData.length > 0) {
      return (
        <div className="bg-slate-600/50 rounded p-2 md:p-3 mt-2">
          <div className="text-xs text-slate-400 mb-2">Environmental Data Table</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-500">
                  <th className="text-left p-1 text-slate-300">Time</th>
                  <th className="text-left p-1 text-slate-300">Temp (°F)</th>
                  <th className="text-left p-1 text-slate-300">Current (m/s)</th>
                  <th className="text-left p-1 text-slate-300">Wave (m)</th>
                </tr>
              </thead>
              <tbody>
                {timeSeriesData.slice(-3).map((row, i) => (
                  <tr key={i} className="border-b border-slate-600/50">
                    <td className="p-1 text-slate-200 font-mono">{row.time}</td>
                    <td className="p-1 text-slate-200">{row.temperature?.toFixed(1) || 'N/A'}</td>
                    <td className="p-1 text-slate-200">{row.currentSpeed?.toFixed(2) || 'N/A'}</td>
                    <td className="p-1 text-slate-200">{row.waveHeight?.toFixed(2) || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return null;
  };

  // Copy response to clipboard
  const handleCopyResponse = async (response) => {
    try {
      await navigator.clipboard.writeText(response.content);
      console.log('Response copied to clipboard');
    } catch (err) {
      console.error('Failed to copy response:', err);
    }
  };

  // Export response
  const handleExportResponse = (response, index) => {
    const responseType = getResponseType(response.content, response.source);
    const exportData = {
      id: response.id,
      timestamp: response.timestamp,
      content: response.content,
      source: response.source,
      type: responseType.type,
      frame: currentFrame,
      parameter: selectedParameter,
      depth: selectedDepth,
      retryAttempt: response.retryAttempt || 0
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocean_analysis_response_${index + 1}_${response.source}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const filteredResponses = getFilteredResponses();

  return (
    <div className={`flex flex-col h-full transition-all duration-300 w-full ${className}`}>
      
      {/* Header */}
      <div className={`flex-shrink-0 ${isCollapsed ? 'p-1' : 'p-2 md:p-4 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 border-b border-yellow-500/20'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`font-semibold text-yellow-300 flex items-center gap-2 ${isCollapsed ? 'text-xs' : 'text-sm md:text-base'}`}>
              <Activity className={`${isCollapsed ? 'w-3 h-3' : 'w-4 h-4 md:w-5 md:h-5'}`} />
              {isCollapsed ? 'Analysis' : 'Analysis Output Module'}
            </h3>
            <p className={`text-slate-400 mt-1 ${isCollapsed ? 'text-xs' : 'text-xs'}`}>
              API: {apiMetrics.totalApiResponses} • Local: {apiMetrics.totalLocalResponses} • Showing: {filteredResponses.length}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* API Metrics - Hidden when collapsed */}
            {!isCollapsed && (
              <div className="text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  <span>{apiMetrics.successRate}% API</span>
                </div>
              </div>
            )}
            
            {/* Filter Dropdown - Hidden when collapsed */}
            {!isCollapsed && (
              <select
                value={responseFilter}
                onChange={(e) => setResponseFilter(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="api">API Responses</option>
                <option value="all">All Responses</option>
                <option value="local">Local Responses</option>
                <option value="charts">Charts & Trends</option>
                <option value="tables">Data & Tables</option>
                <option value="text">Text Analysis</option>
              </select>
            )}
            
            {/* Collapse/Expand Button */}
            <button
              onClick={onToggleCollapse}
              className="p-1 text-slate-400 hover:text-yellow-400 transition-colors border border-slate-600 rounded"
              title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Response History - Scrollable */}
      <div className={`flex-1 overflow-hidden ${isCollapsed ? 'p-1' : 'p-2 md:p-4'}`}>
        <div 
          ref={outputScrollRef} 
          onScroll={handleOutputScroll}
          className={`h-full overflow-y-auto rounded scroll-smooth ${isCollapsed ? 'p-1 space-y-1' : 'bg-slate-700/30 p-2 md:p-3 space-y-3 md:space-y-4'}`}
        >
          {filteredResponses.length > 0 ? (
            filteredResponses.slice(-maxResponses).map((response, index) => {
              const responseType = getResponseType(response.content, response.source);
              const ResponseIcon = responseType.icon;
              const isExpanded = expandedResponse === response.id;
              
              return (
                <div key={response.id} className={`border-b border-slate-600/30 last:border-b-0 ${isCollapsed ? 'pb-1' : 'pb-3 md:pb-4'}`}>
                  
                  {/* Response Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${responseType.color.replace('text-', 'bg-')}`}></div>
                      {!isCollapsed && <ResponseIcon className={`w-4 h-4 ${responseType.color}`} />}
                      <span className={`font-medium ${responseType.color} ${isCollapsed ? 'text-xs' : 'text-xs'}`}>
                        {isCollapsed ? `#${index + 1}` : `Response #${index + 1} • ${responseType.type.charAt(0).toUpperCase() + responseType.type.slice(1)}`}
                      </span>
                      {!isCollapsed && response.source && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${responseType.bgColor} ${responseType.borderColor} border`}>
                          {response.source.toUpperCase()}
                        </span>
                      )}
                      {!isCollapsed && (
                        <span className="text-xs text-slate-400 ml-auto">
                          {response.timestamp.toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    
                    {!isCollapsed && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyResponse(response)}
                          className="p-1 text-slate-400 hover:text-slate-300 transition-colors"
                          title="Copy Response"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleExportResponse(response, index)}
                          className="p-1 text-slate-400 hover:text-slate-300 transition-colors"
                          title="Export Response"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setExpandedResponse(isExpanded ? null : response.id)}
                          className="p-1 text-slate-400 hover:text-slate-300 transition-colors"
                          title={isExpanded ? "Collapse" : "Expand"}
                        >
                          {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Response Content */}
                  <div className={isCollapsed ? 'space-y-1' : 'space-y-2 md:space-y-3'}>
                    
                    {/* Main Response Text */}
                    <div className={`text-slate-100 leading-relaxed ${
                      isCollapsed 
                        ? 'text-xs line-clamp-2' 
                        : isExpanded 
                          ? 'text-xs md:text-sm' 
                          : 'text-xs md:text-sm line-clamp-3'
                    }`}>
                      {response.content}
                    </div>

                    {/* Chart Response - Hidden when collapsed */}
                    {!isCollapsed && showCharts && (isExpanded || responseType.type === 'chart') && 
                     generateResponseChart(response, index)}

                    {/* Table Response - Hidden when collapsed */}
                    {!isCollapsed && showTables && (isExpanded || responseType.type === 'table') && 
                     generateResponseTable(response, index)}

                    {/* Analysis Metadata - Hidden when collapsed */}
                    {!isCollapsed && isExpanded && (
                      <div className="bg-slate-800/50 rounded p-2 mt-2">
                        <div className="text-xs text-slate-400 mb-1">Response Metadata</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500">Source:</span>
                            <br />
                            <span className={responseType.color}>{response.source || 'unknown'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Parameter:</span>
                            <br />
                            <span className="text-slate-300">{selectedParameter}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Depth:</span>
                            <br />
                            <span className="text-slate-300">{selectedDepth}ft</span>
                          </div>
                          <div>
                            <span className="text-slate-500">Frame:</span>
                            <br />
                            <span className="text-slate-300">{currentFrame + 1}</span>
                          </div>
                          {response.retryAttempt > 0 && (
                            <div className="col-span-2">
                              <span className="text-slate-500">Retries:</span>
                              <br />
                              <span className="text-yellow-400">{response.retryAttempt}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className={`text-center text-slate-400 ${isCollapsed ? 'py-2' : 'py-6 md:py-8'}`}>
              <MessageCircle className={`mx-auto mb-2 opacity-50 ${isCollapsed ? 'w-4 h-4' : 'w-6 h-6 md:w-8 md:h-8'}`} />
              <p className="text-xs">
                {isCollapsed ? 'No API responses' : 'No API responses yet'}
              </p>
              {!isCollapsed && (
                <p className="text-xs mt-1">
                  {responseFilter === 'api' 
                    ? 'API responses will appear here. Check connection if none appear.'
                    : `No ${responseFilter} responses found`
                  }
                </p>
              )}
            </div>
          )}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 py-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-0"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-100"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-200"></span>
              </div>
              <span className="text-xs md:text-sm text-slate-400">{typingMessage}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Scroll to Bottom Button */}
      {!isCollapsed && showScrollButton && showScrollToBottom && (
        <button
          onClick={scrollOutputToBottom}
          className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-yellow-500 hover:bg-yellow-600 p-2 rounded-full shadow-lg transition-colors z-10 border-2 border-yellow-400"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-white" />
        </button>
      )}
    </div>
  );
};

export default OutputModule;