/**
 * Ocean Data Service
 * Handles loading, processing, and validation of oceanographic data from the isdata.ai API.
 */

// API Configuration
const API_CONFIG = {
  baseUrl: 'https://demo-chat.isdata.ai',
  endpoint: '/data/query',  
  timeout: 10000, // 10 seconds
  retries: 2,
  token: process.env.REACT_APP_BEARER_TOKEN
};

/**
 * Maps ocean area names to database table names
 * @param {string} areaName - The selected ocean area
 * @returns {string} The corresponding database table name
 */
const getTableNameForArea = (areaName) => {
  const areaTableMap = {
    'MBL': 'mbl_ngofs2',
    'MSR': 'msr_ngofs2',
    'USM': 'usm_ngofs2'
  };
  
  return areaTableMap[areaName] || areaTableMap['USM'];
};

/**
 * Loads data from the oceanographic API based on specified query parameters.
 * @param {object} queryParams - The query parameters for filtering data.
 * @param {string} queryParams.area - The selected ocean area (e.g., 'MBL').
 * @param {Date} queryParams.startDate - The start of the selected date/time range.
 * @param {Date} queryParams.endDate - The end of the selected date/time range.
 * @returns {Promise<{allData: Array}>} A promise that resolves to an object
 * containing all the data rows from the API.
 */
export const loadAllData = async (queryParams = {}) => {
  //console.log(queryParams)
const { 
  area: selectedArea = 'USM', 
  startDate = new Date('Fri Aug 01 2025 11:00:00 GMT-0700 (Pacific Daylight Time)'), 
  endDate 
} = queryParams;


  
  const tableName = getTableNameForArea(selectedArea);
  const baseQuery = `SELECT lat, lon, depth, direction, ndirection, salinity, temp, nspeed, time, ssh, pressure_dbars, sound_speed_ms FROM \`isdata-usmcom.usm_com.${tableName}\``;
  const whereClauses = [];

  // If a date range is provided, create a timestamp filter
  if (startDate && endDate) {
    // Ensure dates are in ISO format for the SQL query
    //2025-07-31 09:00:00	
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    whereClauses.push(`time BETWEEN TIMESTAMP('${startISO}') AND TIMESTAMP('${endISO}')`);
  }

  let query = baseQuery;
  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(' AND ')}`;
  }
  // Order by time to get the most recent records when limiting
  query += ` ORDER BY time DESC LIMIT 20000`;

  try {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoint}?query=${encodeURIComponent(query)}`;
    //console.log("Executing query:", query);

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", `Bearer ${API_CONFIG.token}`);

    const requestOptions = {
      method: "GET",
      headers: myHeaders,
      redirect: "follow"
    };

    const response = await fetch(url, requestOptions);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const apiData = await response.json();

    // Add metadata to each row for compatibility with existing processing functions.
    const allData = apiData.map(row => ({
      ...row,
      model: 'NGOFS2',
      area: selectedArea,
      _source_file: `API_${selectedArea}`,
      _loaded_at: new Date().toISOString()
    }));

    //console.log(`Successfully loaded ${allData.length} records for area ${selectedArea}.`);
    return { allData };

  } catch (error) {
    console.error(`Failed to load data for area ${selectedArea} with params ${JSON.stringify(queryParams)}:`, error);
    // Return empty state on failure to prevent app crashes.
    return { allData: [] };
  }
};

/**
 * Processes raw data into a format suitable for time series charts.
 * @param {Array} rawData - The raw data from the API.
 * @param {number} selectedDepth - The depth to filter the data by.
 * @param {number|null} maxDataPoints - Maximum number of data points to return (null = no limit).
 * @returns {Array} An array of processed data points for visualization.
 */
export const processAPIData = (rawData, selectedDepth = 0, maxDataPoints = null) => {
    if (!rawData || rawData.length === 0) {
      console.log('No data to process');
      return [];
    }

    // Filter data based on current parameters AND skip null/empty values
    let filteredData = rawData.filter(row => {
      // Skip rows with null/empty speed values
      if (row.speed === null || row.speed === undefined || row.speed === '') {
        return false;
      }
      
      // Filter by depth if available (within Â±5ft of selected depth for consistency)
      if (row.depth !== undefined && row.depth !== null && selectedDepth !== undefined) {
        const depthDiff = Math.abs(row.depth - selectedDepth);
        return depthDiff <= 5;
      }
      return true;
    });
  
    // Sort by time if available
    filteredData.sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return new Date(a.time) - new Date(b.time);
    });
  
    const recentData = maxDataPoints ? 
      filteredData.slice(-maxDataPoints) : 
      filteredData;
    
    console.log(`Using ${recentData.length} data points for time series (from ${filteredData.length} filtered, maxLimit: ${maxDataPoints || 'unlimited'})`);
  
    const processedData = recentData.map((row, index) => {
      const processed = {
        depth: row.depth || 0,
        time: formatTimeForDisplay(row.time),
        timestamp: row.time ? new Date(row.time) : new Date(),
        heading: row.direction || 0,
        currentSpeed: row.speed || 0,
        soundSpeed: row.sound_speed_ms || 0, 
        waveHeight: row.ssh || 0,
        temperature: row.temp || null,
        latitude: row.lat,
        longitude: row.lon,
        salinity: row.salinity || null,
        pressure: row.pressure_dbars || null,
        sourceFile: row._source_file,
        model: row.model,
        area: row.area,
      };
      
      return processed;
    });

    return processedData;
};

/**
 * Processes Sea Surface Temperature data for heatmap visualization
 * @param {Array} rawData - The raw data from the API
 * @param {Object} options - Processing options
 * @param {number} options.maxDataPoints - Maximum points to include
 * @param {boolean} options.latestOnly - Only use most recent data per location
 * @param {number} options.depthFilter - Filter by specific depth (null = all depths)
 * @returns {Array} Array of temperature data points with coordinates
 */
export const processTemperatureData = (rawData, options = {}) => {
  const {
    maxDataPoints = null,
    latestOnly = false,
    depthFilter = null
  } = options;

  if (!rawData || rawData.length === 0) {
    console.log('No data to process for temperature');
    return [];
  }

  let tempData = rawData.filter(row => {
    return row.lat && row.lon && 
           row.temp !== null && row.temp !== undefined && 
           !isNaN(row.lat) && !isNaN(row.lon) && !isNaN(row.temp) &&
           Math.abs(row.lat) <= 90 && Math.abs(row.lon) <= 180;
  });

  // Filter by depth if specified
  if (depthFilter !== null && depthFilter !== undefined) {
    tempData = tempData.filter(row => {
      return row.depth !== null && row.depth !== undefined && 
             Math.abs(row.depth - depthFilter) <= 5; // ±5 units tolerance
    });
    console.log(`Filtered temperature data by depth ${depthFilter}ft: ${tempData.length} points`);
  }

  // Sort by time if available
  tempData.sort((a, b) => {
    if (!a.time || !b.time) return 0;
    return new Date(a.time) - new Date(b.time);
  });

  // If latestOnly, get most recent reading per coordinate
  if (latestOnly) {
    const latestData = new Map();
    tempData.forEach(row => {
      const key = `${row.lat.toFixed(4)},${row.lon.toFixed(4)}`;
      if (!latestData.has(key) || new Date(row.time) > new Date(latestData.get(key).time)) {
        latestData.set(key, row);
      }
    });
    tempData = Array.from(latestData.values());
  }

  // Apply data point limit
  if (maxDataPoints && tempData.length > maxDataPoints) {
    tempData = tempData.slice(-maxDataPoints);
  }

  const processedTempData = tempData.map(row => ({
    latitude: row.lat,
    longitude: row.lon,
    temperature: row.temp,
    time: row.time,
    depth: row.depth || 0,
    sourceFile: row._source_file,
    model: row.model,
    area: row.area
  }));

  //console.log(`Processed ${processedTempData.length} temperature data points`);
  return processedTempData;
};

/**
 * Processes currents direction data for vector visualization on map
 * @param {Array} rawData - The raw data from the API
 * @param {Object} options - Processing options
 * @param {number} options.maxDataPoints - Maximum points to include
 * @param {boolean} options.latestOnly - Only use most recent data per location
 * @param {number} options.gridResolution - Grid resolution for aggregating nearby points
 * @param {number} options.depthFilter - Filter by specific depth (null = all depths)
 * @param {string} options.displayParameter - The parameter to visualize
 * @returns {Array} Array of currents vector data points
 */
export const processCurrentsData = (rawData, options = {}) => {
  const {
    maxDataPoints = null,
    latestOnly = false,
    gridResolution = 0.01,
    depthFilter = null,
    displayParameter = 'Current Speed'
  } = options;

  if (!rawData || rawData.length === 0) {
    console.log('No data to process for currents');
    return [];
  }

  // --- DYNAMIC PARAMETER LOGIC ---
  const paramConfig = {
    'Current Speed': { magnitudeKey: 'nspeed', directionKey: 'direction' },
    'Current Direction': { magnitudeKey: 'nspeed', directionKey: 'direction' },
    'Surface Elevation': { magnitudeKey: 'ssh', directionKey: 'direction' },
    'Wave Direction': { magnitudeKey: 'ssh', directionKey: 'direction' },
    'Temperature': { magnitudeKey: 'temp', directionKey: null },
    'Salinity': { magnitudeKey: 'salinity', directionKey: null },
    'Pressure': { magnitudeKey: 'pressure_dbars', directionKey: null },
  };

  const config = paramConfig[displayParameter] || paramConfig['Current Speed'];
  const { magnitudeKey, directionKey } = config;

  if (!magnitudeKey) {
    console.warn(`Display parameter "${displayParameter}" is not supported.`);
    return [];
  }

  let currentsData = rawData.filter(row => {
    const magnitude = row[magnitudeKey];
    const hasMagnitude = magnitude !== null && magnitude !== undefined && !isNaN(magnitude);
    let hasDirection = true; // Assume true for scalar fields
    if (directionKey) {
      const direction = row[directionKey];
      hasDirection = direction !== null && direction !== undefined && !isNaN(direction);
    }
    return row.lat && row.lon && hasMagnitude && hasDirection && Math.abs(row.lat) <= 90 && Math.abs(row.lon) <= 180;
  });

  // Filter by depth if specified
  if (depthFilter !== null) {
    currentsData = currentsData.filter(row => {
      return row.depth !== null && row.depth !== undefined && 
             Math.abs(row.depth - depthFilter) <= 5; // Â±5 units tolerance
    });
  }

  // Sort by time if available
  currentsData.sort((a, b) => {
    if (!a.time || !b.time) return 0;
    return new Date(a.time) - new Date(b.time);
  });

  // Grid-based aggregation to avoid overcrowding
  if (gridResolution > 0) {
    const gridData = new Map();
    currentsData.forEach(row => {
      const gridLat = Math.round(row.lat / gridResolution) * gridResolution;
      const gridLon = Math.round(row.lon / gridResolution) * gridResolution;
      const key = `${gridLat},${gridLon}`;
      
      if (!gridData.has(key)) {
        gridData.set(key, {
          lat: gridLat,
          lon: gridLon,
          directions: [],
          magnitudes: [],
          times: [],
          depths: [],
          count: 0
        });
      }
      
      const cell = gridData.get(key);
      if (directionKey) {
        cell.directions.push(row[directionKey]);
      }
      cell.magnitudes.push(row[magnitudeKey] || 0);
      cell.times.push(row.time);
      cell.depths.push(row.depth || 0);
      cell.count++;
    });

    currentsData = Array.from(gridData.values()).map(cell => {
      const avgDirection = directionKey ? calculateCircularMean(cell.directions) : 0; // Default to North for scalars
      const avgMagnitude = cell.magnitudes.reduce((sum, val) => sum + val, 0) / cell.magnitudes.length;
      const latestTime = cell.times.sort((a, b) => new Date(b) - new Date(a))[0];
      const avgDepth = cell.depths.reduce((sum, depth) => sum + depth, 0) / cell.depths.length;
      
      return {
        lat: cell.lat,
        lon: cell.lon,
        direction: avgDirection,
        magnitude: avgMagnitude,
        time: latestTime,
        depth: avgDepth,
        dataPointCount: cell.count
      };
    });
  }

  // If latestOnly, get most recent reading per coordinate
  if (latestOnly) {
    const latestData = new Map();
    currentsData.forEach(row => {
      const key = `${row.lat.toFixed(4)},${row.lon.toFixed(4)}`;
      if (!latestData.has(key) || new Date(row.time) > new Date(latestData.get(key).time)) {
        latestData.set(key, row);
      }
    });
    currentsData = Array.from(latestData.values());
  }

  // Apply data point limit
  if (maxDataPoints && currentsData.length > maxDataPoints) {
    currentsData = currentsData.slice(-maxDataPoints);
  }

  const processedCurrentsData = currentsData.map((row, index) => ({
    id: `current_${index}`,
    latitude: row.lat,
    longitude: row.lon,
    direction: row.direction,
    speed: row.speed || 0,
    magnitude: row.magnitude,
    time: row.time,
    depth: row.depth || 0,
    coordinates: [row.lon, row.lat],
    vectorX: Math.sin((row.direction * Math.PI) / 180),
    vectorY: Math.cos((row.direction * Math.PI) / 180),
    sourceFile: row._source_file,
    model: row.model,
    area: row.area,
    dataPointCount: row.dataPointCount || 1
  }));
  
  return processedCurrentsData;
};


/**
 * Calculates circular mean for directional data (angles in degrees)
 * @param {Array} angles - Array of angles in degrees
 * @returns {number} Circular mean in degrees
 */
const calculateCircularMean = (angles) => {
  if (angles.length === 0) return 0;
  
  let sumSin = 0;
  let sumCos = 0;
  
  angles.forEach(angle => {
    const radians = (angle * Math.PI) / 180;
    sumSin += Math.sin(radians);
    sumCos += Math.cos(radians);
  });
  
  const meanRadians = Math.atan2(sumSin / angles.length, sumCos / angles.length);
  let meanDegrees = (meanRadians * 180) / Math.PI;
  
  // Ensure positive angle
  if (meanDegrees < 0) {
    meanDegrees += 360;
  }
  
  return meanDegrees;
};

/**
 * Generates currents vector data optimized for Mapbox visualization
 * @param {Array} rawData - The raw data from the API
 * @param {Object} options - Generation options
 * @param {number} options.vectorScale - Scale factor for vector arrows
 * @param {number} options.minMagnitude - Minimum magnitude to display
 * @param {string} options.colorBy - Property to color vectors by ('speed', 'depth', 'uniform')
 * @param {string} options.displayParameter - The parameter being visualized
 * @returns {Object} GeoJSON-like object for Mapbox currents layer
 */
export const generateCurrentsVectorData = (rawData, options = {}) => {
  const {
    vectorScale = 0.009,
    minMagnitude = 0,
    colorBy = 'speed',
    maxVectors = 1000,
    depthFilter = null,
    displayParameter = 'Current Speed'
  } = options;

  // --- DIAGNOSTIC LOG ---
  console.log('[dataService] Generating vector data with options:', { displayParameter, depthFilter, colorBy, maxVectors });

  const currentsData = processCurrentsData(rawData, { 
    latestOnly: true, 
    maxDataPoints: maxVectors,
    gridResolution: 0.01,
    depthFilter: depthFilter,
    displayParameter: displayParameter
  });
  
  if (currentsData.length === 0) {
    return {
      type: 'FeatureCollection',
      features: []
    };
  }

  // Filter by minimum magnitude
  const filteredCurrents = currentsData.filter(current => 
    current.magnitude >= minMagnitude
  );

  // Calculate color scale values
  const speeds = filteredCurrents.map(c => c.speed);
  const depths = filteredCurrents.map(c => c.depth);
  const maxSpeed = Math.max(...speeds);
  const minSpeed = Math.min(...speeds);
  const maxDepth = Math.max(...depths);
  const minDepth = Math.min(...depths);

  const features = filteredCurrents.map(current => {
    // Calculate vector end point
    const vectorLength = current.magnitude * vectorScale;
    const endLat = current.latitude + (current.vectorY * vectorLength);
    const endLon = current.longitude + (current.vectorX * vectorLength);

    // Calculate color value
    let colorValue = 0.5;
    if (colorBy === 'speed' && maxSpeed > minSpeed) {
      colorValue = (current.speed - minSpeed) / (maxSpeed - minSpeed);
    } else if (colorBy === 'depth' && maxDepth > minDepth) {
      colorValue = (current.depth - minDepth) / (maxDepth - minDepth);
    }

    return {
      type: 'Feature',
      properties: {
        id: current.id,
        direction: current.direction,
        speed: current.speed,
        magnitude: current.magnitude,
        depth: current.depth,
        time: current.time,
        colorValue: colorValue,
        dataPointCount: current.dataPointCount || 1
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [current.longitude, current.latitude],
          [endLon, endLat]
        ]
      }
    };
  });
  
  return {
    type: 'FeatureCollection',
    features: features,
    metadata: {
      vectorCount: features.length,
      speedRange: { min: minSpeed, max: maxSpeed },
      depthRange: { min: minDepth, max: maxDepth },
      colorBy: colorBy
    }
  };
};

/**
 * Gets currents color scale configuration for visualization
 * @param {Array} currentsData - Currents data for scale calculation
 * @param {string} colorBy - Property to base colors on ('speed', 'depth')
 * @returns {Object} Color scale configuration
 */
export const getCurrentsColorScale = (currentsData = [], colorBy = 'speed') => {
  if (currentsData.length === 0) {
    // Default scale if no data
    return {
      min: 0,
      max: 10,
      property: colorBy,
      colors: [
        { value: 0, color: '#0000FF' },
        { value: 0.5, color: '#00FF00' },
        { value: 1.0, color: '#FF0000' }
      ]
    };
  }

  const values = currentsData.map(d => 
    colorBy === 'speed' ? d.speed : d.depth
  ).filter(v => !isNaN(v));

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const midValue = (minValue + maxValue) / 2;

  return {
    min: minValue,
    max: maxValue,
    mid: midValue,
    property: colorBy,
    colors: [
      { value: minValue, color: '#0000FF' }, // Blue for low values
      { value: midValue, color: '#00FF00' }, // Green for medium values
      { value: maxValue, color: '#FF0000' }  // Red for high values
    ],
    gradient: colorBy === 'speed' 
      ? ['rgb(0, 0, 255)', 'rgb(0, 255, 0)', 'rgb(255, 0, 0)'] // Blue to green to red for speed
      : ['rgb(255, 255, 0)', 'rgb(0, 255, 255)', 'rgb(0, 0, 255)'] // Yellow to cyan to blue for depth
  };
};

/**
 * Generates heatmap-ready data structure for temperature visualization
 * @param {Array} rawData - The raw data from the API
 * @param {Object} options - Heatmap generation options
 * @param {number} options.depthFilter - Filter by specific depth (null = all depths)
 * @param {number} options.intensityScale - Scale factor for intensity values
 * @param {boolean} options.normalizeTemperature - Whether to normalize temperature values
 * @param {number} options.gridResolution - Grid resolution for aggregating nearby points
 * @returns {Array} Array of [lat, lng, intensity] points for heatmap
 */
export const generateTemperatureHeatmapData = (rawData, options = {}) => {
  const {
    intensityScale = 1.0,
    normalizeTemperature = true,
    gridResolution = 0.01,
    depthFilter = null
  } = options;

  const tempData = processTemperatureData(rawData, { 
    latestOnly: false,
    depthFilter: depthFilter 
  });
  
  if (tempData.length === 0) {
    console.log(`No temperature data available for depth ${depthFilter}ft`);
    return [];
  }

  const temperatures = tempData.map(d => d.temperature);
  const minTemp = Math.min(...temperatures);
  const maxTemp = Math.max(...temperatures);
  const tempRange = maxTemp - minTemp;

  const gridData = new Map();
  tempData.forEach(point => {
    const gridLat = Math.round(point.latitude / gridResolution) * gridResolution;
    const gridLng = Math.round(point.longitude / gridResolution) * gridResolution;
    const key = `${gridLat},${gridLng}`;
    
    if (!gridData.has(key)) {
      gridData.set(key, {
        lat: gridLat,
        lng: gridLng,
        temperatures: [],
        count: 0
      });
    }
    
    gridData.get(key).temperatures.push(point.temperature);
    gridData.get(key).count++;
  });

  const heatmapData = Array.from(gridData.values()).map(cell => {
    const avgTemp = cell.temperatures.reduce((sum, temp) => sum + temp, 0) / cell.temperatures.length;
    
    let intensity;
    if (normalizeTemperature && tempRange > 0) {
      intensity = (avgTemp - minTemp) / tempRange;
    } else {
      intensity = avgTemp * intensityScale;
    }
    
    intensity = Math.max(0, Math.min(1, intensity));
    
    return [cell.lat, cell.lng, intensity];
  });

  console.log(`Generated ${heatmapData.length} heatmap points from ${tempData.length} temperature readings at depth ${depthFilter}ft`);
  console.log(`Temperature range: ${minTemp.toFixed(2)}°C to ${maxTemp.toFixed(2)}°C`);
  
  return heatmapData;
};

/**
 * Gets temperature color scale configuration for visualization
 * @param {Array} temperatureData - Temperature data for scale calculation
 * @returns {Object} Color scale configuration
 */
export const getTemperatureColorScale = (temperatureData = []) => {
  const temperatures = temperatureData.map(d => d.temperature).filter(t => !isNaN(t));
  
  if (temperatures.length === 0) {
    // Default scale if no data
    return {
      min: 0,
      max: 30,
      colors: [
        { value: 0, color: '#0000FF' },
        { value: 0.25, color: '#00FFFF' },
        { value: 0.5, color: '#00FF00' },
        { value: 0.75, color: '#FFFF00' },
        { value: 1.0, color: '#FF0000' }
      ]
    };
  }

  const minTemp = Math.min(...temperatures);
  const maxTemp = Math.max(...temperatures);
  const midTemp = (minTemp + maxTemp) / 2;
  const quarterTemp = minTemp + (maxTemp - minTemp) * 0.25;
  const threeQuarterTemp = minTemp + (maxTemp - minTemp) * 0.75;

  return {
    min: minTemp,
    max: maxTemp,
    mid: midTemp,
    colors: [
      { value: minTemp, color: '#0000FF' },
      { value: quarterTemp, color: '#00FFFF' },
      { value: midTemp, color: '#00FF00' },
      { value: threeQuarterTemp, color: '#FFFF00' },
      { value: maxTemp, color: '#FF0000' }
    ],
    gradient: [
      'rgb(0, 0, 255)',
      'rgb(0, 255, 255)',
      'rgb(0, 255, 0)',
      'rgb(255, 255, 0)',
      'rgb(255, 0, 0)'
    ]
  };
};

/**
 * Gets latest temperature readings grouped by location
 * @param {Array} rawData - The raw data from the API
 * @param {number} maxPoints - Maximum points to return
 * @returns {Array} Latest temperature readings per location
 */
export const getLatestTemperatureReadings = (rawData, maxPoints = 1000) => {
  const tempData = processTemperatureData(rawData, { 
    latestOnly: true, 
    maxDataPoints: maxPoints 
  });
  
  return tempData.map(point => ({
    ...point,
    id: `temp_${point.latitude}_${point.longitude}`,
    displayTemp: `${point.temperature.toFixed(1)}Â°C`,
    coordinates: [point.longitude, point.latitude]
  }));
};

/**
 * Formats a timestamp for display in charts.
 * @param {string | Date} time - The time value to format.
 * @returns {string} The formatted time string (HH:MM).
 */
export const formatTimeForDisplay = (time) => {
  if (!time) return '00:00';
  try {
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  } catch (error) {
    return '00:00';
  }
};

/**
 * Simple land/water detection using basic geographic rules
 */
const isLikelyOnWater = (lat, lon) => {
  const gulfBounds = {
    north: 31,
    south: 18,
    east: -80,
    west: -98
  };
  
  if (lat >= gulfBounds.south && lat <= gulfBounds.north && 
      lon >= gulfBounds.west && lon <= gulfBounds.east) {
    
    if (lat > 29.5 && lon > -90) return false;
    if (lat > 28 && lon > -95 && lat < 30) return false;
    if (lat > 25 && lat < 26.5 && lon > -82) return false;
    
    return true;
  }
  
  return true;
};

/**
 * Color stations based on data characteristics
 */
const getStationColor = (dataPoints) => {
  if (dataPoints.length === 0) return [128, 128, 128];
  
  if (dataPoints.length > 1000) return [255, 69, 0];
  if (dataPoints.length > 500) return [255, 140, 0];
  if (dataPoints.length > 100) return [255, 215, 0];
  if (dataPoints.length > 10) return [0, 191, 255];
  return [0, 255, 127];
};

/**
 * Rough water depth estimation
 */
const estimateWaterDepth = (lat, lon) => {
  const distanceFromCoast = Math.min(
    Math.abs(lat - 29.5),
    Math.abs(lon - (-90))
  );
  
  return Math.min(distanceFromCoast * 100, 3000);
};

/**
 * Enhanced station generation with water filtering and deployment filtering
 */
export const generateOptimizedStationDataFromAPI = (rawData) => {
  if (!rawData || rawData.length === 0) {
    return [];
  }

  const waterData = rawData.filter(row => {
    if (!row.lat || !row.lon || isNaN(row.lat) || isNaN(row.lon)) {
      return false;
    }
    if (Math.abs(row.lat) > 90 || Math.abs(row.lon) > 180) {
      return false;
    }
    if (!isLikelyOnWater(row.lat, row.lon)) {
      return false;
    }
    if (row.status && (row.status === 'pre-deployment' || row.status === 'post-recovery')) {
      return false;
    }
    return true;
  });

  console.log(`Filtered ${rawData.length} rows to ${waterData.length} water-based coordinates`);

  const stations = new Map();
  
  const getOptimalPrecision = (dataCount) => {
    if (dataCount > 50000) return 1;
    if (dataCount > 10000) return 2;
    if (dataCount > 1000) return 3;
    return 4;
  };
  
  const precision = getOptimalPrecision(waterData.length);
  console.log(`Using precision ${precision} for ${waterData.length} water coordinates`);
  
  const area = waterData.length > 0 ? waterData[0].area : null;

  waterData.forEach((row, index) => {
    const key = `${row.lat.toFixed(precision)},${row.lon.toFixed(precision)}`;
    
    if (!stations.has(key)) {
      const groupData = waterData.filter(r => 
        Math.abs(r.lat - row.lat) < Math.pow(10, -precision) &&
        Math.abs(r.lon - row.lon) < Math.pow(10, -precision)
      );
      
      const centroidLat = groupData.reduce((sum, r) => sum + r.lat, 0) / groupData.length;
      const centroidLon = groupData.reduce((sum, r) => sum + r.lon, 0) / groupData.length;
      
      stations.set(key, {
        name: `Ocean Station ${stations.size + 1}`,
        coordinates: [centroidLon, centroidLat],
        exactLat: centroidLat,
        exactLon: centroidLon,
        type: 'ocean_station',
        color: getStationColor(groupData),
        dataPoints: 0,
        sourceFiles: new Set(),
        allDataPoints: [],
        deploymentStatus: 'active',
        waterDepth: estimateWaterDepth(centroidLat, centroidLon),
        model: 'NGOFS2',
        area: area
      });
    }
    
    const station = stations.get(key);
    station.dataPoints++;
    
    if (row._source_file) {
      station.sourceFiles.add(row._source_file);
    }
    
    station.allDataPoints.push({
      ...row,
      rowIndex: index
    });
  });

  const stationArray = Array.from(stations.values()).map(station => ({
    ...station, 
    sourceFiles: Array.from(station.sourceFiles)
  }));

  console.log(`Generated ${stationArray.length} optimized ocean stations from ${waterData.length} water coordinates`);
  return stationArray;
};

/**
 * Validate if coordinates represent real ocean monitoring locations
 */
export const validateOceanStations = (stations) => {
  return stations.map(station => ({
    ...station,
    validation: {
      isOnWater: isLikelyOnWater(station.exactLat, station.exactLon),
      hasData: station.dataPoints > 0,
      isActive: station.deploymentStatus === 'active',
      dataQuality: station.dataPoints > 10 ? 'good' : 'limited'
    }
  }));
};

/**
 * Generates station locations from data by grouping nearby coordinates
 */
export const generateStationDataFromAPI = (rawData) => {
  if (!rawData || rawData.length === 0) {
    return [];
  }

  const stations = new Map();
  const area = rawData.length > 0 ? rawData[0].area : null;
  
  rawData.forEach((row, index) => {
    if (row.lat && row.lon && !isNaN(row.lat) && !isNaN(row.lon)) {
      const precision = 1;
      const key = `${row.lat.toFixed(precision)},${row.lon.toFixed(precision)}`;
      
      if (!stations.has(key)) {
        stations.set(key, {
          name: `Station at ${row.lat.toFixed(4)}, ${row.lon.toFixed(4)}`,
          coordinates: [row.lon, row.lat],
          exactLat: row.lat,
          exactLon: row.lon,
          type: 'api_station',
          color: [Math.random() * 255, Math.random() * 255, Math.random() * 255],
          dataPoints: 0,
          sourceFiles: new Set(),
          allDataPoints: [],
          model: 'NGOFS2',
          area: area
        });
      }
      
      const station = stations.get(key);
      station.dataPoints++;
      
      if (row._source_file) {
        station.sourceFiles.add(row._source_file);
      }
      
      station.allDataPoints.push({
        ...row,
        rowIndex: index
      });
    }
  });

  return Array.from(stations.values()).map(station => ({
    ...station, 
    sourceFiles: Array.from(station.sourceFiles)
  }));
};

/**
 * Alternative version that creates individual stations for each unique coordinate
 */
export const generateStationDataFromAPINoGrouping = (rawData) => {
  if (!rawData || rawData.length === 0) {
    return [];
  }

  const stations = [];
  const seenCoordinates = new Set();
  const area = rawData.length > 0 ? rawData[0].area : null;
  
  rawData.forEach((row, index) => {
    if (row.lat && row.lon && !isNaN(row.lat) && !isNaN(row.lon)) {
      const coordKey = `${row.lat}_${row.lon}`;
      
      if (!seenCoordinates.has(coordKey)) {
        seenCoordinates.add(coordKey);
        
        stations.push({
          name: `Station ${stations.length + 1} (${row.lat.toFixed(4)}, ${row.lon.toFixed(4)})`,
          coordinates: [row.lon, row.lat],
          exactLat: row.lat,
          exactLon: row.lon,
          type: 'api_station',
          color: [Math.random() * 255, Math.random() * 255, Math.random() * 255],
          dataPoints: rawData.filter(r => r.lat === row.lat && r.lon === row.lon).length,
          sourceFiles: [...new Set(rawData.filter(r => r.lat === row.lat && r.lon === row.lon).map(r => r._source_file).filter(Boolean))],
          allDataPoints: rawData.filter(r => r.lat === row.lat && r.lon === row.lon),
          model: 'NGOFS2',
          area: area
        });
      }
    }
  });

  return stations;
};

/**
 * Debug function to validate coordinate data
 */
export const validateCoordinateData = (rawData) => {
  const validCoords = rawData.filter(row => 
    row.lat && row.lon && 
    !isNaN(row.lat) && !isNaN(row.lon) &&
    Math.abs(row.lat) <= 90 && Math.abs(row.lon) <= 180
  );

  const invalidCoords = rawData.filter(row => 
    !row.lat || !row.lon || 
    isNaN(row.lat) || isNaN(row.lon) ||
    Math.abs(row.lat) > 90 || Math.abs(row.lon) > 180
  );

  const coordinateStats = {
    total: rawData.length,
    valid: validCoords.length,
    invalid: invalidCoords.length,
    validPercentage: (validCoords.length / rawData.length * 100).toFixed(1),
    coordinateRanges: validCoords.length > 0 ? {
      latitude: {
        min: Math.min(...validCoords.map(r => r.lat)),
        max: Math.max(...validCoords.map(r => r.lat)),
        range: Math.max(...validCoords.map(r => r.lat)) - Math.min(...validCoords.map(r => r.lat))
      },
      longitude: {
        min: Math.min(...validCoords.map(r => r.lon)),
        max: Math.max(...validCoords.map(r => r.lon)),
        range: Math.max(...validCoords.map(r => r.lon)) - Math.min(...validCoords.map(r => r.lon))
      }
    } : null,
    sampleValidCoords: validCoords.slice(0, 10).map(r => ({ lat: r.lat, lon: r.lon })),
    sampleInvalidCoords: invalidCoords.slice(0, 5).map(r => ({ lat: r.lat, lon: r.lon }))
  };

  return coordinateStats;
};

export default {
  loadAllData,
  processAPIData,
  processTemperatureData,
  processCurrentsData,
  generateCurrentsVectorData,
  getCurrentsColorScale,
  generateTemperatureHeatmapData,
  getTemperatureColorScale,
  getLatestTemperatureReadings,
  formatTimeForDisplay,
  generateOptimizedStationDataFromAPI,
  generateStationDataFromAPI,
  generateStationDataFromAPINoGrouping,
  validateOceanStations,
  validateCoordinateData
};