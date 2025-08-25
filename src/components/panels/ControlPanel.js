import React, { useState, useEffect, useMemo } from 'react';
import DateTimeRangePicker from '@wojtekmaj/react-datetimerange-picker';
import '@wojtekmaj/react-datetimerange-picker/dist/DateTimeRangePicker.css';
import 'react-calendar/dist/Calendar.css';
import 'react-clock/dist/Clock.css';

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
  Loader,
  Wind,
  Droplets,
  BarChart2,
  Compass,
} from 'lucide-react';
import { useOcean } from '../../contexts/OceanDataContext';

// Configuration for all map layer toggles
const allMapLayers = [
    { key: 'oceanCurrents', label: 'Ocean Currents', icon: Navigation, color: 'blue' },
    { key: 'temperature', label: 'Temperature', icon: Thermometer, color: 'red' },
    { key: 'ssh', label: 'Surface Elevation', icon: BarChart2, color: 'indigo' },
    { key: 'salinity', label: 'Salinity', icon: Droplets, color: 'emerald' },
    { key: 'pressure', label: 'Pressure', icon: Gauge, color: 'orange' },
];

// Helper to map layer colors to Tailwind CSS classes
const layerColorClasses = {
    blue: 'text-blue-400',
    red: 'text-red-400',
    indigo: 'text-indigo-400',
    emerald: 'text-emerald-400',
    orange: 'text-orange-400',
};

// Helper to map layer colors to button background classes
const layerButtonClasses = {
    blue: 'bg-blue-600 text-white',
    red: 'bg-red-600 text-white',
    indigo: 'bg-indigo-600 text-white',
    emerald: 'bg-emerald-600 text-white',
    orange: 'bg-orange-600 text-white',
};


const ControlPanel = ({
  // Current state values
  isLoading = false,
  selectedArea = '',
  selectedModel = 'NGOFS2',
  selectedDepth = 0,
  startDate,
  endDate,
  timeZone = 'UTC',
  currentFrame = 0,
  playbackSpeed = 1,
  loopMode = 'Repeat',
  holoOceanPOV = { x: 0, y: 0, depth: 0 },

  // Layer visibility controls from mapLayerVisibility object
  mapLayerVisibility = {
    oceanCurrents: false,
    temperature: false,
    stations: false,
  },
  isSstHeatmapVisible = false,
  currentsVectorScale = 0.009,
  currentsColorBy = 'speed',

  // Wind Velocity layer props
  showWindVelocity = false,
  onWindVelocityToggle,

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
  onDateRangeChange,
  onTimeZoneChange,
  onSpeedChange,
  onLoopModeChange,
  onFrameChange,
  onReset,

  // Layer control callbacks
  onLayerToggle,
  onSstHeatmapToggle,
  onCurrentsScaleChange,
  onCurrentsColorChange,

  // New props for heatmap scale
  heatmapScale = 1,
  onHeatmapScaleChange,

  // Additional props
  className = "",
  showAdvanced = false
}) => {
  const { isPlaying, togglePlay } = useOcean();
  const [isCalendarOpen, setCalendarOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [showLayerControls, setShowLayerControls] = useState(true);
  const [showLayerToggles, setShowLayerToggles] = useState(false);
  
  // Local state for the date picker to ensure state update and query trigger are coupled
  const [dateRangeValue, setDateRangeValue] = useState([startDate, endDate]);

  // Effect to sync local state if parent props change
  useEffect(() => {
    setDateRangeValue([startDate, endDate]);
  }, [startDate, endDate]);


  // Available options
  const areaOptions = [
    { value: '', label: 'Select Area' },
    { value: 'USM', label: 'USM' },
    { value: 'MBL', label: 'MBL' },
    { value: 'MSR', label: 'MSR' },
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
  };

  const handleDepthChange = (e) => {
    const value = Number(e.target.value);
    onDepthChange?.(value);
  };

  const handleModelChange = (newModel) => {
    if (onModelChange && newModel && availableModels.includes(newModel)) {
      onModelChange(newModel);
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
  
  const handleHeatmapScaleChange = (e) => {
    const value = Number(e.target.value);
    onHeatmapScaleChange?.(value);
  };

  const handleCurrentsColorChange = (e) => {
    const value = e.target.value;
    onCurrentsColorChange?.(value);
  };

  const handleLayerToggle = (layerKey) => {    
    if (onLayerToggle) {
      onLayerToggle(layerKey);
    } else {
      console.warn('ControlPanel - onLayerToggle function not provided!');
    }
  };

  // This now only updates the local state
  const handleDateTimeChange = (value) => {
    setDateRangeValue(value);
  };

  // This now commits the state to the parent and triggers the query
  const handleDateTimeConfirm = () => {
    const [start, end] = dateRangeValue || [null, null];
    onDateRangeChange?.({ startDate: start, endDate: end });
    setCalendarOpen(false);
  };

  const getFrameTimeDisplay = () => {
    if (data.length > 0 && data[currentFrame]?.time) {
      return new Date(data[currentFrame].time).toLocaleString();
    }
    return `Frame ${currentFrame + 1} of ${totalFrames}`;
  };

  const getActiveLayers = () => {
    return allMapLayers.filter(layer => mapLayerVisibility[layer.key]);
  };

  const isAnyVectorLayerActive = useMemo(() => {
    return mapLayerVisibility.oceanCurrents || showWindVelocity;
  }, [mapLayerVisibility, showWindVelocity]);
  
  const isAnyHeatmapLayerActive = useMemo(() => {
    const heatmapKeys = ['temperature', 'ssh', 'salinity', 'pressure'];
    return heatmapKeys.some(key => mapLayerVisibility[key]);
  }, [mapLayerVisibility]);

  return (
    <div className={`bg-slate-800 border-b border-pink-500/20 p-2 md:p-4 bg-gradient-to-b from-pink-900/10 to-purple-900/10 ${className}`}>
      <div className="flex items-center justify-between mb-2 md:mb-4">
        <h2 className="font-semibold text-pink-300 flex items-center gap-2 text-sm md:text-base">
          <Activity className="w-4 h-4 md:w-5 md:h-5" />
          {selectedModel || 'Ocean Model'} Control Panel
        </h2>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-1 text-xs text-cyan-400">
              <Loader className="w-3 h-3 animate-spin" />
              Loading...
            </div>
          )}
          {!dataLoaded && !isLoading && (
            <div className="flex items-center gap-1 text-xs text-yellow-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              Initializing
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
                <div className="absolute top-full mt-2 z-50 bg-white p-2 rounded-md shadow-lg">
                    <DateTimeRangePicker
                      onChange={handleDateTimeChange}
                      value={dateRangeValue}
                      disabled={!dataLoaded}
                      className="text-slate-900"
                    />
                    <div className="mt-2 text-right">
                      <button
                        onClick={handleDateTimeConfirm}
                        className="bg-pink-600 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-pink-700 disabled:opacity-50"
                        disabled={!dateRangeValue || !dateRangeValue[0] || !dateRangeValue[1]}
                      >
                        Confirm
                      </button>
                    </div>
                </div>
            )}
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Gauge className="w-3 h-3" /> 
            Depth (ft)
          </label>
          <select 
            value={selectedDepth ?? ''} 
            onChange={handleDepthChange} 
            className={`w-full bg-slate-700 border rounded px-1 md:px-2 py-1 text-xs md:text-sm ${
              errors.depth ? 'border-red-500' : 'border-slate-600'
            }`} 
            disabled={!dataLoaded || !availableDepths.length}
          >
            {depthOptions.map(depth => <option key={depth.value} value={depth.value} disabled={depth.disabled}>{depth.label}</option>)}
          </select>
        </div>
      </div>

      {/* Layer Controls Section */}
      <div className="mb-4 border-t border-slate-600 pt-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-medium text-slate-300 flex items-center gap-1">
            <Settings className="w-3 h-3" />
            Map Controls
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
            
            {/* Column 1: Layer Toggles (now nested) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-medium text-slate-300 flex items-center gap-1">
                      <Map className="w-3 h-3" />
                      Map Layers
                  </h4>
                  <button
                      onClick={() => setShowLayerToggles(!showLayerToggles)}
                      className="text-xs text-slate-400 hover:text-slate-300"
                  >
                      {showLayerToggles ? 'Hide' : 'Show'}
                  </button>
              </div>

              {showLayerToggles && (
                <div className="space-y-2">
                    {allMapLayers.map(layer => (
                        <div key={layer.key} className="flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs text-slate-300">
                                <layer.icon className="w-3 h-3" />
                                {layer.label}
                            </label>
                            <button
                                onClick={() => handleLayerToggle(layer.key)}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                    mapLayerVisibility[layer.key]
                                    ? layerButtonClasses[layer.color]
                                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                }`}
                                disabled={!dataLoaded}
                                >
                                {mapLayerVisibility[layer.key] ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                {mapLayerVisibility[layer.key] ? 'On' : 'Off'}
                            </button>
                        </div>
                    ))}
                    {/* Wind Velocity Toggle */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-slate-300">
                            <Zap className="w-3 h-3" />
                            Wind Velocity
                        </label>
                        <button
                            onClick={onWindVelocityToggle}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                                showWindVelocity
                                ? 'bg-purple-600 text-white'
                                : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                            }`}
                            disabled={!dataLoaded}
                        >
                            {showWindVelocity ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {showWindVelocity ? 'On' : 'Off'}
                        </button>
                    </div>
                </div>
              )}
            </div>

            {/* Column 2: Layer Controls */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400">Currents/Wind Scale</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.0001"
                    max="0.01"
                    step="0.0001"
                    value={currentsVectorScale}
                    onChange={handleCurrentsScaleChange}
                    className="flex-1 accent-blue-500 disabled:opacity-50"
                    disabled={!dataLoaded || !isAnyVectorLayerActive}
                  />
                  <span className="text-xs text-slate-400 w-16">
                    {(currentsVectorScale * 1000).toFixed(1)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400">Heatmap Scale</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.05"
                    value={heatmapScale}
                    onChange={handleHeatmapScaleChange}
                    className="flex-1 accent-red-500 disabled:opacity-50"
                    disabled={!dataLoaded || !isAnyHeatmapLayerActive}
                  />
                  <span className="text-xs text-slate-400 w-16">
                    {heatmapScale.toFixed(2)}x
                  </span>
                </div>
              </div>

              {/* <label className="block text-xs text-slate-400">Color Mode</label>
              <select
                value={currentsColorBy}
                onChange={handleCurrentsColorChange}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
                disabled={!dataLoaded || !isAnyVectorLayerActive}
              >
                {currentsColorOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select> */}
            </div>

            {/* Column 3: Layer Info */}
            <div className="text-xs text-slate-400 space-y-1">
              <div>Active Layers:</div>
              <div className="pl-2 space-y-0.5">
                {getActiveLayers().map(layer => (
                    <div key={layer.key} className={layerColorClasses[layer.color]}>
                      {layer.label}
                    </div>
                ))}
                {getActiveLayers().length === 0 && (
                  <div className="text-slate-500">No layers active</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4 mb-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Animation</label>
          <div className="flex gap-1">
            <button onClick={handlePreviousFrame} className="p-1 bg-slate-600 hover:bg-slate-700 rounded disabled:opacity-50" disabled={!dataLoaded || totalFrames <= 1}><SkipBack className="w-3 h-3" /></button>
            <button onClick={togglePlay} className="flex-1 flex items-center justify-center gap-1 bg-pink-600 hover:bg-pink-700 px-2 rounded text-xs transition-colors disabled:opacity-50" disabled={!dataLoaded || totalFrames <= 1}>
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