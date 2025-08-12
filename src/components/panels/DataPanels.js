import React, { useState, useEffect } from 'react';
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
  PieChart,
  RefreshCw,
  Zap,
  Wind,
  Navigation
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const DataPanels = ({
  // Environmental data
  envData = {
    temperature: null,
    salinity: null,
    pressure: null,
    depth: 33
  },
  
  // HoloOcean data
  holoOceanPOV = { x: 0, y: 0, depth: 33 },
  selectedDepth = 33,
  
  // Time series data
  timeSeriesData = [],
  currentFrame = 0,
  
  // Configuration
  showHoloOcean = true,
  showEnvironmental = true,
  showCharts = true,
  showAdvancedMetrics = false,
  
  // Callbacks
  onDepthChange,
  onPOVChange,
  onRefreshData,
  
  className = ""
}) => {
  
  const [expandedPanel, setExpandedPanel] = useState(null);
  const [chartTimeRange, setChartTimeRange] = useState(24); // hours
  const [selectedChartMetric, setSelectedChartMetric] = useState('currentSpeed');
  const [isStreaming, setIsStreaming] = useState(true);

  // Simulate streaming status
  useEffect(() => {
    const interval = setInterval(() => {
      setIsStreaming(prev => Math.random() > 0.1 ? true : prev);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get current data point
  const getCurrentData = () => {
    if (!timeSeriesData.length) return null;
    return timeSeriesData[currentFrame % timeSeriesData.length];
  };

  // Format value with units
  const formatValue = (value, type) => {
    if (value === null || value === undefined) return 'No Data';
    
    switch (type) {
      case 'temperature':
        return `${value.toFixed(2)}°F`;
      case 'salinity':
        return `${value.toFixed(2)} PSU`;
      case 'pressure':
        return `${value.toFixed(1)} dbar`;
      case 'depth':
        return `${value} ft`;
      case 'speed':
        return `${value.toFixed(3)} m/s`;
      case 'direction':
        return `${value.toFixed(1)}°`;
      case 'height':
        return `${value.toFixed(2)} m`;
      default:
        return value.toString();
    }
  };

  // Get data quality indicator
  const getDataQuality = () => {
    if (!timeSeriesData.length) return { level: 'No Data', color: 'text-red-400' };
    
    const dataAge = Date.now() - new Date(timeSeriesData[timeSeriesData.length - 1]?.timestamp || 0);
    const hoursOld = dataAge / (1000 * 60 * 60);
    
    if (hoursOld < 1) return { level: 'Real-time', color: 'text-green-400' };
    if (hoursOld < 6) return { level: 'Recent', color: 'text-blue-400' };
    if (hoursOld < 24) return { level: 'Delayed', color: 'text-yellow-400' };
    return { level: 'Historical', color: 'text-orange-400' };
  };

  // Chart data for different time ranges
  const getChartData = (metric, range = 24) => {
    return timeSeriesData.slice(-range).map(item => ({
      time: item.time || new Date(item.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      value: item[metric] || 0,
      ...item
    }));
  };

  const currentData = getCurrentData();
  const dataQuality = getDataQuality();

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-green-500/30 ${className}`}>
      
      {/* HoloOcean Visualization Panel */}
      {showHoloOcean && (
        <div className="col-span-1 md:col-span-1 lg:col-span-1 p-2 md:p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-r border-green-500/10">
          <div className="flex items-center justify-between mb-2 md:mb-4">
            <h2 className="font-semibold text-green-300 flex items-center gap-2 text-sm md:text-base">
              <Compass className="w-4 h-4 md:w-5 md:h-5" />
              HoloOcean Visualization
            </h2>
            <button
              onClick={() => setExpandedPanel(expandedPanel === 'holo' ? null : 'holo')}
              className="p-1 text-green-400 hover:text-green-300 transition-colors"
            >
              {expandedPanel === 'holo' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
          
          <p className="text-xs text-slate-400 mb-3">3D Environmental Data Display</p>
          
          {/* 3D Visualization Container */}
          <div className={`bg-gradient-to-b from-green-900/30 to-blue-900/30 rounded-lg border border-green-500/20 relative overflow-hidden transition-all duration-300 ${
            expandedPanel === 'holo' ? 'h-80 md:h-96' : 'h-48 md:h-64'
          }`}>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-green-300/70">
                <div className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-2 md:mb-4 relative">
                  <div className="absolute inset-0 border-2 border-green-400/30 rounded-full animate-ping"></div>
                  <div className="absolute inset-2 border-2 border-green-400/50 rounded-full animate-pulse"></div>
                  <div className="absolute inset-4 bg-green-400/20 rounded-full"></div>
                </div>
                <p className="text-xs md:text-sm font-semibold">HoloOcean 3D Stream</p>
                <p className="text-xs text-slate-400 mt-1">
                  {isStreaming ? 'WebRTC Connected' : 'Connecting...'}
                </p>
              </div>
            </div>
            
            {/* Streaming overlay indicators */}
            <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold ${
              isStreaming ? 'bg-green-600' : 'bg-yellow-600'
            }`}>
              {isStreaming ? 'LIVE' : 'BUFFER'}
            </div>
            
            <div className="absolute top-2 right-2 text-xs text-green-300">
              POV: {holoOceanPOV.x.toFixed(1)}, {holoOceanPOV.y.toFixed(1)}
            </div>
            
            {/* Depth profile visualization */}
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
                       const newDepth = Math.round(x * 200);
                       if (onDepthChange) onDepthChange(newDepth);
                     }}
                >
                  <div 
                    className="absolute w-1 h-full bg-yellow-400 rounded shadow-lg"
                    style={{ left: `${(selectedDepth / 200) * 100}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>Surface</span>
                  <span>200ft</span>
                </div>
              </div>
            </div>

            {/* Water column visualization */}
            {expandedPanel === 'holo' && (
              <div className="absolute right-2 top-12 bottom-16 w-8 bg-gradient-to-b from-cyan-400/20 to-blue-800/40 rounded border border-blue-400/30">
                <div 
                  className="absolute w-full h-0.5 bg-yellow-400 shadow-lg"
                  style={{ top: `${(selectedDepth / 200) * 100}%` }}
                ></div>
                <div className="absolute -right-8 top-0 text-xs text-cyan-300 writing-mode-vertical">
                  Surface
                </div>
                <div className="absolute -right-12 bottom-0 text-xs text-blue-300 writing-mode-vertical">
                  Seafloor
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Environmental Data Panel */}
      {showEnvironmental && (
        <div className="col-span-1 md:col-span-1 lg:col-span-1 p-2 md:p-4 border-slate-700">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <h3 className="text-xs md:text-sm font-semibold text-slate-300 flex items-center gap-1">
              <Activity className="w-3 h-3 md:w-4 md:h-4" />
              Environmental Data
            </h3>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${dataQuality.color.replace('text-', 'bg-')}`}></div>
              <span className={`text-xs ${dataQuality.color}`}>{dataQuality.level}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 md:gap-3">
            
            {/* Temperature */}
            <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg transition-all duration-300 hover:bg-slate-700/70">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <Thermometer className="w-3 h-3 md:w-4 md:h-4 text-red-400" />
                <span className="text-xs text-slate-400">Temperature</span>
              </div>
              <div className="text-sm md:text-lg font-bold text-red-300">
                {formatValue(envData.temperature, 'temperature')}
              </div>
              {currentData?.temperature && (
                <div className="text-xs text-slate-500 mt-1">
                  Trend: {currentData.temperature > (envData.temperature || 0) ? '↗' : '↘'}
                </div>
              )}
            </div>
            
            {/* Salinity */}
            <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg transition-all duration-300 hover:bg-slate-700/70">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <Droplets className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />
                <span className="text-xs text-slate-400">Salinity</span>
              </div>
              <div className="text-sm md:text-lg font-bold text-blue-300">
                {formatValue(envData.salinity, 'salinity')}
              </div>
              {showAdvancedMetrics && (
                <div className="text-xs text-slate-500 mt-1">
                  Conductivity: 4.2 S/m
                </div>
              )}
            </div>
            
            {/* Pressure */}
            <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg transition-all duration-300 hover:bg-slate-700/70">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <Activity className="w-3 h-3 md:w-4 md:h-4 text-purple-400" />
                <span className="text-xs text-slate-400">Pressure</span>
              </div>
              <div className="text-sm md:text-lg font-bold text-purple-300">
                {formatValue(envData.pressure, 'pressure')}
              </div>
              {showAdvancedMetrics && envData.pressure && (
                <div className="text-xs text-slate-500 mt-1">
                  ~{(envData.pressure * 1.02).toFixed(0)} m depth
                </div>
              )}
            </div>
            
            {/* Depth */}
            <div className="bg-slate-700/50 p-2 md:p-3 rounded-lg transition-all duration-300 hover:bg-slate-700/70">
              <div className="flex items-center gap-1 md:gap-2 mb-1">
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-cyan-400" />
                <span className="text-xs text-slate-400">Sensor Depth</span>
              </div>
              <div className="text-sm md:text-lg font-bold text-cyan-300">
                {formatValue(envData.depth, 'depth')}
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          {showAdvancedMetrics && currentData && (
            <div className="mt-3 pt-3 border-t border-slate-600">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {currentData.windSpeed && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <Wind className="w-3 h-3" />
                    <span>Wind: {formatValue(currentData.windSpeed, 'speed')}</span>
                  </div>
                )}
                {currentData.heading && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <Navigation className="w-3 h-3" />
                    <span>Dir: {formatValue(currentData.heading, 'direction')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Advanced 3D Display Panel */}
      <div className="col-span-1 md:col-span-1 lg:col-span-1 p-2 md:p-4">
        <div className="flex items-center justify-between mb-2 md:mb-3">
          <h3 className="text-xs md:text-sm font-semibold text-slate-300 flex items-center gap-1">
            <Eye className="w-3 h-3 md:w-4 md:h-4" />
            Data Visualization
          </h3>
          <button
            onClick={onRefreshData}
            className="p-1 text-slate-400 hover:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {/* Metric Selection */}
          <div>
            <select
              value={selectedChartMetric}
              onChange={(e) => setSelectedChartMetric(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
            >
              <option value="currentSpeed">Current Speed</option>
              <option value="temperature">Temperature</option>
              <option value="waveHeight">Wave Height</option>
              <option value="salinity">Salinity</option>
              <option value="pressure">Pressure</option>
            </select>
          </div>

          {/* Current Reading */}
          {currentData && (
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">Current Reading</div>
              <div className="text-lg font-bold text-green-300">
                {formatValue(currentData[selectedChartMetric], 
                  selectedChartMetric.includes('Speed') ? 'speed' :
                  selectedChartMetric.includes('Height') ? 'height' :
                  selectedChartMetric.includes('temperature') ? 'temperature' :
                  selectedChartMetric.includes('salinity') ? 'salinity' :
                  selectedChartMetric.includes('pressure') ? 'pressure' : 'default'
                )}
              </div>
            </div>
          )}

          {/* Mini Statistics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-slate-700/30 p-2 rounded">
              <div className="text-slate-400">Data Points</div>
              <div className="font-semibold text-slate-200">{timeSeriesData.length}</div>
            </div>
            <div className="bg-slate-700/30 p-2 rounded">
              <div className="text-slate-400">Update Rate</div>
              <div className="font-semibold text-slate-200">15min</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Time Series Charts Panel */}
      {showCharts && (
        <div className="col-span-1 md:col-span-1 lg:col-span-1 p-2 md:p-4 border-slate-700">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <h3 className="text-xs md:text-sm font-semibold text-slate-300 flex items-center gap-1 md:gap-2">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
              Time Series Analysis
            </h3>
            <div className="flex items-center gap-1">
              <select
                value={chartTimeRange}
                onChange={(e) => setChartTimeRange(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs"
              >
                <option value={12}>12h</option>
                <option value={24}>24h</option>
                <option value={48}>48h</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2 md:space-y-4">
            
            {/* Current Speed Chart */}
            <div className="bg-slate-700/30 p-2 md:p-3 rounded-lg">
              <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                <span>Current Speed (m/s)</span>
                <span className="text-cyan-300">
                  {currentData ? formatValue(currentData.currentSpeed, 'speed') : 'N/A'}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={getChartData('currentSpeed', chartTimeRange)}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
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
                    formatter={(value) => [`${value.toFixed(3)} m/s`, 'Speed']}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            {/* Wave Height Chart */}
            <div className="bg-slate-700/30 p-2 md:p-3 rounded-lg">
              <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                <span>Wave Height (m)</span>
                <span className="text-green-300">
                  {currentData ? formatValue(currentData.waveHeight, 'height') : 'N/A'}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={60}>
                <AreaChart data={getChartData('waveHeight', chartTimeRange)}>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.3}
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
                    formatter={(value) => [`${value.toFixed(2)} m`, 'Height']}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Temperature Chart */}
            <div className="bg-slate-700/30 p-2 md:p-3 rounded-lg">
              <div className="text-xs text-slate-400 mb-2 flex items-center justify-between">
                <span>Temperature (°F)</span>
                <span className="text-orange-300">
                  {currentData ? formatValue(currentData.temperature, 'temperature') : 'N/A'}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={60}>
                <LineChart data={getChartData('temperature', chartTimeRange)}>
                  <Line 
                    type="monotone" 
                    dataKey="value" 
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
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`${value?.toFixed(2)}°F`, 'Temp']}
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