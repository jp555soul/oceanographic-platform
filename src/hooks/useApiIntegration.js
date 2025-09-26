import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { getAPIStatus, testAPIConnection } from '../services/aiService';
import EncryptedStorage from '../services/encryptedStorageService';

/**
 * Hook for managing AI API integration, status monitoring, and configuration
 * @returns {object} API integration state and functions
 */
export const useApiIntegration = () => {
  const { getAccessTokenSilently } = useAuth0();

  // --- API Status State ---
  const [apiStatus, setApiStatus] = useState({
    connected: false,
    endpoint: '',
    timestamp: null,
    hasApiKey: false,
    lastError: null,
    lastSuccessTime: null,
    responseTime: null
  });

  // --- API Configuration State ---
  const [apiConfig, setApiConfig] = useState({
    enabled: true,
    timeout: 10000,
    retries: 2,
    fallbackToLocal: true,
    autoRetry: true,
    retryDelay: 1000,
    maxRetryDelay: 8000
  });

  // --- API Metrics State ---
  const [apiMetrics, setApiMetrics] = useState({
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: null,
    uptime: 0,
    downtimeEvents: [],
    requestHistory: []
  });

  // --- Connection Monitoring ---
  const [connectionQuality, setConnectionQuality] = useState('unknown'); // 'excellent', 'good', 'poor', 'offline'
  const [isMonitoring, setIsMonitoring] = useState(false);
  const monitoringIntervalRef = useRef(null);
  const healthCheckIntervalRef = useRef(null);

  // --- Check API status ---
  const checkAPIStatus = useCallback(async () => {
    const startTime = Date.now();
    
    try {
      const token = await getAccessTokenSilently();
      const status = await getAPIStatus(token);
      const responseTime = Date.now() - startTime;
      
      setApiStatus(prev => ({
        ...prev,
        ...status,
        lastError: null,
        responseTime,
        lastSuccessTime: status.connected ? new Date().toISOString() : prev.lastSuccessTime
      }));

      // Update connection quality based on response time
      if (status.connected) {
        if (responseTime < 1000) setConnectionQuality('excellent');
        else if (responseTime < 3000) setConnectionQuality('good');
        else setConnectionQuality('poor');
      } else {
        setConnectionQuality('offline');
      }

      return status.connected;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      setApiStatus(prev => ({
        ...prev,
        connected: false,
        lastError: error.message,
        timestamp: new Date().toISOString(),
        responseTime
      }));
      
      setConnectionQuality('offline');
      
      // Track downtime event
      setApiMetrics(prev => ({
        ...prev,
        downtimeEvents: [...prev.downtimeEvents.slice(-9), {
          timestamp: new Date().toISOString(),
          error: error.message,
          duration: responseTime
        }]
      }));
      
      return false;
    }
  }, []);

  // --- Test API connectivity ---
  const testConnection = useCallback(async () => {
    try {
      const token = await getAccessTokenSilently();
      const isConnected = await testAPIConnection(token);
      
      if (isConnected) {
        setApiStatus(prev => ({ 
          ...prev, 
          connected: true, 
          lastError: null,
          lastSuccessTime: new Date().toISOString()
        }));
        setConnectionQuality('good');
      } else {
        setApiStatus(prev => ({ 
          ...prev, 
          connected: false, 
          lastError: 'Connection test failed'
        }));
        setConnectionQuality('offline');
      }
      
      return isConnected;
    } catch (error) {
      setApiStatus(prev => ({ 
        ...prev, 
        connected: false, 
        lastError: error.message 
      }));
      setConnectionQuality('offline');
      return false;
    }
  }, []);

  // --- Update API configuration ---
  const updateApiConfig = useCallback((newConfig) => {
    setApiConfig(prev => {
      const updated = { ...prev, ...newConfig };
      
      // Persist certain config to EncryptedStorage
      try {
        EncryptedStorage.setItem('ocean-api-config', {
          timeout: updated.timeout,
          retries: updated.retries,
          fallbackToLocal: updated.fallbackToLocal
        });
      } catch (error) {
        console.warn('Failed to persist API config:', error);
      }
      
      return updated;
    });
  }, []);

  // --- Record API request metrics ---
  const recordApiRequest = useCallback((success, responseTime, error = null) => {
    const requestRecord = {
      timestamp: new Date().toISOString(),
      success,
      responseTime,
      error
    };

    setApiMetrics(prev => {
      const newHistory = [...prev.requestHistory.slice(-99), requestRecord];
      const totalRequests = prev.totalRequests + 1;
      const successfulRequests = prev.successfulRequests + (success ? 1 : 0);
      const failedRequests = prev.failedRequests + (success ? 0 : 1);
      
      // Calculate average response time
      const successfulResponses = newHistory.filter(r => r.success && r.responseTime);
      const averageResponseTime = successfulResponses.length > 0
        ? successfulResponses.reduce((sum, r) => sum + r.responseTime, 0) / successfulResponses.length
        : 0;

      return {
        ...prev,
        totalRequests,
        successfulRequests,
        failedRequests,
        averageResponseTime: Math.round(averageResponseTime),
        lastRequestTime: new Date().toISOString(),
        requestHistory: newHistory
      };
    });
  }, []);

  // --- Reset API metrics ---
  const resetApiMetrics = useCallback(() => {
    setApiMetrics({
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: null,
      uptime: 0,
      downtimeEvents: [],
      requestHistory: []
    });
  }, []);

  // --- Start/stop API monitoring ---
  const startMonitoring = useCallback((interval = 60000) => {
    if (isMonitoring) return;
    
    setIsMonitoring(true);
    
    // Health check every minute
    healthCheckIntervalRef.current = setInterval(() => {
      checkAPIStatus();
    }, interval);
    
    // Detailed monitoring every 5 minutes
    monitoringIntervalRef.current = setInterval(() => {
      testConnection();
    }, interval * 5);
  }, [isMonitoring, checkAPIStatus, testConnection]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
    
    if (monitoringIntervalRef.current) {
      clearInterval(monitoringIntervalRef.current);
      monitoringIntervalRef.current = null;
    }
  }, []);

  // --- Get API health summary ---
  const apiHealthSummary = useMemo(() => {
    const successRate = apiMetrics.totalRequests > 0 
      ? (apiMetrics.successfulRequests / apiMetrics.totalRequests * 100).toFixed(1)
      : 0;
    
    const recentRequests = apiMetrics.requestHistory.slice(-10);
    const recentSuccessRate = recentRequests.length > 0
      ? (recentRequests.filter(r => r.success).length / recentRequests.length * 100).toFixed(1)
      : 0;

    return {
      overall: {
        successRate: parseFloat(successRate),
        totalRequests: apiMetrics.totalRequests,
        averageResponseTime: apiMetrics.averageResponseTime
      },
      recent: {
        successRate: parseFloat(recentSuccessRate),
        requestCount: recentRequests.length
      },
      status: apiStatus.connected ? 'online' : 'offline',
      quality: connectionQuality,
      lastCheck: apiStatus.timestamp
    };
  }, [apiMetrics, apiStatus, connectionQuality]);

  // --- Load saved configuration ---
  useEffect(() => {
    try {
      const savedConfig = EncryptedStorage.getItem('ocean-api-config');
      if (savedConfig) {
        setApiConfig(prev => ({ ...prev, ...savedConfig }));
      }
    } catch (error) {
      console.warn('Failed to load saved API config:', error);
    }
  }, []);

  // --- Initial API status check ---
  useEffect(() => {
    checkAPIStatus();
  }, [checkAPIStatus]);

  // --- Start monitoring when enabled (FIXED) ---
  useEffect(() => {
    if (apiConfig.enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }
    
    return () => stopMonitoring();
  }, [apiConfig.enabled]); // Removed startMonitoring, stopMonitoring from dependencies

  // --- Connection status for display ---
  const connectionStatus = useMemo(() => {
    if (!apiStatus.connected) return 'disconnected';
    
    switch (connectionQuality) {
      case 'excellent': return 'excellent';
      case 'good': return 'connected';
      case 'poor': return 'poor';
      default: return 'unknown';
    }
  }, [apiStatus.connected, connectionQuality]);

  // --- Connection details ---
  const connectionDetails = useMemo(() => ({
    api: apiStatus.connected,
    endpoint: apiStatus.endpoint,
    hasApiKey: apiStatus.hasApiKey,
    responseTime: apiStatus.responseTime,
    lastError: apiStatus.lastError,
    quality: connectionQuality,
    monitoring: isMonitoring
  }), [apiStatus, connectionQuality, isMonitoring]);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  // --- Return public API ---
  return {
    // Status
    apiStatus,
    connectionStatus,
    connectionDetails,
    connectionQuality,
    
    // Configuration
    apiConfig,
    updateApiConfig,
    
    // Metrics
    apiMetrics,
    apiHealthSummary,
    recordApiRequest,
    resetApiMetrics,
    
    // Functions
    checkAPIStatus,
    testConnection,
    
    // Monitoring
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    
    // Helper getters
    isConnected: apiStatus.connected,
    hasApiKey: apiStatus.hasApiKey,
    isEnabled: apiConfig.enabled,
    shouldFallback: !apiStatus.connected && apiConfig.fallbackToLocal
  };
};