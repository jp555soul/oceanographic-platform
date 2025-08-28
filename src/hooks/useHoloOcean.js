import { useState, useEffect, useCallback, useRef } from 'react';
import holoOceanService from '../services/holoOceanService';

/**
 * Custom React hook for HoloOcean WebSocket integration
 * Manages connection state, status data, and provides control functions
 */
export const useHoloOcean = (autoConnect = false) => {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionError, setConnectionError] = useState(null);

  // Data state
  const [status, setStatus] = useState(null);
  const [target, setTarget] = useState(null);
  const [current, setCurrent] = useState(null);
  const [holoOceanState, setHoloOceanState] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Error state
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(null);

  // Command state
  const [isSettingTarget, setIsSettingTarget] = useState(false);
  const [isGettingStatus, setIsGettingStatus] = useState(false);

  // Refs for cleanup
  const handlersRef = useRef({});
  const mountedRef = useRef(true);

  // Event handlers
  const handleConnected = useCallback((data) => {
    if (!mountedRef.current) return;
    setIsConnected(true);
    setIsConnecting(false);
    setReconnectAttempts(0);
    setConnectionError(null);
    setError(null);
    console.log('HoloOcean connected to:', data.endpoint);
  }, []);

  const handleDisconnected = useCallback((data) => {
    if (!mountedRef.current) return;
    setIsConnected(false);
    setIsConnecting(false);
    setIsSubscribed(false);
    console.log('HoloOcean disconnected, will reconnect:', data.willReconnect);
  }, []);

  const handleStatus = useCallback((statusData) => {
    if (!mountedRef.current) return;
    setStatus(statusData);
    setTarget(statusData.target || null);
    setCurrent(statusData.current || null);
    setHoloOceanState(statusData.holoocean || null);
    setLastUpdated(statusData.updated_at || new Date().toISOString());
    setError(null);
  }, []);

  const handleTargetUpdated = useCallback((targetData) => {
    if (!mountedRef.current) return;
    setTarget(targetData);
    console.log('Target updated:', targetData);
  }, []);

  const handleError = useCallback((errorData) => {
    if (!mountedRef.current) return;
    if (errorData.type === 'server_error') {
      setServerError(errorData.message);
    } else {
      setError(errorData.message);
    }
    console.error('HoloOcean error:', errorData);
  }, []);

  const handleConnectionError = useCallback((errorData) => {
    if (!mountedRef.current) return;
    setConnectionError(errorData.error);
    setIsConnecting(false);
    const serviceStatus = holoOceanService.getConnectionStatus();
    setReconnectAttempts(serviceStatus.reconnectAttempts);
  }, []);

  // Setup event listeners
  useEffect(() => {
    // Store handlers in ref for cleanup
    handlersRef.current = {
      connected: handleConnected,
      disconnected: handleDisconnected,
      status: handleStatus,
      targetUpdated: handleTargetUpdated,
      error: handleError,
      connectionError: handleConnectionError
    };

    // Register event handlers
    Object.keys(handlersRef.current).forEach(event => {
      holoOceanService.on(event, handlersRef.current[event]);
    });

    // Initialize state from service
    const serviceStatus = holoOceanService.getConnectionStatus();
    setIsConnected(serviceStatus.isConnected);
    setIsSubscribed(serviceStatus.isSubscribed);
    setReconnectAttempts(serviceStatus.reconnectAttempts);
    setStatus(serviceStatus.lastStatus);

    if (serviceStatus.lastStatus) {
      setTarget(serviceStatus.lastStatus.target || null);
      setCurrent(serviceStatus.lastStatus.current || null);
      setHoloOceanState(serviceStatus.lastStatus.holoocean || null);
      setLastUpdated(serviceStatus.lastStatus.updated_at || null);
    }

    // Auto-connect if requested
    if (autoConnect && !serviceStatus.isConnected) {
      connect();
    }

    // Cleanup function
    return () => {
      mountedRef.current = false;
      // Remove event handlers
      Object.keys(handlersRef.current).forEach(event => {
        holoOceanService.off(event, handlersRef.current[event]);
      });
    };
  }, [autoConnect, handleConnected, handleDisconnected, handleStatus, handleTargetUpdated, handleError, handleConnectionError]);

  // Connection functions
  const connect = useCallback(async () => {
    if (isConnecting || isConnected) return;
    
    setIsConnecting(true);
    setConnectionError(null);
    setError(null);

    try {
      await holoOceanService.connect();
    } catch (error) {
      if (mountedRef.current) {
        setConnectionError(error.message);
        setIsConnecting(false);
      }
      throw error;
    }
  }, [isConnecting, isConnected]);

  const disconnect = useCallback(() => {
    holoOceanService.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
    setIsSubscribed(false);
    setConnectionError(null);
  }, []);

  const reconnect = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);
    setError(null);

    try {
      await holoOceanService.reconnect();
    } catch (error) {
      if (mountedRef.current) {
        setConnectionError(error.message);
        setIsConnecting(false);
      }
      throw error;
    }
  }, []);

  // Command functions
  const setTargetPosition = useCallback(async (lat, lon, depth, time = null) => {
    if (!isConnected) {
      throw new Error('Not connected to HoloOcean service');
    }

    setIsSettingTarget(true);
    setError(null);
    setServerError(null);

    try {
      await holoOceanService.setTarget(lat, lon, depth, time);
    } catch (error) {
      if (mountedRef.current) {
        setError(error.message);
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        setIsSettingTarget(false);
      }
    }
  }, [isConnected]);

  const getStatus = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Not connected to HoloOcean service');
    }

    setIsGettingStatus(true);
    setError(null);
    setServerError(null);

    try {
      await holoOceanService.getStatus();
    } catch (error) {
      if (mountedRef.current) {
        setError(error.message);
      }
      throw error;
    } finally {
      if (mountedRef.current) {
        setIsGettingStatus(false);
      }
    }
  }, [isConnected]);

  const subscribe = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Not connected to HoloOcean service');
    }

    if (isSubscribed) {
      console.log('Already subscribed to HoloOcean status updates');
      return;
    }

    setError(null);
    setServerError(null);

    try {
      await holoOceanService.subscribe();
      setIsSubscribed(true);
    } catch (error) {
      if (mountedRef.current) {
        setError(error.message);
      }
      throw error;
    }
  }, [isConnected, isSubscribed]);

  const unsubscribe = useCallback(() => {
    holoOceanService.unsubscribe();
    setIsSubscribed(false);
  }, []);

  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
    setServerError(null);
    setConnectionError(null);
  }, []);

  const validateCoordinates = useCallback((lat, lon, depth) => {
    return holoOceanService.validateCoordinates(lat, lon, depth);
  }, []);

  const formatCoordinates = useCallback((lat, lon, depth) => {
    return holoOceanService.formatCoordinates(lat, lon, depth);
  }, []);

  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    return holoOceanService.calculateDistance(lat1, lon1, lat2, lon2);
  }, []);

  // Derived state
  const isHoloOceanRunning = holoOceanState?.running || false;
  const tickCount = holoOceanState?.tick_count || 0;
  const holoOceanError = holoOceanState?.last_error || null;

  const hasTarget = target && typeof target.lat === 'number' && typeof target.lon === 'number';
  const hasCurrent = current && typeof current.lat === 'number' && typeof current.lon === 'number';

  const distanceToTarget = (hasTarget && hasCurrent) 
    ? calculateDistance(current.lat, current.lon, target.lat, target.lon)
    : null;

  const depthDifference = (hasTarget && hasCurrent && typeof current.depth === 'number' && typeof target.depth === 'number')
    ? Math.abs(current.depth - target.depth)
    : null;

  const isAtTarget = distanceToTarget !== null && depthDifference !== null 
    ? (distanceToTarget < 10 && depthDifference < 1) // Within 10m horizontally and 1m vertically
    : false;

  // Connection status summary
  const connectionStatus = {
    isConnected,
    isConnecting,
    reconnectAttempts,
    maxAttempts: holoOceanService.maxReconnectAttempts,
    readyState: holoOceanService.getReadyStateString(),
    endpoint: holoOceanService.endpoint
  };

  // Complete status summary
  const summary = {
    connection: connectionStatus,
    subscription: { isSubscribed },
    simulation: {
      isRunning: isHoloOceanRunning,
      tickCount,
      error: holoOceanError
    },
    position: {
      hasTarget,
      hasCurrent,
      target,
      current,
      distanceToTarget,
      depthDifference,
      isAtTarget
    },
    lastUpdated,
    errors: {
      connection: connectionError,
      general: error,
      server: serverError
    }
  };

  return {
    // Connection state
    isConnected,
    isConnecting,
    reconnectAttempts,
    connectionError,
    connectionStatus,

    // Subscription state  
    isSubscribed,

    // Data state
    status,
    target,
    current,
    holoOceanState,
    lastUpdated,

    // Derived state
    isHoloOceanRunning,
    tickCount,
    holoOceanError,
    hasTarget,
    hasCurrent,
    distanceToTarget,
    depthDifference,
    isAtTarget,

    // Error state
    error,
    serverError,

    // Command state
    isSettingTarget,
    isGettingStatus,

    // Connection functions
    connect,
    disconnect,
    reconnect,

    // Command functions
    setTarget: setTargetPosition,
    getStatus,
    subscribe,
    unsubscribe,

    // Utility functions
    clearError,
    validateCoordinates,
    formatCoordinates,
    calculateDistance,

    // Complete summary
    summary,

    // Service reference (for advanced usage)
    service: holoOceanService
  };
};

export default useHoloOcean;