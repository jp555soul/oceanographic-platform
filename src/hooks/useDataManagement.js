import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadAllCSVFiles, processCSVData, generateStationDataFromCSV } from '../services/dataService';

/**
 * Hook for managing oceanographic data loading, processing, and quality assessment
 * @param {number} selectedDepth - Currently selected depth for data filtering
 * @param {string} selectedModel - Currently selected model for data filtering
 * @returns {object} Data management state and functions
 */
export const useDataManagement = (selectedDepth = null, selectedModel = 'NGOSF2') => {
  // --- Core Data State ---
  const [csvData, setCsvData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataSource, setDataSource] = useState('simulated');
  const [stationLoadError, setStationLoadError] = useState(null);
  const [generatedStationData, setGeneratedStationData] = useState([]);

  // --- Data Configuration State ---
  const [availableModels, setAvailableModels] = useState([]);
  const [availableDepths, setAvailableDepths] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);

  // --- Data Processing Settings ---
  const [maxDataPoints, setMaxDataPoints] = useState(null); // null = unlimited
  const [dataProcessingOptions, setDataProcessingOptions] = useState({
    filterByDepth: true,
    sortByTime: true,
    skipNullValues: true
  });

  // --- Load and refresh data ---
  const refreshData = useCallback(async () => {
    setDataLoaded(false);
    setStationLoadError(null);
    
    try {
      const { csvFiles, allData } = await loadAllCSVFiles();
      
      if (allData.length > 0) {
        setCsvData(allData);
        setDataSource('csv');

        // Extract available models
        const models = [...new Set(allData.map(row => row.model).filter(Boolean))].sort();
        setAvailableModels(models);
        
        console.log('Available models in data:', models); // Debug log

        // Extract available depths
        const depths = [...new Set(allData.map(row => row.depth).filter(d => d !== null && d !== undefined))].sort((a, b) => a - b);
        setAvailableDepths(depths);

        // Extract available dates and times
        const dates = [...new Set(allData.map(row => row.time ? new Date(row.time).toISOString().split('T')[0] : null).filter(Boolean))].sort();
        const times = [...new Set(allData.map(row => row.time ? new Date(row.time).toTimeString().split(' ')[0].substring(0, 5) : null).filter(Boolean))].sort();
        
        setAvailableDates(dates);
        setAvailableTimes(times);

        console.log(`Data loaded: ${allData.length} records, ${models.length} models, ${depths.length} depth levels`);
        
      } else {
        console.error('No CSV files found and no fallback API available.');
        setDataSource('none');
      }
    } catch (error) {
      console.error('Critical error during data loading:', error);
      setDataSource('none');
      setStationLoadError(error.message);
    } finally {
      setDataLoaded(true);
    }
  }, []);

  // --- Data filtering and processing (FIXED: More flexible model matching) ---
  const filteredCsvData = useMemo(() => {
    // If no models available yet, return all data
    if (availableModels.length === 0) return csvData;
    
    // If no model selected, use first available model
    if (!selectedModel) return csvData;
    
    // Try exact match first
    let filtered = csvData.filter(row => row.model === selectedModel);
    
    // If no exact match, try partial match (e.g., 'NGOSF2' matches 'MSR_NGOSF2')
    if (filtered.length === 0) {
      filtered = csvData.filter(row => 
        row.model && (
          row.model.includes(selectedModel) || 
          selectedModel.includes(row.model)
        )
      );
    }
    
    // If still no match, return all data (don't filter out everything)
    return filtered.length > 0 ? filtered : csvData;
  }, [csvData, selectedModel, availableModels]);

  // FIXED: Use filtered data and proper dependencies
  const processedTimeSeriesData = useMemo(() => {
    if (filteredCsvData.length === 0 || selectedDepth === null) return [];
    
    return processCSVData(filteredCsvData, selectedDepth, maxDataPoints);
  }, [filteredCsvData, selectedDepth, maxDataPoints]);

  // --- Station data generation (FIXED: Proper dependency) ---
  const processedStationData = useMemo(() => {
    if (generatedStationData.length > 0) {
      return generatedStationData;
    }
    return [
      { name: 'USM-1 (Fallback)', coordinates: [-89.1, 30.3], color: [244, 63, 94], type: 'usm' },
      { name: 'NDBC-42012 (Fallback)', coordinates: [-88.8, 30.1], color: [251, 191, 36], type: 'ndbc' }
    ];
  }, [generatedStationData]);

  // --- Data quality assessment (FIXED: Use actual data, not lengths) ---
  const dataQuality = useMemo(() => {
    if (!dataLoaded) return { 
      status: 'loading', 
      score: 0,
      stations: 0,
      measurements: 0,
      lastUpdate: null,
      coverage: {
        temporal: 0,
        spatial: 0,
        depth: 0
      },
      completeness: 0
    };
    
    const recordCount = csvData.length;
    const stationCount = generatedStationData.length;
    const lastUpdate = csvData.length > 0 && csvData[csvData.length - 1]?.time 
      ? new Date(csvData[csvData.length - 1].time) 
      : null;
    
    // Calculate coverage metrics
    const temporalCoverage = availableDates.length;
    const spatialCoverage = generatedStationData.length;
    const depthCoverage = availableDepths.length;
    
    // Calculate completeness (percentage of records with all key fields)
    const completeRecords = csvData.filter(row => 
      row.lat && row.lon && row.speed !== null && row.time
    ).length;
    const completeness = recordCount > 0 ? (completeRecords / recordCount * 100) : 0;
    
    // Determine overall quality status and score
    let status, score;
    if (recordCount === 0) {
      status = 'no-data';
      score = 0;
    } else if (recordCount < 100 || completeness < 50) {
      status = 'limited';
      score = 25;
    } else if (recordCount < 1000 || completeness < 80) {
      status = 'good';
      score = 75;
    } else {
      status = 'excellent';
      score = 95;
    }
    
    return { 
      status, 
      score, 
      stations: stationCount, 
      measurements: recordCount, 
      lastUpdate,
      coverage: {
        temporal: temporalCoverage,
        spatial: spatialCoverage,
        depth: depthCoverage
      },
      completeness: Math.round(completeness)
    };
  }, [dataLoaded, csvData, generatedStationData, availableDates, availableDepths]);

  // --- Data statistics (FIXED: Use actual arrays, not lengths) ---
  const dataStatistics = useMemo(() => {
    if (csvData.length === 0) return null;
    
    const measurements = csvData.filter(row => row.speed !== null && row.speed !== undefined);
    const temperatures = csvData.filter(row => row.temp !== null && row.temp !== undefined);
    const salinities = csvData.filter(row => row.salinity !== null && row.salinity !== undefined);
    
    return {
      totalRecords: csvData.length,
      validMeasurements: measurements.length,
      temperatureReadings: temperatures.length,
      salinityReadings: salinities.length,
      dateRange: {
        start: availableDates[0] || null,
        end: availableDates[availableDates.length - 1] || null
      },
      depthRange: {
        min: Math.min(...availableDepths),
        max: Math.max(...availableDepths)
      },
      models: availableModels,
      sources: [...new Set(csvData.map(row => row._source_file).filter(Boolean))]
    };
  }, [csvData, availableDates, availableDepths, availableModels]);

  // --- Data validation ---
  const validateData = useCallback(() => {
    if (csvData.length === 0) return { valid: false, errors: ['No data loaded'] };
    
    const errors = [];
    const warnings = [];
    
    // Check for required fields
    const recordsWithCoords = csvData.filter(row => row.lat && row.lon).length;
    const recordsWithSpeed = csvData.filter(row => row.speed !== null && row.speed !== undefined).length;
    const recordsWithTime = csvData.filter(row => row.time).length;
    
    if (recordsWithCoords === 0) errors.push('No valid coordinates found');
    if (recordsWithSpeed === 0) errors.push('No speed measurements found');
    if (recordsWithTime === 0) warnings.push('No timestamp data found');
    
    // Check data consistency
    if (recordsWithCoords < csvData.length * 0.8) {
      warnings.push('More than 20% of records missing coordinates');
    }
    if (recordsWithSpeed < csvData.length * 0.5) {
      warnings.push('More than 50% of records missing speed data');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      coverage: {
        coordinates: (recordsWithCoords / csvData.length * 100).toFixed(1),
        speed: (recordsWithSpeed / csvData.length * 100).toFixed(1),
        time: (recordsWithTime / csvData.length * 100).toFixed(1)
      }
    };
  }, [csvData]);

  // --- Configuration functions ---
  const updateDataProcessingOptions = useCallback((newOptions) => {
    setDataProcessingOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  const setMaxDataPointsLimit = useCallback((limit) => {
    setMaxDataPoints(limit);
  }, []);

  // --- Initial data load ---
  useEffect(() => {
    refreshData();
  }, []); // Keep empty dependency array for initial load only

  // --- Update processed data when selections change (FIXED: Use proper dependency) ---
  useEffect(() => {
    if (csvData.length > 0) {
      try {
        const stationResult = generateStationDataFromCSV(csvData);
        setGeneratedStationData(stationResult);
        setStationLoadError(null);
      } catch (error) {
        console.error('Error generating station data:', error);
        setStationLoadError(error.message);
        setGeneratedStationData([]);
      }
    }
  }, [csvData]); // Use full csvData array instead of just length

  // --- Return public API ---
  return {
    // Core data - return computed values directly
    csvData: filteredCsvData,
    rawCsvData: csvData,
    timeSeriesData: processedTimeSeriesData,
    stationData: processedStationData,
    
    // Loading states
    dataLoaded,
    dataSource,
    stationLoadError,
    
    // Configuration options
    availableModels,
    availableDepths,
    availableDates,
    availableTimes,
    
    // Data quality and metrics
    dataQuality,
    dataStatistics,
    
    // Processing configuration
    maxDataPoints,
    dataProcessingOptions,
    
    // Functions
    refreshData,
    validateData,
    updateDataProcessingOptions,
    setMaxDataPointsLimit,
    
    // Computed values
    totalFrames: filteredCsvData.length,
    isLoading: !dataLoaded,
    hasError: dataLoaded && dataSource === 'none',
    errorMessage: dataLoaded && dataSource === 'none' ? 'No CSV files found in public/data/ directory.' : null
  };
};