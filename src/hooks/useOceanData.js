import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [selectedDepth, setSelectedDepth] = useState(33);
  const [selectedParameter, setSelectedParameter] = useState('Current Speed');

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

  // Add a chat message (from user or AI)
  const addChatMessage = (message) => {
    setChatMessages(prev => [...prev, message]);
  };

  // Optional: clear messages
  const clearChatMessages = () => {
    setChatMessages([]);
  };

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
  }, []);

  // Effect 2: Process data for time series charts when raw data or filters change
  useEffect(() => {
    if (csvData.length > 0) {
      const processed = processCSVData(csvData, selectedDepth);
      setTimeSeriesData(processed);
    }
  }, [csvData, selectedDepth]);

  // Effect 3: Generate station data when raw data changes
  useEffect(() => {
    if (csvData.length > 0) {
      const result = generateStationDataFromCSV(csvData);
      if (result.success) {
        setGeneratedStationData(result.stations);
        setStationLoadError(null);
      } else {
        setGeneratedStationData([]);
        setStationLoadError(result.error);
      }
    }
  }, [csvData]);

  // Effect 4: Control animation playback
  useEffect(() => {
    let intervalId;
    if (isPlaying && csvData.length > 0) {
      intervalId = setInterval(() => {
        setCurrentFrame(prev => {
          const nextFrame = prev + 1;
          if (nextFrame >= csvData.length) {
            if (loopMode === 'Once') {
              setIsPlaying(false);
              return prev;
            }
            return 0;
          }
          return nextFrame;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(intervalId);
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

  // --- Return Public API ---
  return {
    // Data & Quality
    dataLoaded,
    dataSource,
    stationData,
    timeSeriesData,
    stationLoadError,
    totalFrames: csvData.length,

    // CSV data access
    csvData,

    // UI Control State
    selectedArea, setSelectedArea,
    selectedModel, setSelectedModel,
    selectedDepth, setSelectedDepth,
    selectedParameter, setSelectedParameter,

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
    clearChatMessages
  };
};
