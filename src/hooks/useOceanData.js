import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { loadAllCSVFiles, processCSVData, generateStationDataFromCSV } from '../services/dataService';

/**
 * A custom hook to manage all oceanographic data, state, and business logic.
 * It handles data loading, processing, animation, and user selections.
 * @returns {object} An object containing all the state and handler functions needed by the UI.
 */
export const useOceanData = () => {
  const MAX_PLAYBACK_SPEED = 20;
  const MIN_PLAYBACK_SPEED = 0.1;
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
  const [selectedDepth, setSelectedDepth] = useState(null); // Initialize as null
  const [availableDepths, setAvailableDepths] = useState([]);
  const [selectedParameter, setSelectedParameter] = useState('Current Speed');
  const [selectedStation, setSelectedStation] = useState(null);

  // --- Animation and Time State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeedInternal] = useState(1);
  const [loopMode, setLoopMode] = useState('Repeat');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [timeZone, setTimeZone] = useState('UTC');

  // --- HoloOcean POV ---
  const [holoOceanPOV, setHoloOceanPOV] = useState({ x: 0, y: 0, depth: 0 });

  // --- Environmental Data State ---
  const [envData, setEnvData] = useState({
    temperature: null,
    salinity: null,
    pressure: null,
    depth: 0
  });

  // --- Chatbot State ---
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      content: "Welcome to BlueAI! I can analyze currents, wave patterns, temperature gradients, sound speed variations, and provide real-time insights. What would you like to explore?",
      isUser: false,
      timestamp: new Date()
    }
  ]);

  const [isTyping, setIsTyping] = useState(false);

  // --- Animation Control Ref ---
  const intervalRef = useRef(null);

  // --- Handler Functions ---
  const handlePlayToggle = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setCurrentFrame(0);
    setIsPlaying(false);
  }, []);

  const handleFrameChange = useCallback((frameIndex) => {
    const maxFrames = csvData.length > 0 ? csvData.length : 24;
    const validFrame = Math.max(0, Math.min(frameIndex, maxFrames - 1));
    setCurrentFrame(validFrame);
  }, [csvData.length]);

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

  const setPlaybackSpeed = useCallback((speed) => {
    const clampedSpeed = Math.max(MIN_PLAYBACK_SPEED, Math.min(MAX_PLAYBACK_SPEED, speed));
    setPlaybackSpeedInternal(clampedSpeed);
  }, []);

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
          ? `Latest data shows temperature: ${stationData[stationData.length-1]?.temperature || 'N/A'}°F, current speed: ${stationData[stationData.length-1]?.currentSpeed || 'N/A'} m/s, sound speed: ${stationData[stationData.length-1]?.sound_speed_ms || 'N/A'} m/s` 
          : 'no recent measurements available'
      }. Located at ${station.coordinates[1]}, ${station.coordinates[0]}`,
      isUser: false,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, analysisMessage]);
  }, [csvData, chatMessages.length]);

  const addChatMessage = useCallback((message) => {
    setChatMessages(prev => [...prev, message]);
  }, []);

  const clearChatMessages = useCallback(() => {
    setChatMessages([]);
  }, []);

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
  const errorMessage = hasError ? 'No CSV files found in public/data/ directory and API endpoint unavailable.' : null;

  // --- Data Quality Metrics ---
  const dataQuality = useMemo(() => {
    if (!dataLoaded) return { 
      status: 'loading', 
      score: 0,
      stations: 0,
      measurements: 0,
      lastUpdate: null
    };
    
    const recordCount = csvData.length;
    const stationCount = generatedStationData.length;
    const lastUpdate = csvData.length > 0 && csvData[csvData.length - 1]?.time 
      ? new Date(csvData[csvData.length - 1].time) 
      : null;
    
    if (recordCount === 0) {
      return { 
        status: 'no-data', 
        score: 0, 
        stations: stationCount, 
        measurements: recordCount, 
        lastUpdate 
      };
    }
    
    let status, score;
    if (recordCount < 100) {
      status = 'limited';
      score = 25;
    } else if (recordCount < 1000) {
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
      lastUpdate 
    };
  }, [dataLoaded, csvData.length, generatedStationData.length, csvData]);

  // --- Connection Status ---
  const connectionStatus = useMemo(() => {
    if (!dataLoaded) return 'connecting';
    
    const hasMapbox = !!process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
    const hasData = csvData.length > 0;
    
    if (hasData && hasMapbox) return 'connected';
    if (hasData || hasMapbox) return 'connected';
    return 'disconnected';
  }, [dataLoaded, csvData.length]);

  // --- Detailed Connection Info ---
  const connectionDetails = useMemo(() => {
    return {
      mapbox: !!process.env.REACT_APP_MAPBOX_ACCESS_TOKEN,
      csv: csvData.length > 0,
      api: false
    };
  }, [csvData.length]);

  // Load raw data on initial mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const { csvFiles, allData } = await loadAllCSVFiles();
        
        if (allData.length > 0) {

          setCsvData(allData);
          setDataSource('csv');

          const models = [...new Set(allData.map(row => row.model).filter(Boolean))].sort();
          setAvailableModels(models);

          // Only set selectedModel if it's not already valid
          if (models.length > 0 && !models.includes(selectedModel)) {
            setSelectedModel(models[0]);
          }

          const depths = [...new Set(allData.map(row => row.depth).filter(d => d !== null && d !== undefined))].sort((a, b) => a - b);
          
          if (depths.length > 0) {
            setAvailableDepths(depths);
            setSelectedDepth(prev => {
                if (prev === null || !depths.includes(prev)) {
                    return depths[0];
                }
                return prev;
            });
          }

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
  }, []); // Removed selectedModel from dependencies to prevent unnecessary reloads

  // Generate station data when raw data changes
  useEffect(() => {
    if (csvData.length > 0 && selectedDepth !== null) {
      const stationResult = generateStationDataFromCSV(csvData);
      setGeneratedStationData(stationResult);
      
      // UPDATED: Pass null as third parameter to remove the 48-point limit
      const processed = processCSVData(csvData, selectedDepth, null);
      setTimeSeriesData(processed);
    }
  }, [csvData, selectedDepth, selectedModel]);

  // Control animation playback
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
            return 0;
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

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, loopMode, csvData.length]);

  // Option 2: Update environmental data using raw csvData 
  useEffect(() => {
    if (csvData.length > 0 && currentFrame < csvData.length) {
      const currentDataPoint = csvData[currentFrame];
      
      if (currentDataPoint) {
        setEnvData({
          temperature: currentDataPoint.temp ?? currentDataPoint.temperature ?? null,
          salinity: currentDataPoint.salinity ?? null,
          pressure: currentDataPoint.pressure_dbars ?? currentDataPoint.pressure ?? null,
          depth: currentDataPoint.depth ?? selectedDepth 
        });
      }
    }
  }, [currentFrame, csvData, selectedDepth]);

  // Update HoloOcean POV when depth changes
  useEffect(() => {
    setHoloOceanPOV(prev => ({
      ...prev,
      depth: selectedDepth
    }));
  }, [selectedDepth]);

  // --- Return Public API ---
  return {
    isLoading,
    hasError,
    errorMessage,
    dataLoaded,
    dataSource,
    dataQuality,
    connectionStatus, 
    connectionDetails,
    stationData,
    timeSeriesData,
    stationLoadError,
    totalFrames: filteredCsvData.length,
    csvData: filteredCsvData,
    rawCsvData: csvData,
    selectedArea, setSelectedArea,
    selectedModel, setSelectedModel,
    availableModels,
    selectedDepth, setSelectedDepth,
    availableDepths,
    selectedParameter, setSelectedParameter,
    selectedStation, setSelectedStation,
    isPlaying, setIsPlaying,
    currentFrame, setCurrentFrame,
    playbackSpeed, setPlaybackSpeed,
    loopMode, setLoopMode,
    currentDate,
    currentTime,
    availableDates,
    availableTimes,
    timeZone, setTimeZone,
    handleDateTimeChange,
    envData,
    setEnvData,
    holoOceanPOV,
    setHoloOceanPOV,
    chatMessages,
    isTyping,
    setIsTyping,
    addChatMessage,
    clearChatMessages,
    handlePlayToggle,
    handleReset,
    handleFrameChange,
    handleStationAnalysis,
    refreshData
  };
};