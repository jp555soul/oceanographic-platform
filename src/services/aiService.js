/**
 * AI Service with External API Integration
 * Handles communication with demo-chat.isdata.ai API (API-only mode)
 */

// API Configuration
const API_CONFIG = {
  baseUrl: 'https://demo-chat.isdata.ai',
  healthCheckEndpoint: 'https://demo-chat.isdata.ai/healthz',
  endpoint: '/chat/',
  timeout: 10000, // 10 seconds
  retries: 2,
  token: process.env.REACT_APP_BEARER_TOKEN
};

// Thread management
let currentThreadId = null;

/**
 * Main function to get AI response - API only (no fallbacks)
 * @param {string} message - The user's input message
 * @param {object} context - Current oceanographic data context
 * @returns {Promise<string>} AI response
 */
export const getAIResponse = async (message, context) => {
  try {
    const apiResponse = await getAPIResponse(message, context);
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
 * @returns {Promise<string>} API response
 */
const getAPIResponse = async (message, context) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

  try {
    const payload = formatAPIPayload(message, context);
    
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
 * Formats the payload for the external API (Updated to match working format)
 * @param {string} message - User message
 * @param {object} context - Oceanographic context
 * @returns {object} Formatted API payload
 */
const formatAPIPayload = (message, context) => {
  const {
    currentData,
    timeSeriesData = [],
    dataSource = 'simulated',
    selectedDepth = 0,
    selectedModel = 'NGOSF2',
    selectedParameter = 'Current Speed',
    selectedArea = '',
    playbackSpeed = 1,
    holoOceanPOV = { x: 0, y: 0, depth: 0 },
    currentFrame = 0,
    totalFrames = 24,
    envData = {}
  } = context;

  // Create oceanographic context for filters
  const oceanographicFilters = {
    domain: 'oceanography',
    location: {
      area: selectedArea,
      coordinates: holoOceanPOV,
      depth: selectedDepth
    },
    currentConditions: currentData ? {
      currentSpeed: currentData.currentSpeed,
      heading: currentData.heading,
      waveHeight: currentData.waveHeight,
      temperature: currentData.temperature
    } : null,
    model: {
      name: selectedModel,
      parameter: selectedParameter,
      dataSource: dataSource
    },
    analysis: {
      frame: currentFrame,
      totalFrames: totalFrames,
      playbackSpeed: playbackSpeed,
      dataPoints: timeSeriesData.length
    },
    systemPrompt: `You are BlueAI, an expert oceanographic analysis assistant for the University of Southern Mississippi's marine science platform. 
    You analyze real-time ocean data including currents, waves, temperature, and environmental conditions. 
    Provide technical yet accessible responses focused on maritime safety, research insights, and data interpretation.
    Current context: ${selectedArea} at ${selectedDepth}ft depth using ${selectedModel} model.`
  };

  // Format for API (matching working Postman structure)
  return {
    input: message,
    filters: {
      oceanographic_context: oceanographicFilters
    },
    thread_id: currentThreadId || `ocean_session_${Date.now()}`
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

  // Log the response structure for debugging
  console.log('API Response Structure:', apiData);
  
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
    const timeoutId = setTimeout(() => controller.abort(), 5000);

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