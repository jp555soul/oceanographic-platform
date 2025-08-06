import React, { useEffect, useState } from 'react';
import { MapPin, Database, Clock, Activity, Waves, Thermometer } from 'lucide-react';

const StationTooltip = ({ 
  station, 
  showDetails = true,
  showDataPreview = false,
  timeSeriesData = [],
  currentFrame = 0,
  className = ""
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Handle visibility and positioning
  useEffect(() => {
    if (station) {
      setIsVisible(true);
      setPosition({ x: station.x, y: station.y });
    } else {
      setIsVisible(false);
    }
  }, [station]);

  // Get current data for this station if available
  const getCurrentStationData = () => {
    if (!timeSeriesData.length || !station) return null;
    
    const currentData = timeSeriesData[currentFrame % timeSeriesData.length];
    return currentData;
  };

  // Format coordinate display
  const formatCoordinate = (lat, lng) => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
  };

  // Get station type styling
  const getStationTypeInfo = (type) => {
    switch (type?.toLowerCase()) {
      case 'usm':
        return {
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          label: 'USM Station'
        };
      case 'ndbc':
        return {
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-400/10',
          label: 'NDBC Buoy'
        };
      case 'csv_station':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-400/10',
          label: 'Data Station'
        };
      default:
        return {
          color: 'text-slate-400',
          bgColor: 'bg-slate-400/10',
          label: 'Unknown'
        };
    }
  };

  // Format data count display
  const formatDataCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  // Get time range display
  const getTimeRangeDisplay = (station) => {
    if (!station.timeRange) return null;
    
    const { start, end } = station.timeRange;
    const duration = end - start;
    const days = Math.floor(duration / (1000 * 60 * 60 * 24));
    
    return {
      start: start.toLocaleDateString(),
      end: end.toLocaleDateString(),
      duration: days > 0 ? `${days} days` : 'Same day'
    };
  };

  if (!isVisible || !station) return null;

  const stationTypeInfo = getStationTypeInfo(station.type);
  const currentData = getCurrentStationData();
  const timeRange = getTimeRangeDisplay(station);

  return (
    <div 
      className={`absolute pointer-events-none bg-slate-800/95 backdrop-blur-sm border border-blue-400/50 rounded-lg shadow-xl z-50 transition-opacity duration-200 ${className}`}
      style={{ 
        left: position.x + 15, 
        top: position.y - 10,
        transform: 'translateY(-100%)',
        maxWidth: '280px'
      }}
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-blue-400" />
          <div className="font-semibold text-blue-300 text-sm">{station.name}</div>
        </div>
        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${stationTypeInfo.bgColor} ${stationTypeInfo.color}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current"></div>
          {stationTypeInfo.label}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 space-y-2">
        
        {/* Coordinates */}
        <div className="text-xs">
          <div className="text-slate-400 mb-1">Location</div>
          <div className="text-slate-200 font-mono">
            {formatCoordinate(station.coordinates[1], station.coordinates[0])}
          </div>
        </div>

        {showDetails && (
          <>
            {/* Data Points */}
            {station.dataPoints && (
              <div className="text-xs">
                <div className="text-slate-400 mb-1 flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Data Points
                </div>
                <div className="text-slate-200">
                  {formatDataCount(station.dataPoints)} measurements
                </div>
              </div>
            )}

            {/* Time Range */}
            {timeRange && (
              <div className="text-xs">
                <div className="text-slate-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Time Range
                </div>
                <div className="text-slate-200">
                  <div>{timeRange.start} - {timeRange.end}</div>
                  <div className="text-slate-400">({timeRange.duration})</div>
                </div>
              </div>
            )}

            {/* Source Files */}
            {station.sourceFiles && station.sourceFiles.length > 0 && (
              <div className="text-xs">
                <div className="text-slate-400 mb-1">Data Sources</div>
                <div className="text-slate-200 space-y-0.5">
                  {station.sourceFiles.slice(0, 3).map((file, index) => (
                    <div key={index} className="truncate font-mono text-xs">
                      {file}
                    </div>
                  ))}
                  {station.sourceFiles.length > 3 && (
                    <div className="text-slate-400">
                      +{station.sourceFiles.length - 3} more files
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Available Parameters */}
            {station.availableParameters && station.availableParameters.length > 0 && (
              <div className="text-xs">
                <div className="text-slate-400 mb-1">Available Parameters</div>
                <div className="flex flex-wrap gap-1">
                  {station.availableParameters.slice(0, 4).map((param, index) => (
                    <span 
                      key={index}
                      className="px-1.5 py-0.5 bg-slate-700/50 text-slate-300 rounded text-xs"
                    >
                      {param}
                    </span>
                  ))}
                  {station.availableParameters.length > 4 && (
                    <span className="px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded text-xs">
                      +{station.availableParameters.length - 4}
                    </span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Current Data Preview */}
        {showDataPreview && currentData && (
          <div className="border-t border-slate-700/50 pt-2 mt-2">
            <div className="text-slate-400 mb-2 text-xs flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Current Readings
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {currentData.currentSpeed && (
                <div className="flex items-center gap-1">
                  <Waves className="w-3 h-3 text-cyan-400" />
                  <div>
                    <div className="text-slate-400">Current</div>
                    <div className="text-slate-200">{currentData.currentSpeed.toFixed(2)} m/s</div>
                  </div>
                </div>
              )}
              {currentData.temperature && (
                <div className="flex items-center gap-1">
                  <Thermometer className="w-3 h-3 text-red-400" />
                  <div>
                    <div className="text-slate-400">Temp</div>
                    <div className="text-slate-200">{currentData.temperature.toFixed(1)}°C</div>
                  </div>
                </div>
              )}
              {currentData.waveHeight && (
                <div className="flex items-center gap-1">
                  <Waves className="w-3 h-3 text-blue-400" />
                  <div>
                    <div className="text-slate-400">Wave</div>
                    <div className="text-slate-200">{currentData.waveHeight.toFixed(2)} m</div>
                  </div>
                </div>
              )}
              {currentData.salinity && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <div>
                    <div className="text-slate-400">Salinity</div>
                    <div className="text-slate-200">{currentData.salinity.toFixed(1)} PSU</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-slate-700/50 bg-slate-900/50">
        <div className="text-xs text-slate-400 text-center">
          Click station to select and analyze
        </div>
      </div>

      {/* Tooltip arrow */}
      <div 
        className="absolute w-2 h-2 bg-slate-800 border-l border-b border-blue-400/50 transform rotate-45"
        style={{
          left: '-4px',
          top: '20px'
        }}
      ></div>
    </div>
  );
};

// Simplified version for basic use cases
export const SimpleStationTooltip = ({ station }) => {
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
        <div className="text-slate-300">
          <span className="text-slate-400">Type:</span> {station.type}
        </div>
      </div>
    </div>
  );
};

export default StationTooltip;