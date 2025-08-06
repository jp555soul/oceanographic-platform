import React, { useState, useEffect } from 'react';
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
  VolumeX
} from 'lucide-react';

const ControlPanel = ({
  // Current state values
  selectedArea = '',
  selectedModel = 'NGOSF2',
  selectedDepth = 33,
  selectedParameter = 'Current Speed',
  currentDate = '',
  currentTime = '',
  timeZone = 'UTC',
  currentFrame = 0,
  isPlaying = false,
  playbackSpeed = 1,
  loopMode = 'Repeat',
  holoOceanPOV = { x: 0, y: 0, depth: 33 },
  
  // Data for dropdowns
  availableDates = [],
  availableTimes = [],
  totalFrames = 24,
  csvData = [],
  
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
    { value: 'MSP', label: 'Mississippi Sound (MSP)' },
    { value: 'USM', label: 'USM Research Area' },
    { value: 'MBL', label: 'Mobile Bay (MBL)' },
    { value: 'GOM', label: 'Gulf of Mexico' }
  ];

  const modelOptions = [
    { value: 'NGOSF2', label: 'NGOSF2 (Northern Gulf)' },
    { value: 'ROMS', label: 'ROMS (Regional Ocean)' },
    { value: 'HYCOM', label: 'HYCOM (Global Ocean)' },
    { value: 'FVCOM', label: 'FVCOM (Finite Volume)' }
  ];

  const parameterOptions = [
    { value: 'Current Speed', label: 'Current Speed (m/s)' },
    { value: 'Current Direction', label: 'Current Direction (°)' },
    { value: 'Wave Height', label: 'Wave Height (m)' },
    { value: 'Wave Direction', label: 'Wave Direction (°)' },
    { value: 'Temperature', label: 'Water Temperature (°C)' },
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

  // Validation
  useEffect(() => {
    const newErrors = {};
    
    if (selectedDepth < 0 || selectedDepth > 1000) {
      newErrors.depth = 'Depth must be between 0-1000 ft';
    }
    
    if (csvData.length > 0 && !currentDate) {
      newErrors.date = 'Date required when CSV data is loaded';
    }
    
    setErrors(newErrors);
  }, [selectedDepth, currentDate, csvData.length]);

  // Handle date/time change with validation
  const handleDateTimeChange = (newDate, newTime) => {
    if (onDateTimeChange) {
      onDateTimeChange(newDate, newTime);
    }
  };

  // Handle frame navigation
  const handlePreviousFrame = () => {
    const prevFrame = currentFrame > 0 ? currentFrame - 1 : totalFrames - 1;
    if (onFrameChange) {
      onFrameChange(prevFrame);
    }
  };

  const handleNextFrame = () => {
    const nextFrame = (currentFrame + 1) % totalFrames;
    if (onFrameChange) {
      onFrameChange(nextFrame);
    }
  };

  // Format frame time display
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
          NGOSF2 Model Control Panel
        </h2>
        
        <div className="flex items-center gap-2">
          <div className="text-xs text-slate-400">
            Data: {csvData.length > 0 ? `${csvData.length} records` : 'Simulated'}
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 md:p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <Settings className="w-3 h-3 md:w-4 md:h-4" />
          </button>
        </div>
      </div>
      
      {/* Main Controls Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4">
        
        {/* Area Selection */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Study Area
          </label>
          <select 
            value={selectedArea}
            onChange={(e) => onAreaChange && onAreaChange(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            {areaOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Model Selection */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Ocean Model
          </label>
          <select 
            value={selectedModel}
            onChange={(e) => onModelChange && onModelChange(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            {modelOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Date/Time Controls */}
        <div className="col-span-2 lg:col-span-1">
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Date/Time
          </label>
          <div className="flex gap-1">
            {csvData.length > 0 ? (
              <>
                <select
                  value={currentDate}
                  onChange={(e) => handleDateTimeChange(e.target.value, currentTime)}
                  className={`flex-1 bg-slate-700 border rounded px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-pink-400 ${
                    errors.date ? 'border-red-500' : 'border-slate-600'
                  }`}
                >
                  <option value="">Select Date</option>
                  {availableDates.map(date => (
                    <option key={date} value={date}>
                      {new Date(date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <select
                  value={currentTime}
                  onChange={(e) => handleDateTimeChange(currentDate, e.target.value)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
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
                  onChange={(e) => handleDateTimeChange(e.target.value, currentTime)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
                <input
                  type="time"
                  value={currentTime}
                  onChange={(e) => handleDateTimeChange(currentDate, e.target.value)}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-1 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-pink-400"
                />
              </>
            )}
          </div>
          {errors.date && <div className="text-red-400 text-xs mt-1">{errors.date}</div>}
        </div>
        
        {/* Depth Control */}
        <div>
          <label className="block text-xs text-slate-400 mb-1 flex items-center gap-1">
            <Gauge className="w-3 h-3" />
            Depth (ft)
          </label>
          <input
            type="number"
            value={selectedDepth}
            onChange={(e) => onDepthChange && onDepthChange(Number(e.target.value))}
            className={`w-full bg-slate-700 border rounded px-1 md:px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 ${
              errors.depth ? 'border-red-500' : 'border-slate-600'
            }`}
            min="0"
            max="1000"
            step="1"
          />
          {errors.depth && <div className="text-red-400 text-xs mt-1">{errors.depth}</div>}
        </div>
      </div>
      
      {/* Parameter and Animation Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 mb-4">
        
        {/* Parameter Selection */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Display Parameter</label>
          <select 
            value={selectedParameter}
            onChange={(e) => onParameterChange && onParameterChange(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
          >
            {parameterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        {/* Animation Controls */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Animation</label>
          <div className="flex gap-1">
            <button
              onClick={handlePreviousFrame}
              className="p-1 bg-slate-600 hover:bg-slate-700 rounded transition-colors"
              title="Previous Frame"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              onClick={onPlayToggle}
              className="flex-1 flex items-center justify-center gap-1 bg-pink-600 hover:bg-pink-700 px-2 md:px-3 py-1 rounded text-xs md:text-sm transition-colors"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={handleNextFrame}
              className="p-1 bg-slate-600 hover:bg-slate-700 rounded transition-colors"
              title="Next Frame"
            >
              <SkipForward className="w-3 h-3" />
            </button>
            <button
              onClick={onReset}
              className="p-1 bg-slate-600 hover:bg-slate-700 rounded transition-colors"
              title="Reset to Frame 1"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {/* Playback Speed */}
        <div>
          <label className="block text-xs text-slate-400 mb-1">Speed: {playbackSpeed}x</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.25"
              max="4"
              step="0.25"
              value={playbackSpeed}
              onChange={(e) => onSpeedChange && onSpeedChange(Number(e.target.value))}
              className="flex-1 accent-pink-500"
            />
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 bg-slate-600 hover:bg-slate-700 rounded transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Status Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-4">
          <span>Frame: {currentFrame + 1}/{totalFrames}</span>
          <span>Loop: {loopMode}</span>
          <span className="hidden md:inline">
            POV: ({holoOceanPOV.x.toFixed(1)}, {holoOceanPOV.y.toFixed(1)})
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3" />
          <span>{getFrameTimeDisplay()}</span>
          <select 
            value={timeZone}
            onChange={(e) => onTimeZoneChange && onTimeZoneChange(e.target.value)}
            className="bg-slate-700 border border-slate-600 rounded px-1 py-0.5 text-xs"
          >
            <option value="UTC">UTC</option>
            <option value="Local">Local</option>
            <option value="CST">CST</option>
          </select>
        </div>
      </div>

      {/* Advanced Settings Panel */}
      {showSettings && (
        <div className="mt-4 p-3 bg-slate-700/30 border border-slate-600 rounded-lg">
          <div className="text-sm font-semibold text-slate-300 mb-3">Advanced Settings</div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            
            {/* Loop Mode */}
            <div>
              <label className="block text-slate-400 mb-1">Loop Mode</label>
              <select 
                value={loopMode}
                onChange={(e) => onLoopModeChange && onLoopModeChange(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs"
              >
                {loopOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Resolution */}
            <div>
              <label className="block text-slate-400 mb-1">Model Resolution</label>
              <div className="text-slate-300">
                {selectedModel === 'NGOSF2' ? '3km grid spacing' :
                 selectedModel === 'ROMS' ? '1km grid spacing' :
                 selectedModel === 'HYCOM' ? '9km grid spacing' :
                 '0.5km grid spacing'}
              </div>
            </div>

            {/* Data Quality */}
            <div>
              <label className="block text-slate-400 mb-1">Data Quality</label>
              <div className={`text-xs ${
                csvData.length > 1000 ? 'text-green-400' :
                csvData.length > 100 ? 'text-blue-400' :
                csvData.length > 10 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {csvData.length > 1000 ? 'Excellent' :
                 csvData.length > 100 ? 'Good' :
                 csvData.length > 10 ? 'Fair' : 'Limited'} 
                ({csvData.length} measurements)
              </div>
            </div>

            {/* Memory Usage */}
            <div>
              <label className="block text-slate-400 mb-1">Memory Usage</label>
              <div className="text-slate-300">
                ~{Math.round(csvData.length * 0.5)} KB
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-600">
            <button
              onClick={() => setShowSettings(false)}
              className="text-xs text-slate-400 hover:text-slate-300"
            >
              Close Advanced Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlPanel;