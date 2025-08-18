import React, { useState, useEffect } from 'react';
import { useOceanData } from './hooks/useOceanData';

// Component imports
import Header from './components/layout/Header';
import LoadingScreen from './components/common/LoadingScreen';
import ErrorScreen from './components/common/ErrorScreen';
import ControlPanel from './components/panels/ControlPanel';
import MapContainer from './components/map/MapContainer';
import DataPanels from './components/panels/DataPanels';
import OutputModule from './components/panels/OutputModule';
import Chatbot from './components/chatbot/Chatbot';

// Tutorial imports
import Tutorial from './components/tutorial/Tutorial';
import TutorialOverlay from './components/tutorial/TutorialOverlay';

// CSS imports
import 'mapbox-gl/dist/mapbox-gl.css';

/**
 * Main Oceanographic Platform Component with API Integration
 */
const App = () => {
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(true);
  const [showApiConfig, setShowApiConfig] = useState(false);
  
  const {
    // Core data state
    isLoading,
    hasError,
    errorMessage,
    csvData,
    timeSeriesData,
    stationData,
    dataSource,
    dataQuality,
    availableModels,
    availableDepths,
    dataLoaded, 
    currentFrame,
    isPlaying,
    playbackSpeed,
    loopMode,
    selectedArea,
    selectedModel,
    selectedDepth,
    selectedParameter,
    currentDate,
    currentTime,
    timeZone,
    holoOceanPOV,
    envData,
    availableDates,
    availableTimes,
    selectedStation,
    connectionStatus,
    totalFrames,
    isHeatmapVisible,
    
    // Enhanced chat with API integration
    chatMessages,
    isTyping,
    chatMetrics,
    
    // API management
    apiStatus,
    apiMetrics,
    apiConfig,
    
    // Tutorial state
    showTutorial,
    tutorialStep,
    isFirstTimeUser,
    
    // Actions
    setSelectedArea,
    setSelectedModel,
    setSelectedDepth,
    setSelectedParameter,
    setCurrentDate, 
    setCurrentTime,
    setTimeZone,
    setCurrentFrame,
    setIsPlaying,
    setPlaybackSpeed, 
    setLoopMode,      
    setHoloOceanPOV,
    setEnvData,
    setSelectedStation,
    addChatMessage,
    handleDateTimeChange,
    handlePlayToggle,
    handleReset,
    handleFrameChange,
    handleStationAnalysis,
    refreshData,
    toggleHeatmapVisibility,
    
    // API functions
    checkAPIStatus,
    updateApiConfig,
    resetApiMetrics,
    
    // Tutorial functions
    handleTutorialToggle,
    handleTutorialComplete,
    handleTutorialStepChange
  } = useOceanData();

  // Check API status on component mount
  useEffect(() => {
    if (checkAPIStatus) {
      checkAPIStatus();
    }
  }, [checkAPIStatus]);

  // Show API config panel if API is not connected and we have data
  useEffect(() => {
    if (dataLoaded && apiStatus && !apiStatus.connected && !showApiConfig) {
      // Auto-show API config if API key is missing but endpoint is available
      if (!apiStatus.hasApiKey && apiStatus.endpoint) {
        setShowApiConfig(true);
      }
    }
  }, [dataLoaded, apiStatus, showApiConfig]);

  const handleApiConfigSave = (newConfig) => {
    if (updateApiConfig) {
      updateApiConfig(newConfig);
    }
    setShowApiConfig(false);
    // Recheck API status after config update
    setTimeout(() => {
      if (checkAPIStatus) {
        checkAPIStatus();
      }
    }, 1000);
  };

  // Handle loading states
  if (isLoading) {
    return (
      <LoadingScreen 
        title="Loading Oceanographic Data"
        message="Initializing ocean monitoring systems and AI services..."
        type="data"
      />
    );
  }

  if (hasError) {
    return (
      <ErrorScreen 
        type="no-data"
        title="No Oceanographic Data Available"
        message={errorMessage}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      
      {/* Enhanced Header with API status */}
      <Header 
        dataSource={dataSource}
        timeZone={timeZone}
        onTimeZoneChange={setTimeZone}
        connectionStatus={connectionStatus}
        dataQuality={dataQuality}
        showDataStatus={true}
        showTutorial={showTutorial}
        onTutorialToggle={handleTutorialToggle}
        tutorialStep={tutorialStep}
        isFirstTimeUser={isFirstTimeUser}
        // API integration props
        apiStatus={apiStatus}
        apiMetrics={apiMetrics}
        chatMetrics={chatMetrics}
        onShowApiConfig={() => setShowApiConfig(true)}
        onResetApiMetrics={resetApiMetrics}
      />

      {/* API Configuration Modal */}
      {showApiConfig && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-lg border border-slate-600 p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-blue-300 mb-4">API Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">API Endpoint</label>
                <input
                  type="text"
                  value={apiStatus?.endpoint || ''}
                  disabled
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-300 mb-1">API Key (Optional)</label>
                <input
                  type="password"
                  placeholder="Enter API key if required"
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Set REACT_APP_CHAT_API_KEY environment variable
                </p>
              </div>
              
              <div>
                <label className="block text-sm text-slate-300 mb-1">Request Timeout (ms)</label>
                <input
                  type="number"
                  value={apiConfig?.timeout || 10000}
                  onChange={(e) => handleApiConfigSave({ timeout: parseInt(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fallback"
                  checked={apiConfig?.fallbackToLocal || false}
                  onChange={(e) => handleApiConfigSave({ fallbackToLocal: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="fallback" className="text-sm text-slate-300">
                  Fallback to local responses if API fails
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowApiConfig(false)}
                className="px-4 py-2 text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowApiConfig(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Application Layout */}
      <main className="flex-1 flex flex-col min-h-0">
        
        {/* Zone 1: Control Panel */}
        <section className="border-b border-pink-500/30 flex-shrink-0">
          <ControlPanel
            data-tutorial="control-panel"
            availableModels={availableModels}
            availableDepths={availableDepths}
            dataLoaded={dataLoaded}
            selectedArea={selectedArea}
            selectedModel={selectedModel}
            selectedDepth={selectedDepth}
            selectedParameter={selectedParameter}
            currentDate={currentDate}
            currentTime={currentTime}
            timeZone={timeZone}
            currentFrame={currentFrame}
            isPlaying={isPlaying}
            playbackSpeed={playbackSpeed}
            loopMode={loopMode}
            holoOceanPOV={holoOceanPOV}
            availableDates={availableDates}
            availableTimes={availableTimes}
            totalFrames={totalFrames}
            csvData={csvData}
            onAreaChange={setSelectedArea}
            onModelChange={setSelectedModel}
            onDepthChange={setSelectedDepth}
            onParameterChange={setSelectedParameter}
            onDateTimeChange={handleDateTimeChange}
            onTimeZoneChange={setTimeZone}
            onPlayToggle={handlePlayToggle}
            onSpeedChange={setPlaybackSpeed}
            onLoopModeChange={setLoopMode}
            onFrameChange={handleFrameChange}
            onReset={handleReset}
            // API status for debugging
            apiStatus={apiStatus}
          />
        </section>

        {/* Zone 2: Map and Output Module */}
        <section className="flex h-96 md:h-[500px] lg:h-[600px] min-h-0">
          
          {/* Interactive Map */}
          <div className={`relative min-h-0 h-full transition-all duration-300 ${isOutputCollapsed ? 'flex-1' : 'w-1/2'}`}>
            <MapContainer
              data-tutorial="map-container"
              stationData={stationData}
              timeSeriesData={timeSeriesData}
              currentFrame={currentFrame}
              selectedDepth={selectedDepth}
              selectedArea={selectedArea}
              selectedParameter={selectedParameter}
              holoOceanPOV={holoOceanPOV}
              onPOVChange={setHoloOceanPOV}
              onStationSelect={setSelectedStation}
              onEnvironmentUpdate={setEnvData}
              csvData={csvData}
              isHeatmapVisible={isHeatmapVisible}
              onToggleHeatmap={toggleHeatmapVisibility}
              mapboxToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
            />
          </div>

          {/* Enhanced Output Module with API integration */}
          <div className={`relative min-h-0 h-full transition-all duration-300 ${isOutputCollapsed ? 'w-1/5' : 'w-1/2'}`}>
            <OutputModule
              data-tutorial="output-module"
              chatMessages={chatMessages}
              timeSeriesData={timeSeriesData}
              currentFrame={currentFrame}
              selectedParameter={selectedParameter}
              selectedDepth={selectedDepth}
              isTyping={isTyping}
              isCollapsed={isOutputCollapsed}
              onToggleCollapse={() => setIsOutputCollapsed(!isOutputCollapsed)}
              // API-specific props
              apiStatus={apiStatus}
              apiMetrics={apiMetrics}
              chatMetrics={chatMetrics}
            />
          </div>
        </section>

        {/* Zone 3: Data Panels */}
        <section className="border-t border-green-500/30">
          <DataPanels
            data-tutorial="data-panels"
            envData={envData}
            holoOceanPOV={holoOceanPOV}
            selectedDepth={selectedDepth}
            selectedParameter={selectedParameter}
            timeSeriesData={timeSeriesData}
            currentFrame={currentFrame}
            csvData={csvData}
            availableDepths={availableDepths}
            onDepthChange={setSelectedDepth}
            onParameterChange={setSelectedParameter}
            onPOVChange={setHoloOceanPOV}
            onRefreshData={refreshData}
            // API status for data quality assessment
            apiStatus={apiStatus}
          />
        </section>
      </main>

      {/* Enhanced Chatbot with full API integration */}
      <Chatbot
        data-tutorial="chatbot"
        timeSeriesData={timeSeriesData}
        csvData={csvData}
        dataSource={dataSource}
        selectedDepth={selectedDepth}
        availableDepths={availableDepths}
        selectedArea={selectedArea}
        selectedModel={selectedModel}
        selectedParameter={selectedParameter}
        playbackSpeed={playbackSpeed}
        currentFrame={currentFrame}
        holoOceanPOV={holoOceanPOV}
        envData={envData}
        timeZone={timeZone}
        onAddMessage={addChatMessage}
        // API integration props
        apiStatus={apiStatus}
        apiConfig={apiConfig}
      />

      {/* Tutorial Components */}
      <Tutorial
        isOpen={showTutorial}
        onClose={handleTutorialToggle}
        onComplete={handleTutorialComplete}
        tutorialStep={tutorialStep}
        onStepChange={handleTutorialStepChange}
      />

      <TutorialOverlay
        isActive={showTutorial}
        targetSelector={getTutorialTarget(tutorialStep)}
        highlightType="spotlight"
        showPointer={tutorialStep > 0}
      />

      {/* API Status Toast */}
      {apiStatus && !apiStatus.connected && dataLoaded && (
        <div className="fixed bottom-20 left-4 bg-yellow-900/90 backdrop-blur-md border border-yellow-500/30 rounded-lg p-3 text-sm max-w-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span className="text-yellow-300 font-medium">API Offline</span>
          </div>
          <p className="text-yellow-200 mt-1">
            Using local responses. Check your connection or API configuration.
          </p>
          <button
            onClick={() => setShowApiConfig(true)}
            className="text-yellow-400 hover:text-yellow-300 underline text-xs mt-1"
          >
            Configure API
          </button>
        </div>
      )}
    </div>
  );
};

// Helper function for tutorial targeting
const getTutorialTarget = (step) => {
  const targets = {
    1: '[data-tutorial="control-panel"]',
    2: '[data-tutorial="map-container"]', 
    3: '[data-tutorial="data-panels"]',
    4: '[data-tutorial="output-module"]',
    5: '[data-tutorial="chatbot"]'
  };
  return targets[step] || null;
};

export default App;