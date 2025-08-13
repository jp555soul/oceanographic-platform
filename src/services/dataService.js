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
    console.log('Attempting to fetch CSV manifest from /csv-manifest.json...');
    const manifestResponse = await fetch('/csv-manifest.json');
    if (manifestResponse.ok) {
      const manifest = await manifestResponse.json();
      console.log('Successfully found CSV manifest:', manifest);

      // Sort files numerically
      const sortedFiles = manifest.files.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0], 10);
        const numB = parseInt(b.match(/\d+/)[0], 10);
        return numA - numB;
      });

      console.log('Sorted files for loading:', sortedFiles);

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
            console.log(`✅ Successfully loaded and processed ${filename} with ${dataWithMetadata.length} rows`);
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
 * @returns {Array} An array of processed data points for visualization.
 */
export const processCSVData = (csvData, selectedDepth = 0) => {
    if (!csvData || csvData.length === 0) {
      console.log('No CSV data to process');
      return [];
    }

    console.log('Processing CSV data:', {
      totalRows: csvData.length,
      selectedDepth,
      sampleRow: csvData[0],
      availableColumns: Object.keys(csvData[0] || {})
    });

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
  
    console.log(`Processed data: ${filteredData.length} valid rows out of ${csvData.length} total (skipped ${csvData.length - filteredData.length} null/empty rows)`);

    // Sort by time if available
    filteredData.sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return new Date(a.time) - new Date(b.time);
    });
  
    // Take last 48 data points for time series
    const recentData = filteredData.slice(-48);
    console.log(`Using ${recentData.length} recent data points for time series`);
  
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

  const stations = new Map();
  csvData.forEach(row => {
    if (row.lat && row.lon) {
      // Round coordinates to group nearby points into a single station
      const key = `${row.lat.toFixed(3)},${row.lon.toFixed(3)}`;
      if (!stations.has(key)) {
        stations.set(key, {
          name: `Station at ${row.lat.toFixed(2)}, ${row.lon.toFixed(2)}`,
          coordinates: [row.lon, row.lat],
          type: 'csv_station',
          color: [Math.random() * 255, Math.random() * 255, Math.random() * 255],
          dataPoints: 0,
          sourceFiles: new Set()
        });
      }
      const station = stations.get(key);
      station.dataPoints++;
      if (row._source_file) {
        station.sourceFiles.add(row._source_file);
      }
    }
  });

  return Array.from(stations.values()).map(station => ({...station, sourceFiles: Array.from(station.sourceFiles)}));
};

export default {
    loadAllCSVFiles,
    parseCSVText,
    processCSVData,
    formatTimeForDisplay,
    generateStationDataFromCSV
};