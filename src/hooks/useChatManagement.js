import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing chat messages, typing states, and chat analytics
 * @returns {object} Chat management state and functions
 */
export const useChatManagement = () => {
  // --- Chat State ---
  const [chatMessages, setChatMessages] = useState([]); // Start empty
  
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessage, setTypingMessage] = useState("Analyzing...");
  
  // --- Chat Configuration ---
  const [chatConfig, setChatConfig] = useState({
    maxMessages: 100,
    autoScroll: true,
    showTimestamps: true,
    showSources: true,
    persistHistory: false
  });

  // --- Add message with enhanced metadata ---
  const addChatMessage = useCallback((message) => {
    const newMessage = {
      id: message.id || Date.now(),
      content: message.content || '',
      isUser: message.isUser || false,
      timestamp: message.timestamp || new Date(),
      source: message.source || 'unknown',
      retryAttempt: message.retryAttempt || 0,
      responseTime: message.responseTime || null,
      metadata: message.metadata || {}
    };
    
    setChatMessages(prev => {
      const updated = [...prev, newMessage];
      
      // Apply message limit
      if (updated.length > chatConfig.maxMessages) {
        return updated.slice(-chatConfig.maxMessages);
      }
      
      return updated;
    });
    
    return newMessage;
  }, [chatConfig.maxMessages]);

  // --- Add user message ---
  const addUserMessage = useCallback((content) => {
    return addChatMessage({
      content,
      isUser: true,
      source: 'user'
    });
  }, [addChatMessage]);

  // --- Add AI response ---
  const addAIResponse = useCallback((content, source = 'api', metadata = {}) => {
    return addChatMessage({
      content,
      isUser: false,
      source,
      metadata
    });
  }, [addChatMessage]);

  // --- Initialize with API welcome message ---
  const initializeWithAPI = useCallback(async (getAIResponseFn, context) => {
    if (chatMessages.length > 0) return; // Already initialized
    
    try {
      const welcomeResponse = await getAIResponseFn("Generate a welcome message for BlueAI oceanographic analysis platform", context);
      
      setChatMessages([{
        id: 1,
        content: welcomeResponse,
        isUser: false,
        timestamp: new Date(),
        source: 'api'
      }]);
    } catch (error) {
      // Fallback to local welcome
      setChatMessages([{
        id: 1,
        content: "Welcome to BlueAI! I can analyze currents, wave patterns, temperature gradients, and provide real-time insights. What would you like to explore?",
        isUser: false,
        timestamp: new Date(),
        source: 'local'
      }]);
    }
  }, [chatMessages.length]);

  // --- Clear chat history ---
  const clearChatMessages = useCallback(() => {
    setChatMessages([]); // Empty array instead of system message
  }, []);

  // --- Remove specific message ---
  const removeMessage = useCallback((messageId) => {
    setChatMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  // --- Update message content ---
  const updateMessage = useCallback((messageId, updates) => {
    setChatMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);

  // --- Typing controls ---
  const startTyping = useCallback((message = "Analyzing...") => {
    setIsTyping(true);
    setTypingMessage(message);
  }, []);

  const stopTyping = useCallback(() => {
    setIsTyping(false);
    setTypingMessage("Analyzing...");
  }, []);

  // --- Update chat configuration ---
  const updateChatConfig = useCallback((newConfig) => {
    setChatConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // --- Chat metrics ---
  const chatMetrics = useMemo(() => {
    const allMessages = chatMessages; // Include all messages now
    const userMessages = allMessages.filter(msg => msg.isUser);
    const aiResponses = allMessages.filter(msg => !msg.isUser);
    
    const apiResponses = aiResponses.filter(msg => msg.source === 'api');
    const localResponses = aiResponses.filter(msg => msg.source === 'local');
    const errorResponses = aiResponses.filter(msg => msg.source === 'error');
    
    const totalResponses = aiResponses.length;
    const apiSuccessRate = totalResponses > 0 ? (apiResponses.length / totalResponses * 100) : 0;
    
    // Calculate average response time for API responses
    const apiResponsesWithTime = apiResponses.filter(msg => msg.responseTime);
    const avgResponseTime = apiResponsesWithTime.length > 0
      ? apiResponsesWithTime.reduce((sum, msg) => sum + msg.responseTime, 0) / apiResponsesWithTime.length
      : 0;

    return {
      totalMessages: chatMessages.length,
      userMessages: userMessages.length,
      totalResponses,
      apiResponses: apiResponses.length,
      localResponses: localResponses.length,
      errorResponses: errorResponses.length,
      apiSuccessRate: parseFloat(apiSuccessRate.toFixed(1)),
      avgResponseTime: Math.round(avgResponseTime)
    };
  }, [chatMessages]);

  // --- Message filtering ---
  const getMessagesBySource = useCallback((source) => {
    return chatMessages.filter(msg => msg.source === source);
  }, [chatMessages]);

  const getMessagesByType = useCallback((isUser) => {
    return chatMessages.filter(msg => msg.isUser === isUser);
  }, [chatMessages]);

  const getRecentMessages = useCallback((count = 10) => {
    return chatMessages.slice(-count);
  }, [chatMessages]);

  // --- Message analysis ---
  const analyzeConversation = useMemo(() => {
    const userMessages = chatMessages.filter(msg => msg.isUser);
    const aiResponses = chatMessages.filter(msg => !msg.isUser);
    
    // Analyze user intent patterns
    const intentPatterns = userMessages.map(msg => {
      const content = msg.content.toLowerCase();
      if (content.includes('current') || content.includes('flow')) return 'current_analysis';
      if (content.includes('wave') || content.includes('swell')) return 'wave_analysis';
      if (content.includes('temperature') || content.includes('thermal')) return 'temperature_analysis';
      if (content.includes('predict') || content.includes('forecast')) return 'prediction';
      if (content.includes('safety') || content.includes('risk')) return 'safety_assessment';
      return 'general_inquiry';
    });
    
    const intentCounts = intentPatterns.reduce((acc, intent) => {
      acc[intent] = (acc[intent] || 0) + 1;
      return acc;
    }, {});
    
    // Analyze response quality
    const retryCount = aiResponses.filter(msg => msg.retryAttempt > 0).length;
    const errorCount = aiResponses.filter(msg => msg.source === 'error').length;
    
    return {
      conversationLength: userMessages.length,
      topIntents: Object.entries(intentCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([intent, count]) => ({ intent, count })),
      retryRate: aiResponses.length > 0 ? (retryCount / aiResponses.length * 100).toFixed(1) : 0,
      errorRate: aiResponses.length > 0 ? (errorCount / aiResponses.length * 100).toFixed(1) : 0
    };
  }, [chatMessages]);

  // --- Export chat history ---
  const exportChatHistory = useCallback((format = 'json') => {
    const exportData = {
      timestamp: new Date().toISOString(),
      messageCount: chatMessages.length,
      metrics: chatMetrics,
      analysis: analyzeConversation,
      messages: chatMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        isUser: msg.isUser,
        timestamp: msg.timestamp,
        source: msg.source,
        retryAttempt: msg.retryAttempt,
        responseTime: msg.responseTime
      }))
    };
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat_history_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
    
    return exportData;
  }, [chatMessages, chatMetrics, analyzeConversation]);

  // --- Search messages ---
  const searchMessages = useCallback((query, options = {}) => {
    const { 
      caseSensitive = false, 
      source = null, 
      isUser = null,
      dateRange = null 
    } = options;
    
    return chatMessages.filter(msg => {
      const content = caseSensitive ? msg.content : msg.content.toLowerCase();
      const searchQuery = caseSensitive ? query : query.toLowerCase();
      
      // Text match
      if (!content.includes(searchQuery)) return false;
      
      // Source filter
      if (source && msg.source !== source) return false;
      
      // User/AI filter
      if (isUser !== null && msg.isUser !== isUser) return false;
      
      // Date range filter
      if (dateRange) {
        const msgDate = new Date(msg.timestamp);
        if (dateRange.start && msgDate < new Date(dateRange.start)) return false;
        if (dateRange.end && msgDate > new Date(dateRange.end)) return false;
      }
      
      return true;
    });
  }, [chatMessages]);

  // --- Return public API ---
  return {
    // State
    chatMessages,
    isTyping,
    typingMessage,
    chatConfig,
    
    // Message management
    addChatMessage,
    addUserMessage,
    addAIResponse,
    initializeWithAPI, 
    clearChatMessages,
    removeMessage,
    updateMessage,
    
    // Typing controls
    startTyping,
    stopTyping,
    
    // Configuration
    updateChatConfig,
    
    // Analytics
    chatMetrics,
    analyzeConversation,
    
    // Filtering and search
    getMessagesBySource,
    getMessagesByType,
    getRecentMessages,
    searchMessages,
    
    // Export
    exportChatHistory,
    
    // Computed values
    messageCount: chatMessages.length,
    hasMessages: chatMessages.length > 0, // Changed from > 1 since no default message
    lastMessage: chatMessages[chatMessages.length - 1] || null,
    lastUserMessage: chatMessages.filter(msg => msg.isUser).pop() || null,
    lastAIResponse: chatMessages.filter(msg => !msg.isUser).pop() || null // Removed system filter
  };
};