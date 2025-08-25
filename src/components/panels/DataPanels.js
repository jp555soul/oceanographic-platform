import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Thermometer,
  Droplets,
  Activity,
  TrendingUp,
  Waves,
  Eye,
  Maximize2,
  Minimize2,
  BarChart3,
  RefreshCw,
  Wind,
  Navigation
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const DataPanels = ({
  // Environmental data
  envData = { temperature: null, salinity: null, pressure: null, depth: 0 },
  // HoloOcean data
  holoOceanPOV = { x: 0, y: 0, depth: 0 },
  selectedDepth = 0,
  selectedParameter = 'Wind Speed',
  // Time series data (now the primary source)
  timeSeriesData = [],
  currentFrame = 0,
  availableDepths = [],
  // Configuration
  showHoloOcean = true,
  showEnvironmental = true,
  showCharts = true,
  showAdvancedMetrics = false,
  // Callbacks
  onDepthChange,
  onParameterChange,
  onPOVChange,
  onRefreshData,
  className = ""
}) => {
  const [expandedPanel, setExpandedPanel] = useState(null);
  const [chartTimeRange, setChartTimeRange] = useState(24); // hours
  const [isStreaming, setIsStreaming] = useState(true);

  // The timeSeriesData prop is now the single source of truth for charts.
  const dataSource = timeSeriesData;

  // Dynamically calculate max depth from the available data
  const maxDepth = useMemo(() => {
    if (!availableDepths || availableDepths.length === 0) {
      return 200; // Fallback if no depths are available
    }
    return Math.max(...availableDepths);
  }, [availableDepths]);

  // Simulate streaming status
  useEffect(() => {
    const interval = setInterval(() => {
      setIsStreaming(prev => Math.random() > 0.1 ? true : prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Parameter to data key mapping
  const parameterMapping = {
    'Wind Speed': 'currentSpeed', // 'currentSpeed' from data is actually wind speed
    'Current Direction': 'heading',
    'Temperature': 'temperature',
    'Sound Speed': 'soundSpeed',
    'SSH': 'ssh',
    'Salinity': 'salinity',
    'Pressure': 'pressure',
    'Wind Direction': 'windDirection'
  };

  // Get current data point
  const getCurrentData = () => {
    if (dataSource && dataSource.length > 0) {
      const dataIndex = Math.min(currentFrame, dataSource.length - 1);
      const data = dataSource[dataIndex];
      const dataKey = parameterMapping[selectedParameter] || 'currentSpeed';
      return { ...data, selectedValue: data[dataKey] };
    }
    return null;
  };

  // Format value with units
  const formatValue = (value, type) => {
    if (value === null || value === undefined || isNaN(value)) return 'No Data';
    const numValue = Number(value);
    switch (type) {
      case 'temperature': return `${numValue.toFixed(2)}°F`;
      case 'salinity': return `${numValue.toFixed(2)} PSU`;
      case 'pressure': return `${numValue.toFixed(1)} dbar`;
      case 'depth': return `${numValue} ft`;
      case 'speed': return `${numValue.toFixed(3)} m/s`;
      case 'direction': return `${numValue.toFixed(1)}°`;
      case 'height': return `${numValue.toFixed(2)} m`;
      case 'soundSpeed': return `${numValue.toFixed(2)} m/s`;
      case 'windSpeed': return `${numValue.toFixed(2)} m/s`;
      default: return numValue.toString();
    }
  };

  // Get data quality indicator
  const getDataQuality = () => {
    if (!dataSource.length) return { level: 'No Data', color: 'text-red-400' };
    
    const lastItem = dataSource[dataSource.length - 1];
    const timestamp = lastItem?.timestamp || lastItem?.time || Date.now();
    const dataAge = Date.now() - new Date(timestamp);
    const hoursOld = dataAge / (1000 * 60 * 60);
    
    if (hoursOld < 1) return { level: 'Real-time', color: 'text-green-400' };
    if (hoursOld < 6) return { level: 'Recent', color: 'text-blue-400' };
    if (hoursOld < 24) return { level: 'Delayed', color: 'text-yellow-400' };
    return { level: 'Historical', color: 'text-orange-400' };
  };

  // Chart data for different time ranges
  const getChartData = (metric, range = 24) => {
    const dataKey = parameterMapping[metric] || 'currentSpeed';
    
    if (!dataSource.length) {
      return [];
    }

    const chartData = dataSource.slice(-range).map((item, index) => {
      let timeDisplay;
      if (item.time) {
        timeDisplay = item.time;
      } else if (item.timestamp) {
        const date = new Date(item.timestamp);
        timeDisplay = date.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      } else {
        timeDisplay = `${String(index % 24).padStart(2, '0')}:00`;
      }

      const value = Number(item[dataKey]) || 0;
      
      return {
        time: timeDisplay,
        value: value,
        originalData: item,
        ...item
      };
    });

    return chartData;
  };

  // Available parameters
  const availableParameters = useMemo(() => {
    if (!dataSource.length) {
      return ['Wind Speed', 'Current Direction', 'Temperature', 'Sound Speed', 'Salinity', 'Pressure', 'SSH'];
    }
    
    const sampleRow = dataSource[0];
    const parameters = [];
    
    Object.entries(parameterMapping).forEach(([displayName, dataKey]) => {
      if (sampleRow[dataKey] !== undefined) {
        parameters.push(displayName);
      }
    });
    
    return parameters.length ? parameters : ['Wind Speed', 'Current Direction', 'Temperature', 'Sound Speed', 'SSH'];
  }, [dataSource, parameterMapping]);

  const currentData = getCurrentData();
  const dataQuality = getDataQuality();

  // Helper function to get current value for a specific parameter
  const getCurrentValue = (parameter) => {
    if (!currentData) return null;
    const dataKey = parameterMapping[parameter] || 'currentSpeed';
    return currentData[dataKey];
  };

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-green-500/30 ${className}`}>
      
      <div className="col-span-2 md:col-span-2 lg:col-span-2 p-2 md:p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-r border-green-500/10">
        <iframe 
          src="https://bluemvmt-holoocean-1.ngrok.dev/" 
          className="w-full h-full border-none rounded-lg"
          title="External Content"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
        ></iframe>
      </div>

      <div className="col-span-1 md:col-span-1 lg:col-span-1 p-2 md:p-4 border-slate-700 space-y-4">
        {showEnvironmental && (
          <div>
            <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-xs md:text-sm font-semibold text-slate-300 flex items-center gap-1"><Activity className="w-3 h-3 md:w-4 md:h-4" />Environmental Data</h3>
                <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${dataQuality.color.replace('text-', 'bg-')}`}></div>
                    <span className={`text-xs ${dataQuality.color}`}>{dataQuality.level}</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-3">
                <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                    <div className="flex items-center gap-1 md:gap-2 mb-1"><Thermometer className="w-3 h-3 md:w-4 md:h-4 text-red-400" /><span className="text-xs text-slate-400">Temperature</span></div>
                    <div className="text-sm md:text-lg font-bold text-red-300">{formatValue(envData?.temperature || getCurrentValue('Temperature'), 'temperature')}</div>
                </div>
                <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                    <div className="flex items-center gap-1 md:gap-2 mb-1"><Droplets className="w-3 h-3 md:w-4 md:h-4 text-blue-400" /><span className="text-xs text-slate-400">Salinity</span></div>
                    <div className="text-sm md:text-lg font-bold text-blue-300">{formatValue(envData?.salinity || getCurrentValue('Salinity'), 'salinity')}</div>
                </div>
                <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                    <div className="flex items-center gap-1 md:gap-2 mb-1"><Navigation className="w-3 h-3 md:w-4 md:h-4 text-cyan-400" /><span className="text-xs text-slate-400">Current Dir</span></div>
                    <div className="text-sm md:text-lg font-bold text-cyan-300">{formatValue(envData?.currentDirection || getCurrentValue('Current Direction'), 'direction')}</div>
                </div>
                <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                    <div className="flex items-center gap-1 md:gap-2 mb-1"><Wind className="w-3 h-3 md:w-4 md:h-4 text-amber-400" /><span className="text-xs text-slate-400">Wind Speed</span></div>
                    <div className="text-sm md:text-lg font-bold text-amber-300">{formatValue(envData?.currentSpeed || getCurrentValue('Wind Speed'), 'speed')}</div>
                </div>
                <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg">
                    <div className="flex items-center gap-1 md:gap-2 mb-1"><Activity className="w-3 h-3 md:w-4 md:h-4 text-purple-400" /><span className="text-xs text-slate-400">Pressure</span></div>
                    <div className="text-sm md:text-lg font-bold text-purple-300">{formatValue(envData?.pressure || getCurrentValue('Pressure'), 'pressure')}</div>
                </div>
            </div>
          </div>
        )}

        {showHoloOcean && (
          <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 p-2 md:p-4 rounded-lg border border-green-500/10">
            <div className="flex items-center justify-between mb-2 md:mb-4">
              <h2 className="font-semibold text-green-300 flex items-center gap-2 text-sm md:text-base">
                <Compass className="w-4 h-4 md:w-5 md:h-5" />
                HoloOcean Visualization
              </h2>
              <button onClick={() => setExpandedPanel(expandedPanel === 'holo' ? null : 'holo')} className="p-1 text-green-400 hover:text-green-300">
                {expandedPanel === 'holo' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">3D Environmental Data Display</p>
            <div className={`bg-gradient-to-b from-green-900/30 to-blue-900/30 rounded-lg border border-green-500/20 relative overflow-hidden transition-all duration-300 ${expandedPanel === 'holo' ? 'h-80 md:h-96' : 'h-48 md:h-64'}`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-green-300/70">
                  <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 relative">
                    <div className="absolute inset-0 border-2 border-green-400/30 rounded-full animate-ping"></div>
                    <div className="absolute inset-2 border-2 border-green-400/50 rounded-full animate-pulse"></div>
                    <div className="absolute inset-4 bg-green-400/20 rounded-full"></div>
                  </div>
                  <p className="text-xs md:text-sm font-semibold">HoloOcean 3D Stream</p>
                  <p className="text-xs text-slate-400 mt-1">{isStreaming ? 'WebRTC Connected' : 'Connecting...'}</p>
                </div>
              </div>
              <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold ${isStreaming ? 'bg-green-600' : 'bg-yellow-600'}`}>{isStreaming ? 'LIVE' : 'BUFFER'}</div>
              <div className="absolute top-2 right-2 text-xs text-green-300">POV: {holoOceanPOV.x.toFixed(1)}, {holoOceanPOV.y.toFixed(1)}</div>
              <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 right-2 md:right-4">
                <div className="bg-slate-800/80 p-2 rounded">
                  <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                    <span>Depth Profile</span>
                    <span>{selectedDepth}ft</span>
                  </div>
                  <div className="h-8 md:h-12 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded relative cursor-pointer"
                       onClick={(e) => {
                         const rect = e.currentTarget.getBoundingClientRect();
                         const x = (e.clientX - rect.left) / rect.width;
                         const newDepth = Math.round(x * maxDepth);
                         onDepthChange?.(newDepth);
                       }}>
                    <div className="absolute w-1 h-full bg-yellow-400 rounded shadow-lg" style={{ left: `${(selectedDepth / maxDepth) * 100}%` }}></div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>Surface</span>
                    <span>{maxDepth}ft</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {showCharts && (
        <div className="col-span-1 md:col-span-1 lg:col-span-1 p-2 md:p-4 border-slate-700">
            <div className="flex items-center justify-between mb-2 md:mb-3">
                <h3 className="text-xs md:text-sm font-semibold text-slate-300 flex items-center gap-1 md:gap-2"><TrendingUp className="w-3 h-3 md:w-4 md:h-4" />Time Series Analysis</h3>
                <div className="flex items-center gap-1">
                    <select value={chartTimeRange} onChange={(e) => setChartTimeRange(Number(e.target.value))} className="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs text-white">
                        <option value={12}>12h</option>
                        <option value={24}>24h</option>
                        <option value={48}>48h</option>
                    </select>
                </div>
            </div>
            <div className="space-y-2 md:space-y-4">
                <div className="bg-slate-700/30 p-2 md:p-3 rounded-lg">
                    <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                        <span>Wind Speed (m/s)</span>
                        <span className="text-amber-300">{formatValue(getCurrentValue('Wind Speed'), 'speed')}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={60}>
                        <LineChart data={getChartData('Wind Speed', chartTimeRange)}>
                            <Line type="monotone" dataKey="value" stroke="#fcd34d" strokeWidth={2} dot={false} />
                            <XAxis hide /><YAxis hide />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: '1px solid #374151', 
                                borderRadius: '6px', 
                                fontSize: '12px',
                                color: '#ffffff'
                              }} 
                              formatter={(value) => [`${Number(value).toFixed(3)} m/s`, 'Wind Speed']} 
                              labelFormatter={(label) => `Time: ${label}`}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-slate-700/30 p-2 md:p-3 rounded-lg">
                    <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                        <span>Current Direction (°)</span>
                        <span className="text-emerald-300">{formatValue(getCurrentValue('Current Direction'), 'direction')}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={60}>
                        <LineChart data={getChartData('Current Direction', chartTimeRange)}>
                            <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                            <XAxis hide /><YAxis hide />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: '1px solid #374151', 
                                borderRadius: '6px', 
                                fontSize: '12px',
                                color: '#ffffff'
                              }} 
                              formatter={(value) => [`${Number(value).toFixed(1)}°`, 'Direction']} 
                              labelFormatter={(label) => `Time: ${label}`}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-slate-700/30 p-2 md:p-3 rounded-lg">
                    <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                        <span>Sound Speed (m/s)</span>
                        <span className="text-green-300">{formatValue(getCurrentValue('Sound Speed'), 'soundSpeed')}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={60}>
                        <AreaChart data={getChartData('Sound Speed', chartTimeRange)}>
                            <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                            <XAxis hide /><YAxis hide />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: '1px solid #374151', 
                                borderRadius: '6px', 
                                fontSize: '12px',
                                color: '#ffffff'
                              }} 
                              formatter={(value) => [`${Number(value).toFixed(2)} m/s`, 'Sound Speed']} 
                              labelFormatter={(label) => `Time: ${label}`}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-slate-700/30 p-2 md:p-3 rounded-lg">
                    <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                        <span>Temperature (°F)</span>
                        <span className="text-orange-300">{formatValue(getCurrentValue('Temperature'), 'temperature')}</span>
                    </div>
                    <ResponsiveContainer width="100%" height={60}>
                        <LineChart data={getChartData('Temperature', chartTimeRange)}>
                            <Line type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={2} dot={false} />
                            <XAxis hide /><YAxis hide />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1f2937', 
                                border: '1px solid #374151', 
                                borderRadius: '6px', 
                                fontSize: '12px',
                                color: '#ffffff'
                              }} 
                              formatter={(value) => [`${Number(value).toFixed(2)}°F`, 'Temp']} 
                              labelFormatter={(label) => `Time: ${label}`}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default DataPanels;