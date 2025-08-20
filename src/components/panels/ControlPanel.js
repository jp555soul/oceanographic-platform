import React, { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-date-range';
import { enUS } from 'date-fns/locale';
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Activity, 
  Settings,
  Calendar,
  Clock,
  Layers,
  MapPin,
  Gauge,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  AlertTriangle,
  Navigation,
  Thermometer,
  Eye,
  EyeOff,
  Map,
  Zap,
} from 'lucide-react';

const ControlPanel = ({
  // Current state values
  selectedArea = '',
  selectedModel = 'NGOFS2',
  selectedDepth = 0,
  selectedParameter = 'Current Speed',
  startDate,
  endDate,
  timeZone = 'UTC',
  currentFrame = 0,
  isPlaying = false,
  playbackSpeed = 1,
  loopMode = 'Repeat',
  holoOceanPOV = { x: 0, y: 0, depth: 0 },
  
  // Layer visibility controls from mapLayerVisibility object
  mapLayerVisibility = {
    oceanCurrents: false,
    temperature: false,
    stations: true,
  },
  isSstHeatmapVisible = false,
  currentsVectorScale = 0.001,
  currentsColorBy = 'speed',
  
  // Data for dropdowns
  availableModels = [],
  availableDepths = [],
  totalFrames = 24,
  data = [],
  dataLoaded = false,
  
  // Callbacks
  onAreaChange,
  onModelChange,
  onDepthChange,
  onParameterChange,
  onDateRangeChange,
  onTimeZoneChange,
  onPlayToggle,
  onSpeedChange,
  onLoopModeChange,
  onFrameChange,
  onReset,
  onSquery,
  
  // Layer control callbacks
  onLayerToggle,
  onSstHeatmapToggle,
  onCurrentsScaleChange,
  onCurrentsColorChange,
  
  // Additional props
  className = "",
  showAdvanced = false
}) => {
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [showLayerControls, setShowLayerControls] = useState(true);

  // Available options
  const areaOptions = [
    { value: '', label: 'Select Area' },
    { value: 'MBL', label: 'MBL' },
    { value: 'MSR', label: 'MSR' },
    { value: 'USM', label: 'USM' },
  ];

  const modelOptions = useMemo(() => {
    if (!dataLoaded) {
      return [{ value: '', label: 'Loading model...', disabled: true }];
    }
    
    if (availableModels.length === 0) {
      return [{ value: '', label: 'No model found', disabled: true }];
    }

    const modelLabels = {
      'NGOFS2': 'NGOFS2',
    };

    return availableModels.map(model => ({
      value: model,
      label: modelLabels[model] || `${model} (Ocean Model)`,
      disabled: false
    }));
  }, [availableModels, dataLoaded]);

  const parameterOptions = [
    { value: 'Current Speed', label: 'Current Speed (m/s)' },
    { value: 'Current Direction', label: 'Current Direction (°)' },
    { value: 'Wave Height', label: 'Wave Height (m)' },
    { value: 'Wave Direction', label: 'Wave Direction (°)' },
    { value: 'Temperature', label: 'Water Temperature (°F)' },
    { value: 'Salinity', label: 'Salinity (PSU)' },
    { value: 'Pressure', label: 'Pressure (dbar)' },
    { value: 'Wind Speed', label: 'Wind Speed (m/s)' },
    { value: 'Wind Direction', label: 'Wind Direction (°)' }
  ];

  const loopOptions = [
    { value: 'Repeat', label: 'Repeat Loop' },
    { value: 'Once', label: 'Play Once' },
    { value: 'Bounce', label: 'Bounce Loop' }
  ];

  const currentsColorOptions = [
    { value: 'speed', label: 'Color by Speed' },
    { value: 'depth', label: 'Color by Depth' },
    { value: 'uniform', label: 'Uniform Color' }
  ];

  // Logic for depth dropdown options
  const depthOptions = useMemo(() => {
    if (!availableDepths || availableDepths.length === 0) {
      return [{ value: '', label: 'Loading...', disabled: true }];
    }
    return availableDepths.map(depth => ({
      value: depth,
      label: depth === 0 ? '0 ft (Surface)' : `${depth} ft`,
      disabled: false
    }));
  }, [availableDepths]);

  useEffect(() => {
    const newErrors = {};
    if (selectedDepth < 0) newErrors.depth = 'Depth cannot be negative';
    if (dataLoaded && availableModels.length > 0 && selectedModel && !availableModels.includes(selectedModel)) {
      newErrors.model = `Model "${selectedModel}" not found`;
    }
    setErrors(newErrors);
  }, [selectedDepth, selectedModel, availableModels, dataLoaded]);

  const handleAreaChange = (e) => {
    const value = e.target.value;
    onAreaChange?.(value);
    onSquery?.();
  };

  const handleDepthChange = (e) => {
    const value = Number(e.target.value);
    onDepthChange?.(value);
    onSquery?.();
  };

  const handleModelChange = (newModel) => {
    if (onModelChange && newModel && availableModels.includes(newModel)) {
      onModelChange(newModel);
      onSquery?.();
    }
  };

  const handlePreviousFrame = () => {
    const prevFrame = currentFrame > 0 ? currentFrame - 1 : totalFrames - 1;
    onFrameChange?.(prevFrame);
  };

  const handleNextFrame = () => {
    const nextFrame = (currentFrame + 1) % totalFrames;
    onFrameChange?.(nextFrame);
  };

  const handleCurrentsScaleChange = (e) => {
    const value = Number(e.target.value);
    onCurrentsScaleChange?.(value);
  };

  const handleCurrentsColorChange = (e) => {
    const value = e.target.value;
    onCurrentsColorChange?.(value);
  };
  
  const handleDateSelect = (item) => {
    const { startDate, endDate } = item.selection;
    onDateRangeChange?.(startDate, endDate);
    // Trigger squery only when the date range selection is complete
    if (startDate && endDate && startDate.getTime() !== endDate.getTime()) {
      onSquery?.();
    }
  };

  const getFrameTimeDisplay = () => {
    if (data.length > 0 && data[currentFrame]?.time) {
      return new Date(data[currentFrame].time).toLocaleString();
    }
    return `Frame ${currentFrame + 1} of ${totalFrames}`;
  };

  return (
    <div className={`bg-slate-800 border-b border-pink-500/20 p-2 md:p-4 bg-gradient-to-b from-pink-900/10 to-purple-900/10 ${className}`}>
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <h2 className="font-semibold text-pink-300 flex items-center gap-2 text-sm md:text-base">
          <Activity className="w-4 h-4 md:w-5 md:h-5" />
          {selectedModel || 'Ocean Model'} Control Panel
        </h2>
        <div className="flex items-center gap-2">
          {!dataLoaded && (
            <div className="flex items-center gap-1 text-xs text-yellow-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              Loading
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Study Area</label>
          <select value={selectedArea} onChange={handleAreaChange} className="w-full bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm">
            {areaOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Layers className="w-3 h-3" /> Ocean Model</label>
          <select value={selectedModel} onChange={(e) => handleModelChange(e.target.value)} className={`w-full bg-slate-700 border rounded px-1 md:px-2 py-1 text-xs md:text-sm ${errors.model ? 'border-red-500' : 'border-slate-600'}`} disabled={!dataLoaded || availableModels.length === 0}>
            {modelOptions.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
          </select>
        </div>
        
        <div className="col-span-2 lg:col-span-1 relative">
            <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date/Time Range</label>
            
            <button
                onClick={() => setCalendarOpen(!isCalendarOpen)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs md:text-sm text-left truncate"
                disabled={!dataLoaded}
            >
                {startDate && endDate ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}` : 'Select Range'}
            </button>

            {isCalendarOpen && (
                <div className="absolute top-full mt-2 z-50">
                    <DateRange
                      locale={enUS}
                      editableDateInputs={true}
                      onChange={handleDateSelect}
                      moveRangeOnFirstSelection={false}
                      ranges={[{
                          startDate: startDate || new Date(),
                          endDate: endDate || new Date(),
                          key: 'selection'
                      }]}
                      disabled={!dataLoaded}
                    />
                    <button 
                        onClick={() => setCalendarOpen(false)}
                        className="w-full bg-pink-600 hover:bg-pink-700 text-white py-1 text-xs rounded-b"
                    >
                        Close
                    </button>
                </div>
            )}
        </div>
        
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Gauge className="w-3 h-3" /> Depth (ft)</label>
          <select value={selectedDepth ?? ''} onChange={handleDepthChange} className={`w-full bg-slate-700 border rounded px-1 md:px-2 py-1 text-xs md:text-sm ${errors.depth ? 'border-red-500' : 'border-slate-600'}`} disabled={!dataLoaded || !availableDepths.length}>
            {depthOptions.map(depth => <option key={depth.value} value={depth.value} disabled={depth.disabled}>{depth.label}</option>)}
          </select>
        </div>
      </div>

      {/* Layer Controls Section */}
      <div className="mb-4 border-t border-slate-600 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-slate-300 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Map Layers
          </h3>
          <button 
            onClick={() => setShowLayerControls(!showLayerControls)}
            className="text-xs text-slate-400 hover:text-slate-300"
          >
            {showLayerControls ? 'Hide' : 'Show'}
          </button>
        </div>
        
        {showLayerControls && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Layer Toggles */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <Navigation className="w-3 h-3" />
                  Ocean Currents
                </label>
                <button
                  onClick={() => onLayerToggle('oceanCurrents')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    mapLayerVisibility.oceanCurrents 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                  disabled={!dataLoaded}
                >
                  {mapLayerVisibility.oceanCurrents ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {mapLayerVisibility.oceanCurrents ? 'On' : 'Off'}
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <Thermometer className="w-3 h-3" />
                  Temperature
                </label>
                <button
                  onClick={() => onLayerToggle('temperature')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    mapLayerVisibility.temperature
                      ? 'bg-red-600 text-white' 
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                  disabled={!dataLoaded}
                >
                  {mapLayerVisibility.temperature ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {mapLayerVisibility.temperature ? 'On' : 'Off'}
                </button>
              </div>

              {mapLayerVisibility.temperature && (
                <div className="flex items-center justify-between pl-4">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <Zap className="w-3 h-3" />
                    Heatmap
                  </label>
                  <button
                    onClick={onSstHeatmapToggle}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                      isSstHeatmapVisible 
                        ? 'bg-amber-600 text-white' 
                        : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                    }`}
                    disabled={!dataLoaded}
                  >
                    {isSstHeatmapVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {isSstHeatmapVisible ? 'On' : 'Off'}
                  </button>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-300">
                  <MapPin className="w-3 h-3" />
                  Stations
                </label>
                <button
                  onClick={() => onLayerToggle('stations')}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                    mapLayerVisibility.stations 
                      ? 'bg-green-600 text-white' 
                      : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
                  disabled={!dataLoaded}
                >
                  {mapLayerVisibility.stations ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {mapLayerVisibility.stations ? 'On' : 'Off'}
                </button>
              </div>
            </div>

            {/* Layer Controls */}
            <div className="space-y-2">
              <label className="block text-xs text-slate-400">Vector Scale</label>
              <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="0.0001" 
                  max="0.01" 
                  step="0.0001" 
                  value={currentsVectorScale} 
                  onChange={handleCurrentsScaleChange}
                  className="flex-1 accent-blue-500 disabled:opacity-50" 
                  disabled={!dataLoaded || !mapLayerVisibility.oceanCurrents}
                />
                <span className="text-xs text-slate-400 w-16">
                  {(currentsVectorScale * 1000).toFixed(1)}
                </span>
              </div>
              
              <label className="block text-xs text-slate-400">Color Mode</label>
              <select 
                value={currentsColorBy} 
                onChange={handleCurrentsColorChange}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                disabled={!dataLoaded || !mapLayerVisibility.oceanCurrents}
              >
                {currentsColorOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Layer Info */}
            <div className="text-xs text-slate-400 space-y-1">
              <div>Active Layers:</div>
              <div className="pl-2 space-y-0.5">
                {mapLayerVisibility.oceanCurrents && <div className="text-blue-400">🌊 Ocean Currents</div>}
                {mapLayerVisibility.temperature && <div className="text-red-400">🌡️ Temperature</div>}
                {isSstHeatmapVisible && <div className="text-amber-400 pl-2">- Heatmap</div>}
                {mapLayerVisibility.stations && <div className="text-green-400">📍 Stations</div>}
                {!mapLayerVisibility.oceanCurrents && !mapLayerVisibility.temperature && !mapLayerVisibility.stations && (
                  <div className="text-slate-500">No layers active</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 mb-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Display Parameter</label>
          <select value={selectedParameter} onChange={(e) => onParameterChange?.(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm" disabled={!dataLoaded}>
            {parameterOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-xs text-slate-400 mb-1">Animation</label>
          <div className="flex gap-1">
            <button onClick={handlePreviousFrame} className="p-1 bg-slate-600 hover:bg-slate-700 rounded disabled:opacity-50" disabled={!dataLoaded || totalFrames <= 1}><SkipBack className="w-3 h-3" /></button>
            <button onClick={onPlayToggle} className="flex-1 flex items-center justify-center gap-1 bg-pink-600 hover:bg-pink-700 px-2 rounded text-xs transition-colors disabled:opacity-50" disabled={!dataLoaded || totalFrames <= 1}>
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button onClick={handleNextFrame} className="p-1 bg-slate-600 hover:bg-slate-700 rounded disabled:opacity-50" disabled={!dataLoaded || totalFrames <= 1}><SkipForward className="w-3 h-3" /></button>
            <button onClick={onReset} className="p-1 bg-slate-600 hover:bg-slate-700 rounded disabled:opacity-50" disabled={!dataLoaded}><RotateCcw className="w-3 h-3" /></button>
          </div>
        </div>
        
        <div>
          <label className="block text-xs text-slate-400 mb-1">Speed: {playbackSpeed}x</label>
          <div className="flex items-center gap-2">
            <input 
              type="range" 
              min="0.1" 
              max="20" 
              step="0.1" 
              value={playbackSpeed} 
              onChange={(e) => onSpeedChange?.(Number(e.target.value))} 
              className="flex-1 accent-pink-500 disabled:opacity-50" 
              disabled={!dataLoaded} 
            />
            <div className="flex gap-1">
              <button 
                onClick={() => onSpeedChange?.(1)} 
                className="px-1 py-0.5 bg-slate-600 hover:bg-slate-500 rounded text-xs"
                disabled={!dataLoaded}
              >
                1x
              </button>
              <button 
                onClick={() => onSpeedChange?.(5)} 
                className="px-1 py-0.5 bg-slate-600 hover:bg-slate-500 rounded text-xs"
                disabled={!dataLoaded}
              >
                5x
              </button>
              <button 
                onClick={() => onSpeedChange?.(10)} 
                className="px-1 py-0.5 bg-slate-600 hover:bg-slate-500 rounded text-xs"
                disabled={!dataLoaded}
              >
                10x
              </button>
              <button 
                onClick={() => onSpeedChange?.(20)} 
                className="px-1 py-0.5 bg-slate-600 hover:bg-slate-500 rounded text-xs"
                disabled={!dataLoaded}
              >
                20x
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <span>Frame: {currentFrame + 1}/{totalFrames}</span>
          <span>Loop: {loopMode}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>{getFrameTimeDisplay()}</span>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;