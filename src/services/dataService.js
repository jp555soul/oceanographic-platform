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
          console.error(`❌ Error loading or processing ${filename}:`, fileError);
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
      
      // Filter by depth if available (within ±5ft of selected depth for consistency)
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
      // Debug the raw row values
      // if (index < 3) {
      //   console.log(`Raw row ${index}:`, {
      //     speed: row.speed,
      //     sound_speed: row.sound_speed_ms,
      //     temp: row.temp,
      //     salinity: row.salinity,
      //     pressure_dbars: row.pressure_dbars,
      //     direction: row.direction
      //   });
      // }

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

    // console.log('Final processed data summary:', {
    //   count: processedData.length,
    //   firstItem: processedData[0],
    //   lastItem: processedData[processedData.length - 1],
    //   speedRange: processedData.length > 0 ? {
    //     min: Math.min(...processedData.map(d => d.currentSpeed)),
    //     max: Math.max(...processedData.map(d => d.currentSpeed))
    //   } : null
    // });

    return processedData;
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
 * Generates station locations from the raw CSV data by grouping nearby coordinates.
 * @param {Array} csvData - The raw data from PapaParse.
 * @returns {Array} An array of station objects.
 */
export const generateStationDataFromCSV = (csvData) => {
  if (!csvData || csvData.length === 0) {
    return [];
  }

  // // FIRST: Check what coordinates we actually have
  // console.log('🔍 DEBUGGING COORDINATES - First 10 rows:');
  // csvData.slice(0, 10).forEach((row, i) => {
  //   if (row.lat && row.lon) {
  //     console.log(`Row ${i}: lat=${row.lat} (${typeof row.lat}), lon=${row.lon} (${typeof row.lon})`);
  //   }
  // });

  // console.log('Generating stations from CSV data:', {
  //   totalRows: csvData.length,
  //   sampleCoordinates: csvData.slice(0, 5).map(row => ({ lat: row.lat, lon: row.lon })),
  //   coordinateRanges: {
  //     latRange: [
  //       Math.min(...csvData.filter(r => r.lat).map(r => r.lat)),
  //       Math.max(...csvData.filter(r => r.lat).map(r => r.lat))
  //     ],
  //     lonRange: [
  //       Math.min(...csvData.filter(r => r.lon).map(r => r.lon)),
  //       Math.max(...csvData.filter(r => r.lon).map(r => r.lon))
  //     ]
  //   }
  // });

  const stations = new Map();
  
  csvData.forEach((row, index) => {
    if (row.lat && row.lon && !isNaN(row.lat) && !isNaN(row.lon)) {
      // Add this to your generateStationDataFromCSV function, replace the precision line:

      // PRECISION OPTIONS - Choose based on your needs:
      // const precision = 4; // HIGH: ~10m grouping - Individual measurement points (25,000+ stations)
      // const precision = 3; // MEDIUM-HIGH: ~100m grouping - Very detailed (2,500+ stations)  
      // const precision = 2; // MEDIUM: ~1km grouping - Detailed but manageable (250+ stations)
      // const precision = 1; // LOW: ~10km grouping - Regional overview (25+ stations)

      const precision = 1; // Using high precision with small icons

      const key = `${row.lat.toFixed(precision)},${row.lon.toFixed(precision)}`;
      
      if (!stations.has(key)) {
        // Use the exact coordinates from the first occurrence, not rounded
        stations.set(key, {
          name: `Station at ${row.lat.toFixed(4)}, ${row.lon.toFixed(4)}`,
          coordinates: [row.lon, row.lat], // [longitude, latitude] for Deck.gl
          exactLat: row.lat, // Store exact coordinates for debugging
          exactLon: row.lon,
          type: 'csv_station',
          color: [Math.random() * 255, Math.random() * 255, Math.random() * 255],
          dataPoints: 0,
          sourceFiles: new Set(),
          allDataPoints: [] // Store all data points for this station
        });
      }
      
      const station = stations.get(key);
      station.dataPoints++;
      
      if (row._source_file) {
        station.sourceFiles.add(row._source_file);
      }
      
      // Store the actual data point for analysis
      station.allDataPoints.push({
        ...row,
        rowIndex: index
      });
    } else {
      // Log invalid coordinates for debugging
      if (index < 10) { // Only log first 10 to avoid spam
        console.warn(`Invalid coordinates at row ${index}:`, { lat: row.lat, lon: row.lon });
      }
    }
  });

  const stationArray = Array.from(stations.values()).map(station => ({
    ...station, 
    sourceFiles: Array.from(station.sourceFiles)
  }));

  return stationArray;
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
    formatTimeForDisplay,
    generateStationDataFromCSV,
    generateStationDataFromCSVNoGrouping,
    validateCoordinateData
};