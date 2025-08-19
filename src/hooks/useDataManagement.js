import { useState, useEffect, useCallback, useMemo } from 'react';
import { loadAllData, processAPIData, generateStationDataFromAPI } from '../services/dataService';

/**
 * Hook for managing oceanographic data loading, processing, and quality assessment
 * @param {string} selectedArea - Currently selected area for data fetching
 * @param {string} selectedModel - Currently selected model for data fetching
 * @param {string} currentDate - Currently selected date for data fetching
 * @param {string} currentTime - Currently selected time for data fetching
 * @param {number} selectedDepth - Currently selected depth for data filtering
 * @returns {object} Data management state and functions
 */
export const useDataManagement = (
  selectedArea = 'MBL',
  selectedModel = null,
  currentDate = null,
  currentTime = null,
  selectedDepth = null
) => {
  // --- Core Data State ---
  const [apiData, setApiData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataSource, setDataSource] = useState('simulated');
  const [generatedStationData, setGeneratedStationData] = useState([]);

  // --- Loading and Error State ---
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);

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
    setIsLoading(true);
    setErrorMessage(null);
    
    try {
      // Pass all relevant query parameters to the data loading service
      const queryParams = { area: selectedArea, model: selectedModel, date: currentDate, time: currentTime };
      const { allData } = await loadAllData(queryParams);
      
      if (allData.length > 0) {
        setApiData(allData);
        setDataSource('api');

        // Extract available models
        const models = [...new Set(allData.map(row => row.model).filter(Boolean))].sort();
        setAvailableModels(models);
        
        // Extract available depths
        const depths = [...new Set(allData.map(row => row.depth).filter(d => d !== null && d !== undefined))].sort((a, b) => a - b);
        setAvailableDepths(depths);

        // Extract available dates and times
        const dates = [...new Set(allData.map(row => row.time ? new Date(row.time).toISOString().split('T')[0] : null).filter(Boolean))].sort();
        const times = [...new Set(allData.map(row => row.time ? new Date(row.time).toTimeString().split(' ')[0].substring(0, 5) : null).filter(Boolean))].sort();
        
        setAvailableDates(dates);
        setAvailableTimes(times);
        
      } else {
        setErrorMessage('No data returned from the source.');
        setDataSource('none');
      }
    } catch (error) {
      console.error('Critical error during data loading:', error);
      setErrorMessage(error.message || 'An unknown error occurred.');
      setDataSource('none');
    } finally {
      setIsLoading(false);
      setDataLoaded(true);
    }
  }, [selectedArea, selectedModel, currentDate, currentTime]);

  // --- Data filtering and processing  ---
  const processedTimeSeriesData = useMemo(() => {
    if (apiData.length === 0 || selectedDepth === null) return [];
    return processAPIData(apiData, selectedDepth, maxDataPoints);
  }, [apiData, selectedDepth, maxDataPoints]);

  // --- Station data generation ---
  const processedStationData = useMemo(() => {
    if (generatedStationData.length > 0) {
      return generatedStationData;
    }
    return [
      { name: 'USM-1 (Fallback)', coordinates: [-89.1, 30.3], color: [244, 63, 94], type: 'usm' },
      { name: 'NDBC-42012 (Fallback)', coordinates: [-88.8, 30.1], color: [251, 191, 36], type: 'ndbc' }
    ];
  }, [generatedStationData]);

  // --- Currents data validation and statistics ---
  const currentsDataStats = useMemo(() => {
    if (apiData.length === 0) return { available: false, count: 0, coverage: 0 };
    
    const recordsWithDirection = apiData.filter(row => 
      row.direction !== null && row.direction !== undefined && !isNaN(row.direction)
    ).length;
    
    const recordsWithSpeed = apiData.filter(row => 
      row.speed !== null && row.speed !== undefined && !isNaN(row.speed)
    ).length;
    
    const recordsWithBothCurrents = apiData.filter(row => 
      row.direction !== null && row.direction !== undefined && !isNaN(row.direction) &&
      row.speed !== null && row.speed !== undefined && !isNaN(row.speed)
    ).length;
    
    const coverage = apiData.length > 0 ? (recordsWithBothCurrents / apiData.length * 100) : 0;
    
    return {
      available: recordsWithBothCurrents > 0,
      count: recordsWithBothCurrents,
      coverage: Math.round(coverage),
      directionRecords: recordsWithDirection,
      speedRecords: recordsWithSpeed,
      totalRecords: apiData.length
    };
  }, [apiData]);

  // --- Raw CSV data for currents layer (exposed directly) ---
  const rawCsvData = useMemo(() => {
    return apiData.map(row => ({
      ...row,
      // Ensure key currents fields are properly formatted
      lat: parseFloat(row.lat),
      lon: parseFloat(row.lon),
      direction: parseFloat(row.direction),
      speed: parseFloat(row.speed),
      nspeed: parseFloat(row.nspeed), // wind speed
      ndirection: parseFloat(row.ndirection), // wind direction
      temp: parseFloat(row.temp),
      salinity: parseFloat(row.salinity),
      depth: parseFloat(row.depth),
      ssh: parseFloat(row.ssh),
      pressure_dbars: parseFloat(row.pressure_dbars),
      sound_speed_ms: parseFloat(row.sound_speed_ms),
      time: row.time
    })).filter(row => 
      !isNaN(row.lat) && !isNaN(row.lon) // Minimum requirement for mapping
    );
  }, [apiData]);

  // --- Data quality assessment  ---
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
        depth: 0,
        currents: 0
      },
      completeness: 0
    };
    
    const recordCount = apiData.length;
    const stationCount = generatedStationData.length;
    const lastUpdate = apiData.length > 0 && apiData[apiData.length - 1]?.time 
      ? new Date(apiData[apiData.length - 1].time) 
      : null;
    
    const temporalCoverage = availableDates.length;
    const spatialCoverage = generatedStationData.length;
    const depthCoverage = availableDepths.length;
    const currentsCoverage = currentsDataStats.coverage;
    
    const completeRecords = apiData.filter(row => 
      row.lat && row.lon && row.speed !== null && row.time
    ).length;
    const completeness = recordCount > 0 ? (completeRecords / recordCount * 100) : 0;
    
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
        depth: depthCoverage,
        currents: currentsCoverage
      },
      completeness: Math.round(completeness)
    };
  }, [dataLoaded, apiData, generatedStationData, availableDates, availableDepths, currentsDataStats]);

  // --- Data statistics ---
  const dataStatistics = useMemo(() => {
    if (apiData.length === 0) return null;
    
    const measurements = apiData.filter(row => row.speed !== null && row.speed !== undefined);
    const temperatures = apiData.filter(row => row.temp !== null && row.temp !== undefined);
    const salinities = apiData.filter(row => row.salinity !== null && row.salinity !== undefined);
    const currentsData = apiData.filter(row => 
      row.direction !== null && row.direction !== undefined && 
      row.speed !== null && row.speed !== undefined
    );
    
    return {
      totalRecords: apiData.length,
      validMeasurements: measurements.length,
      temperatureReadings: temperatures.length,
      salinityReadings: salinities.length,
      currentsReadings: currentsData.length,
      dateRange: {
        start: availableDates[0] || null,
        end: availableDates[availableDates.length - 1] || null
      },
      depthRange: {
        min: Math.min(...availableDepths),
        max: Math.max(...availableDepths)
      },
      models: availableModels,
      sources: [...new Set(apiData.map(row => row._source_file).filter(Boolean))],
      currentsStats: currentsDataStats
    };
  }, [apiData, availableDates, availableDepths, availableModels, currentsDataStats]);

  // --- Data validation ---
  const validateData = useCallback(() => {
    if (apiData.length === 0) return { valid: false, errors: ['No data loaded'] };
    
    const errors = [];
    const warnings = [];
    
    const recordsWithCoords = apiData.filter(row => row.lat && row.lon).length;
    const recordsWithSpeed = apiData.filter(row => row.speed !== null && row.speed !== undefined).length;
    const recordsWithTime = apiData.filter(row => row.time).length;
    const recordsWithDirection = apiData.filter(row => row.direction !== null && row.direction !== undefined).length;
    
    if (recordsWithCoords === 0) errors.push('No valid coordinates found');
    if (recordsWithSpeed === 0) errors.push('No speed measurements found');
    if (recordsWithTime === 0) warnings.push('No timestamp data found');
    if (recordsWithDirection === 0) warnings.push('No current direction data found');
    
    if (recordsWithCoords < apiData.length * 0.8) {
      warnings.push('More than 20% of records missing coordinates');
    }
    if (recordsWithSpeed < apiData.length * 0.5) {
      warnings.push('More than 50% of records missing speed data');
    }
    if (recordsWithDirection < apiData.length * 0.5) {
      warnings.push('More than 50% of records missing direction data');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      coverage: {
        coordinates: (recordsWithCoords / apiData.length * 100).toFixed(1),
        speed: (recordsWithSpeed / apiData.length * 100).toFixed(1),
        time: (recordsWithTime / apiData.length * 100).toFixed(1),
        direction: (recordsWithDirection / apiData.length * 100).toFixed(1)
      }
    };
  }, [apiData]);

  // --- Configuration functions ---
  const updateDataProcessingOptions = useCallback((newOptions) => {
    setDataProcessingOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  const setMaxDataPointsLimit = useCallback((limit) => {
    setMaxDataPoints(limit);
  }, []);

  // --- Initial data load and model change handling ---
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // --- Update station data when raw data changes ---
  useEffect(() => {
    if (apiData.length > 0) {
      try {
        const stationResult = generateStationDataFromAPI(apiData);
        setGeneratedStationData(stationResult);
      } catch (error) {
        console.error('Error generating station data:', error);
        setErrorMessage(prev => prev || error.message);
        setGeneratedStationData([]);
      }
    }
  }, [apiData]);

  // --- Return public API ---
  return {
    // Core data
    apiData: apiData,
    rawApiData: apiData,
    rawCsvData: rawCsvData, // Properly formatted for currents layer
    timeSeriesData: processedTimeSeriesData,
    stationData: processedStationData,
    
    // Loading states
    dataLoaded,
    dataSource,
    isLoading,
    hasError: !!errorMessage,
    errorMessage,
    
    // Configuration options
    availableModels,
    availableDepths,
    availableDates,
    availableTimes,
    
    // Data quality and metrics
    dataQuality,
    dataStatistics,
    currentsDataStats,
    
    // Processing configuration
    maxDataPoints,
    dataProcessingOptions,
    
    // Functions
    refreshData,
    validateData,
    updateDataProcessingOptions,
    setMaxDataPointsLimit,
    
    // Computed values
    totalFrames: apiData.length,
    csvData: rawCsvData // Alias for backward compatibility
  };
};