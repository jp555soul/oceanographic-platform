/**
 * AI Service with External API Integration
 * Handles communication with demo-chat.isdata.ai API (API-only mode)
 */

// API Configuration
if (process.env.NODE_ENV === 'production' && process.env.REACT_APP_BASE_URL && !process.env.REACT_APP_BASE_URL.startsWith('https://')) {
  console.warn('Insecure API endpoint configured for production environment. Please use https.');
}

const API_CONFIG = {
  baseUrl: process.env.REACT_APP_BASE_URL,
  healthCheckEndpoint: `${process.env.REACT_APP_BASE_URL}/healthz`,
  endpoint: '/chat/',
  timeout: 600000, // Increased timeout to 10 minutes (600,000 milliseconds)
  retries: 2,
  token: process.env.REACT_APP_BEARER_TOKEN
};

/**
 * Main function to get AI response - API only (no fallbacks)
 * @param {string} message - The user's input message
 * @param {object} context - Current oceanographic data context
 * @param {string} threadId - Thread ID for conversation continuity
 * @returns {Promise<string>} AI response
 */
export const getAIResponse = async (message, context, threadId = null) => {
  try {
    const apiResponse = await getAPIResponse(message, context, threadId);
    if (apiResponse) {
      return apiResponse;
    } else {
      throw new Error('Empty response from API');
    }
  } catch (error) {
    console.error('API request failed:', error.message);
    throw new Error(`AI service unavailable: ${error.message}`);
  }
};

/**
 * Makes request to external AI API
 * @param {string} message - User message
 * @param {object} context - Oceanographic context
 * @param {string} threadId - Thread ID for conversation continuity
 * @returns {Promise<string>} API response
 */
const getAPIResponse = async (message, context, threadId = null) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const payload = formatAPIPayload(message, context, threadId);
    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${API_CONFIG.token}`);
    myHeaders.append("Content-Type", "application/json");

    const requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify(payload),
      signal: controller.signal
    };

    const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoint}`, requestOptions);

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return extractResponseFromAPI(data);

  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error('API request timed out');
    }
    throw error;
  }
};

/**
 * Formats a flattened payload for the external API
 * @param {string} message - User message
 * @param {object} context - Oceanographic context
 * @param {string} threadId - Thread ID for conversation continuity
 * @returns {object} Formatted API payload
 */
const formatAPIPayload = (message, context, threadId = null) => {
  const {
    currentData,
    timeSeriesData = [],
    dataSource = 'simulated',
    selectedDepth = 0,
    selectedModel = 'NGOSF2',
    selectedParameter = 'Current Speed',
    selectedArea = 'USM', // Provide a fallback since this is required
    playbackSpeed = 1,
    holoOceanPOV = { x: 0, y: 0, depth: 0 },
    currentFrame = 0,
    totalFrames = 24,
    startDate,
    endDate,
    envData = {}
  } = context;

  // Helper to format date to YYYY-MM-DD
  const formatDate = (date) => {
    // Fallback to a default date if input is invalid
    const validDate = (date && date instanceof Date && !isNaN(date)) 
      ? date 
      : new Date('2025-08-01T12:00:00Z');
    return validDate.toISOString().split('T')[0];
  };

  // Create date_range string, ensuring it's always present as it's required
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate || startDate);
  const date_range = `${formattedStartDate} to ${formattedEndDate}`;

  // Create flattened oceanographic context for filters
  const oceanographicFilters = {
    area: selectedArea,
    date_range: date_range,
    depth: `${selectedDepth} meters`, // Use meters to match API schema
    domain: 'oceanography',
    model: selectedModel,
    parameter: selectedParameter,
    data_source: dataSource,
    frame: currentFrame,
    total_frames: totalFrames,
    playback_speed: playbackSpeed,
    data_points: timeSeriesData.length,
    pov_x: holoOceanPOV.x,
    pov_y: holoOceanPOV.y,
    pov_depth: holoOceanPOV.depth,
    current_speed: currentData ? currentData.currentSpeed : null,
    heading: currentData ? currentData.heading : null,
    wave_height: currentData ? currentData.waveHeight : null,
    temperature: currentData ? currentData.temperature : null,
    system_prompt: `You are CubeAI, an expert oceanographic analysis assistant for the University of Southern Mississippi's marine science platform. 
    You analyze real-time ocean data including currents, waves, temperature, and environmental conditions. 
    Provide technical yet accessible responses focused on maritime safety, research insights, and data interpretation.
    Current context: ${selectedArea} at ${selectedDepth} meters depth using ${selectedModel} model for the date range ${date_range}.`
  };

  // Format for API (matching working Postman structure)
  return {
    input: message,
    filters: oceanographicFilters,
    thread_id: threadId || `ocean_session_${Date.now()}`
  };
};

/**
 * Extracts the response text from API response
 * @param {object} apiData - Raw API response
 * @returns {string} Extracted response text
 */
const extractResponseFromAPI = (apiData) => {
  // Handle the documented API response structure
  if (apiData.run_items && Array.isArray(apiData.run_items)) {
    for (const item of apiData.run_items) {
      if (item.content && Array.isArray(item.content)) {
        for (const content of item.content) {
          if (content.type === 'output_text' && content.text) {
            return content.text;
          }
        }
      }
    }
  }
  
  // Fallback to common response formats
  if (apiData.response) {
    return apiData.response;
  }
  if (apiData.message) {
    return apiData.message;
  }
  if (apiData.content) {
    return apiData.content;
  }
  if (apiData.text) {
    return apiData.text;
  }
  if (apiData.output) {
    return apiData.output;
  }
  if (apiData.result) {
    return apiData.result;
  }
  
  // If response is just a string
  if (typeof apiData === 'string') {
    return apiData;
  }

  // // Log the response structure for debugging
  // console.log('API Response Structure:', apiData);
  
  throw new Error('Invalid API response format');
};

/**
 * Detects user intent from message for better API context
 * @param {string} message - User message
 * @returns {string} Detected intent
 */
const detectUserIntent = (message) => {
  const msg = message.toLowerCase();
  
  if (msg.includes('current') || msg.includes('flow')) return 'current_analysis';
  if (msg.includes('wave') || msg.includes('swell')) return 'wave_analysis';
  if (msg.includes('temperature') || msg.includes('thermal')) return 'temperature_analysis';
  if (msg.includes('predict') || msg.includes('forecast')) return 'prediction';
  if (msg.includes('safety') || msg.includes('risk')) return 'safety_assessment';
  if (msg.includes('data') || msg.includes('source')) return 'data_inquiry';
  if (msg.includes('model') || msg.includes('accuracy')) return 'model_info';
  if (msg.includes('export') || msg.includes('download')) return 'data_export';
  
  return 'general_inquiry';
};

/**
 * Test API connectivity (Updated endpoint)
 * @returns {Promise<boolean>} True if API is accessible
 */
export const testAPIConnection = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600000); // Increased timeout to 10 minutes

    const myHeaders = new Headers();
    myHeaders.append("Authorization", `Bearer ${API_CONFIG.token}`);
    myHeaders.append("Content-Type", "application/json");

    const requestOptions = {
      method: 'GET',
      headers: myHeaders,
      signal: controller.signal
    };

    const response = await fetch(`${API_CONFIG.healthCheckEndpoint}`, requestOptions);

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Get API status for monitoring
 * @returns {Promise<object>} API status information
 */
export const getAPIStatus = async () => {
  const isConnected = await testAPIConnection();
  
  return {
    connected: isConnected,
    endpoint: `${API_CONFIG.baseUrl}${API_CONFIG.endpoint}`,
    timestamp: new Date().toISOString(),
    hasApiKey: true // Updated to reflect the use of a Bearer token
  };
};

export default {
  getAIResponse,
  testAPIConnection,
  getAPIStatus
};