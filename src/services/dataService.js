import Papa from 'papaparse';

/**
 * Ocean Data Service
 * Handles loading, processing, and validation of oceanographic CSV data
 * Supports both development (require.context) and production (manifest) environments
 */

/**
 * Loads and parses all .csv files from the public/data directory or a manifest file.
 * This function is designed to be environment-agnostic (works in dev and production).
 * @returns {Promise<{csvFiles: Array, allData: Array}>} A promise that resolves to an object
 * containing metadata about the loaded files and all the parsed data rows.
 */
export const loadAllCSVFiles = async () => {
  const csvFiles = [];
  const allData = [];

  try {
    // Method 1: Try webpack's require.context (works in development)
    try {
      // Note: This path is relative to the file where it's called.
      // For a file in src/services, the path to src/data is '../data'.
      // However, require.context is static and might need the original path.
      // If this fails, the manifest method is the fallback.
      const csvContext = require.context('../data', false, /\.csv$/);
      const csvFilenames = csvContext.keys();

      console.log('Found CSV files via require.context:', csvFilenames);

      if (csvFilenames.length > 0) {
        for (const filename of csvFilenames) {
          try {
            const csvModule = csvContext(filename);
            const response = await fetch(csvModule.default || csvModule);
            const csvText = await response.text();

            const parseResult = await parseCSVText(csvText);
            const dataWithMetadata = addMetadataToRows(parseResult.data, filename.replace('./', ''));

            csvFiles.push({
              filename: filename.replace('./', ''),
              rowCount: dataWithMetadata.length,
              columns: parseResult.meta.fields || [],
              errors: parseResult.errors || [],
              parseTime: new Date().toISOString()
            });

            allData.push(...dataWithMetadata);

          } catch (fileError) {
            console.error(`Error loading ${filename}:`, fileError);
            csvFiles.push({
              filename: filename.replace('./', ''),
              rowCount: 0,
              columns: [],
              errors: [fileError.message],
              parseTime: new Date().toISOString()
            });
          }
        }
        if (allData.length > 0) return { csvFiles, allData };
      }
    } catch (contextError) {
      console.log('require.context failed:', contextError.message, 'Falling back to manifest.');
    }

    // Method 2: Try to fetch a manifest file (robust method for production)
    try {
      console.log('Trying to fetch CSV manifest from /csv-manifest.json...');
      const manifestResponse = await fetch('/csv-manifest.json');
      if (manifestResponse.ok) {
        const manifest = await manifestResponse.json();
        console.log('Found CSV manifest:', manifest);

        for (const filename of manifest.files) {
          try {
            // Path is relative to the public folder
            const response = await fetch(`/data/${filename}`);
            if (response.ok) {
              const csvText = await response.text();
              const parseResult = await parseCSVText(csvText);
              const dataWithMetadata = addMetadataToRows(parseResult.data, filename);

              csvFiles.push({
                filename: filename,
                rowCount: dataWithMetadata.length,
                columns: parseResult.meta.fields || [],
                errors: parseResult.errors || [],
                parseTime: new Date().toISOString()
              });

              allData.push(...dataWithMetadata);
              console.log(`✅ Loaded ${filename} with ${dataWithMetadata.length} rows`);
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
          } catch (fileError) {
            console.error(`❌ Error loading ${filename}:`, fileError);
            csvFiles.push({
              filename: filename,
              rowCount: 0,
              columns: [],
              errors: [fileError.message],
              parseTime: new Date().toISOString()
            });
          }
        }
        if (allData.length > 0) return { csvFiles, allData };
      }
    } catch (manifestError) {
      console.log('CSV manifest not found or failed to load.');
    }

    // Method 3: Try common oceanographic data files directly
    const commonFiles = [
      'ocean_data.csv',
      'buoy_data.csv', 
      'station_data.csv',
      'measurements.csv',
      'oceanographic_data.csv'
    ];

    console.log('Attempting to load common oceanographic files...');
    for (const filename of commonFiles) {
      try {
        const response = await fetch(`/data/${filename}`);
        if (response.ok) {
          const csvText = await response.text();
          const parseResult = await parseCSVText(csvText);
          const dataWithMetadata = addMetadataToRows(parseResult.data, filename);

          csvFiles.push({
            filename: filename,
            rowCount: dataWithMetadata.length,
            columns: parseResult.meta.fields || [],
            errors: parseResult.errors || [],
            parseTime: new Date().toISOString()
          });

          allData.push(...dataWithMetadata);
          console.log(`🔍 Found and loaded ${filename} with ${dataWithMetadata.length} rows`);
          break; // Stop after finding the first valid file
        }
      } catch (error) {
        console.log(`File ${filename} not found, continuing...`);
      }
    }

    return { csvFiles, allData };

  } catch (error) {
    console.error('All CSV loading methods failed:', error);
    return { csvFiles: [], allData: [] };
  }
};

/**
 * Parse CSV text using PapaParse with optimized settings for oceanographic data
 * @param {string} csvText - Raw CSV text content
 * @returns {Promise<Object>} Parse result with data, metadata, and errors
 */
export const parseCSVText = (csvText) => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      delimitersToGuess: [',', '\t', '|', ';'],
      transformHeader: (header) => {
        // Clean up common header variations
        return header
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '_')
          .replace(/__+/g, '_')
          .replace(/^_|_$/g, '');
      },
      transform: (value, header) => {
        // Handle common oceanographic data transformations
        if (typeof value === 'string') {
          value = value.trim();
          // Handle empty strings
          if (value === '' || value.toLowerCase() === 'nan' || value.toLowerCase() === 'null') {
            return null;
          }
        }
        return value;
      },
      complete: resolve,
      error: reject
    });
  });
};

/**
 * Add metadata to each data row
 * @param {Array} data - Parsed CSV data
 * @param {string} filename - Source filename
 * @returns {Array} Data with metadata added
 */
export const addMetadataToRows = (data, filename) => {
  return data.map(row => ({
    ...row,
    _source_file: filename,
    _loaded_at: new Date().toISOString(),
    _data_quality: assessRowDataQuality(row)
  }));
};

/**
 * Assess data quality of a single row
 * @param {Object} row - Data row
 * @returns {string} Quality assessment
 */
export const assessRowDataQuality = (row) => {
  const requiredFields = ['lat', 'lon', 'time'];
  const optionalFields = ['temp', 'speed', 'salinity', 'pressure_dbars'];
  
  const hasRequired = requiredFields.every(field => 
    row[field] !== null && row[field] !== undefined
  );
  
  if (!hasRequired) return 'poor';
  
  const optionalCount = optionalFields.filter(field => 
    row[field] !== null && row[field] !== undefined
  ).length;
  
  if (optionalCount >= 3) return 'excellent';
  if (optionalCount >= 2) return 'good';
  return 'fair';
};

/**
 * Processes raw CSV data into a format suitable for time series charts.
 * @param {Array} csvData - The raw data from PapaParse.
 * @param {number} selectedDepth - The depth to filter the data by.
 * @returns {Array} An array of processed data points for visualization.
 */
export const processCSVData = (csvData, selectedDepth) => {
  if (!csvData || csvData.length === 0) return [];

  // Filter data based on current parameters
  let filteredData = csvData.filter(row => {
    // Filter by depth if available (within ±10ft of selected depth)
    if (row.depth && selectedDepth) {
      const depthDiff = Math.abs(row.depth - selectedDepth);
      return depthDiff <= 10;
    }
    return true;
  });

  // Sort by time if available
  filteredData.sort((a, b) => {
    if (!a.time || !b.time) return 0;
    return new Date(a.time) - new Date(b.time);
  });

  // Take last 48 data points for time series
  const recentData = filteredData.slice(-48);

  return recentData.map(row => {
    const pressure = row.pressure_dbars !== undefined ? row.pressure_dbars : null;
    return {
      time: formatTimeForDisplay(row.time),
      timestamp: row.time ? new Date(row.time) : new Date(),
      heading: row.direction || row.heading || 0,
      currentSpeed: row.speed || row.current_speed || 0,
      waveHeight: row.ssh || row.wave_height || 0,
      temperature: row.temp || row.temperature || null,
      latitude: row.lat || row.latitude,
      longitude: row.lon || row.longitude,
      surfaceHeight: row.ssh || 0,
      salinity: row.salinity || null,
      pressure: pressure,
      windSpeed: row.windspeed || row.wind_speed || 0,
      windDirection: row.winddirection || row.wind_direction || 0,
      swellHeight: row.swellheight || row.swell_height || 0,
      soundSpeed: row.sound_speed_ms || 1500,
      sourceFile: row._source_file,
      dataQuality: row._data_quality
    };
  });
};

/**
 * Format timestamp for display in charts
 * @param {string|Date} time - Time value
 * @returns {string} Formatted time string
 */
export const formatTimeForDisplay = (time) => {
  if (!time) return new Date().toISOString().split('T')[1].split(':').slice(0, 2).join(':');
  
  try {
    return new Date(time).toISOString().split('T')[1].split(':').slice(0, 2).join(':');
  } catch (error) {
    return new Date().toISOString().split('T')[1].split(':').slice(0, 2).join(':');
  }
};

/**
 * Generates station locations and metadata from the raw CSV data.
 * @param {Array} csvData - The raw data from PapaParse.
 * @returns {{success: boolean, error: string|null, stations: Array}} An object indicating success,
 * an optional error message, and the array of generated station objects.
 */
export const generateStationDataFromCSV = (csvData) => {
  if (!csvData || csvData.length === 0) {
    return { success: false, error: 'No CSV data available', stations: [] };
  }

  try {
    // Extract unique latitude/longitude combinations with validation
    const uniqueStations = new Map();
    let validDataPoints = 0;
    let invalidDataPoints = 0;

    csvData.forEach(row => {
      // Enhanced validation for coordinates with multiple field name variations
      const lat = row.lat || row.latitude;
      const lon = row.lon || row.longitude;

      if (lat && lon &&
        typeof lat === 'number' &&
        typeof lon === 'number' &&
        !isNaN(lat) && !isNaN(lon) &&
        Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {

        validDataPoints++;

        // Create a key for grouping (rounded to avoid floating point precision issues)
        const roundedLat = Math.round(lat * 10000) / 10000; // 4 decimal places
        const roundedLng = Math.round(lon * 10000) / 10000; // 4 decimal places
        const key = `${roundedLat},${roundedLng}`;

        if (!uniqueStations.has(key)) {
          uniqueStations.set(key, {
            latitude: roundedLat,
            longitude: roundedLng,
            count: 1,
            sourceFiles: new Set([row._source_file || 'unknown']),
            firstTimestamp: row.time ? new Date(row.time) : null,
            lastTimestamp: row.time ? new Date(row.time) : null,
            parameters: new Set(),
            dataQuality: [row._data_quality].filter(Boolean)
          });
        } else {
          const station = uniqueStations.get(key);
          station.count++;
          station.sourceFiles.add(row._source_file || 'unknown');

          // Update timestamp range
          if (row.time) {
            const timestamp = new Date(row.time);
            if (!station.firstTimestamp || timestamp < station.firstTimestamp) {
              station.firstTimestamp = timestamp;
            }
            if (!station.lastTimestamp || timestamp > station.lastTimestamp) {
              station.lastTimestamp = timestamp;
            }
          }

          // Track available parameters
          Object.keys(row).forEach(key => {
            if (key !== 'lat' && key !== 'lon' && key !== 'latitude' && key !== 'longitude' && 
                key !== '_source_file' && key !== '_loaded_at' && key !== '_data_quality' &&
                row[key] !== null && row[key] !== undefined) {
              station.parameters.add(key);
            }
          });

          // Track data quality
          if (row._data_quality) {
            station.dataQuality.push(row._data_quality);
          }
        }
      } else {
        invalidDataPoints++;
      }
    });

    console.log(`📊 Data validation: ${validDataPoints} valid, ${invalidDataPoints} invalid coordinate entries`);

    if (uniqueStations.size === 0) {
      return { success: false, error: 'No valid coordinates found in CSV data', stations: [] };
    }

    // Convert to array and generate incremental names with enhanced metadata
    const stationsArray = Array.from(uniqueStations.entries()).map(([key, station], index) => {
      const stationNumber = String(index + 1).padStart(3, '0');
      const latLabel = station.latitude >= 0 ? 'N' : 'S';
      const lngLabel = station.longitude >= 0 ? 'E' : 'W';
      const name = `STN-${stationNumber} (${Math.abs(station.latitude).toFixed(2)}°${latLabel})`;

      // Enhanced color palette for better distinction
      const colors = [
        [244, 63, 94],   // red-400
        [251, 191, 36],  // yellow-400
        [34, 211, 238],  // cyan-400
        [168, 85, 247],  // purple-400
        [34, 197, 94],   // green-400
        [249, 115, 22],  // orange-400
        [236, 72, 153],  // pink-400
        [99, 102, 241],  // indigo-400
        [156, 163, 175], // gray-400
        [245, 101, 101]  // red-300
      ];
      const colorIndex = index % colors.length;

      // Calculate overall data quality
      const qualityCounts = station.dataQuality.reduce((acc, quality) => {
        acc[quality] = (acc[quality] || 0) + 1;
        return acc;
      }, {});
      
      const dominantQuality = Object.keys(qualityCounts).reduce((a, b) => 
        qualityCounts[a] > qualityCounts[b] ? a : b, 'fair'
      );

      return {
        name: name,
        coordinates: [station.longitude, station.latitude],
        color: colors[colorIndex],
        type: 'csv_station',
        dataPoints: station.count,
        sourceFiles: Array.from(station.sourceFiles),
        timeRange: station.firstTimestamp && station.lastTimestamp ? {
          start: station.firstTimestamp,
          end: station.lastTimestamp,
          duration: station.lastTimestamp - station.firstTimestamp
        } : null,
        availableParameters: Array.from(station.parameters || []),
        dataQuality: dominantQuality,
        qualityDistribution: qualityCounts
      };
    });

    console.log(`🎯 Generated ${stationsArray.length} stations from CSV data with enhanced metadata`);
    return { success: true, error: null, stations: stationsArray };

  } catch (error) {
    console.error('❌ Error generating station data:', error);
    return { success: false, error: `Failed to process station data: ${error.message}`, stations: [] };
  }
};

/**
 * Validate oceanographic data integrity
 * @param {Array} data - CSV data to validate
 * @returns {Object} Validation report
 */
export const validateOceanographicData = (data) => {
  if (!data || data.length === 0) {
    return { isValid: false, errors: ['No data provided'], warnings: [] };
  }

  const errors = [];
  const warnings = [];
  let validRecords = 0;

  data.forEach((row, index) => {
    // Check for required fields
    if (!row.lat && !row.latitude) {
      errors.push(`Row ${index + 1}: Missing latitude`);
    }
    if (!row.lon && !row.longitude) {
      errors.push(`Row ${index + 1}: Missing longitude`);
    }
    if (!row.time) {
      warnings.push(`Row ${index + 1}: Missing timestamp`);
    }

    // Check coordinate ranges
    const lat = row.lat || row.latitude;
    const lon = row.lon || row.longitude;
    
    if (lat && (Math.abs(lat) > 90)) {
      errors.push(`Row ${index + 1}: Invalid latitude ${lat}`);
    }
    if (lon && (Math.abs(lon) > 180)) {
      errors.push(`Row ${index + 1}: Invalid longitude ${lon}`);
    }

    // Check for reasonable oceanographic values
    if (row.temp && (row.temp < -5 || row.temp > 50)) {
      warnings.push(`Row ${index + 1}: Unusual temperature ${row.temp}°F`);
    }
    if (row.salinity && (row.salinity < 0 || row.salinity > 45)) {
      warnings.push(`Row ${index + 1}: Unusual salinity ${row.salinity} PSU`);
    }

    if (lat && lon && !isNaN(lat) && !isNaN(lon)) {
      validRecords++;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalRecords: data.length,
    validRecords,
    dataQuality: validRecords / data.length
  };
};

/**
 * Export data in various formats
 * @param {Array} data - Data to export
 * @param {string} format - Export format ('csv', 'json', 'geojson')
 * @param {string} filename - Output filename
 */
export const exportData = (data, format = 'csv', filename = 'ocean_data') => {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  let content;
  let mimeType;
  let fileExtension;

  switch (format.toLowerCase()) {
    case 'csv':
      const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
      const csvRows = data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return value;
        }).join(',')
      );
      content = [headers.join(','), ...csvRows].join('\n');
      mimeType = 'text/csv';
      fileExtension = '.csv';
      break;

    case 'json':
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
      fileExtension = '.json';
      break;

    case 'geojson':
      const features = data
        .filter(row => (row.lat || row.latitude) && (row.lon || row.longitude))
        .map(row => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [row.lon || row.longitude, row.lat || row.latitude]
          },
          properties: Object.fromEntries(
            Object.entries(row).filter(([key]) => 
              key !== 'lat' && key !== 'lon' && key !== 'latitude' && key !== 'longitude'
            )
          )
        }));
      
      content = JSON.stringify({
        type: 'FeatureCollection',
        features
      }, null, 2);
      mimeType = 'application/geo+json';
      fileExtension = '.geojson';
      break;

    default:
      console.error('Unsupported export format:', format);
      return;
  }

  // Create and trigger download
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}${fileExtension}`;
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

// Default export with all functions
export default {
  loadAllCSVFiles,
  parseCSVText,
  addMetadataToRows,
  assessRowDataQuality,
  processCSVData,
  formatTimeForDisplay,
  generateStationDataFromCSV,
  validateOceanographicData,
  exportData
};