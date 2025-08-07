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
  Filter
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
  selectedDepth = 33,
  
  // Display options
  showCharts = true,
  showTables = true,
  showScrollButton = true,
  maxResponses = 50,
  
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
  const [responseFilter, setResponseFilter] = useState('all'); // 'all', 'charts', 'tables', 'text'
  
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

  // Filter responses based on type
  const getFilteredResponses = () => {
    const aiResponses = chatMessages.filter(msg => !msg.isUser);
    
    switch (responseFilter) {
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
  const getResponseType = (content) => {
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('chart') || lowerContent.includes('trend') || lowerContent.includes('wave')) {
      return { type: 'chart', icon: BarChart3, color: 'text-cyan-400' };
    }
    if (lowerContent.includes('data') || lowerContent.includes('temperature') || lowerContent.includes('environmental')) {
      return { type: 'table', icon: Table, color: 'text-green-400' };
    }
    if (lowerContent.includes('analysis') || lowerContent.includes('forecast') || lowerContent.includes('predict')) {
      return { type: 'analysis', icon: TrendingUp, color: 'text-purple-400' };
    }
    return { type: 'text', icon: FileText, color: 'text-yellow-400' };
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
                  <th className="text-left p-1 text-slate-300">Temp (°C)</th>
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
      // Could show a toast notification here
      console.log('Response copied to clipboard');
    } catch (err) {
      console.error('Failed to copy response:', err);
    }
  };

  // Export response
  const handleExportResponse = (response, index) => {
    const exportData = {
      id: response.id,
      timestamp: response.timestamp,
      content: response.content,
      type: getResponseType(response.content).type,
      frame: currentFrame,
      parameter: selectedParameter,
      depth: selectedDepth
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocean_analysis_response_${index + 1}.json`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const filteredResponses = getFilteredResponses();

  return (
    <div className={`flex flex-col h-full ${className}`}>
      
      {/* Header */}
      <div className="p-2 md:p-4 border-b border-yellow-500/20 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-yellow-300 flex items-center gap-2 text-sm md:text-base">
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
              Analysis Output Module
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              History: {filteredResponses.length} responses • Frame: {currentFrame + 1}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Filter Dropdown */}
            <select
              value={responseFilter}
              onChange={(e) => setResponseFilter(e.target.value)}
              className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-yellow-400"
            >
              <option value="all">All Responses</option>
              <option value="charts">Charts & Trends</option>
              <option value="tables">Data & Tables</option>
              <option value="text">Text Analysis</option>
            </select>
            
            <button
              onClick={() => setExpandedResponse(null)}
              className="p-1 text-slate-400 hover:text-slate-300 transition-colors"
              title="Collapse All"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Response History - Scrollable */}
      <div className="flex-1 p-2 md:p-4 overflow-hidden">
        <div 
          ref={outputScrollRef} 
          onScroll={handleOutputScroll}
          className="h-full overflow-y-auto bg-slate-700/30 rounded p-2 md:p-3 space-y-3 md:space-y-4 scroll-smooth"
        >
          {filteredResponses.length > 0 ? (
            filteredResponses.slice(-maxResponses).map((response, index) => {
              const responseType = getResponseType(response.content);
              const ResponseIcon = responseType.icon;
              const isExpanded = expandedResponse === response.id;
              
              return (
                <div key={response.id} className="border-b border-slate-600/30 pb-3 md:pb-4 last:border-b-0">
                  
                  {/* Response Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${responseType.color.replace('text-', 'bg-')}`}></div>
                      <ResponseIcon className={`w-4 h-4 ${responseType.color}`} />
                      <span className={`text-xs font-medium ${responseType.color}`}>
                        Response #{index + 1} • {responseType.type.charAt(0).toUpperCase() + responseType.type.slice(1)}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        {response.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    
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
                  </div>

                  {/* Response Content */}
                  <div className="space-y-2 md:space-y-3">
                    
                    {/* Main Response Text */}
                    <div className={`text-xs md:text-sm text-slate-100 leading-relaxed ${
                      isExpanded ? '' : 'line-clamp-3'
                    }`}>
                      {response.content}
                    </div>

                    {/* Chart Response */}
                    {showCharts && (isExpanded || responseType.type === 'chart') && 
                     generateResponseChart(response, index)}

                    {/* Table Response */}
                    {showTables && (isExpanded || responseType.type === 'table') && 
                     generateResponseTable(response, index)}

                    {/* Analysis Metadata */}
                    {isExpanded && (
                      <div className="bg-slate-800/50 rounded p-2 mt-2">
                        <div className="text-xs text-slate-400 mb-1">Analysis Context</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
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
                          <div>
                            <span className="text-slate-500">Type:</span>
                            <br />
                            <span className={responseType.color}>{responseType.type}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center text-slate-400 py-6 md:py-8">
              <MessageCircle className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs md:text-sm">No analysis responses yet</p>
              <p className="text-xs mt-1">
                {responseFilter === 'all' 
                  ? 'Charts, tables, and text responses will appear here'
                  : `No ${responseFilter} responses found`
                }
              </p>
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
      {showScrollButton && showScrollToBottom && (
        <button
          onClick={scrollOutputToBottom}
          className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-yellow-500 hover:bg-yellow-600 p-2 rounded-full shadow-lg transition-colors z-20 border-2 border-yellow-400"
          aria-label="Scroll to bottom"
        >
          <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-white" />
        </button>
      )}
    </div>
  );
};

export default OutputModule;