import React, { useState, useEffect } from 'react';
import { Clock, Settings, Wifi, WifiOff, Activity, HelpCircle, BookOpen } from 'lucide-react';
import oceanEnterpriseLogo from '../../assets/icons/roger_wicker_center_ocean_enterprise.png';
import powerBluemvmtLogo from '../../assets/icons/powered_by_bluemvmt.png';

const Header = ({ 
  dataSource = "simulated", 
  timeZone = "UTC", 
  onTimeZoneChange,
  onSettingsClick,
  connectionStatus = "connected",
  dataQuality = null,
  showDataStatus = true,
  // NEW: Tutorial props
  showTutorial = false,
  onTutorialToggle,
  tutorialStep = 0,
  isFirstTimeUser = false
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check for first-time user tutorial prompt
  useEffect(() => {
    if (isFirstTimeUser && !showTutorial) {
      const hasSeenTutorial = localStorage.getItem('ocean-monitor-tutorial-completed');
      if (!hasSeenTutorial) {
        // Show tutorial prompt after a brief delay
        const timer = setTimeout(() => {
          if (onTutorialToggle) {
            onTutorialToggle(true);
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [isFirstTimeUser, showTutorial, onTutorialToggle]);

  // Format time based on selected timezone
  const getFormattedTime = () => {
    const options = {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };

    switch (timeZone) {
      case 'UTC':
        return currentTime.toLocaleString('en-US', { ...options, timeZone: 'UTC' });
      case 'Local':
        return currentTime.toLocaleString('en-US', options);
      case 'CST':
        return currentTime.toLocaleString('en-US', { ...options, timeZone: 'America/Chicago' });
      default:
        return currentTime.toLocaleString('en-US', options);
    }
  };

  const getDataSourceDisplay = () => {
    switch (dataSource) {
      case 'api':
        return { text: 'API Stream', color: 'text-blue-400', icon: Wifi };
      case 'simulated':
        return { text: 'Simulated', color: 'text-yellow-400', icon: Activity };
      case 'none':
        return { text: 'No Data', color: 'text-red-400', icon: WifiOff };
      default:
        return { text: 'Unknown', color: 'text-gray-400', icon: Activity };
    }
  };

  const getConnectionStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>;
      case 'connecting':
        return <div className="w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>;
      case 'disconnected':
        return <div className="w-2 h-2 bg-red-400 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
    }
  };

  const dataSourceInfo = getDataSourceDisplay();
  const DataSourceIcon = dataSourceInfo.icon;

  return (
    <header className="bg-slate-800 border-b border-slate-700 px-3 md:px-6 py-2 md:py-4 relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        
        {/* Left Side - Branding */}
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
            <img 
              src={oceanEnterpriseLogo} 
              alt="Roger F. Wicker Center for Ocean Enterprise"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Coastal Oceanographic Monitor
            </h1>
            <div className="flex items-center gap-2 text-xs md:text-sm text-slate-400">
              <span>USM Maritime Technology Solutions</span>
              <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
              <div className="flex items-center gap-1">
                <DataSourceIcon className="w-3 h-3" />
                <span className={dataSourceInfo.color}>Data: {dataSourceInfo.text}</span>
                {getConnectionStatusIndicator()}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side - Controls & Branding */}
        <div className="flex flex-col items-start sm:items-center gap-2 w-full sm:w-auto">
          
          {/* Time Zone & Status Controls */}
          <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto">
            
            {/* Time Zone Selector */}
            <div className="flex items-center gap-2 text-xs md:text-sm">
              <Clock className="w-3 h-3 md:w-4 md:h-4 text-slate-400" />
              <select 
                value={timeZone} 
                onChange={(e) => onTimeZoneChange && onTimeZoneChange(e.target.value)}
                className="bg-slate-700 border border-slate-600 rounded px-1 md:px-2 py-1 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="UTC">UTC</option>
                <option value="Local">Local Time</option>
                <option value="CST">CST</option>
              </select>
            </div>

            {/* Current Time Display */}
            <div className="text-xs md:text-sm text-slate-300 hidden sm:block font-mono">
              {getFormattedTime()}
            </div>

            {/* Data Quality Indicator */}
            {showDataStatus && dataQuality && (
              <div className="flex items-center gap-1 text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                <Activity className="w-3 h-3" />
                <span>{dataQuality.stations}S/{dataQuality.measurements}M</span>
              </div>
            )}

            {/* NEW: Tutorial Button */}
            <button 
              onClick={() => onTutorialToggle && onTutorialToggle(!showTutorial)}
              className={`p-1 md:p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 relative ${
                showTutorial 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
              aria-label="Tutorial"
              title="Interactive Tutorial"
            >
              <HelpCircle className="w-4 h-4 md:w-5 md:h-5" />
              {/* NEW: Tutorial step indicator */}
              {showTutorial && tutorialStep > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                  {tutorialStep}
                </div>
              )}
              {/* NEW: First-time user indicator */}
              {isFirstTimeUser && !localStorage.getItem('ocean-monitor-tutorial-completed') && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              )}
            </button>

            {/* Settings Button */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowSettings(!showSettings);
                  onSettingsClick && onSettingsClick();
                }}
                className="p-1 md:p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              {/* Settings Dropdown */}
              {showSettings && (
                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-50">
                  <div className="p-3">
                    <div className="text-sm font-semibold text-slate-200 mb-3">System Settings</div>
                    
                    {/* Data Source Info */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Data Source:</span>
                        <span className={dataSourceInfo.color}>{dataSourceInfo.text}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Connection:</span>
                        <span className={
                          connectionStatus === 'connected' ? 'text-green-400' :
                          connectionStatus === 'connecting' ? 'text-yellow-400' :
                          'text-red-400'
                        }>
                          {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                        </span>
                      </div>
                      {dataQuality && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Stations:</span>
                            <span className="text-slate-300">{dataQuality.stations} Stations</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Measurements:</span>
                            <span className="text-slate-300">{dataQuality.measurements} Measurements</span>
                          </div>
                          {dataQuality.lastUpdate && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Last Update:</span>
                              <span className="text-slate-300">
                                {new Date(dataQuality.lastUpdate).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-700">
                      <div className="space-y-2">
                        {/* NEW: Tutorial option in settings */}
                        <button 
                          onClick={() => {
                            onTutorialToggle && onTutorialToggle(true);
                            setShowSettings(false);
                          }}
                          className="w-full text-left text-xs text-slate-300 hover:text-white p-2 hover:bg-slate-700 rounded transition-colors flex items-center gap-2"
                        >
                          <BookOpen className="w-3 h-3" />
                          Start Tutorial
                        </button>
                        <button 
                          onClick={() => window.location.reload()}
                          className="w-full text-left text-xs text-slate-300 hover:text-white p-2 hover:bg-slate-700 rounded transition-colors"
                        >
                          Refresh Data
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* BlueMvmt Logo */}
          <div className="flex items-center justify-end sm:justify-center">
            <img 
              src={powerBluemvmtLogo} 
              alt="Powered by Bluemvmt" 
              className="h-6 md:h-8"
            />
          </div>
        </div>
      </div>

      {/* Mobile Time Display */}
      <div className="sm:hidden mt-2 text-xs text-slate-300 font-mono text-center">
        {getFormattedTime()} {timeZone}
      </div>

      {/* Click outside to close settings */}
      {showSettings && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowSettings(false)}
        ></div>
      )}
    </header>
  );
};

export default Header;