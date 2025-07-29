import React, { useState, useEffect, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts';
import { Play, Pause, RotateCcw, Settings, MessageCircle, X, Send, MapPin, Waves, Navigation, Activity, Thermometer, Droplets, Compass, Clock, Zap, TrendingUp, Filter, Download, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

const OceanographicPlatform = () => {
  // State Management
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loopMode, setLoopMode] = useState('Repeat');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      content: "Welcome to BlueAI! I'm your advanced oceanographic assistant. I can analyze currents, wave patterns, temperature gradients, and provide real-time insights. What would you like to explore?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedArea, setSelectedArea] = useState('USM_HYCOM');
  const [selectedModel, setSelectedModel] = useState('USM');
  const [selectedDepth, setSelectedDepth] = useState(33);
  const [selectedParameter, setSelectedParameter] = useState('Current Speed');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [timeZone, setTimeZone] = useState('UTC');
  const [holoOceanPOV, setHoloOceanPOV] = useState({ x: 0, y: 0, depth: 33 });
  const [envData, setEnvData] = useState({
    temperature: null,
    salinity: null,
    pressure: null,
    depth: 33
  });

  // CSV Data Management
  const [csvData, setCsvData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataSource, setDataSource] = useState('simulated');
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);

  const intervalRef = useRef(null);
  const chatEndRef = useRef(null);

  // Function to load CSV files - works with any CSV files
  const loadAllCSVFiles = async () => {
    const csvFiles = [];
    const allData = [];

    try {
      // Method 1: Try webpack's require.context (works in development)
      try {
        const csvContext = require.context('./data', false, /\.csv$/);
        const csvFilenames = csvContext.keys();

        console.log('Found CSV files via require.context:', csvFilenames);

        if (csvFilenames.length > 0) {
          for (const filename of csvFilenames) {
            try {
              const csvModule = csvContext(filename);
              const response = await fetch(csvModule.default || csvModule);
              const csvText = await response.text();

              const parseResult = await new Promise((resolve, reject) => {
                Papa.parse(csvText, {
                  header: true,
                  dynamicTyping: true,
                  skipEmptyLines: true,
                  complete: resolve,
                  error: reject
                });
              });

              const dataWithMetadata = parseResult.data.map(row => ({
                ...row,
                _source_file: filename.replace('./', ''),
                _loaded_at: new Date().toISOString()
              }));

              csvFiles.push({
                filename: filename.replace('./', ''),
                rowCount: dataWithMetadata.length,
                columns: parseResult.meta.fields || []
              });

              allData.push(...dataWithMetadata);

            } catch (fileError) {
              console.error(`Error loading ${filename}:`, fileError);
            }
          }

          if (allData.length > 0) {
            return { csvFiles, allData };
          }
        }
      } catch (contextError) {
        console.log('require.context failed:', contextError.message);
      }

      // Method 2: Try to fetch a manifest file that lists available CSV files
      try {
        console.log('Trying to fetch CSV manifest...');
        const manifestResponse = await fetch('/csv-manifest.json');
        if (manifestResponse.ok) {
          const manifest = await manifestResponse.json();
          console.log('Found CSV manifest:', manifest);

          for (const filename of manifest.files) {
            try {
              const response = await fetch(`/data/${filename}`);
              if (response.ok) {
                const csvText = await response.text();

                const parseResult = await new Promise((resolve, reject) => {
                  Papa.parse(csvText, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: resolve,
                    error: reject
                  });
                });

                const dataWithMetadata = parseResult.data.map(row => ({
                  ...row,
                  _source_file: filename,
                  _loaded_at: new Date().toISOString()
                }));

                csvFiles.push({
                  filename: filename,
                  rowCount: dataWithMetadata.length,
                  columns: parseResult.meta.fields || []
                });

                allData.push(...dataWithMetadata);
                console.log(`Loaded ${filename} with ${dataWithMetadata.length} rows`);
              }
            } catch (fileError) {
              console.error(`Error loading ${filename}:`, fileError);
            }
          }

          if (allData.length > 0) {
            return { csvFiles, allData };
          }
        }
      } catch (manifestError) {
        console.log('CSV manifest not found');
      }

      return { csvFiles: [], allData: [] };

    } catch (error) {
      console.error('All CSV loading methods failed:', error);
      return { csvFiles: [], allData: [] };
    }
  };

  // Generate realistic oceanographic data (fallback)
  const generateSimulatedData = useCallback(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 47; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 1800000); // 30-minute intervals
      const timeStr = time.toISOString().split('T')[1].split(':').slice(0, 2).join(':');
      
      // Complex oceanographic patterns
      const tidePhase = Math.sin(i * 0.26) * 1.2; // Semi-diurnal tide
      const windEffect = Math.sin(i * 0.1) * 0.8 + Math.random() * 0.3;
      const thermoclineEffect = Math.cos(i * 0.05) * 0.5;
      
      data.push({
        time: timeStr,
        heading: 45 + tidePhase * 25 + windEffect * 15 + (Math.random() - 0.5) * 10,
        currentSpeed: Math.abs(0.5 + tidePhase * 0.3 + windEffect * 0.2 + (Math.random() - 0.5) * 0.1),
        waveHeight: Math.abs(1.2 + windEffect * 0.8 + (Math.random() - 0.5) * 0.4),
        wavePeriod: 6 + windEffect * 2 + (Math.random() - 0.5) * 1,
        temperature: 23.5 + thermoclineEffect + (Math.random() - 0.5) * 0.8,
        salinity: 35.2 + (Math.random() - 0.5) * 0.6,
        pressure: 105.7 + (selectedDepth - 33) * 0.1 + (Math.random() - 0.5) * 0.3,
        windSpeed: Math.abs(8 + windEffect * 5 + (Math.random() - 0.5) * 2),
        windDirection: 180 + windEffect * 30 + (Math.random() - 0.5) * 20
      });
    }
    
    return data;
  }, [selectedDepth]);

  // Find closest data point to selected date/time
  const findClosestDataPoint = useCallback((targetDate, targetTime) => {
    if (csvData.length === 0) return 0;
    
    const targetDateTime = new Date(`${targetDate}T${targetTime}:00`);
    let closestIndex = 0;
    let minDifference = Math.abs(new Date(csvData[0].time) - targetDateTime);
    
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

  // Handle date/time changes
  const handleDateTimeChange = useCallback((newDate, newTime) => {
    if (csvData.length > 0 && newDate && newTime) {
      const closestIndex = findClosestDataPoint(newDate, newTime);
      setCurrentFrame(closestIndex); // Use actual index, not modulo 24
      
      // Update to actual date/time from CSV
      const actualData = csvData[closestIndex];
      if (actualData?.time) {
        const actualDateTime = new Date(actualData.time);
        setCurrentDate(actualDateTime.toISOString().split('T')[0]);
        setCurrentTime(actualDateTime.toTimeString().split(' ')[0].substring(0, 5));
      }
    }
  }, [csvData, findClosestDataPoint]);
  const processCSVData = useCallback(() => {
    if (csvData.length === 0) return [];
    
    // Group data by source file if needed
    const fileGroups = csvData.reduce((groups, row) => {
      const file = row._source_file || 'unknown';
      if (!groups[file]) groups[file] = [];
      groups[file].push(row);
      return groups;
    }, {});

    console.log('Data sources:', Object.keys(fileGroups));
    
    // Filter data based on current parameters
    let filteredData = csvData.filter(row => {
      // Filter by depth if available (within ±10ft of selected depth)
      if (row.depth && selectedDepth) {
        const depthDiff = Math.abs(row.depth - selectedDepth);
        return depthDiff <= 10;
      }
      return true;
    });

    // Take last 48 data points for time series
    const recentData = filteredData.slice(-48);
    
    return recentData.map(row => ({
      time: new Date(row.time).toISOString().split('T')[1].split(':').slice(0, 2).join(':'),
      heading: row.currentdirection || 0,
      currentSpeed: row.currentspeed || 0,
      waveHeight: row.significantwaveheight || 0,
      wavePeriod: row.primarywaveperiod || 0,
      temperature: row.temperature || 23.5,
      salinity: row.salinity || 35.2,
      pressure: row.pressure_dbars || 105.7,
      windSpeed: row.windspeed || 0,
      windDirection: row.winddirection || 0,
      latitude: row.latitude,
      longitude: row.longitude,
      surfaceHeight: row.surfaceheight || 0,
      swellHeight: row.swellheight || 0,
      soundSpeed: row.sound_speed_ms || 1500,
      sourceFile: row._source_file
    }));
  }, [csvData, selectedDepth]);

  const [timeSeriesData, setTimeSeriesData] = useState([]);

  // Load CSV data on component mount
  useEffect(() => {
    const loadData = async () => {
      if (process.env.NODE_ENV === 'development') {
        try {
          console.log('Loading CSV files from src/data...');
          const { csvFiles, allData } = await loadAllCSVFiles();
          
          if (allData.length > 0) {
            console.log(`Loaded ${csvFiles.length} CSV files with ${allData.length} total records:`);
            csvFiles.forEach(file => {
              console.log(`- ${file.filename}: ${file.rowCount} rows, columns: [${file.columns.join(', ')}]`);
            });

            setCsvData(allData);
            setDataSource('csv');
            
            // Extract available dates and times from CSV data
            const dates = [...new Set(allData.map(row => {
              if (row.time) {
                return new Date(row.time).toISOString().split('T')[0];
              }
              return null;
            }).filter(Boolean))].sort();
            
            const times = [...new Set(allData.map(row => {
              if (row.time) {
                return new Date(row.time).toTimeString().split(' ')[0].substring(0, 5);
              }
              return null;
            }).filter(Boolean))].sort();
            
            setAvailableDates(dates);
            setAvailableTimes(times);
            
            // Set initial date/time to first available
            if (dates.length > 0 && times.length > 0) {
              setCurrentDate(dates[0]);
              setCurrentTime(times[0]);
            }
            
            setDataLoaded(true);
          } else {
            console.log('No CSV files found, using simulated data');
            setTimeSeriesData(generateSimulatedData());
            setDataSource('simulated');
            setDataLoaded(true);
          }

        } catch (error) {
          console.error('Dev CSV loading error:', error);
          setTimeSeriesData(generateSimulatedData());
          setDataSource('simulated');
          setDataLoaded(true);
        }
      } else {
        // Production: fetch from secure API endpoint
        try {
          const response = await fetch('/api/oceanographic-data', {
            headers: {
              'Authorization': `Bearer ${process.env.REACT_APP_API_TOKEN}`
            }
          });
          const data = await response.json();
          setCsvData(data);
          setDataSource('api');
          setDataLoaded(true);
        } catch (error) {
          console.error('API data loading error:', error);
          setTimeSeriesData(generateSimulatedData());
          setDataSource('simulated');
          setDataLoaded(true);
        }
      }
    };

    loadData();
  }, [generateSimulatedData]);

  // Update time series data when CSV data or parameters change
  useEffect(() => {
    if (dataLoaded) {
      if (csvData.length > 0) {
        setTimeSeriesData(processCSVData());
      } else if (dataSource === 'simulated') {
        setTimeSeriesData(generateSimulatedData());
      }
    }
  }, [dataLoaded, csvData, processCSVData, generateSimulatedData, selectedArea, selectedModel, selectedDepth, dataSource]);

  // Animation Control - use actual CSV data length
  useEffect(() => {
    if (isPlaying) {
      const maxFrames = csvData.length > 0 ? csvData.length : 24;
      intervalRef.current = setInterval(() => {
        setCurrentFrame(prev => {
          if (loopMode === 'Once' && prev >= maxFrames - 1) {
            setIsPlaying(false);
            return prev;
          }
          return (prev + 1) % maxFrames;
        });
      }, 1000 / playbackSpeed);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isPlaying, playbackSpeed, loopMode, csvData.length]);

  // Update environmental data and date/time based on current frame
  useEffect(() => {
    if (timeSeriesData.length > 0) {
      // Use real data from CSV if available
      const currentData = timeSeriesData[currentFrame % timeSeriesData.length];
      
      // Update date/time from CSV data (always update during animation or when frame changes)
      if (csvData.length > 0 && csvData[currentFrame % csvData.length]?.time) {
        const csvDate = new Date(csvData[currentFrame % csvData.length].time);
        setCurrentDate(csvDate.toISOString().split('T')[0]);
        setCurrentTime(csvDate.toTimeString().split(' ')[0].substring(0, 5));
      }
      
      // Update environmental data
      setEnvData({
        temperature: currentData.temperature || null,
        salinity: currentData.salinity || null,
        pressure: currentData.pressure || null,
        depth: selectedDepth
      });
    } else {
      // Show no data if no CSV data is available
      setCurrentDate('');
      setCurrentTime('');
      setEnvData({
        temperature: null,
        salinity: null,
        pressure: null,
        depth: selectedDepth
      });
    }
  }, [selectedDepth, currentFrame, timeSeriesData, csvData]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatMessages]);

  // Advanced AI Response System
  const getAIResponse = (message) => {
    const msg = message.toLowerCase();
    const currentData = timeSeriesData[timeSeriesData.length - 1];
    
    // Data source context
    if (msg.includes('data') || msg.includes('source')) {
      return `Data source: Currently using ${dataSource} data with ${timeSeriesData.length} data points. ${csvData.length > 0 ? `Loaded ${csvData.length} records from CSV files with real oceanographic measurements.` : 'Using simulated oceanographic patterns for demonstration purposes.'}`;
    }
    
    // Contextual analysis based on current parameters
    if (msg.includes('current') || msg.includes('flow')) {
      return `Current analysis: Using ${dataSource} data, at ${selectedDepth}ft depth in ${selectedArea}, I'm detecting ${currentData?.currentSpeed.toFixed(2)} m/s flow velocity with heading ${currentData?.heading.toFixed(1)}°. The ${selectedModel} model shows tidal-dominated circulation with ${playbackSpeed > 1 ? 'accelerated' : 'normal'} temporal resolution. ${csvData.length > 0 ? 'This data comes from real oceanographic measurements.' : 'This is simulated for demonstration.'}`;
    }
    
    if (msg.includes('wave') || msg.includes('swell')) {
      return `Wave dynamics: Current significant wave height is ${currentData?.waveHeight.toFixed(2)}m with ${currentData?.wavePeriod.toFixed(1)}s period. The spectral analysis indicates ${currentData?.waveHeight > 2 ? 'energetic' : 'moderate'} sea state conditions. Wind-sea interaction at ${currentData?.windSpeed.toFixed(1)} m/s from ${currentData?.windDirection.toFixed(0)}° is driving the dominant wave patterns. Maritime operations should ${currentData?.waveHeight > 2.5 ? 'exercise caution' : 'proceed normally'}.`;
    }
    
    if (msg.includes('temperature') || msg.includes('thermal')) {
      if (envData.temperature !== null) {
        return `Thermal structure: Water temperature at ${selectedDepth}ft is ${envData.temperature.toFixed(2)}°C. The vertical gradient suggests ${selectedDepth < 50 ? 'mixed layer' : 'thermocline'} dynamics. This thermal profile influences marine life distribution and affects acoustic propagation for USM research operations. Temperature anomalies of ±${Math.abs(envData.temperature - (timeSeriesData[0]?.temperature || 23.5)).toFixed(1)}°C from baseline detected.`;
      } else {
        return `Thermal data: No temperature measurements available for the current dataset at ${selectedDepth}ft depth. Temperature profiling requires oceanographic sensor data. Please ensure CSV data includes temperature column for thermal analysis.`;
      }
    }
    
    if (msg.includes('predict') || msg.includes('forecast')) {
      const trend = currentData?.currentSpeed > 0.8 ? 'increasing' : 'stable';
      return `Predictive analysis: Based on the ${selectedModel} ensemble, I forecast ${trend} current velocities over the next 6-hour window. Tidal harmonics suggest peak flows at ${new Date(Date.now() + 3*3600000).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})} UTC. Wave energy will ${currentData?.waveHeight > 1.5 ? 'persist elevated' : 'remain moderate'} with 85% confidence. Recommend continuous monitoring for operational planning.`;
    }
    
    if (msg.includes('holographic') || msg.includes('3d') || msg.includes('visualization')) {
      return `HoloOcean integration: The 3D visualization at POV coordinates (${holoOceanPOV.x.toFixed(1)}, ${holoOceanPOV.y.toFixed(1)}) shows immersive ${selectedParameter.toLowerCase()} distribution. Pixel streaming provides real-time depth profiling from surface to ${holoOceanPOV.depth}ft. WebRTC connectivity enables collaborative analysis with remote USM teams. Interactive navigation reveals complex flow structures invisible in 2D projections.`;
    }
    
    if (msg.includes('safety') || msg.includes('risk') || msg.includes('alert')) {
      const riskLevel = currentData?.currentSpeed > 1.5 || currentData?.waveHeight > 3 ? 'ELEVATED' : 'NORMAL';
      return `Maritime safety assessment: Current risk level is ${riskLevel}. ${currentData?.currentSpeed > 1.5 ? `Strong currents (${currentData.currentSpeed.toFixed(2)} m/s) may affect vessel positioning. ` : ''}${currentData?.waveHeight > 3 ? `High wave conditions (${currentData.waveHeight.toFixed(2)}m) impact small craft operations. ` : ''}Recommend ${riskLevel === 'ELEVATED' ? 'enhanced precautions and continuous monitoring' : 'standard operational procedures'}. Real-time alerts configured for threshold exceedances.`;
    }
    
    if (msg.includes('model') || msg.includes('hycom') || msg.includes('accuracy')) {
      return `Model performance: ${selectedModel} resolution is ${selectedModel === 'HYCOM' ? '1/12°' : selectedModel === 'ROMS' ? '1km' : '3km'} with ${selectedModel === 'HYCOM' ? 'global' : 'regional'} coverage. Validation against USM buoy data shows 92% correlation for current predictions and 88% for wave forecasts. Data assimilation includes satellite altimetry, ARGO floats, and coastal stations. Model skill metrics updated every 6 hours for continuous improvement.`;
    }
    
    if (msg.includes('usm') || msg.includes('university') || msg.includes('research')) {
      return `USM research integration: This platform supports Southern Miss marine science operations with high-fidelity coastal modeling. The NGOSF2 system provides real-time data fusion for academic research, thesis projects, and collaborative studies. Current deployment monitors critical habitat zones and supports NOAA partnership initiatives. Data export capabilities enable seamless integration with USM's research infrastructure.`;
    }
    
    if (msg.includes('export') || msg.includes('download') || msg.includes('data')) {
      return `Data access: Time series exports available in NetCDF, CSV, and MATLAB formats. Current dataset contains ${timeSeriesData.length} temporal snapshots with ${Object.keys(currentData || {}).length} parameters. API endpoints provide programmatic access for USM researchers. Real-time streaming supports automated monitoring systems. All data includes QC flags and uncertainty estimates for scientific rigor.`;
    }
    
    // Advanced contextual responses
    const responses = [
      `Advanced analysis: The ${selectedModel} model at ${selectedDepth}ft depth reveals complex ${selectedParameter.toLowerCase()} patterns in ${selectedArea}. Current frame ${currentFrame + 1}/24 shows ${Math.random() > 0.5 ? 'increasing' : 'stable'} trends with ${playbackSpeed}x temporal acceleration.`,
      `Oceanographic insight: Multi-parameter correlation indicates ${Math.random() > 0.5 ? 'strong coupling' : 'weak correlation'} between ${selectedParameter.toLowerCase()} and environmental forcing. The ${timeZone} time reference optimizes data interpretation for regional operations.`,
      `Research perspective: This query aligns with USM's coastal monitoring objectives. The integrated visualization supports both real-time analysis and historical trend assessment for comprehensive marine science applications.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const newMessage = {
      id: chatMessages.length + 1,
      content: inputMessage,
      isUser: true,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, newMessage]);
    setInputMessage('');
    setIsTyping(true);
    
    // Simulate AI processing time
    setTimeout(() => {
      const response = {
        id: chatMessages.length + 2,
        content: getAIResponse(inputMessage),
        isUser: false,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 1200 + Math.random() * 1800);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // HoloOcean interaction simulation
  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setHoloOceanPOV({ x, y, depth: selectedDepth });
    
    // Simulate environmental data update based on position (only if CSV data exists)
    if (timeSeriesData.length > 0) {
      const currentData = timeSeriesData[currentFrame % timeSeriesData.length];
      const tempVariation = (x - 50) * 0.05 + (y - 50) * 0.03;
      const salinityVariation = (x - 50) * 0.01;
      
      setEnvData(prev => ({
        ...prev,
        temperature: currentData.temperature ? currentData.temperature + tempVariation : null,
        salinity: currentData.salinity ? currentData.salinity + salinityVariation : null
      }));
    }
  };

  // Loading screen
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-blue-400/30 rounded-full animate-ping"></div>
            <div className="absolute inset-2 border-4 border-blue-400/50 rounded-full animate-pulse"></div>
          </div>
          <h2 className="text-xl font-semibold text-blue-300 mb-2">Loading Oceanographic Data</h2>
          <p className="text-slate-400">Initializing platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Advanced Oceanographic Platform
              </h1>
              <p className="text-sm text-slate-400">USM Maritime Technology Solutions • Data: {dataSource}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-slate-400" />
              <select 
                value={timeZone} 
                onChange={(e) => setTimeZone(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
              >
                <option value="UTC">UTC</option>
                <option value="Local">Local Time</option>
                <option value="CST">CST</option>
              </select>
            </div>
            <div className="text-sm text-slate-300">
              {new Date().toLocaleString('en-US', { 
                timeZone: timeZone === 'UTC' ? 'UTC' : 'America/Chicago',
                hour12: false 
              })}
            </div>
            <button className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Zone 1: HoloOcean Visualization & Data (Green/Left) */}
        <div className="w-96 border-l border-green-500/30 flex flex-col">
          <div className="p-4 border-b border-green-500/20 bg-gradient-to-r from-green-900/20 to-emerald-900/20">
            <h2 className="font-semibold text-green-300 flex items-center gap-2">
              <Compass className="w-5 h-5" />
              HoloOcean Visualization
            </h2>
            <p className="text-xs text-slate-400 mt-1">3D Environmental Data Display</p>
          </div>
          
          {/* Environmental Data Panel */}
          <div className="p-4 border-b border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Real-time Environmental Data</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-slate-400">Temperature</span>
                </div>
                <div className="text-lg font-bold text-red-300">
                  {envData.temperature !== null ? `${envData.temperature.toFixed(2)}°C` : 'No Data'}
                </div>
              </div>
              
              <div className="bg-slate-700/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-400">Salinity</span>
                </div>
                <div className="text-lg font-bold text-blue-300">
                  {envData.salinity !== null ? `${envData.salinity.toFixed(2)} PSU` : 'No Data'}
                </div>
              </div>
              
              <div className="bg-slate-700/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-xs text-slate-400">Pressure</span>
                </div>
                <div className="text-lg font-bold text-purple-300">
                  {envData.pressure !== null ? `${envData.pressure.toFixed(1)} kPa` : 'No Data'}
                </div>
              </div>
              
              <div className="bg-slate-700/50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs text-slate-400">Depth</span>
                </div>
                <div className="text-lg font-bold text-cyan-300">
                  {envData.depth} ft
                </div>
              </div>
            </div>
          </div>
          
          {/* 3D Visualization Mockup */}
          <div className="flex-1 p-4">
            <div className="h-64 bg-gradient-to-b from-green-900/30 to-blue-900/30 rounded-lg border border-green-500/20 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-green-300/70">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="absolute inset-0 border-2 border-green-400/30 rounded-full animate-ping"></div>
                    <div className="absolute inset-2 border-2 border-green-400/50 rounded-full animate-pulse"></div>
                    <div className="absolute inset-4 bg-green-400/20 rounded-full"></div>
                  </div>
                  <p className="text-sm font-semibold">HoloOcean 3D Stream</p>
                  <p className="text-xs text-slate-400 mt-1">WebRTC Connected</p>
                </div>
              </div>
              
              {/* Streaming overlay indicators */}
              <div className="absolute top-2 left-2 bg-green-600 px-2 py-1 rounded text-xs">
                LIVE
              </div>
              <div className="absolute top-2 right-2 text-xs text-green-300">
                {holoOceanPOV.x.toFixed(1)}, {holoOceanPOV.y.toFixed(1)}
              </div>
              
              {/* Depth profile visualization */}
              <div className="absolute bottom-4 left-4 right-4">
                <div className="bg-slate-800/80 p-2 rounded">
                  <div className="text-xs text-slate-400 mb-2">Depth Profile</div>
                  <div className="h-12 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded relative">
                    <div 
                      className="absolute w-1 h-full bg-yellow-400 rounded"
                      style={{ left: `${(selectedDepth / 200) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>0ft</span>
                    <span>200ft</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Time Series Charts */}
          <div className="p-4 border-t border-slate-700">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Time Series Analysis
            </h3>
            
            <div className="space-y-4">
              {/* Current Speed Chart */}
              <div className="bg-slate-700/30 p-3 rounded-lg">
                <div className="text-xs text-slate-400 mb-2">Current Speed (m/s)</div>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={timeSeriesData.slice(-24)}>
                    <Line 
                      type="monotone" 
                      dataKey="currentSpeed" 
                      stroke="#22d3ee" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <XAxis hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '6px'
                      }}
                      formatter={(value) => [`${value.toFixed(3)} m/s`, 'Speed']}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Wave Height Chart */}
              <div className="bg-slate-700/30 p-3 rounded-lg">
                <div className="text-xs text-slate-400 mb-2">Wave Height (m)</div>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={timeSeriesData.slice(-24)}>
                    <Line 
                      type="monotone" 
                      dataKey="waveHeight" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <XAxis hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '6px'
                      }}
                      formatter={(value) => [`${value.toFixed(2)} m`, 'Height']}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Temperature Chart */}
              <div className="bg-slate-700/30 p-3 rounded-lg">
                <div className="text-xs text-slate-400 mb-2">Temperature (°C)</div>
                <ResponsiveContainer width="100%" height={80}>
                  <LineChart data={timeSeriesData.slice(-24)}>
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <XAxis hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '6px'
                      }}
                      formatter={(value) => [`${value.toFixed(2)}°C`, 'Temp']}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* Control Actions */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <button className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 px-3 py-2 rounded text-sm transition-colors">
                <Download className="w-4 h-4" />
                Export Data
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 bg-slate-600 hover:bg-slate-700 px-3 py-2 rounded text-sm transition-colors">
                <RefreshCw className="w-4 h-4" />
                Sync
              </button>
            </div>
          </div>
        </div>

        {/* Zone 2: NGOSF2 Control Panel & Map (Pink/Center) */}
        <div className="flex-1 border-r border-pink-500/30">
          {/* Control Panel */}
          <div className="h-64 bg-slate-800 border-b border-pink-500/20 p-4 bg-gradient-to-b from-pink-900/10 to-purple-900/10">
            <h2 className="font-semibold text-pink-300 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              NGOSF2 Control Panel
            </h2>
            
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Area</label>
                <select 
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                >
                  <option value="USM_HYCOM">USM HYCOM</option>
                  <option value="GULF_HYCOM">Gulf HYCOM</option>
                  <option value="ATLANTIC_HYCOM">Atlantic HYCOM</option>
                  <option value="CARIBBEAN_ROMS">Caribbean ROMS</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Model</label>
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                >
                  <option value="USM">USM</option>
                  <option value="MSR">MSR</option>
                  <option value="MBL">MBL</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Date/Time</label>
                <div className="flex gap-1">
                  {csvData.length > 0 ? (
                    <>
                      <select
                        value={currentDate}
                        onChange={(e) => handleDateTimeChange(e.target.value, currentTime)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                      >
                        <option value="">Select Date</option>
                        {availableDates.map(date => (
                          <option key={date} value={date}>{date}</option>
                        ))}
                      </select>
                      <select
                        value={currentTime}
                        onChange={(e) => handleDateTimeChange(currentDate, e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                      >
                        <option value="">Select Time</option>
                        {availableTimes.map(time => (
                          <option key={time} value={time}>{time}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <input
                        type="date"
                        value={currentDate}
                        onChange={(e) => setCurrentDate(e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                        placeholder="No CSV data"
                      />
                      <input
                        type="time"
                        value={currentTime}
                        onChange={(e) => setCurrentTime(e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                        placeholder="No CSV data"
                      />
                    </>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Depth (ft)</label>
                <input
                  type="number"
                  value={selectedDepth}
                  onChange={(e) => setSelectedDepth(Number(e.target.value))}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                  min="0"
                  max="1000"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Parameter</label>
                <select 
                  value={selectedParameter}
                  onChange={(e) => setSelectedParameter(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-sm"
                >
                  <option value="Current Speed">Current Speed</option>
                  <option value="Heading">Heading</option>
                  <option value="Wave Height">Wave Height</option>
                  <option value="Wave Direction">Wave Direction</option>
                  <option value="Temperature">Temperature</option>
                  <option value="Salinity">Salinity</option>
                  <option value="Pressure">Pressure</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Animation</label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex-1 flex items-center justify-center gap-1 bg-pink-600 hover:bg-pink-700 px-3 py-1 rounded text-sm transition-colors"
                  >
                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </button>
                  <button
                    onClick={() => setCurrentFrame(0)}
                    className="p-1 bg-slate-600 hover:bg-slate-700 rounded transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Speed: {playbackSpeed}x</label>
                <input
                  type="range"
                  min="0.5"
                  max="4"
                  step="0.5"
                  value={playbackSpeed}
                  onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                  className="w-full accent-pink-500"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 text-xs text-slate-400">
              <span>Frame: {currentFrame + 1}/{csvData.length > 0 ? csvData.length : 24}</span>
              <span>Loop: {loopMode}</span>
              <span>POV: ({holoOceanPOV.x.toFixed(1)}, {holoOceanPOV.y.toFixed(1)})</span>
            </div>
          </div>

          {/* Interactive Map */}
          <div 
            className="flex-1 bg-gradient-to-br from-slate-900 via-blue-900/30 to-slate-900 relative cursor-crosshair"
            onClick={handleMapClick}
          >
            <div className="absolute inset-4 border border-slate-600 rounded-lg overflow-hidden">
              {/* Map Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-blue-800/20">
                <div className="absolute inset-0 opacity-20"
                     style={{
                       backgroundImage: 'linear-gradient(rgba(59,130,246,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.1) 1px, transparent 1px)',
                       backgroundSize: '30px 30px'
                     }}>
                </div>
              </div>
              
              {/* Station Markers */}
              <div className="absolute top-1/4 left-1/3 transform -translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <MapPin className="w-6 h-6 text-red-400 animate-pulse" />
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-slate-800/90 px-2 py-1 rounded text-xs whitespace-nowrap">
                    USM-1 Station
                  </div>
                </div>
              </div>
              
              <div className="absolute top-1/2 right-1/3 transform translate-x-1/2 -translate-y-1/2">
                <div className="relative">
                  <MapPin className="w-6 h-6 text-yellow-400 animate-pulse" />
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-slate-800/90 px-2 py-1 rounded text-xs whitespace-nowrap">
                    NDBC-42012
                  </div>
                </div>
              </div>
              
              {/* Current Vectors */}
              <div 
                className="absolute transition-transform duration-500"
                style={{
                  top: '40%',
                  left: '45%',
                  transform: `rotate(${45 + currentFrame * 5}deg)`
                }}
              >
                <Navigation className="w-8 h-8 text-cyan-400" />
              </div>
              
              <div 
                className="absolute transition-transform duration-500"
                style={{
                  top: '60%',
                  right: '30%',
                  transform: `rotate(${120 + currentFrame * 3}deg)`
                }}
              >
                <Navigation className="w-6 h-6 text-cyan-300" />
              </div>
              
              {/* POV Indicator */}
              <div 
                className="absolute w-3 h-3 bg-green-400 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                style={{
                  left: `${holoOceanPOV.x}%`,
                  top: `${holoOceanPOV.y}%`
                }}
              >
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600 px-2 py-1 rounded text-xs whitespace-nowrap">
                  HoloOcean POV
                </div>
              </div>
              
              {/* Frame Indicator */}
              <div className="absolute top-4 right-4 bg-slate-800/80 px-3 py-2 rounded-lg">
                <div className="text-sm font-mono">Frame: {currentFrame + 1}/{csvData.length > 0 ? csvData.length : 24}</div>
                <div className="text-xs text-slate-400">{selectedArea}</div>
                {csvData.length > 0 && currentDate && currentTime && (
                  <div className="text-xs text-green-300 mt-1">
                    {currentDate} {currentTime}
                  </div>
                )}
              </div>
              
              {/* Map Info Center */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center text-slate-300/50">
                  <Waves className="w-16 h-16 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Interactive Ocean Current Map</h3>
                  <p className="text-sm">Click anywhere to set HoloOcean POV</p>
                  <p className="text-xs mt-2">
                    {selectedParameter} at {selectedDepth}ft depth
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Zone 3: BlueAI Chatbot Interface (Yellow/Right) */}
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-24 right-6 z-50 w-80 max-h-[600px] flex flex-col bg-slate-800/90 backdrop-blur-md border border-yellow-500/30 rounded-xl shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-4 border-b border-yellow-500/20 bg-gradient-to-r from-yellow-900/20 to-orange-900/20">
              <h2 className="font-semibold text-yellow-300 flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                BlueAI Assistant
              </h2>
              <p className="text-xs text-slate-400 mt-1">Advanced oceanographic analysis</p>
              <button
                onClick={() => setChatOpen(false)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`relative max-w-[80%] p-3 rounded-xl text-sm leading-relaxed shadow-md ${
                    msg.isUser
                      ? 'bg-yellow-600 text-white rounded-br-none after:content-[""] after:absolute after:right-0 after:bottom-0 after:border-[8px] after:border-transparent after:border-t-yellow-600 after:border-b-0 after:border-l-0'
                      : 'bg-slate-700 text-slate-100 rounded-bl-none after:content-[""] after:absolute after:left-0 after:bottom-0 after:border-[8px] after:border-transparent after:border-t-slate-700 after:border-b-0 after:border-r-0'
                  }`}>
                    <p>{msg.content}</p>
                    <p className="text-xs opacity-50 mt-1 text-right">
                      {msg.timestamp.toLocaleTimeString('en-US', { hour12: false })}
                    </p>
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-0"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-100"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-200"></span>
                  </div>
                  <span className="text-xs text-slate-400">BlueAI analyzing...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Box */}
            <div className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about oceanographic data..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none"
                  maxLength={500}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  className="p-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 rounded-lg transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

      </div>
      
      {/* Floating BlueAI Toggle Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-yellow-500 hover:bg-yellow-600 p-3 rounded-full shadow-lg transition-colors"
          aria-label="Open Chat"
        >
          <MessageCircle className="w-5 h-5 text-slate-900" />
        </button>
      )}
    </div>
  );
};

export default OceanographicPlatform;