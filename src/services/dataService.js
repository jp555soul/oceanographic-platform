/**
 * Ocean Data Service
 * Handles loading, processing, and validation of oceanographic data from the isdata.ai API.
 */

// API Configuration
const API_CONFIG = {
  baseUrl: process.env.REACT_APP_BASE_URL,
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
  const { 
    area: selectedArea = 'USM', 
    startDate = new Date('Fri Aug 01 2025 11:00:00 GMT-0700 (Pacific Daylight Time)'), 
    endDate 
  } = queryParams;
  
  const tableName = getTableNameForArea(selectedArea);
  const baseQuery = `SELECT lat, lon, depth, direction, ndirection, salinity, temp, nspeed, time, ssh, pressure_dbars, sound_speed_ms FROM \`${process.env.REACT_APP_DB}.${tableName}\``;
  const whereClauses = [];

  if (startDate && endDate) {
    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();
    whereClauses.push(`time BETWEEN TIMESTAMP('${startISO}') AND TIMESTAMP('${endISO}')`);
  }

  let query = baseQuery;
  if (whereClauses.length > 0) {
    query += ` WHERE ${whereClauses.join(' AND ')}`;
  }
  query += ` ORDER BY time DESC LIMIT 10000`;

  try {
    const url = `${API_CONFIG.baseUrl}${API_CONFIG.endpoint}?query=${encodeURIComponent(query)}`;
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

    const allData = apiData.map(row => ({
      ...row,
      model: 'NGOFS2',
      area: selectedArea,
      _source_file: `API_${selectedArea}`,
      _loaded_at: new Date().toISOString()
    }));

    return { allData };

  } catch (error) {
    console.error(`Failed to load data for area ${selectedArea} with params ${JSON.stringify(queryParams)}:`, error);
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
    let filteredData = rawData.filter(row => {
      if (row.speed === null || row.speed === undefined || row.speed === '') {
        return false;
      }
      if (row.depth !== undefined && row.depth !== null && selectedDepth !== undefined) {
        const depthDiff = Math.abs(row.depth - selectedDepth);
        return depthDiff <= 5;
      }
      return true;
    });
  
    filteredData.sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return new Date(a.time) - new Date(b.time);
    });
  
    const recentData = maxDataPoints ? 
      filteredData.slice(-maxDataPoints) : 
      filteredData;
    
    const processedData = recentData.map((row, index) => ({
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
    }));

    return processedData;
};

/**
 * Generic processor for scalar data (like temperature, salinity) for heatmap generation.
 * @param {Array} rawData - The raw data from the API.
 * @param {string} parameterKey - The key of the parameter to process (e.g., 'temp', 'salinity').
 * @param {Object} options - Processing options.
 * @returns {Array} Array of processed scalar data points.
 */
const processScalarData = (rawData, parameterKey, options = {}) => {
  const { maxDataPoints = null, latestOnly = false, depthFilter = null } = options;

  if (!rawData || rawData.length === 0) return [];

  let filteredData = rawData.filter(row => 
    row.lat && row.lon &&
    row[parameterKey] !== null && row[parameterKey] !== undefined &&
    !isNaN(row.lat) && !isNaN(row.lon) && !isNaN(row[parameterKey]) &&
    Math.abs(row.lat) <= 90 && Math.abs(row.lon) <= 180
  );

  if (depthFilter !== null) {
    filteredData = filteredData.filter(row => 
      row.depth !== null && row.depth !== undefined && Math.abs(row.depth - depthFilter) <= 5
    );
  }

  filteredData.sort((a, b) => new Date(a.time) - new Date(b.time));

  if (latestOnly) {
    const latestData = new Map();
    filteredData.forEach(row => {
      const key = `${row.lat.toFixed(4)},${row.lon.toFixed(4)}`;
      if (!latestData.has(key) || new Date(row.time) > new Date(latestData.get(key).time)) {
        latestData.set(key, row);
      }
    });
    filteredData = Array.from(latestData.values());
  }

  if (maxDataPoints) {
    filteredData = filteredData.slice(-maxDataPoints);
  }

  return filteredData.map(row => ({
    latitude: row.lat,
    longitude: row.lon,
    value: row[parameterKey],
    time: row.time,
    depth: row.depth || 0,
  }));
};

/**
 * Processes vector data for map visualization with configurable field mapping
 * @param {Array} rawData - The raw data from the API
 * @param {Object} options - Processing options
 * @param {string} options.magnitudeKey - Field name for magnitude/speed
 * @param {string} options.directionKey - Field name for direction
 * @returns {Array} Array of vector data points
 */
export const processVectorData = (rawData, options = {}) => {
  const { 
    maxDataPoints = null, 
    latestOnly = false, 
    gridResolution = 0.01, 
    depthFilter = null,
    magnitudeKey = 'nspeed',
    directionKey = 'direction'
  } = options;

  if (!rawData || rawData.length === 0) return [];

  let vectorData = rawData.filter(row => {
    const magnitude = row[magnitudeKey];
    const direction = row[directionKey];
    return row.lat && row.lon &&
           magnitude !== null && magnitude !== undefined && !isNaN(magnitude) &&
           direction !== null && direction !== undefined && !isNaN(direction) &&
           Math.abs(row.lat) <= 90 && Math.abs(row.lon) <= 180;
  });

  if (depthFilter !== null) {
    vectorData = vectorData.filter(row => 
      row.depth !== null && row.depth !== undefined && Math.abs(row.depth - depthFilter) <= 5
    );
  }

  vectorData.sort((a, b) => new Date(a.time) - new Date(b.time));

  if (gridResolution > 0) {
    const gridData = new Map();
    vectorData.forEach(row => {
      const gridLat = Math.round(row.lat / gridResolution) * gridResolution;
      const gridLon = Math.round(row.lon / gridResolution) * gridResolution;
      const key = `${gridLat},${gridLon}`;
      if (!gridData.has(key)) {
        gridData.set(key, { lat: gridLat, lon: gridLon, directions: [], magnitudes: [], times: [], depths: [] });
      }
      const cell = gridData.get(key);
      cell.directions.push(row[directionKey]);
      cell.magnitudes.push(row[magnitudeKey] || 0);
      cell.times.push(row.time);
      cell.depths.push(row.depth || 0);
    });

    vectorData = Array.from(gridData.values()).map(cell => ({
      lat: cell.lat,
      lon: cell.lon,
      direction: calculateCircularMean(cell.directions),
      magnitude: cell.magnitudes.reduce((s, v) => s + v, 0) / cell.magnitudes.length,
      time: cell.times.sort((a, b) => new Date(b) - new Date(a))[0],
      depth: cell.depths.reduce((s, d) => s + d, 0) / cell.depths.length,
    }));
  }

  if (latestOnly) {
    const latestData = new Map();
    vectorData.forEach(row => {
      const key = `${row.lat.toFixed(4)},${row.lon.toFixed(4)}`;
      if (!latestData.has(key) || new Date(row.time) > new Date(latestData.get(key).time)) {
        latestData.set(key, row);
      }
    });
    vectorData = Array.from(latestData.values());
  }

  if (maxDataPoints) {
    vectorData = vectorData.slice(-maxDataPoints);
  }

  return vectorData.map((row, index) => ({
    id: `vector_${index}`,
    latitude: row.lat,
    longitude: row.lon,
    direction: row.direction,
    speed: row.magnitude,
    magnitude: row.magnitude,
    time: row.time,
    depth: row.depth || 0,
    coordinates: [row.lon, row.lat],
    vectorX: Math.sin((row.direction * Math.PI) / 180),
    vectorY: Math.cos((row.direction * Math.PI) / 180),
  }));
};

/**
 * Legacy function for backwards compatibility
 */
export const processCurrentsData = (rawData, options = {}) => {
  return processVectorData(rawData, {
    ...options,
    magnitudeKey: 'nspeed',
    directionKey: 'direction'
  });
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
  if (meanDegrees < 0) meanDegrees += 360;
  return meanDegrees;
};

/**
 * Generates vector data optimized for Mapbox visualization with configurable field mapping
 * @param {Array} rawData - The raw data from the API
 * @param {Object} options - Generation options
 * @returns {Object} GeoJSON-like object for Mapbox vector layers
 */
export const generateCurrentsVectorData = (rawData, options = {}) => {
  const { 
    vectorScale = 0.009, 
    minMagnitude = 0, 
    colorBy = 'speed', 
    maxVectors = 1000, 
    depthFilter = null,
    displayParameter = 'Current Speed',
    magnitudeKey = 'nspeed',
    directionKey = 'direction'
  } = options;

  // Get field mappings based on display parameter
  const fieldMapping = getFieldMapping(displayParameter);
  const finalMagnitudeKey = magnitudeKey || fieldMapping.magnitudeKey;
  const finalDirectionKey = directionKey || fieldMapping.directionKey;

  console.log('dataService - Field mapping:', { displayParameter, fieldMapping });
  console.log('dataService - Raw data sample:', rawData?.[0]);

  const vectorData = processVectorData(rawData, { 
    latestOnly: true, 
    maxDataPoints: maxVectors, 
    gridResolution: 0.01, 
    depthFilter,
    magnitudeKey: finalMagnitudeKey,
    directionKey: finalDirectionKey
  });

  console.log('dataService - Processed vectors:', vectorData.length);
  
  if (vectorData.length === 0) return { type: 'FeatureCollection', features: [] };

  const filteredVectors = vectorData.filter(vector => vector.magnitude >= minMagnitude);
  const speeds = filteredVectors.map(c => c.speed);
  const depths = filteredVectors.map(c => c.depth);
  const maxSpeed = Math.max(...speeds), minSpeed = Math.min(...speeds);
  const maxDepth = Math.max(...depths), minDepth = Math.min(...depths);

  const features = filteredVectors.map(vector => {
    const vectorLength = vector.magnitude * vectorScale;
    const endLat = vector.latitude + (vector.vectorY * vectorLength);
    const endLon = vector.longitude + (vector.vectorX * vectorLength);

    let colorValue = 0.5;
    if (colorBy === 'speed' && maxSpeed > minSpeed) {
      colorValue = (vector.speed - minSpeed) / (maxSpeed - minSpeed);
    } else if (colorBy === 'depth' && maxDepth > minDepth) {
      colorValue = (vector.depth - minDepth) / (maxDepth - minDepth);
    }

    return {
      type: 'Feature',
      properties: {
        id: vector.id, 
        direction: vector.direction, 
        speed: vector.speed,
        magnitude: vector.magnitude, 
        depth: vector.depth, 
        time: vector.time,
        colorValue: colorValue, 
        dataPointCount: vector.dataPointCount || 1
      },
      geometry: {
        type: 'LineString',
        coordinates: [[vector.longitude, vector.latitude], [endLon, endLat]]
      }
    };
  });
  
  return {
    type: 'FeatureCollection',
    features,
    metadata: {
      vectorCount: features.length,
      speedRange: { min: minSpeed, max: maxSpeed },
      depthRange: { min: minDepth, max: maxDepth },
      colorBy: colorBy,
      displayParameter: displayParameter,
      fieldMapping: { magnitudeKey: finalMagnitudeKey, directionKey: finalDirectionKey }
    }
  };
};

/**
 * Gets field mapping for different layer types
 * @param {string} displayParameter - The display parameter name
 * @returns {Object} Field mapping configuration
 */
const getFieldMapping = (displayParameter) => {
  const mappings = {
    'Current Speed': { magnitudeKey: 'nspeed', directionKey: 'direction' },
    'Current Direction': { magnitudeKey: 'nspeed', directionKey: 'direction' },
    'Wind Speed': { magnitudeKey: 'nspeed', directionKey: 'ndirection' },
    'Wind Direction': { magnitudeKey: 'nspeed', directionKey: 'ndirection' },
    'Wave Direction': { magnitudeKey: 'ssh', directionKey: 'direction' }, // Using SSH magnitude with current direction
    'Ocean Currents': { magnitudeKey: 'nspeed', directionKey: 'direction' } // Default
  };
  
  return mappings[displayParameter] || mappings['Ocean Currents'];
};

/**
 * Gets currents color scale configuration for visualization
 * @param {Array} currentsData - Currents data for scale calculation
 * @param {string} colorBy - Property to base colors on ('speed', 'depth')
 * @returns {Object} Color scale configuration
 */
export const getCurrentsColorScale = (currentsData = [], colorBy = 'speed') => {
  if (currentsData.length === 0) return { min: 0, max: 10, property: colorBy, colors: [] };
  const values = currentsData.map(d => colorBy === 'speed' ? d.speed : d.depth).filter(v => !isNaN(v));
  const minValue = Math.min(...values), maxValue = Math.max(...values), midValue = (minValue + maxValue) / 2;
  return {
    min: minValue, max: maxValue, mid: midValue, property: colorBy,
    gradient: colorBy === 'speed' 
      ? ['rgb(0, 0, 255)', 'rgb(0, 255, 0)', 'rgb(255, 0, 0)']
      : ['rgb(255, 255, 0)', 'rgb(0, 255, 255)', 'rgb(0, 0, 255)']
  };
};

/**
 * Generic generator for heatmap data from any scalar parameter.
 * @param {Array} rawData - The raw data from the API.
 * @param {string} parameterKey - The key of the data to visualize (e.g., 'temp', 'salinity').
 * @param {Object} options - Heatmap generation options.
 * @returns {Array} Array of [lat, lng, intensity] points for heatmap.
 */
const generateScalarHeatmapData = (rawData, parameterKey, options = {}) => {
  const { intensityScale = 1.0, normalize = true, gridResolution = 0.01, depthFilter = null } = options;
  const processedData = processScalarData(rawData, parameterKey, { latestOnly: false, depthFilter });

  if (processedData.length === 0) return [];

  const values = processedData.map(d => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal;

  const gridData = new Map();
  processedData.forEach(point => {
    const gridLat = Math.round(point.latitude / gridResolution) * gridResolution;
    const gridLng = Math.round(point.longitude / gridResolution) * gridResolution;
    const key = `${gridLat},${gridLng}`;
    if (!gridData.has(key)) {
      gridData.set(key, { lat: gridLat, lng: gridLng, values: [] });
    }
    gridData.get(key).values.push(point.value);
  });

  return Array.from(gridData.values()).map(cell => {
    const avgValue = cell.values.reduce((sum, val) => sum + val, 0) / cell.values.length;
    let intensity = normalize && range > 0 ? (avgValue - minVal) / range : avgValue * intensityScale;
    return [cell.lat, cell.lng, Math.max(0, Math.min(1, intensity))];
  });
};

export const generateTemperatureHeatmapData = (rawData, options) => generateScalarHeatmapData(rawData, 'temp', options);
export const generateSalinityHeatmapData = (rawData, options) => generateScalarHeatmapData(rawData, 'salinity', options);
export const generateSshHeatmapData = (rawData, options) => generateScalarHeatmapData(rawData, 'ssh', options);
export const generatePressureHeatmapData = (rawData, options) => generateScalarHeatmapData(rawData, 'pressure_dbars', options);


/**
 * Gets temperature color scale configuration for visualization
 * @param {Array} temperatureData - Temperature data for scale calculation
 * @returns {Object} Color scale configuration
 */
export const getTemperatureColorScale = (temperatureData = []) => {
  const temperatures = temperatureData.map(d => d.temperature).filter(t => !isNaN(t));
  
  if (temperatures.length === 0) {
    return {
      min: 0, max: 30, colors: [
        { value: 0, color: '#0000FF' }, { value: 0.25, color: '#00FFFF' },
        { value: 0.5, color: '#00FF00' }, { value: 0.75, color: '#FFFF00' },
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
    min: minTemp, max: maxTemp, mid: midTemp,
    colors: [
      { value: minTemp, color: '#0000FF' }, { value: quarterTemp, color: '#00FFFF' },
      { value: midTemp, color: '#00FF00' }, { value: threeQuarterTemp, color: '#FFFF00' },
      { value: maxTemp, color: '#FF0000' }
    ],
    gradient: ['rgb(0, 0, 255)', 'rgb(0, 255, 255)', 'rgb(0, 255, 0)', 'rgb(255, 255, 0)', 'rgb(255, 0, 0)']
  };
};

/**
 * Gets latest temperature readings grouped by location
 * @param {Array} rawData - The raw data from the API
 * @param {number} maxPoints - Maximum points to return
 * @returns {Array} Latest temperature readings per location
 */
export const getLatestTemperatureReadings = (rawData, maxPoints = 1000) => {
  const tempData = processScalarData(rawData, 'temp', { 
    latestOnly: true, maxDataPoints: maxPoints 
  });
  
  return tempData.map(point => ({
    ...point,
    temperature: point.value,
    id: `temp_${point.latitude}_${point.longitude}`,
    displayTemp: `${point.value.toFixed(1)}°C`,
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
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  } catch (error) {
    return '00:00';
  }
};

/**
 * Simple land/water detection using basic geographic rules
 */
const isLikelyOnWater = (lat, lon) => {
  const gulfBounds = { north: 31, south: 18, east: -80, west: -98 };
  if (lat >= gulfBounds.south && lat <= gulfBounds.north && lon >= gulfBounds.west && lon <= gulfBounds.east) {
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
  const distanceFromCoast = Math.min(Math.abs(lat - 29.5), Math.abs(lon - (-90)));
  return Math.min(distanceFromCoast * 100, 3000);
};

/**
 * Enhanced station generation with water filtering and deployment filtering
 */
export const generateOptimizedStationDataFromAPI = (rawData) => {
  if (!rawData || rawData.length === 0) return [];

  const waterData = rawData.filter(row => {
    if (!row.lat || !row.lon || isNaN(row.lat) || isNaN(row.lon)) return false;
    if (Math.abs(row.lat) > 90 || Math.abs(row.lon) > 180) return false;
    if (!isLikelyOnWater(row.lat, row.lon)) return false;
    if (row.status && (row.status === 'pre-deployment' || row.status === 'post-recovery')) return false;
    return true;
  });

  const stations = new Map();
  const getOptimalPrecision = (dataCount) => {
    if (dataCount > 50000) return 1; if (dataCount > 10000) return 2;
    if (dataCount > 1000) return 3; return 4;
  };
  const precision = getOptimalPrecision(waterData.length);
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
        name: `Ocean Station ${stations.size + 1}`, coordinates: [centroidLon, centroidLat],
        exactLat: centroidLat, exactLon: centroidLon, type: 'ocean_station',
        color: getStationColor(groupData), dataPoints: 0, sourceFiles: new Set(),
        allDataPoints: [], deploymentStatus: 'active', waterDepth: estimateWaterDepth(centroidLat, centroidLon),
        model: 'NGOFS2', area: area
      });
    }
    const station = stations.get(key);
    station.dataPoints++;
    if (row._source_file) station.sourceFiles.add(row._source_file);
    station.allDataPoints.push({ ...row, rowIndex: index });
  });

  return Array.from(stations.values()).map(station => ({
    ...station, sourceFiles: Array.from(station.sourceFiles)
  }));
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
  if (!rawData || rawData.length === 0) return [];
  const stations = new Map();
  const area = rawData.length > 0 ? rawData[0].area : null;
  rawData.forEach((row, index) => {
    if (row.lat && row.lon && !isNaN(row.lat) && !isNaN(row.lon)) {
      const precision = 4;
      const key = `${row.lat.toFixed(precision)},${row.lon.toFixed(precision)}`;
      if (!stations.has(key)) {
        stations.set(key, {
          name: `Station at ${row.lat.toFixed(4)}, ${row.lon.toFixed(4)}`,
          coordinates: [row.lon, row.lat], exactLat: row.lat, exactLon: row.lon,
          type: 'api_station', color: [Math.random() * 255, Math.random() * 255, Math.random() * 255],
          dataPoints: 0, sourceFiles: new Set(), allDataPoints: [], model: 'NGOFS2', area: area
        });
      }
      const station = stations.get(key);
      station.dataPoints++;
      if (row._source_file) station.sourceFiles.add(row._source_file);
      station.allDataPoints.push({ ...row, rowIndex: index });
    }
  });
  return Array.from(stations.values()).map(station => ({
    ...station, sourceFiles: Array.from(station.sourceFiles)
  }));
};

/**
 * Alternative version that creates individual stations for each unique coordinate
 */
export const generateStationDataFromAPINoGrouping = (rawData) => {
  if (!rawData || rawData.length === 0) return [];
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
          coordinates: [row.lon, row.lat], exactLat: row.lat, exactLon: row.lon,
          type: 'api_station', color: [Math.random() * 255, Math.random() * 255, Math.random() * 255],
          dataPoints: rawData.filter(r => r.lat === row.lat && r.lon === row.lon).length,
          sourceFiles: [...new Set(rawData.filter(r => r.lat === row.lat && r.lon === row.lon).map(r => r._source_file).filter(Boolean))],
          allDataPoints: rawData.filter(r => r.lat === row.lat && r.lon === row.lon),
          model: 'NGOFS2', area: area
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
    row.lat && row.lon && !isNaN(row.lat) && !isNaN(row.lon) &&
    Math.abs(row.lat) <= 90 && Math.abs(row.lon) <= 180
  );
  const invalidCoords = rawData.filter(row => 
    !row.lat || !row.lon || isNaN(row.lat) || isNaN(row.lon) ||
    Math.abs(row.lat) > 90 || Math.abs(row.lon) > 180
  );
  return {
    total: rawData.length, valid: validCoords.length, invalid: invalidCoords.length,
    validPercentage: (validCoords.length / rawData.length * 100).toFixed(1),
    coordinateRanges: validCoords.length > 0 ? {
      latitude: {
        min: Math.min(...validCoords.map(r => r.lat)), max: Math.max(...validCoords.map(r => r.lat)),
        range: Math.max(...validCoords.map(r => r.lat)) - Math.min(...validCoords.map(r => r.lat))
      },
      longitude: {
        min: Math.min(...validCoords.map(r => r.lon)), max: Math.max(...validCoords.map(r => r.lon)),
        range: Math.max(...validCoords.map(r => r.lon)) - Math.min(...validCoords.map(r => r.lon))
      }
    } : null,
    sampleValidCoords: validCoords.slice(0, 10).map(r => ({ lat: r.lat, lon: r.lon })),
    sampleInvalidCoords: invalidCoords.slice(0, 5).map(r => ({ lat: r.lat, lon: r.lon }))
  };
};

export default {
  loadAllData,
  processAPIData,
  processCurrentsData,
  processVectorData,
  generateCurrentsVectorData,
  getCurrentsColorScale,
  generateTemperatureHeatmapData,
  generateSalinityHeatmapData,
  generateSshHeatmapData,
  generatePressureHeatmapData,
  getTemperatureColorScale,
  getLatestTemperatureReadings,
  formatTimeForDisplay,
  generateOptimizedStationDataFromAPI,
  generateStationDataFromAPI,
  generateStationDataFromAPINoGrouping,
  validateOceanStations,
  validateCoordinateData
};