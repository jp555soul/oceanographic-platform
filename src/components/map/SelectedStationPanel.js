import React, { useState, useMemo } from 'react';
import { 
  X, 
  MapPin, 
  Database, 
  BarChart3, 
  Clock, 
  FileText, 
  Activity, 
  TrendingUp,
  Download,
  Eye,
  Waves,
  Thermometer,
  Droplets,
  Navigation,
  Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const SelectedStationPanel = ({
  station,
  csvData = [],
  onClose,
  onAnalyze,
  onAddChatMessage,
  showCharts = true,
  showDataExport = true,
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Filter CSV data for this specific station
  const stationCsvData = useMemo(() => {
    if (!station || !csvData.length) return [];
    
    return csvData.filter(row => {
      if (!row.lat || !row.lon) return false;
      const latDiff = Math.abs(row.lat - station.coordinates[1]);
      const lngDiff = Math.abs(row.lon - station.coordinates[0]);
      return latDiff < 0.001 && lngDiff < 0.001; // Within ~100m
    });
  }, [station, csvData]);

  // Process data for charts
  const chartData = useMemo(() => {
    if (!stationCsvData.length) return [];
    
    return stationCsvData
      .filter(row => row.time)
      .sort((a, b) => new Date(a.time) - new Date(b.time))
      .slice(-48) // Last 48 data points
      .map(row => ({
        time: new Date(row.time).toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        }),
        timestamp: new Date(row.time),
        currentSpeed: row.speed || 0,
        temperature: row.temp || null,
        salinity: row.salinity || null,
        waveHeight: row.ssh || 0,
        pressure: row.pressure_dbars || null,
        windSpeed: row.windspeed || 0
      }));
  }, [stationCsvData]);

  // Get station statistics
  const stationStats = useMemo(() => {
    if (!stationCsvData.length) {
      return {
        totalMeasurements: 0,
        timeSpan: null,
        avgTemperature: null,
        avgCurrentSpeed: null,
        maxWaveHeight: null,
        dataQuality: 'No Data'
      };
    }

    const timestamps = stationCsvData
      .filter(row => row.time)
      .map(row => new Date(row.time))
      .sort((a, b) => a - b);

    const temperatures = stationCsvData.map(row => row.temp).filter(t => t !== null && t !== undefined);
    const speeds = stationCsvData.map(row => row.speed).filter(s => s !== null && s !== undefined);
    const waveHeights = stationCsvData.map(row => row.ssh).filter(h => h !== null && h !== undefined);

    return {
      totalMeasurements: stationCsvData.length,
      timeSpan: timestamps.length > 1 ? {
        start: timestamps[0],
        end: timestamps[timestamps.length - 1],
        duration: timestamps[timestamps.length - 1] - timestamps[0]
      } : null,
      avgTemperature: temperatures.length > 0 ? temperatures.reduce((a, b) => a + b, 0) / temperatures.length : null,
      avgCurrentSpeed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null,
      maxWaveHeight: waveHeights.length > 0 ? Math.max(...waveHeights) : null,
      dataQuality: stationCsvData.length > 100 ? 'Excellent' : 
                   stationCsvData.length > 50 ? 'Good' : 
                   stationCsvData.length > 10 ? 'Fair' : 'Limited'
    };
  }, [stationCsvData]);

  // Handle station analysis
  const handleAnalyze = async () => {
    if (!station || !onAnalyze) return;
    
    setIsAnalyzing(true);
    
    try {
      const analysisData = onAnalyze(station);
      
      // Generate analysis message
      const analysisMessage = generateAnalysisMessage(station, stationStats, chartData);
      
      // Add to chat if callback provided
      if (onAddChatMessage) {
        onAddChatMessage({
          id: Date.now(),
          content: analysisMessage,
          isUser: false,
          timestamp: new Date(),
          type: 'analysis'
        });
      }
      
      console.log(`Station ${station.name} analysis completed:`, analysisData);
      
    } catch (error) {
      console.error('Station analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate comprehensive analysis message
  const generateAnalysisMessage = (station, stats, data) => {
    const location = `${station.coordinates[1].toFixed(4)}°N, ${station.coordinates[0].toFixed(4)}°W`;
    
    let message = `Station Analysis: ${station.name} located at ${location}`;
    
    if (stats.totalMeasurements > 0) {
      message += ` contains ${stats.totalMeasurements} measurements.`;
      
      if (stats.timeSpan) {
        const days = Math.floor(stats.timeSpan.duration / (1000 * 60 * 60 * 24));
        message += ` Data spans ${days > 0 ? `${days} days` : 'single day'} from ${stats.timeSpan.start.toLocaleDateString()} to ${stats.timeSpan.end.toLocaleDateString()}.`;
      }
      
      const conditions = [];
      if (stats.avgTemperature !== null) {
        conditions.push(`average temperature: ${stats.avgTemperature.toFixed(2)}°C`);
      }
      if (stats.avgCurrentSpeed !== null) {
        conditions.push(`average current speed: ${stats.avgCurrentSpeed.toFixed(3)} m/s`);
      }
      if (stats.maxWaveHeight !== null) {
        conditions.push(`maximum wave height: ${stats.maxWaveHeight.toFixed(2)} m`);
      }
      
      if (conditions.length > 0) {
        message += ` Latest conditions show ${conditions.join(', ')}.`;
      }
      
      message += ` Data quality assessment: ${stats.dataQuality}.`;
    } else {
      message += ` but no measurement data is currently available for analysis.`;
    }
    
    return message;
  };

  // Export station data
  const handleExport = () => {
    if (!stationCsvData.length) return;
    
    const csvContent = [
      ['timestamp', 'latitude', 'longitude', 'temperature', 'current_speed', 'wave_height', 'salinity', 'pressure'],
      ...stationCsvData.map(row => [
        row.time,
        row.lat,
        row.lon,
        row.temp || '',
        row.speed || '',
        row.ssh || '',
        row.salinity || '',
        row.pressure_dbars || ''
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${station.name.replace(/\s+/g, '_')}_data.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (!station) return null;

  const getStationTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'usm': return 'text-blue-400 bg-blue-400/10';
      case 'ndbc': return 'text-yellow-400 bg-yellow-400/10';
      case 'csv_station': return 'text-green-400 bg-green-400/10';
      default: return 'text-slate-400 bg-slate-400/10';
    }
  };

  return (
    <div className={`absolute top-4 md:top-16 left-2 md:left-4 bg-slate-800/95 backdrop-blur-sm border border-blue-400/30 rounded-lg shadow-xl max-w-sm md:max-w-md z-30 ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 md:p-4 border-b border-slate-700">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <div className="font-semibold text-blue-300 text-sm md:text-base">{station.name}</div>
          </div>
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getStationTypeColor(station.type)}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
            {station.type === 'csv_station' ? 'Data Station' : 
             station.type === 'usm' ? 'USM Station' : 
             station.type === 'ndbc' ? 'NDBC Buoy' : 'Station'}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 px-3 py-2 text-xs md:text-sm font-medium transition-colors ${
            activeTab === 'overview' 
              ? 'text-blue-300 border-b-2 border-blue-400 bg-blue-400/5' 
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Overview
        </button>
        {chartData.length > 0 && showCharts && (
          <button
            onClick={() => setActiveTab('charts')}
            className={`flex-1 px-3 py-2 text-xs md:text-sm font-medium transition-colors ${
              activeTab === 'charts' 
                ? 'text-blue-300 border-b-2 border-blue-400 bg-blue-400/5' 
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            Charts
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-3 md:p-4 max-h-96 overflow-y-auto">
        
        {activeTab === 'overview' && (
          <div className="space-y-4">
            
            {/* Location */}
            <div className="bg-slate-700/30 p-3 rounded">
              <div className="text-xs text-slate-400 mb-1">Location</div>
              <div className="text-slate-200 font-mono text-sm">
                {station.coordinates[1].toFixed(6)}°N<br />
                {station.coordinates[0].toFixed(6)}°W
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/30 p-3 rounded">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Data Points
                </div>
                <div className="text-slate-200 font-semibold">
                  {stationStats.totalMeasurements.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-slate-700/30 p-3 rounded">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Quality
                </div>
                <div className={`font-semibold text-xs ${
                  stationStats.dataQuality === 'Excellent' ? 'text-green-400' :
                  stationStats.dataQuality === 'Good' ? 'text-blue-400' :
                  stationStats.dataQuality === 'Fair' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {stationStats.dataQuality}
                </div>
              </div>
            </div>

            {/* Current Conditions */}
            {stationStats.totalMeasurements > 0 && (
              <div className="bg-slate-700/30 p-3 rounded">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Average Conditions
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  {stationStats.avgTemperature !== null && (
                    <div className="flex items-center gap-1">
                      <Thermometer className="w-3 h-3 text-red-400" />
                      <div>
                        <div className="text-slate-400">Temperature</div>
                        <div className="text-slate-200">{stationStats.avgTemperature.toFixed(1)}°C</div>
                      </div>
                    </div>
                  )}
                  {stationStats.avgCurrentSpeed !== null && (
                    <div className="flex items-center gap-1">
                      <Navigation className="w-3 h-3 text-cyan-400" />
                      <div>
                        <div className="text-slate-400">Current</div>
                        <div className="text-slate-200">{stationStats.avgCurrentSpeed.toFixed(2)} m/s</div>
                      </div>
                    </div>
                  )}
                  {stationStats.maxWaveHeight !== null && (
                    <div className="flex items-center gap-1">
                      <Waves className="w-3 h-3 text-blue-400" />
                      <div>
                        <div className="text-slate-400">Max Wave</div>
                        <div className="text-slate-200">{stationStats.maxWaveHeight.toFixed(2)} m</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Time Range */}
            {stationStats.timeSpan && (
              <div className="bg-slate-700/30 p-3 rounded">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Data Range
                </div>
                <div className="text-slate-200 text-xs">
                  <div>{stationStats.timeSpan.start.toLocaleDateString()} - {stationStats.timeSpan.end.toLocaleDateString()}</div>
                  <div className="text-slate-400 mt-1">
                    {Math.floor(stationStats.timeSpan.duration / (1000 * 60 * 60 * 24))} days of data
                  </div>
                </div>
              </div>
            )}

            {/* Source Files */}
            {station.sourceFiles && station.sourceFiles.length > 0 && (
              <div className="bg-slate-700/30 p-3 rounded">
                <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Data Sources
                </div>
                <div className="space-y-1">
                  {station.sourceFiles.slice(0, 3).map((file, index) => (
                    <div key={index} className="text-xs text-slate-200 font-mono truncate">
                      {file}
                    </div>
                  ))}
                  {station.sourceFiles.length > 3 && (
                    <div className="text-xs text-slate-400">
                      +{station.sourceFiles.length - 3} more files
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'charts' && chartData.length > 0 && (
          <div className="space-y-4">
            
            {/* Current Speed Chart */}
            <div className="bg-slate-700/30 p-3 rounded">
              <div className="text-xs text-slate-400 mb-2">Current Speed (m/s)</div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData.slice(-24)}>
                  <XAxis dataKey="time" tick={false} />
                  <YAxis tick={false} />
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <Line 
                    type="monotone" 
                    dataKey="currentSpeed" 
                    stroke="#22d3ee" 
                    strokeWidth={2}
                    dot={false}
                  />
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

            {/* Temperature Chart */}
            {chartData.some(d => d.temperature !== null) && (
              <div className="bg-slate-700/30 p-3 rounded">
                <div className="text-xs text-slate-400 mb-2">Temperature (°C)</div>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={chartData.slice(-24)}>
                    <XAxis dataKey="time" tick={false} />
                    <YAxis tick={false} />
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <Line 
                      type="monotone" 
                      dataKey="temperature" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        fontSize: '12px'
                      }}
                      formatter={(value) => [`${value?.toFixed(2)}°C`, 'Temperature']}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-3 md:p-4 border-t border-slate-700 space-y-2">
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || stationStats.totalMeasurements === 0}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed px-3 py-2 rounded text-xs md:text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {isAnalyzing ? (
            <>
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Analyzing...
            </>
          ) : (
            <>
              <BarChart3 className="w-4 h-4" />
              Analyze Station Data
            </>
          )}
        </button>

        {showDataExport && stationCsvData.length > 0 && (
          <button
            onClick={handleExport}
            className="w-full bg-slate-600 hover:bg-slate-500 px-3 py-2 rounded text-xs md:text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export Data ({stationCsvData.length} records)
          </button>
        )}
      </div>
    </div>
  );
};

export default SelectedStationPanel;