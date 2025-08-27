import React from 'react';

/**
 * Connection status indicator for HoloOcean WebSocket
 * Shows visual status with color coding and icons
 */
const ConnectionStatus = ({ 
  isConnected, 
  isConnecting, 
  reconnectAttempts = 0, 
  error = null,
  className = '' 
}) => {
  // Determine status state and styling
  const getStatusInfo = () => {
    if (error) {
      return {
        status: 'error',
        text: 'Connection Error',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        borderColor: 'border-red-200',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      };
    }

    if (isConnecting) {
      return {
        status: 'connecting',
        text: reconnectAttempts > 0 ? `Reconnecting (${reconnectAttempts})` : 'Connecting',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        borderColor: 'border-yellow-200',
        icon: (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      };
    }

    if (isConnected) {
      return {
        status: 'connected',
        text: 'Connected',
        color: 'text-green-700',
        bgColor: 'bg-green-100', 
        borderColor: 'border-green-200',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      };
    }

    return {
      status: 'disconnected',
      text: 'Disconnected',
      color: 'text-gray-700',
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-200',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
        </svg>
      )
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Status Badge */}
      <div className={`
        flex items-center gap-2 px-3 py-1 rounded-full border
        ${statusInfo.bgColor} ${statusInfo.borderColor} ${statusInfo.color}
      `}>
        {statusInfo.icon}
        <span className="text-sm font-medium">
          {statusInfo.text}
        </span>
      </div>

      {/* Connection Pulse Indicator */}
      {isConnected && (
        <div className="relative">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div className="absolute top-0 left-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
        </div>
      )}

      {/* Error Tooltip */}
      {error && (
        <div className="relative group">
          <svg className="w-4 h-4 text-red-500 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;