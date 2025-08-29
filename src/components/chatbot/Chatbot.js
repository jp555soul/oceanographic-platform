import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Wifi, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { getAIResponse, getAPIStatus } from '../../services/aiService';
import { useChatManagement } from '../../hooks/useChatManagement';

const Chatbot = ({ 
  timeSeriesData = [],
  data = [],
  dataSource = 'simulated',
  selectedDepth = 0, 
  availableDepths = [],
  selectedArea = '', 
  selectedModel = 'NGOSF2', 
  selectedParameter = 'Current Speed',
  playbackSpeed = 1, 
  currentFrame = 0,
  holoOceanPOV = { x: 0, y: 0, depth: 0 }, 
  envData = {},
  timeZone = 'UTC',
  startDate,
  endDate,
  onAddMessage
}) => {
  // Chat Management Hook
  const {
    chatMessages,
    isTyping,
    addUserMessage,
    addAIResponse,
    getThreadId,
    startTyping,
    stopTyping,
    clearChatMessages
  } = useChatManagement();

  // Core State
  const [chatOpen, setChatOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // API Status State
  const [apiStatus, setApiStatus] = useState({
    connected: false,
    endpoint: '',
    timestamp: null,
    hasApiKey: false
  });
  const [showApiStatus, setShowApiStatus] = useState(false);
  
  const chatEndRef = useRef(null);
  const maxRetries = 2;

  // Initialize chat with API welcome message
  useEffect(() => {
    const initializeChat = async () => {
      if (isInitialized || chatMessages.length > 0) return;
      
      try {
        const context = {
          currentData: timeSeriesData && timeSeriesData.length > 0 ? timeSeriesData[timeSeriesData.length - 1] : null,
          timeSeriesData,
          dataSource,
          selectedDepth,
          selectedModel,
          selectedParameter,
          selectedArea,
          playbackSpeed,
          holoOceanPOV,
          currentFrame,
          totalFrames: data?.length || 24,
          startDate,
          endDate,
          envData
        };

        const threadId = getThreadId();
        const welcomeResponse = await getAIResponse("Generate a welcome message for CubeAI oceanographic analysis platform", context, threadId);
        
        // Only proceed if we got a valid API response (not a local fallback)
        if (welcomeResponse && !welcomeResponse.includes('[Local Response')) {
          addAIResponse(welcomeResponse, 'api');
        } else {
          throw new Error('API not available');
        }
      } catch (error) {
        console.error('Failed to get API welcome message:', error);
        // Set error state instead of local fallback
        addAIResponse("Unable to connect to CubeAI services. Please check your connection and try again.", 'error');
        setApiStatus(prev => ({ ...prev, connected: false }));
      }
      
      setIsInitialized(true);
    };
    
    initializeChat();
  }, [dataSource, selectedModel, selectedParameter, isInitialized, chatMessages.length, getThreadId, addAIResponse, startDate, endDate]);

  // Check API status on mount and periodically
  useEffect(() => {
    checkAPIStatus();
    const interval = setInterval(checkAPIStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkAPIStatus = async () => {
    try {
      const status = await getAPIStatus();
      setApiStatus(status);
    } catch (error) {
      console.error('Failed to check API status:', error);
      setApiStatus(prev => ({ ...prev, connected: false }));
    }
  };

  // Enhanced AI Response with API integration (API only)
  const sendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    addUserMessage(inputMessage);
    const currentInput = inputMessage;
    setInputMessage('');
    startTyping('Analyzing...');
    setRetryCount(0);

    try {
      await processAIResponse(currentInput);
    } catch (error) {
      console.error('Failed to process AI response:', error);
      addErrorMessage('Sorry, I encountered an error processing your request. Please try again.');
    } finally {
      stopTyping();
    }
  };

  const processAIResponse = async (message, retryAttempt = 0) => {
    try {
      // Build context for AI
      const context = {
        currentData: timeSeriesData && timeSeriesData.length > 0 ? timeSeriesData[timeSeriesData.length - 1] : null,
        timeSeriesData,
        dataSource,
        selectedDepth,
        selectedModel,
        selectedParameter,
        selectedArea,
        playbackSpeed,
        holoOceanPOV,
        currentFrame,
        totalFrames: data?.length || 24,
        startDate,
        endDate,
        envData
      };

      // Get thread ID and AI response from API only
      const threadId = getThreadId();
      const aiResponse = await getAIResponse(message, context, threadId);
      
      // Reject local responses - only accept valid API responses
      if (!aiResponse || aiResponse.includes('[Local Response')) {
        throw new Error('API not available');
      }
      
      const response = addAIResponse(aiResponse, 'api', { retryAttempt });
      setRetryCount(0);

      if (onAddMessage) {
        onAddMessage(response);
      }

      // Update API status on successful API response
      setApiStatus(prev => ({ ...prev, connected: true, timestamp: new Date().toISOString() }));

    } catch (error) {
      console.error(`AI response attempt ${retryAttempt + 1} failed:`, error);
      
      if (retryAttempt < maxRetries) {
        setRetryCount(retryAttempt + 1);
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryAttempt) * 1000;
        setTimeout(() => {
          processAIResponse(message, retryAttempt + 1);
        }, delay);
      } else {
        addErrorMessage('Unable to connect to CubeAI services. Please check your connection and try again.');
        setApiStatus(prev => ({ ...prev, connected: false }));
      }
    }
  };

  const addErrorMessage = (errorText) => {
    addAIResponse(errorText, 'error');
  };

  const retryLastMessage = () => {
    const lastUserMessage = [...chatMessages].reverse().find(msg => msg.isUser);
    if (lastUserMessage) {
      startTyping('Analyzing...');
      processAIResponse(lastUserMessage.content).finally(() => stopTyping());
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getMessageStyle = (msg) => {
    if (msg.isUser) {
      return 'bg-blue-600/20 text-blue-100 ml-4';
    }
    
    switch (msg.source) {
      case 'api':
        return 'bg-slate-700/50 text-slate-200 mr-4 border-l-2 border-green-400';
      case 'error':
        return 'bg-red-900/30 text-red-200 mr-4 border-l-2 border-red-500';
      default:
        return 'bg-slate-700/50 text-slate-200 mr-4';
    }
  };

  const getSourceIndicator = (source) => {
    switch (source) {
      case 'api': return { icon: Wifi, color: 'text-green-400', label: 'AI API' };
      case 'error': return { icon: AlertTriangle, color: 'text-red-400', label: 'Error' };
      default: return { icon: MessageCircle, color: 'text-blue-400', label: 'System' };
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatMessages]);

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setChatOpen(!chatOpen)}
        className="fixed bottom-4 md:bottom-6 right-4 md:right-6 z-50 bg-blue-500 hover:bg-blue-600 p-2 md:p-3 rounded-full shadow-lg transition-colors"
        aria-label="Toggle Chatbot"
      >
        <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
        {retryCount > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
        )}
      </button>

      {/* Chat Window */}
      {chatOpen && (
        <div className="fixed bottom-16 md:bottom-20 right-2 md:right-6 z-40 w-72 md:w-80 bg-slate-800/90 backdrop-blur-md border border-blue-500/30 rounded-lg shadow-xl flex flex-col mx-2 md:mx-0">
          
          {/* Header */}
          <div className="p-2 md:p-3 border-b border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full animate-pulse ${apiStatus.connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <h3 className="text-sm font-semibold text-blue-300">CubeAI Assistant</h3>
              <button
                onClick={() => setShowApiStatus(!showApiStatus)}
                className="text-slate-400 hover:text-blue-300 transition-colors"
                title="API Status"
              >
                {apiStatus.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              </button>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* API Status Panel */}
          {showApiStatus && (
            <div className="p-2 bg-slate-700/50 border-b border-slate-600 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">API Status:</span>
                <span className={apiStatus.connected ? 'text-green-400' : 'text-red-400'}>
                  {apiStatus.connected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              <div className="mt-1 text-slate-400">
                Endpoint: {apiStatus.endpoint || 'N/A'}
              </div>
              {apiStatus.timestamp && (
                <div className="text-slate-400">
                  Last check: {new Date(apiStatus.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 max-h-40 overflow-y-auto p-2 md:p-3 space-y-2">
            {chatMessages.map((msg) => {
              const sourceInfo = getSourceIndicator(msg.source);
              const SourceIcon = sourceInfo.icon;
              
              return (
                <div key={msg.id} className={`p-2 rounded-lg text-xs ${getMessageStyle(msg)}`}>
                  <div className="flex items-start gap-1">
                    {!msg.isUser && (
                      <SourceIcon className={`w-3 h-3 mt-0.5 ${sourceInfo.color} flex-shrink-0`} />
                    )}
                    <div className="flex-1">
                      <div className="line-clamp-3">{msg.content}</div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="text-xs text-slate-400">
                          {msg.timestamp.toLocaleTimeString()}
                        </div>
                        {!msg.isUser && (
                          <div className={`text-xs ${sourceInfo.color}`}>
                            {sourceInfo.label}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing Indicator */}
            {isTyping && (
              <div className="bg-slate-700/50 text-slate-200 mr-4 p-2 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-0"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-100"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse delay-200"></span>
                  </div>
                  <span className="text-xs text-slate-400">
                    {retryCount > 0 ? `Retrying (${retryCount}/${maxRetries})...` : 'Analyzing...'}
                  </span>
                  {retryCount > 0 && (
                    <RefreshCw className="w-3 h-3 text-yellow-400 animate-spin" />
                  )}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Section */}
          <div className="p-2 md:p-3 border-t border-blue-500/20">
            <div className="flex gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about currents, waves, temperature..."
                className="flex-1 h-12 md:h-16 bg-slate-700 border border-slate-600 rounded px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm resize-none"
                rows="2"
                disabled={isTyping}
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-3 py-2 rounded text-xs md:text-sm transition-colors flex items-center justify-center"
                >
                  <Send className="w-3 h-3 md:w-4 md:h-4" />
                </button>
                {retryCount > 0 && (
                  <button
                    onClick={retryLastMessage}
                    disabled={isTyping}
                    className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 px-3 py-1 rounded text-xs transition-colors"
                    title="Retry last message"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => setInputMessage('What are the current conditions?')}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
                disabled={isTyping}
              >
                Conditions
              </button>
              <button
                onClick={() => setInputMessage('Analyze wave patterns')}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
                disabled={isTyping}
              >
                Waves
              </button>
              <button
                onClick={() => setInputMessage('Safety assessment')}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors"
                disabled={isTyping}
              >
                Safety
              </button>
              <button
                onClick={checkAPIStatus}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300 transition-colors ml-auto"
                title="Refresh API status"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;