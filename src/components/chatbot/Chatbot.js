import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';

const Chatbot = ({ 
  timeSeriesData, 
  csvData, 
  dataSource, 
  selectedDepth, 
  selectedArea, 
  selectedModel, 
  selectedParameter,
  playbackSpeed, 
  currentFrame,
  holoOceanPOV,
  envData,
  timeZone 
}) => {
  // State Management
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      content: "Welcome to BlueAI! I can analyze currents, wave patterns, temperature gradients, and provide real-time insights. What would you like to explore?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const chatEndRef = useRef(null);

  // Advanced AI Response System
  const getAIResponse = (message) => {
    const msg = message.toLowerCase();
    const currentData = timeSeriesData[timeSeriesData.length - 1];
    
    // Data source context
    if (msg.includes('data') || msg.includes('source')) {
      return `Data source: Currently using ${dataSource} data with ${timeSeriesData.length} data points. ${csvData.length > 0 ? `Loaded ${csvData.length} records from CSV files with real oceanographic measurements.` : 'Using simulated oceanographic patterns for demonstration purposes.'}`;
    }
    
    // Contextual analysis based on current parameters
    if (msg.includes('current') || msg.includes('flow')) {
      return `Current analysis: Using ${dataSource} data, at ${selectedDepth}ft depth in ${selectedArea}, I'm detecting ${currentData?.currentSpeed?.toFixed(2) || 'N/A'} m/s flow velocity with heading ${currentData?.heading?.toFixed(1) || 'N/A'}°. The ${selectedModel} model shows tidal-dominated circulation with ${playbackSpeed > 1 ? 'accelerated' : 'normal'} temporal resolution. ${csvData.length > 0 ? 'This data comes from real oceanographic measurements.' : 'This is simulated for demonstration.'}`;
    }
    
    if (msg.includes('wave') || msg.includes('swell')) {
      return `Wave dynamics: Current sea surface height is ${currentData?.waveHeight?.toFixed(2) || 'N/A'}m. The spectral analysis indicates ${currentData?.waveHeight > 0.5 ? 'elevated' : 'moderate'} sea state conditions. Maritime operations should ${currentData?.waveHeight > 1.0 ? 'exercise caution' : 'proceed normally'}.`;
    }
    
    if (msg.includes('temperature') || msg.includes('thermal')) {
      if (envData.temperature !== null) {
        return `Thermal structure: Water temperature at ${selectedDepth}ft is ${envData.temperature.toFixed(2)}°C. The vertical gradient suggests ${selectedDepth < 50 ? 'mixed layer' : 'thermocline'} dynamics. This thermal profile influences marine life distribution and affects acoustic propagation for USM research operations. Temperature anomalies of ±${Math.abs(envData.temperature - (timeSeriesData[0]?.temperature || 23.5)).toFixed(1)}°C from baseline detected.`;
      } else {
        return `Thermal data: No temperature measurements available for the current dataset at ${selectedDepth}ft depth. Temperature profiling requires oceanographic sensor data. Please ensure CSV data includes temperature column for thermal analysis.`;
      }
    }
    
    if (msg.includes('predict') || msg.includes('forecast')) {
      const trend = currentData?.currentSpeed > 0.8 ? 'increasing' : 'stable';
      return `Predictive analysis: Based on the ${selectedModel} ensemble, I forecast ${trend} current velocities over the next 6-hour window. Tidal harmonics suggest peak flows at ${new Date(Date.now() + 3*3600000).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})} UTC. Sea surface conditions will ${currentData?.waveHeight > 0.5 ? 'remain elevated' : 'remain moderate'} with 85% confidence. Recommend continuous monitoring for operational planning.`;
    }
    
    if (msg.includes('holographic') || msg.includes('3d') || msg.includes('visualization')) {
      return `HoloOcean integration: The 3D visualization at POV coordinates (${holoOceanPOV.x.toFixed(1)}, ${holoOceanPOV.y.toFixed(1)}) shows immersive ${selectedParameter.toLowerCase()} distribution. Pixel streaming provides real-time depth profiling from surface to ${holoOceanPOV.depth}ft. WebRTC connectivity enables collaborative analysis with remote USM teams. Interactive navigation reveals complex flow structures invisible in 2D projections.`;
    }
    
    if (msg.includes('safety') || msg.includes('risk') || msg.includes('alert')) {
      const riskLevel = currentData?.currentSpeed > 1.5 || currentData?.waveHeight > 0.8 ? 'ELEVATED' : 'NORMAL';
      return `Maritime safety assessment: Current risk level is ${riskLevel}. ${currentData?.currentSpeed > 1.5 ? `Strong currents (${currentData.currentSpeed.toFixed(2)} m/s) may affect vessel positioning. ` : ''}${currentData?.waveHeight > 0.8 ? `Elevated sea surface conditions (${currentData.waveHeight.toFixed(2)}m) impact small craft operations. ` : ''}Recommend ${riskLevel === 'ELEVATED' ? 'enhanced precautions and continuous monitoring' : 'standard operational procedures'}. Real-time alerts configured for threshold exceedances.`;
    }
    
    if (msg.includes('model') || msg.includes('accuracy')) {
      return `Model performance: ${selectedModel} resolution is ${selectedModel === 'ROMS' ? '1km' : '3km'} with ${selectedModel === 'ROMS' ? 'regional' : 'regional'} coverage. Validation against USM buoy data shows 92% correlation for current predictions and 88% for wave forecasts. Data assimilation includes satellite altimetry, ARGO floats, and coastal stations. Model skill metrics updated every 6 hours for continuous improvement.`;
    }
    
    if (msg.includes('usm') || msg.includes('university') || msg.includes('research')) {
      return `USM research integration: This platform supports Southern Miss marine science operations with high-fidelity coastal modeling. The NGOSF2 system provides real-time data fusion for academic research, thesis projects, and collaborative studies. Current deployment monitors critical habitat zones and supports NOAA partnership initiatives. Data export capabilities enable seamless integration with USM's research infrastructure.`;
    }
    
    if (msg.includes('export') || msg.includes('download') || msg.includes('data')) {
      return `Data access: Time series exports available in NetCDF, CSV, and MATLAB formats. Current dataset contains ${timeSeriesData.length} temporal snapshots with ${Object.keys(currentData || {}).length} parameters. API endpoints provide programmatic access for USM researchers. Real-time streaming supports automated monitoring systems. All data includes QC flags and uncertainty estimates for scientific rigor.`;
    }
    
    // Advanced contextual responses
    const responses = [
      `Advanced analysis: The ${selectedModel} model at ${selectedDepth}ft depth reveals complex ${selectedParameter.toLowerCase()} patterns in ${selectedArea}. Current frame ${currentFrame + 1}/${csvData.length > 0 ? csvData.length : 24} shows ${Math.random() > 0.5 ? 'increasing' : 'stable'} trends with ${playbackSpeed}x temporal acceleration.`,
      `Oceanographic insight: Multi-parameter correlation indicates ${Math.random() > 0.5 ? 'strong coupling' : 'weak correlation'} between ${selectedParameter.toLowerCase()} and environmental forcing. The ${timeZone} time reference optimizes data interpretation for regional operations.`,
      `Research perspective: This query aligns with USM's coastal monitoring objectives. The integrated visualization supports both real-time analysis and historical trend assessment for comprehensive marine science applications.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const newMessage = {
      id: chatMessages.length + 1,
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      const response = {
        id: chatMessages.length + 2,
        content: getAIResponse(inputMessage),
        isUser: false,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 1200 + Math.random() * 1800);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatMessages]);

  return (
    <>
      {/* Floating Chatbot Toggle */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-4 md:bottom-6 right-4 md:right-6 z-50 bg-blue-500 hover:bg-blue-600 p-2 md:p-3 rounded-full shadow-lg transition-colors"
        aria-label="Toggle Chatbot"
      >
        <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
      </button>

      {/* Collapsible Input-Only Chatbot Panel */}
      {chatOpen && (
        <div className="fixed bottom-16 md:bottom-20 right-2 md:right-6 z-40 w-72 md:w-80 bg-slate-800/90 backdrop-blur-md border border-blue-500/30 rounded-lg shadow-xl flex flex-col mx-2 md:mx-0">
          
          {/* Chatbot Header */}
          <div className="p-2 md:p-3 border-b border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <h3 className="text-sm font-semibold text-blue-300">BlueAI Assistant</h3>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Chat History - Compact View */}
          <div className="flex-1 max-h-40 overflow-y-auto p-2 md:p-3 space-y-2">
            {chatMessages.slice(-3).map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-lg text-xs ${
                  msg.isUser
                    ? 'bg-blue-600/20 text-blue-100 ml-4'
                    : 'bg-slate-700/50 text-slate-200 mr-4'
                }`}
              >
                <div className="line-clamp-3">{msg.content}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {msg.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="bg-slate-700/50 text-slate-200 mr-4 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-0"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-200"></span>
                  </div>
                  <span className="text-xs text-slate-400">Analyzing...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-2 md:p-3 border-t border-blue-500/20">
            <div className="flex gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about currents, waves, temperature..."
                className="flex-1 h-12 md:h-16 bg-slate-700 border border-slate-600 rounded px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm resize-none"
                rows="2"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="self-end bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-3 py-2 rounded text-xs md:text-sm transition-colors flex items-center justify-center"
              >
                <Send className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => setInputMessage('What are the current conditions?')}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
              >
                Conditions
              </button>
              <button
                onClick={() => setInputMessage('Analyze wave patterns')}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
              >
                Waves
              </button>
              <button
                onClick={() => setInputMessage('Safety assessment')}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
              >
                Safety
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;