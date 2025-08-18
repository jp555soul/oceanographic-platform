import Papa from 'papaparse';

/**
 * Ocean Data Service
 * Handles loading, processing, and validation of oceanographic CSV data.
 * This simplified version focuses on loading data from a manifest file in the public/data directory.
 */

/**
 * Loads and parses all .csv files listed in a manifest file.
 * @returns {Promise<{csvFiles: Array, allData: Array}>} A promise that resolves to an object
 * containing metadata about the loaded files and all the parsed data rows.
 */
export const loadAllCSVFiles = async () => {
  const csvFiles = [];
  let allData = [];

  try {
    const manifestResponse = await fetch('/csv-manifest.json');
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json();

      // Sort files numerically
      const sortedFiles = manifest.files.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numA - numB;
      });

      // Use the sorted list of files
      for (const filename of sortedFiles) {
        try {
          const response = await fetch(`/data/${filename}`);
          if (response.ok) {
            const csvText = await response.text();
            const parseResult = await parseCSVText(csvText);
            
            const dataWithMetadata = parseResult.data.map(row => ({
              ...row,
              _source_file: filename,
              _loaded_at: new Date().toISOString()
            }));

            csvFiles.push({
              filename: filename,
              rowCount: dataWithMetadata.length,
              columns: parseResult.meta.fields || [],
              errors: parseResult.errors || [],
              parseTime: new Date().toISOString()
            });

            allData = allData.concat(dataWithMetadata);
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } catch (fileError) {
          console.error(`âŒ Error loading or processing ${filename}:`, fileError);
          csvFiles.push({
            filename: filename,
            rowCount: 0,
            columns: [],
            errors: [fileError.message],
            parseTime: new Date().toISOString()
          });
        }
      }
    } else {
        console.log('CSV manifest not found. No data loaded.');
    }
  } catch (error) {
    console.error('All CSV loading methods failed:', error);
  }

  return { csvFiles, allData };
};

/**
 * Parses CSV text using PapaParse with optimized settings for oceanographic data.
 * @param {string} csvText - The raw CSV text content.
 * @returns {Promise<Object>} A Promise that resolves to the parse result from PapaParse.
 */
export const parseCSVText = (csvText) => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(), // Only trim whitespace
      complete: resolve,
      error: reject,
    });
  });
};

/**
 * Processes raw CSV data into a format suitable for time series charts.
 * @param {Array} csvData - The raw data from PapaParse.
 * @param {number} selectedDepth - The depth to filter the data by.
 * @param {number|null} maxDataPoints - Maximum number of data points to return (null = no limit).
 * @returns {Array} An array of processed data points for visualization.
 */
export const processCSVData = (csvData, selectedDepth = 0, maxDataPoints = null) => {
    if (!csvData || csvData.length === 0) {
      console.log('No CSV data to process');
      return [];
    }

    // Filter data based on current parameters AND skip null/empty values
    let filteredData = csvData.filter(row => {
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
  
    // UPDATED: Use configurable limit instead of hard-coded 48
    const recentData = maxDataPoints ? 
      filteredData.slice(-maxDataPoints) : 
      filteredData; // Use ALL data if maxDataPoints is null
    
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
      };
      
      return processed;
    });

    return processedData;
};

/**
 * Processes Sea Surface Temperature data for heatmap visualization
 * @param {Array} csvData - The raw CSV data
 * @param {Object} options - Processing options
 * @param {number} options.maxDataPoints - Maximum points to include
 * @param {boolean} options.latestOnly - Only use most recent data per location
 * @param {number} options.temperatureMin - Minimum temperature threshold
 * @param {number} options.temperatureMax - Maximum temperature threshold
 * @returns {Array} Array of temperature data points with coordinates
 */
export const processTemperatureData = (csvData, options = {}) => {
  const {
    maxDataPoints = null,
    latestOnly = false,
    temperatureMin = -5,
    temperatureMax = 50
  } = options;

  if (!csvData || csvData.length === 0) {
    console.log('No CSV data to process for temperature');
    return [];
  }

  // Filter for valid temperature data
  let tempData = csvData.filter(row => {
    return row.lat && row.lon && 
           row.temp !== null && row.temp !== undefined && 
           !isNaN(row.lat) && !isNaN(row.lon) && !isNaN(row.temp) &&
           row.temp >= temperatureMin && row.temp <= temperatureMax &&
           Math.abs(row.lat) <= 90 && Math.abs(row.lon) <= 180;
  });

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
    sourceFile: row._source_file
  }));

  console.log(`Processed ${processedTempData.length} temperature data points`);
  return processedTempData;
};

/**
 * Generates heatmap-ready data structure for temperature visualization
 * @param {Array} csvData - The raw CSV data
 * @param {Object} options - Heatmap generation options
 * @returns {Array} Array of [lat, lng, intensity] points for heatmap
 */
export const generateTemperatureHeatmapData = (csvData, options = {}) => {
  const {
    intensityScale = 1.0,
    normalizeTemperature = true,
    gridResolution = 0.01 // Decimal degrees for grouping nearby points
  } = options;

  const tempData = processTemperatureData(csvData, { latestOnly: true });
  
  if (tempData.length === 0) {
    return [];
  }

  // Calculate temperature range for normalization
  const temperatures = tempData.map(d => d.temperature);
  const minTemp = Math.min(...temperatures);
  const maxTemp = Math.max(...temperatures);
  const tempRange = maxTemp - minTemp;

  // Group nearby points to reduce noise
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

  // Convert to heatmap format with averaged temperatures
  const heatmapData = Array.from(gridData.values()).map(cell => {
    const avgTemp = cell.temperatures.reduce((sum, temp) => sum + temp, 0) / cell.temperatures.length;
    
    let intensity;
    if (normalizeTemperature && tempRange > 0) {
      // Normalize to 0-1 range
      intensity = (avgTemp - minTemp) / tempRange;
    } else {
      // Use raw temperature scaled
      intensity = avgTemp * intensityScale;
    }
    
    // Ensure intensity is between 0 and 1 for heatmap libraries
    intensity = Math.max(0, Math.min(1, intensity));
    
    return [cell.lat, cell.lng, intensity];
  });

  console.log(`Generated ${heatmapData.length} heatmap points from ${tempData.length} temperature readings`);
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
        { value: 0, color: '#0000FF' },    // Blue (cold)
        { value: 0.25, color: '#00FFFF' }, // Cyan
        { value: 0.5, color: '#00FF00' },  // Green
        { value: 0.75, color: '#FFFF00' }, // Yellow
        { value: 1.0, color: '#FF0000' }   // Red (hot)
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
      { value: minTemp, color: '#0000FF' },           // Blue (coldest)
      { value: quarterTemp, color: '#00FFFF' },       // Cyan
      { value: midTemp, color: '#00FF00' },           // Green
      { value: threeQuarterTemp, color: '#FFFF00' },  // Yellow
      { value: maxTemp, color: '#FF0000' }            // Red (warmest)
    ],
    gradient: [
      'rgb(0, 0, 255)',     // Blue
      'rgb(0, 255, 255)',   // Cyan
      'rgb(0, 255, 0)',     // Green
      'rgb(255, 255, 0)',   // Yellow
      'rgb(255, 0, 0)'      // Red
    ]
  };
};

/**
 * Gets latest temperature readings grouped by location
 * @param {Array} csvData - The raw CSV data
 * @param {number} maxPoints - Maximum points to return
 * @returns {Array} Latest temperature readings per location
 */
export const getLatestTemperatureReadings = (csvData, maxPoints = 1000) => {
  const tempData = processTemperatureData(csvData, { 
    latestOnly: true, 
    maxDataPoints: maxPoints 
  });
  
  return tempData.map(point => ({
    ...point,
    id: `temp_${point.latitude}_${point.longitude}`,
    displayTemp: `${point.temperature.toFixed(1)}°C`,
    coordinates: [point.longitude, point.latitude] // [lng, lat] for mapping libraries
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
 * For more accuracy, integrate with actual bathymetry data
 */
const isLikelyOnWater = (lat, lon) => {
  // Gulf of Mexico bounds (approximate)
  const gulfBounds = {
    north: 31,
    south: 18,
    east: -80,
    west: -98
  };
  
  // Basic Gulf of Mexico water area detection
  if (lat >= gulfBounds.south && lat <= gulfBounds.north && 
      lon >= gulfBounds.west && lon <= gulfBounds.east) {
    
    // Exclude obvious land areas (very basic)
    // Louisiana/Texas coast exclusions
    if (lat > 29.5 && lon > -90) return false; // Louisiana coast
    if (lat > 28 && lon > -95 && lat < 30) return false; // Texas coast
    if (lat > 25 && lat < 26.5 && lon > -82) return false; // Florida keys area
    
    return true; // Likely in Gulf waters
  }
  
  // For other ocean areas, add similar logic or use bathymetry API
  return true; // Default to allow
};

/**
 * Color stations based on data characteristics
 */
const getStationColor = (dataPoints) => {
  if (dataPoints.length === 0) return [128, 128, 128]; // Gray for no data
  
  // Color by data density
  if (dataPoints.length > 1000) return [255, 69, 0];   // Red-orange for high density
  if (dataPoints.length > 500) return [255, 140, 0];   // Orange for medium-high
  if (dataPoints.length > 100) return [255, 215, 0];   // Gold for medium
  if (dataPoints.length > 10) return [0, 191, 255];    // Blue for low-medium
  return [0, 255, 127]; // Green for sparse data
};

/**
 * Rough water depth estimation (replace with actual bathymetry data)
 */
const estimateWaterDepth = (lat, lon) => {
  // Very rough Gulf of Mexico depth estimates
  // Replace with actual NOAA bathymetry API calls
  const distanceFromCoast = Math.min(
    Math.abs(lat - 29.5), // Distance from Louisiana coast
    Math.abs(lon - (-90)) // Distance from shore longitude
  );
  
  // Rough estimate: deeper water further from coast
  return Math.min(distanceFromCoast * 100, 3000); // Max 3000m depth
};

/**
 * Enhanced station generation with water filtering and deployment filtering
 */
export const generateOptimizedStationDataFromCSV = (csvData) => {
  if (!csvData || csvData.length === 0) {
    return [];
  }

  // Pre-filter for valid water coordinates
  const waterData = csvData.filter(row => {
    if (!row.lat || !row.lon || isNaN(row.lat) || isNaN(row.lon)) {
      return false;
    }
    
    // Skip obvious invalid coordinates
    if (Math.abs(row.lat) > 90 || Math.abs(row.lon) > 180) {
      return false;
    }
    
    // Filter out likely land positions
    if (!isLikelyOnWater(row.lat, row.lon)) {
      return false;
    }
    
    // For buoy/UxS data, filter by deployment status if available
    if (row.status && (row.status === 'pre-deployment' || row.status === 'post-recovery')) {
      return false;
    }
    
    return true;
  });

  console.log(`Filtered ${csvData.length} rows to ${waterData.length} water-based coordinates`);

  const stations = new Map();
  
  // Adaptive precision based on data density
  const getOptimalPrecision = (dataCount) => {
    if (dataCount > 50000) return 1; // Regional view for very dense data
    if (dataCount > 10000) return 2; // Standard 1km grouping
    if (dataCount > 1000) return 3;  // 100m grouping for detailed view
    return 4; // High precision for sparse data
  };
  
  const precision = getOptimalPrecision(waterData.length);
  console.log(`Using precision ${precision} for ${waterData.length} water coordinates`);
  
  waterData.forEach((row, index) => {
    const key = `${row.lat.toFixed(precision)},${row.lon.toFixed(precision)}`;
    
    if (!stations.has(key)) {
      // Calculate centroid for grouped stations
      const groupData = waterData.filter(r => 
        Math.abs(r.lat - row.lat) < Math.pow(10, -precision) &&
        Math.abs(r.lon - row.lon) < Math.pow(10, -precision)
      );
      
      const centroidLat = groupData.reduce((sum, r) => sum + r.lat, 0) / groupData.length;
      const centroidLon = groupData.reduce((sum, r) => sum + r.lon, 0) / groupData.length;
      
      stations.set(key, {
        name: `Ocean Station ${stations.size + 1}`,
        coordinates: [centroidLon, centroidLat], // Use centroid
        exactLat: centroidLat,
        exactLon: centroidLon,
        type: 'ocean_station',
        color: getStationColor(groupData), // Color by data characteristics
        dataPoints: 0,
        sourceFiles: new Set(),
        allDataPoints: [],
        deploymentStatus: 'active', // Mark as active ocean station
        waterDepth: estimateWaterDepth(centroidLat, centroidLon) // Rough depth estimate
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
 * Legacy function - generates station locations from CSV data by grouping nearby coordinates
 * Use generateOptimizedStationDataFromCSV instead for better water filtering
 */
export const generateStationDataFromCSV = (csvData) => {
  console.warn('Using legacy generateStationDataFromCSV - consider using generateOptimizedStationDataFromCSV');
  
  if (!csvData || csvData.length === 0) {
    return [];
  }

  const stations = new Map();
  
  csvData.forEach((row, index) => {
    if (row.lat && row.lon && !isNaN(row.lat) && !isNaN(row.lon)) {
      const precision = 1; // Using medium precision
      const key = `${row.lat.toFixed(precision)},${row.lon.toFixed(precision)}`;
      
      if (!stations.has(key)) {
        stations.set(key, {
          name: `Station at ${row.lat.toFixed(4)}, ${row.lon.toFixed(4)}`,
          coordinates: [row.lon, row.lat], // [longitude, latitude] for Deck.gl
          exactLat: row.lat,
          exactLon: row.lon,
          type: 'csv_station',
          color: [Math.random() * 255, Math.random() * 255, Math.random() * 255],
          dataPoints: 0,
          sourceFiles: new Set(),
          allDataPoints: []
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
 * Use this if you don't want any grouping at all
 */
export const generateStationDataFromCSVNoGrouping = (csvData) => {
  if (!csvData || csvData.length === 0) {
    return [];
  }

  const stations = [];
  const seenCoordinates = new Set();
  
  csvData.forEach((row, index) => {
    if (row.lat && row.lon && !isNaN(row.lat) && !isNaN(row.lon)) {
      const coordKey = `${row.lat}_${row.lon}`;
      
      if (!seenCoordinates.has(coordKey)) {
        seenCoordinates.add(coordKey);
        
        stations.push({
          name: `Station ${stations.length + 1} (${row.lat.toFixed(4)}, ${row.lon.toFixed(4)})`,
          coordinates: [row.lon, row.lat], // [longitude, latitude]
          exactLat: row.lat,
          exactLon: row.lon,
          type: 'csv_station',
          color: [Math.random() * 255, Math.random() * 255, Math.random() * 255],
          dataPoints: csvData.filter(r => r.lat === row.lat && r.lon === row.lon).length,
          sourceFiles: [...new Set(csvData.filter(r => r.lat === row.lat && r.lon === row.lon).map(r => r._source_file).filter(Boolean))],
          allDataPoints: csvData.filter(r => r.lat === row.lat && r.lon === row.lon)
        });
      }
    }
  });

  return stations;
};

/**
 * Debug function to validate coordinate data
 */
export const validateCoordinateData = (csvData) => {
  const validCoords = csvData.filter(row => 
    row.lat && row.lon && 
    !isNaN(row.lat) && !isNaN(row.lon) &&
    Math.abs(row.lat) <= 90 && Math.abs(row.lon) <= 180
  );

  const invalidCoords = csvData.filter(row => 
    !row.lat || !row.lon || 
    isNaN(row.lat) || isNaN(row.lon) ||
    Math.abs(row.lat) > 90 || Math.abs(row.lon) > 180
  );

  const coordinateStats = {
    total: csvData.length,
    valid: validCoords.length,
    invalid: invalidCoords.length,
    validPercentage: (validCoords.length / csvData.length * 100).toFixed(1),
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
  loadAllCSVFiles,
  parseCSVText,
  processCSVData,
  processTemperatureData,
  generateTemperatureHeatmapData,
  getTemperatureColorScale,
  getLatestTemperatureReadings,
  formatTimeForDisplay,
  generateOptimizedStationDataFromCSV,
  generateStationDataFromCSV,
  generateStationDataFromCSVNoGrouping,
  validateOceanStations,
  validateCoordinateData
};