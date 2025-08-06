import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import oceanEnterpriseLogo from './assets/icons/roger_wicker_center_ocean_enterprise.png';
import powerBluemvmtLogo from './assets/icons/powered_by_bluemvmt.png';
import Papa from 'papaparse';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter } from 'recharts';
import { Play, Pause, RotateCcw, Settings, MessageCircle, X, Send, MapPin, Waves, Navigation, Activity, Thermometer, Droplets, Compass, Clock, Zap, TrendingUp, Filter, Download, RefreshCw, ChevronDown } from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';

// Import Mapbox CSS
import 'mapbox-gl/dist/mapbox-gl.css';

const OceanographicPlatform = () => {

  const mapRef = useRef();
  const mapContainerRef = useRef(); 

  // State Management
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loopMode, setLoopMode] = useState('Repeat');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      id: 1,
      content: "Welcome to BlueAI! I can analyze currents, wave patterns, temperature gradients, and provide real-time insights. What would you like to explore?",
      isUser: false,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedArea, setSelectedArea] = useState('');
  const [selectedModel, setSelectedModel] = useState('NGOSFf2');
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

  const [csvData, setCsvData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataSource, setDataSource] = useState('simulated');
  const [availableDates, setAvailableDates] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [generatedStationData, setGeneratedStationData] = useState([]);
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [hoveredStation, setHoveredStation] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  const [stationLoadError, setStationLoadError] = useState(null);
  const [mapDataReady, setMapDataReady] = useState(false);  
  const [mapContainerReady, setMapContainerReady] = useState(false);

  const intervalRef = useRef(null);
  const chatEndRef = useRef(null);
  const outputScrollRef = useRef(null);

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

  // Scroll-to-bottom function for the Output Module
  const scrollOutputToBottom = () => {
    if (outputScrollRef.current) {
      outputScrollRef.current.scrollTop = outputScrollRef.current.scrollHeight;
    }
  };

  const handleOutputScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  // Find closest data point to selected date/time
  const findClosestDataPoint = (targetDate, targetTime) => {
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
  };

  // Handle date/time changes
  const handleDateTimeChange = (newDate, newTime) => {
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
  };

  // Process CSV data
  const processCSVData = () => {
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
    
    return recentData.map(row => {
      const pressure = row.pressure_dbars !== undefined ? row.pressure_dbars : null;
      return {
        time: new Date(row.time).toISOString().split('T')[1].split(':').slice(0, 2).join(':'),
        heading: row.direction || 0,
        currentSpeed: row.speed || 0,
        waveHeight: row.ssh || 0, // Using sea surface height
        temperature: row.temp || 23.5,
        latitude: row.lat,
        longitude: row.lon,
        surfaceHeight: row.ssh || 0,
        salinity: row.salinity || 35.2,
        pressure: pressure,
        windSpeed: row.windspeed || 0,
        windDirection: row.winddirection || 0,
        swellHeight: row.swellheight || 0,
        soundSpeed: row.sound_speed_ms || 1500,
        sourceFile: row._source_file
      };
    });
  };

  const generateStationDataFromCSV = () => {
    if (csvData.length === 0) {
      return { success: false, error: 'No CSV data available', stations: [] };
    }

    try {
      // Extract unique latitude/longitude combinations with validation
      const uniqueStations = new Map();
      let validDataPoints = 0;
      let invalidDataPoints = 0;
      
      csvData.forEach(row => {
        // Enhanced validation for coordinates
        if (row.lat && row.lon && 
          typeof row.lat === 'number' && 
          typeof row.lon === 'number' &&
          !isNaN(row.lat) && !isNaN(row.lon) &&
          Math.abs(row.lat) <= 90 && Math.abs(row.lon) <= 180) {
          
          validDataPoints++;
          
          // Create a key for grouping (rounded to avoid floating point precision issues)
          const lat = Math.round(row.lat * 10000) / 10000; // 4 decimal places
          const lng = Math.round(row.lon * 10000) / 10000; // 4 decimal places
          const key = `${lat},${lng}`;
          
          if (!uniqueStations.has(key)) {
            uniqueStations.set(key, {
              latitude: lat,
              longitude: lng,
              count: 1,
              sourceFiles: new Set([row._source_file || 'unknown']),
              firstTimestamp: row.time ? new Date(row.time) : null,
              lastTimestamp: row.time ? new Date(row.time) : null,
              parameters: new Set()
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
              if (key !== 'lat' && key !== 'lon' && key !== '_source_file' && key !== '_loaded_at' && row[key] !== null && row[key] !== undefined) {
                station.parameters.add(key);
              }
            });
          }
        } else {
          invalidDataPoints++;
        }
      });

      console.log(`Data validation: ${validDataPoints} valid, ${invalidDataPoints} invalid coordinate entries`);

      if (uniqueStations.size === 0) {
        return { success: false, error: 'No valid coordinates found in CSV data', stations: [] };
      }

      // Convert to array and generate incremental names with enhanced metadata
      const stationsArray = Array.from(uniqueStations.entries()).map(([key, station], index) => {
        // Generate more descriptive station names based on location
        const stationNumber = String(index + 1).padStart(3, '0');
        const latLabel = station.latitude >= 0 ? 'N' : 'S';
        const lngLabel = station.longitude >= 0 ? 'E' : 'W';
        const name = `STN-${stationNumber} (${Math.abs(station.latitude).toFixed(2)}°${latLabel})`;
        
        // Assign colors with better distribution
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
          availableParameters: Array.from(station.parameters || [])
        };
      });

      console.log(`Generated ${stationsArray.length} stations from CSV data with enhanced metadata`);
      return { success: true, error: null, stations: stationsArray };
      
    } catch (error) {
      console.error('Error generating station data:', error);
      return { success: false, error: `Failed to process station data: ${error.message}`, stations: [] };
    }
  };

  const [viewState, setViewState] = useState({
    longitude: -89.0, // Gulf Coast area near USM
    latitude: 30.2,
    zoom: 8,
    pitch: 0,
    bearing: 0
  });

  // Station Data
  const stationData = useMemo(() => {
    // Use generated station data from CSV if available, otherwise fall back to hardcoded data
    if (generatedStationData.length > 0) {
      return generatedStationData;
    }
    
    // Fallback to original hardcoded stations if no CSV data
    return [
      {
        name: 'USM-1 Station',
        coordinates: [-89.1, 30.3],
        color: [244, 63, 94], // red-400
        type: 'usm'
      },
      {
        name: 'NDBC-42012',
        coordinates: [-88.8, 30.1], 
        color: [251, 191, 36], // yellow-400
        type: 'ndbc'
      }
    ];
  }, [generatedStationData]);


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
      return `Wave dynamics: Current sea surface height is ${currentData?.waveHeight.toFixed(2)}m. The spectral analysis indicates ${currentData?.waveHeight > 0.5 ? 'elevated' : 'moderate'} sea state conditions. Maritime operations should ${currentData?.waveHeight > 1.0 ? 'exercise caution' : 'proceed normally'}.`;
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
      return `Predictive analysis: Based on the ${selectedModel} ensemble, I forecast ${trend} current velocities over the next 6-hour window. Tidal harmonics suggest peak flows at ${new Date(Date.now() + 3*3600000).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})} UTC. Sea surface conditions will ${currentData?.waveHeight > 0.5 ? 'remain elevated' : 'remain moderate'} with 85% confidence. Recommend continuous monitoring for operational planning.`;
    }
    
    if (msg.includes('holographic') || msg.includes('3d') || msg.includes('visualization')) {
      return `HoloOcean integration: The 3D visualization at POV coordinates (${holoOceanPOV.x.toFixed(1)}, ${holoOceanPOV.y.toFixed(1)}) shows immersive ${selectedParameter.toLowerCase()} distribution. Pixel streaming provides real-time depth profiling from surface to ${holoOceanPOV.depth}ft. WebRTC connectivity enables collaborative analysis with remote USM teams. Interactive navigation reveals complex flow structures invisible in 2D projections.`;
    }
    
    if (msg.includes('safety') || msg.includes('risk') || msg.includes('alert')) {
      const riskLevel = currentData?.currentSpeed > 1.5 || currentData?.waveHeight > 0.8 ? 'ELEVATED' : 'NORMAL';
      return `Maritime safety assessment: Current risk level is ${riskLevel}. ${currentData?.currentSpeed > 1.5 ? `Strong currents (${currentData.currentSpeed.toFixed(2)} m/s) may affect vessel positioning. ` : ''}${currentData?.waveHeight > 0.8 ? `Elevated sea surface conditions (${currentData.waveHeight.toFixed(2)}m) impact small craft operations. ` : ''}Recommend ${riskLevel === 'ELEVATED' ? 'enhanced precautions and continuous monitoring' : 'standard operational procedures'}. Real-time alerts configured for threshold exceedances.`;
    }
    
    if (msg.includes('model') || msg.includes('accuracy')) {
      return `Model performance: ${selectedModel} resolution is ${selectedModel === 'ROMS' ? '1km' : '3km'} with ${selectedModel === 'ROMS' ? 'regional' : 'regional'} coverage. Validation against USM buoy data shows 92% correlation for current predictions and 88% for wave forecasts. Data assimilation includes satellite altimetry, ARGO floats, and coastal stations. Model skill metrics updated every 6 hours for continuous improvement.`;
    }
    
    if (msg.includes('usm') || msg.includes('university') || msg.includes('research')) {
      return `USM research integration: This platform supports Southern Miss marine science operations with high-fidelity coastal modeling. The NGOSF2 system provides real-time data fusion for academic research, thesis projects, and collaborative studies. Current deployment monitors critical habitat zones and supports NOAA partnership initiatives. Data export capabilities enable seamless integration with USM's research infrastructure.`;
    }
    
    if (msg.includes('export') || msg.includes('download') || msg.includes('data')) {
      return `Data access: Time series exports available in NetCDF, CSV, and MATLAB formats. Current dataset contains ${timeSeriesData.length} temporal snapshots with ${Object.keys(currentData || {}).length} parameters. API endpoints provide programmatic access for USM researchers. Real-time streaming supports automated monitoring systems. All data includes QC flags and uncertainty estimates for scientific rigor.`;
    }
    
    // Advanced contextual responses
    const responses = [
      `Advanced analysis: The ${selectedModel} model at ${selectedDepth}ft depth reveals complex ${selectedParameter.toLowerCase()} patterns in ${selectedArea}. Current frame ${currentFrame + 1}/${csvData.length > 0 ? csvData.length : 24} shows ${Math.random() > 0.5 ? 'increasing' : 'stable'} trends with ${playbackSpeed}x temporal acceleration.`,
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

  const getDeckLayers = () => {
    const layers = [];
    
    // Station markers - now using dynamic CSV-based stations
    if (stationData.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'stations',
          data: stationData,
          getPosition: d => d.coordinates,
          getFillColor: d => d.color,
          getRadius: d => {
            // Make radius proportional to data points available
            const baseRadius = 2000;
            const dataPointMultiplier = d.dataPoints ? Math.log(d.dataPoints + 1) * 500 : 0;
            return baseRadius + dataPointMultiplier;
          },
          radiusScale: 1,
          radiusMinPixels: 8,
          radiusMaxPixels: 25,
          pickable: true,
          onHover: ({object, x, y}) => {
            setHoveredStation(object ? {
              ...object,
              x: x,
              y: y
            } : null);
          },
          onClick: ({object}) => {
            if (object) {
              // Update POV to clicked station
              const [lng, lat] = object.coordinates;
              const x = ((lng + 89.2) / 0.4) * 100;
              const y = ((lat - 30.0) / 0.4) * 100;
              
              setHoloOceanPOV({ 
                x: Math.max(0, Math.min(100, x)), 
                y: Math.max(0, Math.min(100, y)), 
                depth: selectedDepth 
              });
              
              // ADD THIS LINE to set selected station
              setSelectedStation(object);
              
              // Center map on clicked station
              if (mapRef.current) {
                mapRef.current.jumpTo({
                  center: [lng, lat],
                  zoom: Math.max(mapRef.current.getZoom(), 10)
                });
              }
              
              console.log(`Selected station: ${object.name} at [${lat}, ${lng}]`);
            }
          }
        })
      );
    }
    
    // Current vectors (using CSV data if available)
    if (timeSeriesData.length > 0) {
      const currentData = timeSeriesData[currentFrame % timeSeriesData.length];
      
      // Create current vectors at each station location
      const currentVectors = stationData.map((station, index) => {
        const [lng, lat] = station.coordinates;
        const vectorLength = 0.1 * (currentData.currentSpeed || 0.5) / 2; // Scale vector by current speed
        const angle = ((currentData.heading || (45 + index * 75)) + index * 30) * Math.PI / 180;
        
        return {
          from: [lng, lat],
          to: [
            lng + Math.cos(angle) * vectorLength,
            lat + Math.sin(angle) * vectorLength
          ],
          color: station.color.map(c => Math.min(255, c + 50)), // Slightly brighter for vectors
          speed: currentData.currentSpeed || 0.5
        };
      });
      
      layers.push(
        new LineLayer({
          id: 'current-vectors',
          data: currentVectors,
          getSourcePosition: d => d.from,
          getTargetPosition: d => d.to,
          getColor: d => d.color,
          getWidth: d => Math.max(2, d.speed * 3), // Width based on current speed
          widthScale: 1,
          widthMinPixels: 2,
          widthMaxPixels: 8
        })
      );
    }
    
    // POV indicator
    layers.push(
      new ScatterplotLayer({
        id: 'pov-indicator',
        data: [{
          coordinates: [
            -89.2 + (holoOceanPOV.x / 100) * 0.4,
            30.0 + (holoOceanPOV.y / 100) * 0.4
          ],
          color: [74, 222, 128] // green-400
        }],
        getPosition: d => d.coordinates,
        getFillColor: d => d.color,
        getRadius: 1500,
        radiusMinPixels: 6,
        radiusMaxPixels: 12,
        pickable: true
      })
    );
    
    return layers;
  };

  const StationTooltip = ({ station }) => {
    if (!station) return null;
    
    return (
      <div 
        className="absolute pointer-events-none bg-slate-800/95 border border-blue-400/50 rounded-lg p-3 text-sm z-50 shadow-xl"
        style={{ 
          left: station.x + 10, 
          top: station.y - 10,
          transform: 'translateY(-100%)'
        }}
      >
        <div className="font-semibold text-blue-300 mb-2">{station.name}</div>
        <div className="space-y-1 text-xs">
          <div className="text-slate-300">
            <span className="text-slate-400">Coordinates:</span> 
            <br />{station.coordinates[1].toFixed(4)}°N, {station.coordinates[0].toFixed(4)}°W
          </div>
          {station.dataPoints && (
            <div className="text-slate-300">
              <span className="text-slate-400">Data Points:</span> {station.dataPoints}
            </div>
          )}
          {station.sourceFiles && station.sourceFiles.length > 0 && (
            <div className="text-slate-300">
              <span className="text-slate-400">Sources:</span> 
              <br />{station.sourceFiles.join(', ')}
            </div>
          )}
          <div className="text-slate-300">
            <span className="text-slate-400">Type:</span> {station.type}
          </div>
        </div>
      </div>
    );
  };

   // Load CSV data on component mount
   useEffect(() => {
    const loadData = async () => {
      // Always try CSV first, regardless of environment
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
          return; // Exit early if CSV loading succeeds
        }
      } catch (error) {
        console.error('CSV loading error:', error);
      }

      // Try API endpoint if CSV loading fails
      try {
        console.log('Trying API endpoint...');
        const response = await fetch('/api/oceanographic-data', {
          headers: {
            'Authorization': `Bearer ${process.env.REACT_APP_API_TOKEN}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log(`Loaded ${data.length} records from API`);
          setCsvData(data);
          setDataSource('api');
          setDataLoaded(true);
          return;
        } else {
          console.error('API response not OK:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('API data loading error:', error);
      }

      // No data available - show error state
      console.error('No data sources available: No CSV files found and API unavailable');
      setDataSource('none');
      setDataLoaded(true);
    };

    loadData();
  }, []);

  // Update time series data when CSV data or parameters change
  useEffect(() => {
    if (dataLoaded) {
      if (csvData.length > 0) {
        setTimeSeriesData(processCSVData());
      } else {
        setTimeSeriesData([]);
      }
    }
  }, [dataLoaded, csvData, selectedArea, selectedModel, selectedDepth, dataSource]);

  // Generate station data when CSV data changes (SINGLE useEffect, not two)
  useEffect(() => {
    if (dataLoaded && csvData.length > 0) {
      const result = generateStationDataFromCSV();
      
      if (result.success) {
        setStationLoadError(null);
        setGeneratedStationData(result.stations);
        setMapDataReady(true);
        
        // Enhanced logging with data quality metrics
        if (result.stations.length > 0) {
          console.log(`✅ Station data updated: ${result.stations.length} stations`);
          
          // Calculate coverage area
          const lats = result.stations.map(s => s.coordinates[1]);
          const lngs = result.stations.map(s => s.coordinates[0]);
          const coverage = {
            north: Math.max(...lats),
            south: Math.min(...lats),
            east: Math.max(...lngs),
            west: Math.min(...lngs)
          };
          
          console.log(`📍 Coverage area: ${coverage.south.toFixed(3)}°S to ${coverage.north.toFixed(3)}°N, ${coverage.west.toFixed(3)}°W to ${coverage.east.toFixed(3)}°E`);
          
          // Log data quality metrics
          const totalDataPoints = result.stations.reduce((sum, s) => sum + s.dataPoints, 0);
          const avgDataPoints = totalDataPoints / result.stations.length;
          console.log(`📊 Data quality: ${totalDataPoints} total points, ${avgDataPoints.toFixed(1)} avg per station`);
        } else {
          console.warn('⚠️ CSV data loaded but no valid stations generated');
        }
      } else {
        setStationLoadError(result.error);
        setGeneratedStationData([]);
      }
    } else if (dataLoaded) {
      // Clear station data if no CSV data
      setGeneratedStationData([]);
      setStationLoadError(null);
    }
  }, [dataLoaded, csvData]);

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
        temperature: currentData.temperature !== undefined ? currentData.temperature : null,
        salinity: currentData.salinity !== undefined ? currentData.salinity : null,
        pressure: currentData.pressure !== undefined ? currentData.pressure : null, 
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

  useEffect(() => {
    if (!mapContainerReady || !mapContainerRef.current) return;
  
    mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1Ijoiam1wYXVsbWFwYm94IiwiYSI6ImNtZHh0ZmR6MjFoaHIyam9vZmJ4Z2x1MDYifQ.gR60szhfKWhTv8MyqynpVA';
    
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing
    });
  
    // Only sync FROM map TO viewState (one direction only)
    mapRef.current.on('moveend', () => {
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      const pitch = mapRef.current.getPitch();
      const bearing = mapRef.current.getBearing();
      
      setViewState({
        longitude: center.lng,
        latitude: center.lat,
        zoom,
        pitch,
        bearing
      });
    });
  
    return () => {
      mapRef.current?.remove();
    };
  }, [mapContainerReady]);

  // Scroll when new responses are added
  useEffect(() => {
    scrollOutputToBottom();
  }, [chatMessages.filter(msg => !msg.isUser).length]);

  // Scroll when AI starts typing
  useEffect(() => {
    if (isTyping) {
      scrollOutputToBottom();
    }
  }, [isTyping]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [chatMessages]);


  // Loading screen or error state
  if (!dataLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 border-4 border-blue-400/30 rounded-full animate-ping"></div>
            <div className="absolute inset-2 border-4 border-blue-400/50 rounded-full animate-pulse"></div>
          </div>
          <h2 className="text-lg md:text-xl font-semibold text-blue-300 mb-2">Loading Oceanographic Data</h2>
          <p className="text-sm md:text-base text-slate-400">Searching for CSV files and API endpoints...</p>
        </div>
      </div>
    );
  }

	// Error state when no data is available
	if (dataSource === 'none') {
		return (
			<div className="min-h-screen bg-slate-900 text-white flex items-center justify-center px-4">
				<div className="text-center max-w-md">
					<div className="w-16 h-16 mx-auto mb-4 text-red-400">
						<svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
						</svg>
					</div>
					<h2 className="text-lg md:text-xl font-semibold text-red-300 mb-2">No Data Available</h2>
					<p className="text-sm md:text-base text-slate-400 mb-4">
						No CSV files found in src/data/ and API endpoint is not available.
					</p>
					<div className="text-xs md:text-sm text-slate-500 space-y-2">
						<p>• Add CSV files to src/data/ folder</p>
						<p>• Configure API endpoint at /api/oceanographic-data</p>
						<p>• Check browser console for detailed error messages</p>
					</div>
				</div>
			</div>
		);
	}

  return (
    <div className="bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-3 md:px-6 py-2 md:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
              <img src={oceanEnterpriseLogo} alt="Roger F. Wicker Center for Ocean Enterprise" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Coastal Oceanographic Monitor
              </h1>
              <p className="text-xs md:text-sm text-slate-400">USM Maritime Technology Solutions • Data: {dataSource}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-start sm:items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2 text-xs md:text-sm">
                <Clock className="w-3 h-3 md:w-4 md:h-4 text-slate-400" />
                <select 
                  value={timeZone} 
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm"
                >
                  <option value="UTC">UTC</option>
                  <option value="Local">Local Time</option>
                  <option value="CST">CST</option>
                </select>
              </div>
              <div className="text-xs md:text-sm text-slate-300 hidden sm:block">
                {new Date().toLocaleString('en-US', { 
                  timeZone: timeZone === 'UTC' ? 'UTC' : 'America/Chicago',
                  hour12: false 
                })}
              </div>
              <button className="p-1 md:p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                <Settings className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            <img src={powerBluemvmtLogo} alt="Powered by Bluemvmt" className="h-6 md:h-8" />
          </div>
        </div>
      </header>

        {/* Zone 1: NGOSF2 Control Panel & Map (Pink/Center) */}
        <div className="border-r border-pink-500/30">
          {/* Control Panel */}
          <div className="h-auto md:h-64 bg-slate-800 border-b border-pink-500/20 p-2 md:p-4 bg-gradient-to-b from-pink-900/10 to-purple-900/10">
            <h2 className="font-semibold text-pink-300 mb-2 md:mb-4 flex items-center gap-2 text-sm md:text-base">
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
              Model Control Panel
            </h2>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Area</label>
                <select 
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm"
                >
                  <option value="">Select Area</option>
                  <option value="MSP">MSP</option>
                  <option value="USM">USM</option>
                  <option value="MBL">MBL</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Model</label>
                <select 
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm"
                >
                  <option value="NGOSF2">NGOSF2</option>
                </select>
              </div>
              
              <div className="col-span-2 lg:col-span-1">
                <label className="block text-xs text-slate-400 mb-1">Date/Time</label>
                <div className="flex gap-1">
                  {csvData.length > 0 ? (
                    <>
                      <select
                        value={currentDate}
                        onChange={(e) => handleDateTimeChange(e.target.value, currentTime)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs"
                      >
                        <option value="">Select Date</option>
                        {availableDates.map(date => (
                          <option key={date} value={date}>{date}</option>
                        ))}
                      </select>
                      <select
                        value={currentTime}
                        onChange={(e) => handleDateTimeChange(currentDate, e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs"
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
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs"
                        placeholder="No CSV data"
                      />
                      <input
                        type="time"
                        value={currentTime}
                        onChange={(e) => setCurrentTime(e.target.value)}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs"
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
                  className="w-full bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm"
                  min="0"
                  max="1000"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 mt-2 md:mt-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Parameter</label>
                <select 
                  value={selectedParameter}
                  onChange={(e) => setSelectedParameter(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm"
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
                    className="flex-1 flex items-center justify-center gap-1 bg-pink-600 hover:bg-pink-700 px-2 md:px-3 py-1 rounded text-xs md:text-sm transition-colors"
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
            
            <div className="flex flex-wrap items-center justify-between mt-2 md:mt-4 text-xs text-slate-400 gap-2">
              <span>Frame: {currentFrame + 1}/{csvData.length > 0 ? csvData.length : 24}</span>
              <span>Loop: {loopMode}</span>
              <span className="hidden md:inline">POV: ({holoOceanPOV.x.toFixed(1)}, {holoOceanPOV.y.toFixed(1)})</span>
            </div>
          </div>
        </div>

        {/* Zone 2: Interactive Map & Output Module */}
        <div className="grid grid-cols-1 lg:grid-rows-1 lg:grid-cols-2 lg:h-screen">
          <div className="col-span-1 h-64 md:h-96 lg:h-full relative order-1 lg:order-1">
            {/* Mapbox container */}
            <div 
              ref={(el) => {
                mapContainerRef.current = el;
                if (el && !mapContainerReady) {
                  setMapContainerReady(true);
                }
              }} 
              style={{width: '100%', height: '100%', position: 'absolute', top: 0, left: 0}}
            />
            
            {/* DeckGL overlay */}
            <DeckGL
              viewState={viewState}
              onViewStateChange={({viewState}) => setViewState(viewState)}
              controller={true}
              layers={getDeckLayers()}
              onClick={(info, event) => {
                if (info.coordinate) {
                  // Convert deck.gl coordinates back to percentage for POV
                  const [lng, lat] = info.coordinate;
                  const x = ((lng + 89.2) / 0.4) * 100;
                  const y = ((lat - 30.0) / 0.4) * 100;
                  
                  setHoloOceanPOV({ 
                    x: Math.max(0, Math.min(100, x)), 
                    y: Math.max(0, Math.min(100, y)), 
                    depth: selectedDepth 
                  });
                  
                  // Update environmental data if CSV data exists
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
                }
              }}
              style={{width: '100%', height: '100%', position: 'relative', zIndex: 1}}
            />

            {/* Frame Indicator Overlay */}
            <div className="absolute top-2 md:top-4 right-2 md:right-4 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none">
              <div className="text-xs md:text-sm font-mono">Frame: {currentFrame + 1}/{csvData.length > 0 ? csvData.length : 24}</div>
              <div className="text-xs text-slate-400">{selectedArea}</div>
              {csvData.length > 0 && currentDate && currentTime && (
                <div className="text-xs text-green-300 mt-1">
                  {currentDate} {currentTime}
                </div>
              )}
            </div>
            
            {/* Map Info Overlay */}
            <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none">
              <div className="text-xs md:text-sm font-semibold text-slate-300">Interactive Ocean Current Map</div>
              <div className="text-xs text-slate-400 hidden md:block">Click to set HoloOcean POV</div>
              <div className="text-xs text-slate-400">
                {selectedParameter} at {selectedDepth}ft depth
              </div>
            </div>
          </div>

          {/* Selected Station Info Panel */}
          {selectedStation && (
            <div className="absolute top-4 md:top-16 left-2 md:left-4 bg-slate-800/90 border border-blue-400/30 rounded-lg p-3 md:p-4 max-w-xs z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-blue-300 text-sm md:text-base">{selectedStation.name}</div>
                <button
                  onClick={() => setSelectedStation(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-2 text-xs md:text-sm">
                <div className="bg-slate-700/50 p-2 rounded">
                  <div className="text-xs text-slate-400">Location</div>
                  <div className="text-slate-200">
                    {selectedStation.coordinates[1].toFixed(6)}°N<br />
                    {selectedStation.coordinates[0].toFixed(6)}°W
                  </div>
                </div>
                
                {selectedStation.dataPoints && (
                  <div className="bg-slate-700/50 p-2 rounded">
                    <div className="text-xs text-slate-400">Available Data</div>
                    <div className="text-slate-200">{selectedStation.dataPoints} measurements</div>
                  </div>
                )}
                
                {selectedStation.sourceFiles && selectedStation.sourceFiles.length > 0 && (
                  <div className="bg-slate-700/50 p-2 rounded">
                    <div className="text-xs text-slate-400">Data Sources</div>
                    <div className="text-slate-200 text-xs">
                      {selectedStation.sourceFiles.map(file => (
                        <div key={file} className="truncate">{file}</div>
                      ))}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => {
                    // Filter CSV data for this station
                    const stationData = csvData.filter(row => {
                      if (!row.latitude || !row.longitude) return false;
                      const latDiff = Math.abs(row.latitude - selectedStation.coordinates[1]);
                      const lngDiff = Math.abs(row.longitude - selectedStation.coordinates[0]);
                      return latDiff < 0.001 && lngDiff < 0.001; // Within ~100m
                    });
                    
                    console.log(`Station ${selectedStation.name} data:`, stationData);
                    
                    // Add a chat message about this station
                    const stationAnalysis = {
                      id: chatMessages.length + 1,
                      content: `Station Analysis: ${selectedStation.name} contains ${stationData.length} measurements. Latest data shows ${stationData.length > 0 ? `temperature: ${stationData[stationData.length-1]?.temperature?.toFixed(2) || 'N/A'}°C, current speed: ${stationData[stationData.length-1]?.currentspeed?.toFixed(3) || 'N/A'} m/s` : 'no recent measurements available'}. This station is located at ${selectedStation.coordinates[1].toFixed(4)}°N, ${selectedStation.coordinates[0].toFixed(4)}°W.`,
                      isUser: false,
                      timestamp: new Date()
                    };
                    
                    setChatMessages(prev => [...prev, stationAnalysis]);
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-xs md:text-sm"
                >
                  Analyze Station Data
                </button>
              </div>
            </div>
          )}

          {/* Station Loading Error Display */}
          {stationLoadError && (
            <div className="absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2 bg-red-800/90 border border-red-500/50 rounded-lg p-2 md:p-3 max-w-md mx-2">
              <div className="flex items-center gap-2 text-red-300">
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="font-semibold text-sm md:text-base">Station Data Error</span>
              </div>
              <div className="text-red-200 text-xs md:text-sm mt-1">{stationLoadError}</div>
              <button
                onClick={() => setStationLoadError(null)}
                className="mt-2 px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-xs md:text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Station Data Quality Indicator */}
          {mapDataReady && generatedStationData.length > 0 && (
            <div className="absolute bottom-12 md:bottom-16 left-2 md:left-4 bg-green-800/80 border border-green-500/30 rounded-lg p-2">
              <div className="text-green-300 text-xs font-semibold">Data Quality</div>
              <div className="text-green-200 text-xs">
                {generatedStationData.length} stations • {generatedStationData.reduce((sum, s) => sum + s.dataPoints, 0)} measurements
              </div>
            </div>
          )}

          {/* Output Module */}
          <div className="col-span-1 h-64 md:h-96 lg:h-full border-yellow-500/30 flex flex-col order-2 lg:order-2">
            
            {/* Header */}
            <div className="p-2 md:p-4 border-b border-yellow-500/20 bg-gradient-to-r from-yellow-900/20 to-orange-900/20 flex-shrink-0">
              <p className="text-xs text-slate-400">History: {chatMessages.filter(msg => !msg.isUser).length} responses</p>
            </div>

            {/* Response History (full height) */}
            <div className="flex-1 p-2 md:p-4 overflow-hidden">
              <div ref={outputScrollRef} className="h-full overflow-y-auto bg-slate-700/30 rounded p-2 md:p-3 space-y-3 md:space-y-4 scroll-smooth">
                {chatMessages.filter(msg => !msg.isUser).map((msg, index) => (
                  <div key={msg.id} className="border-b border-slate-600/30 pb-3 md:pb-4 last:border-b-0">
                    
                    {/* Response Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      <span className="text-xs text-yellow-300">Response #{index + 1}</span>
                      <span className="text-xs text-slate-400 ml-auto">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Response Content */}
                    <div className="space-y-2 md:space-y-3">
                      
                      {/* Paragraph Response */}
                      <div className="text-xs md:text-sm text-slate-100 leading-relaxed">
                        {msg.content}
                      </div>

                      {/* Chart Response (if response mentions chart/visualization) */}
                      {(msg.content.toLowerCase().includes('chart') || 
                        msg.content.toLowerCase().includes('trend') || 
                        msg.content.toLowerCase().includes('wave') ||
                        msg.content.toLowerCase().includes('current')) && (
                        <div className="bg-slate-600/50 rounded p-2 md:p-3">
                          <div className="text-xs text-slate-400 mb-2">Generated Chart</div>
                          <ResponsiveContainer width="100%" height={100}>
                            <LineChart data={timeSeriesData.slice(-12)}>
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
                                  borderRadius: '6px',
                                  fontSize: '12px'
                                }}
                                formatter={(value) => [`${value?.toFixed(3)} m/s`, 'Current Speed']}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}

                      {/* Table Response (if response mentions data/values) */}
                      {(msg.content.toLowerCase().includes('data') || 
                        msg.content.toLowerCase().includes('temperature') ||
                        msg.content.toLowerCase().includes('environmental')) && timeSeriesData.length > 0 && (
                        <div className="bg-slate-600/50 rounded p-2 md:p-3">
                          <div className="text-xs text-slate-400 mb-2">Data Table</div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-slate-500">
                                  <th className="text-left p-1 text-slate-300">Time</th>
                                  <th className="text-left p-1 text-slate-300">Temp (°C)</th>
                                  <th className="text-left p-1 text-slate-300">Current (m/s)</th>
                                  <th className="text-left p-1 text-slate-300">Wave (m)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {timeSeriesData.slice(-3).map((row, i) => (
                                  <tr key={i} className="border-b border-slate-600/50">
                                    <td className="p-1 text-slate-200">{row.time}</td>
                                    <td className="p-1 text-slate-200">{row.temperature?.toFixed(1) || 'N/A'}</td>
                                    <td className="p-1 text-slate-200">{row.currentSpeed?.toFixed(2) || 'N/A'}</td>
                                    <td className="p-1 text-slate-200">{row.waveHeight?.toFixed(2) || 'N/A'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-0"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-100"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-200"></span>
                    </div>
                    <span className="text-xs md:text-sm text-slate-400">Processing...</span>
                  </div>
                )}

                {chatMessages.filter(msg => !msg.isUser).length === 0 && !isTyping && (
                  <div className="text-center text-slate-400 py-6 md:py-8">
                    <MessageCircle className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs md:text-sm">Response history will appear here</p>
                    <p className="text-xs mt-1">Charts, tables, and text responses</p>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
            
          </div>
        </div>
          
        {/* Zone 3: Data Modules (Green/Left) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-green-500/30">
          
          {/*  HoloOcean Visualization Panel */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 p-2 md:p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20">
            <h2 className="font-semibold text-green-300 flex items-center gap-2 text-sm md:text-base">
              <Compass className="w-4 h-4 md:w-5 md:h-5" />
              HoloOcean Visualization
            </h2>
            <p className="text-xs text-slate-400 mt-1">3D Environmental Data Display</p>
          </div>
          
          {/* Environmental Data Panel */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 p-2 md:p-4 border-slate-700">
            <h3 className="text-xs md:text-sm font-semibold text-slate-300 mb-2 md:mb-3">Real-time Environmental Data</h3>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                <div className="flex items-center gap-1 md:gap-2 mb-1">
                  <Thermometer className="w-3 h-3 md:w-4 md:h-4 text-red-400" />
                  <span className="text-xs text-slate-400">Temperature</span>
                </div>
                <div className="text-sm md:text-lg font-bold text-red-300">
                  {envData.temperature !== null ? `${envData.temperature.toFixed(2)}°C` : 'No Data'}
                </div>
              </div>
              
              <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                <div className="flex items-center gap-1 md:gap-2 mb-1">
                  <Droplets className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />
                  <span className="text-xs text-slate-400">Salinity</span>
                </div>
                <div className="text-sm md:text-lg font-bold text-blue-300">
                  {envData.salinity !== null ? `${envData.salinity.toFixed(2)} PSU` : 'No Data'}
                </div>
              </div>
              
              <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                <div className="flex items-center gap-1 md:gap-2 mb-1">
                  <Activity className="w-3 h-3 md:w-4 md:h-4 text-purple-400" />
                  <span className="text-xs text-slate-400">Pressure</span>
                </div>
                <div className="text-sm md:text-lg font-bold text-purple-300">
                  {envData.pressure !== null ? `${envData.pressure.toFixed(1)} dbar` : 'No Data'}
                </div>
              </div>
              
              <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                <div className="flex items-center gap-1 md:gap-2 mb-1">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-cyan-400" />
                  <span className="text-xs text-slate-400">Depth</span>
                </div>
                <div className="text-sm md:text-lg font-bold text-cyan-300">
                  {envData.depth} ft
                </div>
              </div>
            </div>
          </div>
          
          {/* 3D Visualization Panel */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 p-2 md:p-4">
            <div className="h-48 md:h-64 bg-gradient-to-b from-green-900/30 to-blue-900/30 rounded-lg border border-green-500/20 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-green-300/70">
                  <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 relative">
                    <div className="absolute inset-0 border-2 border-green-400/30 rounded-full animate-ping"></div>
                    <div className="absolute inset-2 border-2 border-green-400/50 rounded-full animate-pulse"></div>
                    <div className="absolute inset-4 bg-green-400/20 rounded-full"></div>
                  </div>
                  <p className="text-xs md:text-sm font-semibold">HoloOcean 3D Stream</p>
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
              <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 right-2 md:right-4">
                <div className="bg-slate-800/80 p-2 rounded">
                  <div className="text-xs text-slate-400 mb-2">Depth Profile</div>
                  <div className="h-8 md:h-12 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded relative">
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
          
          {/* Time Series Charts Panel */}
          <div className="col-span-1 md:col-span-1 lg:col-span-1 p-2 md:p-4 border-slate-700">
            
            <h3 className="text-xs md:text-sm font-semibold text-slate-300 mb-2 md:mb-3 flex items-center gap-1 md:gap-2">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />Time Series Analysis
            </h3>
            
            <div className="space-y-2 md:space-y-4">
              {/* Current Speed Chart */}
              <div className="bg-slate-700/30 p-2 md:p-3 rounded-lg">
                <div className="text-xs text-slate-400 mb-2">Current Speed (m/s)</div>
                <ResponsiveContainer width="100%" height={60}>
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
              <div className="bg-slate-700/30 p-2 md:p-3 rounded-lg">
                <div className="text-xs text-slate-400 mb-2">Wave Height (m)</div>
                <ResponsiveContainer width="100%" height={60}>
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
              <div className="bg-slate-700/30 p-2 md:p-3 rounded-lg">
                <div className="text-xs text-slate-400 mb-2">Temperature (°C)</div>
                <ResponsiveContainer width="100%" height={60}>
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
        </div>

        {/* Floating Chatbot Toggle */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="fixed bottom-4 md:bottom-6 right-4 md:right-6 z-50 bg-blue-500 hover:bg-blue-600 p-2 md:p-3 rounded-full shadow-lg transition-colors"
          aria-label="Toggle Chatbot"
        >
          <MessageCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </button>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollOutputToBottom}
            className="absolute bottom-4 md:bottom-6 right-4 md:right-6 bg-yellow-500 hover:bg-yellow-600 p-2 md:p-3 rounded-full shadow-lg transition-colors z-10 border-2 border-yellow-400"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="w-3 h-3 md:w-4 md:h-4 text-white" />
          </button>
        )}

        {/* Collapsible Input-Only Chatbot Panel */}
        {chatOpen && (
          <div className="fixed bottom-16 md:bottom-20 right-2 md:right-6 z-40 w-72 md:w-80 bg-slate-800/90 backdrop-blur-md border border-blue-500/30 rounded-lg shadow-xl flex flex-col mx-2 md:mx-0">
            
            {/* Chatbot Header */}
            <div className="p-2 md:p-3 border-b border-blue-500/20 bg-gradient-to-r from-blue-900/20 to-cyan-900/20 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-300">Chatbot</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Area Only */}
            <div className="flex-1 p-2 md:p-3">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Enter your prompt..."
                className="w-full h-12 md:h-16 bg-slate-700 border border-slate-600 rounded px-2 md:px-3 py-1 md:py-2 text-xs md:text-sm resize-none mb-2 md:mb-3"
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isTyping}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 px-3 py-2 rounded text-xs md:text-sm"
              >
                Submit Prompt
              </button>
            </div>
          </div>
        )}

    </div>
  );
};

export default OceanographicPlatform;