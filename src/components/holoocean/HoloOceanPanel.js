import React, { useState, useEffect } from 'react';
import useHoloOcean from '../../hooks/useHoloOcean';
import ConnectionStatus from './ConnectionStatus';
import TargetForm from './TargetForm';

/**
 * Main HoloOcean control panel component
 * Provides interface for WebSocket connection management and agent control
 */
const HoloOceanPanel = ({ className = '', autoConnect = false }) => {
  const {
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

    // Functions
    connect,
    disconnect,
    reconnect,
    setTarget,
    getStatus,
    subscribe,
    unsubscribe,
    clearError,
    validateCoordinates,
    formatCoordinates
  } = useHoloOcean(autoConnect);

  // Local state for expanded panels
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  // Handle connection actions
  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleReconnect = async () => {
    try {
      await reconnect();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };

  // Handle subscription actions
  const handleSubscribe = async () => {
    try {
      await subscribe();
    } catch (error) {
      console.error('Subscribe failed:', error);
    }
  };

  const handleUnsubscribe = () => {
    unsubscribe();
  };

  // Handle status refresh
  const handleRefreshStatus = async () => {
    try {
      await getStatus();
    } catch (error) {
      console.error('Status refresh failed:', error);
    }
  };

  // Format time for display
  const formatTime = (timeStr) => {
    if (!timeStr) return 'Unknown';
    try {
      return new Date(timeStr).toLocaleString();
    } catch {
      return timeStr;
    }
  };

  // Format distance for display
  const formatDistance = (distance) => {
    if (distance === null || distance === undefined) return 'Unknown';
    if (distance < 1000) {
      return `${distance.toFixed(1)}m`;
    }
    return `${(distance / 1000).toFixed(2)}km`;
  };

  // Format depth for display
  const formatDepth = (depth) => {
    if (depth === null || depth === undefined) return 'Unknown';
    return `${depth.toFixed(1)}m`;
  };

  return (
    <div className={`bg-slate-800 rounded-lg shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">HoloOcean Agent Control</h2>
        <ConnectionStatus 
          isConnected={isConnected}
          isConnecting={isConnecting}
          reconnectAttempts={reconnectAttempts}
          error={connectionError}
        />
      </div>

      {/* Error Display */}
      {(error || serverError || connectionError) && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-md">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-medium text-red-400">Error</h4>
              <p className="text-sm text-red-300 mt-1">
                {serverError || error || connectionError}
              </p>
            </div>
            <button 
              onClick={clearError}
              className="text-red-400 hover:text-red-200"
              title="Clear error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Connection Controls */}
      <div className="mb-6 p-4 border border-slate-600 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-100 mb-3">Connection</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {!isConnected && !isConnecting && (
            <button 
              onClick={handleConnect}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Connect
            </button>
          )}
          
          {isConnected && (
            <button 
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Disconnect
            </button>
          )}

          {(connectionError || reconnectAttempts > 0) && (
            <button 
              onClick={handleReconnect}
              disabled={isConnecting}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Reconnect'}
            </button>
          )}
        </div>

        <div className="text-sm text-gray-300">
          <p>Endpoint: {connectionStatus.endpoint}</p>
          <p>Status: {connectionStatus.readyState}</p>
          {reconnectAttempts > 0 && (
            <p>Reconnect attempts: {reconnectAttempts}/{connectionStatus.maxAttempts}</p>
          )}
        </div>
      </div>

      {/* Target Setting */}
      {isConnected && (
        <div className="mb-6">
          <TargetForm 
            onSetTarget={setTarget}
            isLoading={isSettingTarget}
            validateCoordinates={validateCoordinates}
            formatCoordinates={formatCoordinates}
          />
        </div>
      )}

      {/* Status Controls */}
      {isConnected && (
        <div className="mb-6 p-4 border border-slate-600 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-100 mb-3">Status Updates</h3>
          
          <div className="flex flex-wrap gap-2 mb-3">
            <button 
              onClick={handleRefreshStatus}
              disabled={isGettingStatus}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isGettingStatus ? 'Getting Status...' : 'Refresh Status'}
            </button>

            {!isSubscribed ? (
              <button 
                onClick={handleSubscribe}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                Subscribe to Updates
              </button>
            ) : (
              <button 
                onClick={handleUnsubscribe}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-700 transition-colors"
              >
                Unsubscribe
              </button>
            )}
          </div>

          <div className="text-sm text-gray-300">
            {isSubscribed && (
              <p className="text-green-400">✓ Receiving live updates (~1 second interval)</p>
            )}
            {lastUpdated && (
              <p>Last updated: {formatTime(lastUpdated)}</p>
            )}
          </div>
        </div>
      )}

      {/* Current Status Display */}
      {status && (
        <div className="mb-6 p-4 border border-slate-600 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-100">Agent Status</h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                isHoloOceanRunning 
                  ? 'bg-green-900/30 text-green-400' 
                  : 'bg-red-900/30 text-red-400'
              }`}>
                {isHoloOceanRunning ? 'Running' : 'Stopped'}
              </span>
              {tickCount > 0 && (
                <span className="text-xs text-gray-400">
                  Tick: {tickCount.toLocaleString()}
                </span>
              )}
            </div>
          </div>

          {/* Target Position */}
          {hasTarget && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded">
              <h4 className="font-medium text-blue-400 mb-2">Target Position</h4>
              <div className="text-sm text-blue-300">
                <p>Latitude: {target.lat.toFixed(6)}°</p>
                <p>Longitude: {target.lon.toFixed(6)}°</p>
                <p>Depth: {formatDepth(target.depth)}</p>
                {target.time && <p>Time: {formatTime(target.time)}</p>}
              </div>
            </div>
          )}

          {/* Current Position */}
          {hasCurrent && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-700/30 rounded">
              <h4 className="font-medium text-green-400 mb-2">Current Position</h4>
              <div className="text-sm text-green-300">
                <p>Latitude: {current.lat.toFixed(6)}°</p>
                <p>Longitude: {current.lon.toFixed(6)}°</p>
                <p>Depth: {formatDepth(current.depth)}</p>
                {current.time && <p>Time: {formatTime(current.time)}</p>}
              </div>
            </div>
          )}

          {/* Distance to Target */}
          {hasTarget && hasCurrent && (
            <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded">
              <h4 className="font-medium text-yellow-400 mb-2">Navigation</h4>
              <div className="text-sm text-yellow-300">
                <p>Distance to target: {formatDistance(distanceToTarget)}</p>
                {depthDifference !== null && (
                  <p>Depth difference: {formatDistance(depthDifference)}</p>
                )}
                <p className={`font-medium ${isAtTarget ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isAtTarget ? '✓ At target position' : '→ Moving to target'}
                </p>
              </div>
            </div>
          )}

          {/* HoloOcean Error */}
          {holoOceanError && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700/30 rounded">
              <h4 className="font-medium text-red-400 mb-2">Simulation Error</h4>
              <p className="text-sm text-red-300">{holoOceanError}</p>
            </div>
          )}

          {/* Advanced Controls */}
          <div className="border-t border-slate-600 pt-4">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-gray-300 hover:text-gray-100 mb-3"
            >
              {showAdvanced ? '▼' : '▶'} Advanced Controls
            </button>

            {showAdvanced && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setShowRawData(!showRawData)}
                    className="px-3 py-1 text-sm bg-slate-700 text-gray-200 rounded hover:bg-slate-600 transition-colors"
                  >
                    {showRawData ? 'Hide' : 'Show'} Raw Data
                  </button>
                </div>

                {/* Raw JSON Data */}
                {showRawData && status && (
                  <div className="p-3 bg-slate-900 rounded border border-slate-600 overflow-auto">
                    <h5 className="font-medium text-gray-200 mb-2">Raw Status Data</h5>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                      {JSON.stringify(status, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Connection Statistics */}
                <div className="p-3 bg-slate-900 rounded border border-slate-600">
                  <h5 className="font-medium text-gray-200 mb-2">Connection Info</h5>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                    <div>Subscribed: {isSubscribed ? 'Yes' : 'No'}</div>
                    <div>Ready State: {connectionStatus.readyState}</div>
                    <div>Reconnects: {reconnectAttempts}</div>
                    <div>Endpoint: {connectionStatus.endpoint}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Connection State */}
      {!isConnected && !isConnecting && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            <div className="w-16 h-16 mx-auto mb-3 bg-slate-700 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
            </div>
            <p className="text-lg text-gray-200">Not connected to HoloOcean</p>
            <p className="text-sm text-gray-400">Connect to start controlling the underwater agent</p>
          </div>
          
          {connectionError && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-sm text-red-300">
              Connection failed: {connectionError}
            </div>
          )}
          
          <button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect to HoloOcean'}
          </button>
        </div>
      )}

      {/* Loading State */}
      {isConnecting && (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          <p className="text-gray-300">Connecting to HoloOcean...</p>
          {reconnectAttempts > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              Attempt {reconnectAttempts}/{connectionStatus.maxAttempts}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default HoloOceanPanel;