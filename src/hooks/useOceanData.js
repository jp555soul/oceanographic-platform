import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { loadAllCSVFiles, processCSVData, generateStationDataFromCSV } from '../services/dataService';

/**
 * A custom hook to manage all oceanographic data, state, and business logic.
 * It handles data loading, processing, animation, and user selections.
 * @returns {object} An object containing all the state and handler functions needed by the UI.
 */
export const useOceanData = () => {
  // --- Core Data State ---
  const [csvData, setCsvData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataSource, setDataSource] = useState('simulated');
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [generatedStationData, setGeneratedStationData] = useState([]);
  const [stationLoadError, setStationLoadError] = useState(null);

  // --- UI Control State ---
  const [selectedArea, setSelectedArea] = useState('MSP');
  const [selectedModel, setSelectedModel] = useState('NGOSF2');
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedDepth, setSelectedDepth] = useState(33);
  const [selectedParameter, setSelectedParameter] = useState('Current Speed');
  const [selectedStation, setSelectedStation] = useState(null); // Added missing state

  // --- Animation and Time State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loopMode, setLoopMode] = useState('Repeat');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [timeZone, setTimeZone] = useState('UTC');

  // --- HoloOcean POV ---
  const [holoOceanPOV, setHoloOceanPOV] = useState({ x: 0, y: 0, depth: 33 });

  // --- Environmental Data State ---
  const [envData, setEnvData] = useState({
    temperature: null,
    salinity: null,
    pressure: null,
    depth: 33
  });

  // --- Chatbot State ---
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      content: "Welcome to BlueAI! I can analyze currents, wave patterns, temperature gradients, and provide real-time insights. What would you like to explore?",
      isUser: false,
      timestamp: new Date()
    }
  ]);

  const [isTyping, setIsTyping] = useState(false);

  // --- Animation Control Ref (ADDED MISSING REF) ---
  const intervalRef = useRef(null);

  // --- Handler Functions (ADDED MISSING HANDLERS) ---
  
  // Toggle play/pause animation
  const handlePlayToggle = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  // Reset animation to first frame
  const handleReset = useCallback(() => {
    setCurrentFrame(0);
    setIsPlaying(false);
  }, []);

  // Change to specific frame
  const handleFrameChange = useCallback((frameIndex) => {
    const maxFrames = csvData.length > 0 ? csvData.length : 24;
    const validFrame = Math.max(0, Math.min(frameIndex, maxFrames - 1));
    setCurrentFrame(validFrame);
  }, [csvData.length]);

  // Refresh data (reload CSV files)
  const refreshData = useCallback(async () => {
    setDataLoaded(false);
    try {
      const { csvFiles, allData } = await loadAllCSVFiles();
      if (allData.length > 0) {
        setCsvData(allData);
        setDataSource('csv');
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setDataLoaded(true);
    }
  }, []);

  // Station analysis handler
  const handleStationAnalysis = useCallback((station) => {
    const stationData = csvData.filter(row => {
      if (!row.lat || !row.lon) return false;
      const latDiff = Math.abs(row.lat - station.coordinates[1]);
      const lngDiff = Math.abs(row.lon - station.coordinates[0]);
      return latDiff < 0.001 && lngDiff < 0.001;
    });
    
    const analysisMessage = {
      id: chatMessages.length + 1,
      content: `Station Analysis: ${station.name} contains ${stationData.length} measurements. ${
        stationData.length > 0 
          ? `Latest data shows temperature: ${stationData[stationData.length-1]?.temperature?.toFixed(2) || 'N/A'}°C, current speed: ${stationData[stationData.length-1]?.currentSpeed?.toFixed(3) || 'N/A'} m/s` 
          : 'no recent measurements available'
      }. Located at ${station.coordinates[1].toFixed(4)}°N, ${station.coordinates[0].toFixed(4)}°W.`,
      isUser: false,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, analysisMessage]);
  }, [csvData, chatMessages.length]);

  // Add a chat message (from user or AI)
  const addChatMessage = useCallback((message) => {
    setChatMessages(prev => [...prev, message]);
  }, []);

  // Clear messages
  const clearChatMessages = useCallback(() => {
    setChatMessages([]);
  }, []);

  // Effect 1: Load raw data on initial mount
  useEffect(() => {
    const loadData = async () => {
      console.log('Loading oceanographic data...');
      try {
        const { csvFiles, allData } = await loadAllCSVFiles();
        
        if (allData.length > 0) {
          console.log(`Successfully loaded ${allData.length} records from ${csvFiles.length} CSV files.`);
          setCsvData(allData);
          setDataSource('csv');

          const models = [...new Set(allData.map(row => row.model).filter(Boolean))].sort();
          setAvailableModels(models);

          if (models.length > 0) {
            const currentModelExists = models.includes(selectedModel);
            if (!currentModelExists) {
              setSelectedModel(models[0]);
              console.log(`Set initial model to: ${models[0]}`);
            }
          }

          // Extract and set available dates and times
          const dates = [...new Set(allData.map(row => row.time ? new Date(row.time).toISOString().split('T')[0] : null).filter(Boolean))].sort();
          const times = [...new Set(allData.map(row => row.time ? new Date(row.time).toTimeString().split(' ')[0].substring(0, 5) : null).filter(Boolean))].sort();
          
          setAvailableDates(dates);
          setAvailableTimes(times);
          
          if (dates.length > 0) setCurrentDate(dates[0]);
          if (times.length > 0) setCurrentTime(times[0]);

        } else {
          console.error('No CSV files found and no fallback API available.');
          setDataSource('none');
        }
      } catch (error) {
        console.error('Critical error during data loading:', error);
        setDataSource('none');
      } finally {
        setDataLoaded(true);
      }
    };
    loadData();
  }, [selectedModel]);

  // Effect 2: Process data for time series charts when raw data or filters change
  useEffect(() => {
    if (csvData.length > 0) {
      const processed = processCSVData(csvData, selectedDepth, selectedModel);
      setTimeSeriesData(processed);
    }
  }, [csvData, selectedDepth, selectedModel]);

  // Effect 3: Generate station data when raw data changes
  useEffect(() => {
    if (csvData.length > 0) {
      const result = generateStationDataFromCSV(csvData, selectedModel);
      if (result.success) {
        setGeneratedStationData(result.stations);
        setStationLoadError(null);
      } else {
        setGeneratedStationData([]);
        setStationLoadError(result.error);
      }
    }
  }, [csvData, selectedModel]);

  // Effect 4: Control animation playback (FIXED - using intervalRef)
  useEffect(() => {
    if (isPlaying && csvData.length > 0) {
      const maxFrames = csvData.length > 0 ? csvData.length : 24;
      intervalRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          const nextFrame = prev + 1;
          if (nextFrame >= maxFrames) {
            if (loopMode === 'Once') {
              setIsPlaying(false);
              return prev;
            }
            return 0; // Loop back to start
          }
          return nextFrame;
        });
      }, 1000 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, loopMode, csvData.length]);

  // Effect 5: Update environmental data and date/time when the frame changes
  useEffect(() => {
    if (timeSeriesData.length > 0) {
      const frameIndex = currentFrame % timeSeriesData.length;
      const currentDataPoint = timeSeriesData[frameIndex];
      
      if (csvData.length > 0) {
        const masterDataPoint = csvData[currentFrame % csvData.length];
        if (masterDataPoint?.time) {
          const frameDate = new Date(masterDataPoint.time);
          setCurrentDate(frameDate.toISOString().split('T')[0]);
          setCurrentTime(frameDate.toTimeString().split(' ')[0].substring(0, 5));
        }
      }

      setEnvData({
        temperature: currentDataPoint.temperature ?? null,
        salinity: currentDataPoint.salinity ?? null,
        pressure: currentDataPoint.pressure ?? null,
        depth: selectedDepth
      });
    }
  }, [currentFrame, timeSeriesData, csvData, selectedDepth]);

  // --- Time Utility ---
  const findClosestDataPoint = useCallback((targetDate, targetTime) => {
    if (csvData.length === 0) return 0;
    
    const targetDateTime = new Date(`${targetDate}T${targetTime}:00Z`);
    let closestIndex = 0;
    let minDifference = Infinity;
    
    csvData.forEach((row, index) => {
      if (row.time) {
        const rowDateTime = new Date(row.time);
        const difference = Math.abs(rowDateTime - targetDateTime);
        if (difference < minDifference) {
          minDifference = difference;
          closestIndex = index;
        }
      }
    });
    return closestIndex;
  }, [csvData]);

  const handleDateTimeChange = useCallback((newDate, newTime) => {
    if (csvData.length > 0 && newDate && newTime) {
      const closestIndex = findClosestDataPoint(newDate, newTime);
      setCurrentFrame(closestIndex);
      
      const actualData = csvData[closestIndex];
      if (actualData?.time) {
        const actualDateTime = new Date(actualData.time);
        setCurrentDate(actualDateTime.toISOString().split('T')[0]);
        setCurrentTime(actualDateTime.toTimeString().split(' ')[0].substring(0, 5));
      }
    }
  }, [csvData, findClosestDataPoint]);

  // --- Filtered CSV Data Memo ---
  const filteredCsvData = useMemo(() => {
    if (!selectedModel || availableModels.length === 0) return csvData;
    return csvData.filter(row => row.model === selectedModel);
  }, [csvData, selectedModel, availableModels]);

  // --- Station Data Memo ---
  const stationData = useMemo(() => {
    if (generatedStationData.length > 0) {
      return generatedStationData;
    }
    return [
      { name: 'USM-1 (Fallback)', coordinates: [-89.1, 30.3], color: [244, 63, 94], type: 'usm' },
      { name: 'NDBC-42012 (Fallback)', coordinates: [-88.8, 30.1], color: [251, 191, 36], type: 'ndbc' }
    ];
  }, [generatedStationData]);

  // --- Loading/Error States ---
  const isLoading = !dataLoaded;
  const hasError = dataLoaded && dataSource === 'none';
  const errorMessage = hasError ? 'No CSV files found in src/data/ directory and API endpoint unavailable.' : null;

  // --- Data Quality Metrics ---
  const dataQuality = useMemo(() => {
    if (!dataLoaded) return { status: 'loading', score: 0 };
    
    const recordCount = csvData.length;
    const stationCount = generatedStationData.length;
    
    if (recordCount === 0) return { status: 'no-data', score: 0 };
    if (recordCount < 100) return { status: 'limited', score: 25 };
    if (recordCount < 1000) return { status: 'good', score: 75 };
    return { status: 'excellent', score: 95 };
  }, [dataLoaded, csvData.length, generatedStationData.length]);

  const connectionStatus = useMemo(() => {
    return {
      mapbox: !!process.env.REACT_APP_MAPBOX_ACCESS_TOKEN,
      csv: csvData.length > 0,
      api: false // Could implement API health check
    };
  }, [csvData.length]);

  // --- Return Public API ---
  return {
    // Loading & Error States (ADDED)
    isLoading,
    hasError,
    errorMessage,
    
    // Data & Quality
    dataLoaded,
    dataSource,
    dataQuality,
    connectionStatus,
    stationData,
    timeSeriesData,
    stationLoadError,
    totalFrames: filteredCsvData.length,

    // CSV data access
    csvData: filteredCsvData,
    rawCsvData: csvData,

    // UI Control State
    selectedArea, setSelectedArea,
    selectedModel, setSelectedModel,
    availableModels,
    selectedDepth, setSelectedDepth,
    selectedParameter, setSelectedParameter,
    selectedStation, setSelectedStation, // ADDED

    // Animation
    isPlaying, setIsPlaying,
    currentFrame, setCurrentFrame,
    playbackSpeed, setPlaybackSpeed,
    loopMode, setLoopMode,

    // Time
    currentDate,
    currentTime,
    availableDates,
    availableTimes,
    timeZone, setTimeZone,
    handleDateTimeChange,

    // Environmental
    envData,
    setEnvData,

    // POV
    holoOceanPOV,
    setHoloOceanPOV,

    // Chatbot
    chatMessages,
    isTyping,
    setIsTyping,
    addChatMessage,
    clearChatMessages,

    // Action Handlers (ADDED MISSING HANDLERS)
    handlePlayToggle,
    handleReset,
    handleFrameChange,
    handleStationAnalysis,
    refreshData
  };
};