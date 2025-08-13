import React, { useState, useEffect, useMemo } from 'react';
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
  AlertTriangle
} from 'lucide-react';

const ControlPanel = ({
  // Current state values
  selectedArea = '',
  selectedModel = 'NGOSF2',
  selectedDepth = 0,
  selectedParameter = 'Current Speed',
  currentDate = '',
  currentTime = '',
  timeZone = 'UTC',
  currentFrame = 0,
  isPlaying = false,
  playbackSpeed = 1,
  loopMode = 'Repeat',
  holoOceanPOV = { x: 0, y: 0, depth: 0 },
  
  // Data for dropdowns
  availableModels = [],
  availableDepths = [],
  availableDates = [],
  availableTimes = [],
  totalFrames = 24,
  csvData = [],
  dataLoaded = false,
  
  // Callbacks
  onAreaChange,
  onModelChange,
  onDepthChange,
  onParameterChange,
  onDateTimeChange,
  onTimeZoneChange,
  onPlayToggle,
  onSpeedChange,
  onLoopModeChange,
  onFrameChange,
  onReset,
  
  // Additional props
  className = "",
  showAdvanced = false
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [errors, setErrors] = useState({});

  // Available options
  const areaOptions = [
    { value: '', label: 'Select Area' },
    { value: 'MSP', label: 'MSP' },
    { value: 'USM', label: 'USM' },
    { value: 'MBL', label: 'MBL' },
  ];

  const modelOptions = useMemo(() => {
    if (!dataLoaded) {
      return [{ value: '', label: 'Loading models...', disabled: true }];
    }
    
    if (availableModels.length === 0) {
      return [{ value: '', label: 'No models found', disabled: true }];
    }

    const modelLabels = {
      'NGOSF2': 'NGOSF2 (Northern Gulf)',
      'ROMS': 'ROMS (Regional Ocean)',
      'HYCOM': 'HYCOM (Global Ocean)',
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

  const handleDateTimeChange = (newDate, newTime) => {
    onDateTimeChange?.(newDate, newTime);
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

  const getFrameTimeDisplay = () => {
    if (csvData.length > 0 && csvData[currentFrame]?.time) {
      return new Date(csvData[currentFrame].time).toLocaleString();
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
          <button onClick={() => setShowSettings(!showSettings)} className="p-1 md:p-2 bg-slate-700 hover:bg-slate-600 rounded-lg">
            <Settings className="w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4">
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Study Area</label>
          <select value={selectedArea} onChange={(e) => onAreaChange?.(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm">
            {areaOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Layers className="w-3 h-3" /> Ocean Model</label>
          <select value={selectedModel} onChange={(e) => handleModelChange(e.target.value)} className={`w-full bg-slate-700 border rounded px-1 md:px-2 py-1 text-xs md:text-sm ${errors.model ? 'border-red-500' : 'border-slate-600'}`} disabled={!dataLoaded || availableModels.length === 0}>
            {modelOptions.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
          </select>
        </div>
        
        <div className="col-span-2 lg:col-span-1">
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date/Time</label>
          <div className="flex gap-1">
            <select value={currentDate} onChange={(e) => handleDateTimeChange(e.target.value, currentTime)} className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs" disabled={!dataLoaded}>
              <option value="">Select Date</option>
              {availableDates.map(date => <option key={date} value={date}>{new Date(date).toLocaleDateString()}</option>)}
            </select>
            <select value={currentTime} onChange={(e) => handleDateTimeChange(currentDate, e.target.value)} className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs" disabled={!dataLoaded}>
              <option value="">Select Time</option>
              {availableTimes.map(time => <option key={time} value={time}>{time}</option>)}
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1"><Gauge className="w-3 h-3" /> Depth (ft)</label>
          <select value={selectedDepth ?? ''} onChange={(e) => onDepthChange?.(Number(e.target.value))} className={`w-full bg-slate-700 border rounded px-1 md:px-2 py-1 text-xs md:text-sm ${errors.depth ? 'border-red-500' : 'border-slate-600'}`} disabled={!dataLoaded || !availableDepths.length}>
            {depthOptions.map(depth => <option key={depth.value} value={depth.value} disabled={depth.disabled}>{depth.label}</option>)}
          </select>
        </div>
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