import React, { useState } from 'react';
import { OceanDataProvider } from './contexts/OceanDataContext';
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

// NEW: Tutorial imports
import Tutorial from './components/tutorial/Tutorial';
import TutorialOverlay from './components/tutorial/TutorialOverlay';

// CSS imports
import 'mapbox-gl/dist/mapbox-gl.css';

/**
 * Main Oceanographic Platform Component
 */
const OceanographicPlatformContent = () => {
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(true);
  
  // NEW: Tutorial state management
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(() => {
    return !localStorage.getItem('ocean-monitor-tutorial-completed');
  });

  const {
    // ... existing state destructuring
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
    chatMessages,
    isTyping,
    // ... existing actions
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
    refreshData
  } = useOceanData();

  // NEW: Tutorial handlers
  const handleTutorialToggle = (open) => {
    setShowTutorial(open);
    if (open) {
      setTutorialStep(0);
    }
  };

  const handleTutorialComplete = () => {
    localStorage.setItem('ocean-monitor-tutorial-completed', 'true');
    setIsFirstTimeUser(false);
    setShowTutorial(false);
  };

  const handleTutorialStepChange = (step) => {
    setTutorialStep(step);
  };

  // Handle loading states
  if (isLoading) {
    return (
      <LoadingScreen 
        title="Loading Oceanographic Data"
        message="Initializing ocean monitoring systems..."
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
      
      {/* Header with tutorial props */}
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
      />

      {/* Main Application Layout */}
      <main className="flex-1 flex flex-col min-h-0">
        
        {/* Zone 1: Control Panel with tutorial targeting */}
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
            totalFrames={csvData?.length || 24}
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
          />
        </section>

        {/* Zone 2: Map and Output Module */}
        <section className="flex h-96 md:h-[500px] lg:h-[600px] min-h-0">
          
          {/* Interactive Map with tutorial targeting */}
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
              mapboxToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
            />
          </div>

          {/* Output Module with tutorial targeting */}
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
            />
          </div>
        </section>

        {/* Zone 3: Data Panels with tutorial targeting */}
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
          />
        </section>
      </main>

      {/* Floating Components */}
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
      />

      {/* NEW: Tutorial Components */}
      {showTutorial && (
        <Tutorial
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          onComplete={handleTutorialComplete}
          tutorialStep={tutorialStep}
          onStepChange={handleTutorialStepChange}
        />
      )}

      {/* NEW: Tutorial Overlay for highlighting */}
      <TutorialOverlay
        isActive={showTutorial}
        targetSelector={getTutorialTarget(tutorialStep)}
        highlightType="spotlight"
        showPointer={tutorialStep > 0}
      />
    </div>
  );
};

// NEW: Helper function to get current tutorial target
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

/**
 * App Component with Context Provider
 */
const App = () => {
  return (
    <OceanDataProvider>
      <OceanographicPlatformContent />
    </OceanDataProvider>
  );
};

export default App;