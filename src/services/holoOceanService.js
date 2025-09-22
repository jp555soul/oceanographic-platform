/**
 * HoloOcean WebSocket Service
 * Manages WebSocket connection and communication with HoloOcean agent
 */

class HoloOceanService {
    constructor(endpoint) {
      this.endpoint = endpoint;
      this.ws = null;
      this.isConnected = false;
      this.isSubscribed = false;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 10;
      this.reconnectDelay = 1000; // Initial delay in ms
      this.maxReconnectDelay = 30000; // Max delay in ms
      this.reconnectTimer = null;
      this.pingTimer = null;
      this.shouldReconnect = true;
      
      // Event handlers
      this.eventHandlers = {
        connected: [],
        disconnected: [],
        status: [],
        targetUpdated: [],
        error: [],
        connectionError: []
      };
  
      // Last known status
      this.lastStatus = null;
    }
  
    /**
     * Add event listener
     * @param {string} event - Event type (connected, disconnected, status, targetUpdated, error, connectionError)
     * @param {function} handler - Event handler function
     */
    on(event, handler) {
      if (this.eventHandlers[event]) {
        this.eventHandlers[event].push(handler);
      }
    }
  
    /**
     * Remove event listener
     * @param {string} event - Event type
     * @param {function} handler - Event handler function to remove
     */
    off(event, handler) {
      if (this.eventHandlers[event]) {
        const index = this.eventHandlers[event].indexOf(handler);
        if (index > -1) {
          this.eventHandlers[event].splice(index, 1);
        }
      }
    }
  
    /**
     * Emit event to all handlers
     * @param {string} event - Event type
     * @param {any} data - Event data
     */
    emit(event, data) {
      if (this.eventHandlers[event]) {
        this.eventHandlers[event].forEach(handler => {
          try {
            handler(data);
          } catch (error) {
            console.error(`Error in ${event} event handler:`, error);
          }
        });
      }
    }
  
    /**
     * Validate coordinates and depth
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude  
     * @param {number} depth - Depth in meters
     * @returns {object} Validation result
     */
    validateCoordinates(lat, lon, depth) {
      const errors = [];
      
      if (typeof lat !== 'number' || lat < -90 || lat > 90) {
        errors.push('Latitude must be a number between -90 and 90');
      }
      
      if (typeof lon !== 'number' || lon < -180 || lon > 180) {
        errors.push('Longitude must be a number between -180 and 180');
      }
      
      if (typeof depth !== 'number' || depth < -11000 || depth > 11000) {
        errors.push('Depth must be a number between -11000 and 11000 meters');
      }
      
      return {
        isValid: errors.length === 0,
        errors
      };
    }
  
    /**
     * Validate ISO-8601 time string
     * @param {string} timeStr - ISO-8601 time string
     * @returns {boolean} Is valid time string
     */
    validateTime(timeStr) {
      if (!timeStr) return true; // Optional field
      try {
        const date = new Date(timeStr);
        return !isNaN(date.getTime()) && timeStr.includes('T');
      } catch {
        return false;
      }
    }
  
    /**
     * Connect to WebSocket endpoint
     * @returns {Promise} Connection promise
     */
    connect() {
      return new Promise((resolve, reject) => {
        try {
          this.shouldReconnect = true;
          this.ws = new WebSocket(this.endpoint);
          
          this.ws.onopen = () => {
            console.log('HoloOcean WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.reconnectDelay = 1000;
            this.clearReconnectTimer();
            this.emit('connected', { endpoint: this.endpoint });
            resolve();
          };
  
          this.ws.onclose = (event) => {
            console.log('HoloOcean WebSocket disconnected:', event.code, event.reason);
            this.handleDisconnection();
            if (event.wasClean) {
              resolve();
            }
          };
  
          this.ws.onerror = (error) => {
            console.error('HoloOcean WebSocket error:', error);
            this.emit('connectionError', { error: error.message || 'WebSocket error' });
            if (!this.isConnected) {
              reject(new Error('Failed to connect to HoloOcean WebSocket'));
            }
          };
  
          this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
          };
  
          // Connection timeout
          setTimeout(() => {
            if (!this.isConnected) {
              this.ws.close();
              reject(new Error('Connection timeout'));
            }
          }, 10000);
  
        } catch (error) {
          reject(error);
        }
      });
    }
  
    /**
     * Handle WebSocket disconnection
     */
    handleDisconnection() {
      this.isConnected = false;
      this.isSubscribed = false;
      this.clearPingTimer();
      this.emit('disconnected', { 
        willReconnect: this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts 
      });
      
      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    }
  
    /**
     * Schedule reconnection with exponential backoff
     */
    scheduleReconnect() {
      this.clearReconnectTimer();
      
      this.reconnectAttempts++;
      const delay = Math.min(
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
        this.maxReconnectDelay
      );
      
      console.log(`Scheduling HoloOcean reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
      
      this.reconnectTimer = setTimeout(() => {
        if (this.shouldReconnect) {
          console.log(`Attempting HoloOcean reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
          this.connect().catch(error => {
            console.error('Reconnection failed:', error);
          });
        }
      }, delay);
    }
  
    /**
     * Clear reconnection timer
     */
    clearReconnectTimer() {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }
  
    /**
     * Clear ping timer
     */
    clearPingTimer() {
      if (this.pingTimer) {
        clearTimeout(this.pingTimer);
        this.pingTimer = null;
      }
    }
  
    /**
     * Handle incoming WebSocket messages
     * @param {string} data - Message data
     */
    handleMessage(data) {
      try {
        const message = JSON.parse(data);
        
        // Handle different message types
        switch (message.event) {
          case 'target_updated':
            this.emit('targetUpdated', message.target);
            break;
            
          case 'status':
            this.lastStatus = message.status;
            this.emit('status', message.status);
            break;
            
          default:
            // Handle responses with 'ok' field
            if (message.hasOwnProperty('ok')) {
              if (message.ok) {
                // Success responses
                if (message.event === 'target_updated') {
                  this.emit('targetUpdated', message.target);
                } else if (message.status) {
                  this.lastStatus = message.status;
                  this.emit('status', message.status);
                }
              } else {
                // Error responses
                console.error('HoloOcean server error:', message.error);
                this.emit('error', { 
                  type: 'server_error', 
                  message: message.error 
                });
              }
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing HoloOcean message:', error);
        this.emit('error', { 
          type: 'parse_error', 
          message: 'Failed to parse server message',
          rawData: data 
        });
      }
    }
  
    /**
     * Send command to server
     * @param {object} command - Command object
     * @returns {Promise} Send promise
     */
    sendCommand(command) {
      return new Promise((resolve, reject) => {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
          reject(new Error('WebSocket not connected'));
          return;
        }
  
        try {
          const message = JSON.stringify(command);
          this.ws.send(message);
          resolve();
        } catch (error) {
          reject(new Error(`Failed to send command: ${error.message}`));
        }
      });
    }
  
    /**
     * Set target position for HoloOcean agent
     * @param {number} lat - Latitude (-90 to 90)
     * @param {number} lon - Longitude (-180 to 180)
     * @param {number} depth - Depth in meters (-11000 to 11000)
     * @param {string} time - Optional ISO-8601 time string
     * @returns {Promise} Command promise
     */
    async setTarget(lat, lon, depth, time = null) {
      // Validate coordinates
      const validation = this.validateCoordinates(lat, lon, depth);
      if (!validation.isValid) {
        throw new Error(`Invalid coordinates: ${validation.errors.join(', ')}`);
      }
  
      // Validate time if provided
      if (time && !this.validateTime(time)) {
        throw new Error('Invalid time format. Use ISO-8601 format (e.g., "2025-08-14T00:00:00Z")');
      }
  
      const command = {
        type: 'set_target',
        lat,
        lon,
        depth
      };
  
      if (time) {
        command.time = time;
      }
  
      try {
        await this.sendCommand(command);
        console.log('Target set:', command);
      } catch (error) {
        console.error('Failed to set target:', error);
        throw error;
      }
    }
  
    /**
     * Request one-shot status from server
     * @returns {Promise} Status promise
     */
    async getStatus() {
      try {
        await this.sendCommand({ type: 'get_status' });
        console.log('Status requested');
      } catch (error) {
        console.error('Failed to get status:', error);
        throw error;
      }
    }
  
    /**
     * Subscribe to continuous status updates
     * @returns {Promise} Subscribe promise
     */
    async subscribe() {
      try {
        await this.sendCommand({ type: 'subscribe' });
        this.isSubscribed = true;
        console.log('Subscribed to status updates');
      } catch (error) {
        console.error('Failed to subscribe:', error);
        throw error;
      }
    }
  
    /**
     * Unsubscribe from status updates (by closing connection)
     */
    unsubscribe() {
      this.isSubscribed = false;
      // Note: The protocol doesn't specify an unsubscribe command
      // Status updates stop when the WebSocket connection is closed
      console.log('Unsubscribed from status updates');
    }
  
    /**
     * Disconnect from WebSocket
     */
    disconnect() {
      this.shouldReconnect = false;
      this.clearReconnectTimer();
      this.clearPingTimer();
      
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close(1000, 'Client disconnect');
      }
      
      this.isConnected = false;
      this.isSubscribed = false;
      this.ws = null;
      
      console.log('HoloOcean WebSocket disconnected');
    }
  
    /**
     * Get connection status
     * @returns {object} Connection status
     */
    getConnectionStatus() {
      return {
        isConnected: this.isConnected,
        isSubscribed: this.isSubscribed,
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.maxReconnectAttempts,
        endpoint: this.endpoint,
        readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED,
        lastStatus: this.lastStatus
      };
    }
  
    /**
     * Get last known status
     * @returns {object|null} Last status object
     */
    getLastStatus() {
      return this.lastStatus;
    }
  
    /**
     * Reset reconnection attempts (useful for manual reconnect)
     */
    resetReconnection() {
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    }
  
    /**
     * Manual reconnect
     * @returns {Promise} Connection promise
     */
    reconnect() {
      if (this.ws) {
        this.disconnect();
      }
      this.shouldReconnect = true;
      this.resetReconnection();
      return this.connect();
    }
  
    /**
     * Check if coordinates are within valid ranges
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {number} depth - Depth
     * @returns {boolean} Are coordinates valid
     */
    areCoordinatesValid(lat, lon, depth) {
      return this.validateCoordinates(lat, lon, depth).isValid;
    }
  
    /**
     * Format coordinates for display
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @param {number} depth - Depth
     * @returns {string} Formatted coordinates
     */
    formatCoordinates(lat, lon, depth) {
      const latDir = lat >= 0 ? 'N' : 'S';
      const lonDir = lon >= 0 ? 'E' : 'W';
      
      return `${Math.abs(lat).toFixed(6)}°${latDir}, ${Math.abs(lon).toFixed(6)}°${lonDir}, ${depth}m depth`;
    }
  
    /**
     * Get current timestamp in ISO-8601 format
     * @returns {string} ISO-8601 timestamp
     */
    getCurrentTime() {
      return new Date().toISOString();
    }
  
    /**
     * Parse time string to Date object
     * @param {string} timeStr - ISO-8601 time string
     * @returns {Date|null} Parsed date or null if invalid
     */
    parseTime(timeStr) {
      if (!timeStr) return null;
      try {
        const date = new Date(timeStr);
        return isNaN(date.getTime()) ? null : date;
      } catch {
        return null;
      }
    }
  
    /**
     * Calculate distance between two coordinates (Haversine formula)
     * @param {number} lat1 - First latitude
     * @param {number} lon1 - First longitude
     * @param {number} lat2 - Second latitude
     * @param {number} lon2 - Second longitude
     * @returns {number} Distance in meters
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371000; // Earth's radius in meters
      const φ1 = lat1 * Math.PI / 180;
      const φ2 = lat2 * Math.PI / 180;
      const Δφ = (lat2 - lat1) * Math.PI / 180;
      const Δλ = (lon2 - lon1) * Math.PI / 180;
  
      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
      return R * c;
    }
  
    /**
     * Get WebSocket ready state as string
     * @returns {string} Ready state description
     */
    getReadyStateString() {
      if (!this.ws) return 'CLOSED';
      
      switch (this.ws.readyState) {
        case WebSocket.CONNECTING: return 'CONNECTING';
        case WebSocket.OPEN: return 'OPEN';
        case WebSocket.CLOSING: return 'CLOSING';
        case WebSocket.CLOSED: return 'CLOSED';
        default: return 'UNKNOWN';
      }
    }
  
    /**
     * Send ping to server (for testing connection)
     */
    ping() {
      if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send a get_status as ping since protocol doesn't specify ping format
        this.getStatus().catch(error => {
          console.warn('Ping failed:', error);
        });
      }
    }
  
    /**
     * Start periodic ping timer
     */
    startPingTimer() {
      this.clearPingTimer();
      this.pingTimer = setInterval(() => {
        this.ping();
      }, 25000); // Slightly more than server's 20 second ping interval
    }
  
    /**
     * Stop ping timer
     */
    stopPingTimer() {
      this.clearPingTimer();
    }
  
    /**
     * Get service statistics
     * @returns {object} Service statistics
     */
    getStats() {
      return {
        isConnected: this.isConnected,
        isSubscribed: this.isSubscribed,
        reconnectAttempts: this.reconnectAttempts,
        maxReconnectAttempts: this.maxReconnectAttempts,
        currentDelay: this.reconnectDelay,
        maxDelay: this.maxReconnectDelay,
        hasLastStatus: !!this.lastStatus,
        readyState: this.getReadyStateString(),
        endpoint: this.endpoint,
        shouldReconnect: this.shouldReconnect,
        eventHandlerCounts: Object.keys(this.eventHandlers).reduce((acc, event) => {
          acc[event] = this.eventHandlers[event].length;
          return acc;
        }, {})
      };
    }
  
    /**
     * Clean up resources
     */
    cleanup() {
      this.shouldReconnect = false;
      this.disconnect();
      this.clearReconnectTimer();
      this.clearPingTimer();
      
      // Clear all event handlers
      Object.keys(this.eventHandlers).forEach(event => {
        this.eventHandlers[event] = [];
      });
      
      this.lastStatus = null;
    }
  }
  
  // Create and export singleton instance
let endpoint;

if (process.env.NODE_ENV === 'production') {
  // In production, enforce a secure WebSocket connection
  if (!process.env.REACT_APP_HOLOOCEAN_ENDPOINT) {
    throw new Error('REACT_APP_HOLOOCEAN_ENDPOINT is not defined in the production environment. Please set it to a secure WebSocket URL (wss://).');
  }
  if (!process.env.REACT_APP_HOLOOCEAN_ENDPOINT.startsWith('wss://')) {
    throw new Error('REACT_APP_HOLOOCEAN_ENDPOINT in production must start with wss://');
  }
  endpoint = process.env.REACT_APP_HOLOOCEAN_ENDPOINT;
} else {
  // In development, allow http and default to localhost
  endpoint = process.env.REACT_APP_HOLOOCEAN_ENDPOINT || 'ws://localhost:8080';
  // Optional: you might want to warn if a production-like URL is used in development
  if (endpoint.startsWith('wss://')) {
    console.warn(`Using a secure WebSocket (wss://) in a non-production environment. Ensure this is intended.`);
  }
}


const HOLOOCEAN_ENDPOINT = endpoint;
  const holoOceanService = new HoloOceanService(HOLOOCEAN_ENDPOINT);
  
  export default holoOceanService;
  
  // Also export the class for testing or creating additional instances
  export { HoloOceanService };