import React, { useState, useEffect } from 'react';

// Ocean data hook import (replaces individual hooks)
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

  // Unified ocean data hook
  const oceanData = useOceanData();

  // Check API status on component mount
  useEffect(() => {
    if (oceanData.connectionStatus && oceanData.connectionStatus.checkAPIStatus) {
      oceanData.connectionStatus.checkAPIStatus();
    }
  }, [oceanData.connectionStatus]);

  // Show API config panel if API is not connected and we have data
  useEffect(() => {
    if (oceanData.dataLoaded && oceanData.connectionStatus && !oceanData.connectionStatus.connected && !showApiConfig) {
      if (!oceanData.connectionStatus.hasApiKey && oceanData.connectionStatus.endpoint) {
        setShowApiConfig(true);
      }
    }
  }, [oceanData.dataLoaded, oceanData.connectionStatus, showApiConfig]);

  if (oceanData.isLoading) {
    return <LoadingScreen title="Loading Oceanographic Data" message="Initializing ocean monitoring systems and AI services..." type="data" />;
  }

  if (oceanData.hasError) {
    return <ErrorScreen type="no-data" title="No Oceanographic Data Available" message={oceanData.errorMessage} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      
      <Header 
        dataSource={oceanData.dataSource}
        timeZone={oceanData.timeZone}
        onTimeZoneChange={oceanData.setTimeZone}
        connectionStatus={oceanData.connectionStatus}
        dataQuality={oceanData.dataQuality}
        showDataStatus={true}
        showTutorial={oceanData.showTutorial}
        onTutorialToggle={oceanData.handleTutorialToggle}
        tutorialStep={oceanData.tutorialStep}
        isFirstTimeUser={oceanData.isFirstTimeUser}
        apiStatus={oceanData.connectionStatus}
        apiMetrics={oceanData.connectionDetails}
        chatMetrics={oceanData.chatMessages?.length || 0}
        onShowApiConfig={() => setShowApiConfig(true)}
        onResetApiMetrics={() => {}}
      />

      <main className="flex-1 flex flex-col min-h-0">
        <section className="border-b border-pink-500/30 flex-shrink-0">
          <ControlPanel
            data-tutorial="control-panel"
            availableModels={oceanData.availableModels}
            availableDepths={oceanData.availableDepths}
            dataLoaded={oceanData.dataLoaded}
            selectedArea={oceanData.selectedArea}
            selectedModel={oceanData.selectedModel}
            selectedDepth={oceanData.selectedDepth}
            selectedParameter={oceanData.selectedParameter}
            currentDate={oceanData.currentDate}
            currentTime={oceanData.currentTime}
            timeZone={oceanData.timeZone}
            currentFrame={oceanData.currentFrame}
            isPlaying={oceanData.isPlaying}
            playbackSpeed={oceanData.playbackSpeed}
            loopMode={oceanData.loopMode}
            holoOceanPOV={oceanData.holoOceanPOV}
            availableDates={oceanData.availableDates}
            availableTimes={oceanData.availableTimes}
            totalFrames={oceanData.totalFrames}
            csvData={oceanData.csvData}
            mapLayerVisibility={oceanData.mapLayerVisibility}
            isSstHeatmapVisible={oceanData.isSstHeatmapVisible}
            currentsVectorScale={oceanData.currentsVectorScale}
            currentsColorBy={oceanData.currentsColorBy}
            onAreaChange={oceanData.setSelectedArea}
            onModelChange={oceanData.setSelectedModel}
            onDepthChange={oceanData.setSelectedDepth}
            onParameterChange={oceanData.setSelectedParameter}
            onDateTimeChange={oceanData.handleDateTimeChange}
            onTimeZoneChange={oceanData.setTimeZone}
            onPlayToggle={oceanData.handlePlayToggle}
            onSpeedChange={oceanData.setPlaybackSpeed}
            onLoopModeChange={oceanData.setLoopMode}
            onFrameChange={oceanData.handleFrameChange}
            onReset={oceanData.handleReset}
            onLayerToggle={oceanData.toggleMapLayer}
            onSstHeatmapToggle={oceanData.toggleSstHeatmap}
            onCurrentsScaleChange={oceanData.handleCurrentsScaleChange}
            onCurrentsColorChange={oceanData.handleCurrentsColorChange}
            apiStatus={oceanData.connectionStatus}
          />
        </section>

        <section className="flex h-96 md:h-[500px] lg:h-[600px] min-h-0">
          <div className={`relative min-h-0 h-full transition-all duration-300 ${isOutputCollapsed ? 'flex-1' : 'w-1/2'}`}>
            <MapContainer
              data-tutorial="map-container"
              stationData={oceanData.stationData}
              timeSeriesData={oceanData.timeSeriesData}
              rawCsvData={oceanData.rawCsvData}
              currentsGeoJSON={oceanData.currentsGeoJSON}
              currentFrame={oceanData.currentFrame}
              selectedDepth={oceanData.selectedDepth}
              selectedArea={oceanData.selectedArea}
              selectedParameter={oceanData.selectedParameter}
              holoOceanPOV={oceanData.holoOceanPOV}
              onPOVChange={oceanData.setHoloOceanPOV}
              onStationSelect={oceanData.setSelectedStation}
              onEnvironmentUpdate={oceanData.setEnvData}
              currentDate={oceanData.currentDate}
              currentTime={oceanData.currentTime}
              mapLayerVisibility={oceanData.mapLayerVisibility}
              isSstHeatmapVisible={oceanData.isSstHeatmapVisible}
              currentsVectorScale={oceanData.currentsVectorScale}
              currentsColorBy={oceanData.currentsColorBy}
              mapboxToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
            />
          </div>

          <div className={`relative min-h-0 h-full transition-all duration-300 ${isOutputCollapsed ? 'w-1/5' : 'w-1/2'}`}>
            <OutputModule
              data-tutorial="output-module"
              chatMessages={oceanData.chatMessages}
              timeSeriesData={oceanData.timeSeriesData}
              currentFrame={oceanData.currentFrame}
              selectedParameter={oceanData.selectedParameter}
              selectedDepth={oceanData.selectedDepth}
              isTyping={oceanData.isTyping}
              isCollapsed={isOutputCollapsed}
              onToggleCollapse={() => setIsOutputCollapsed(!isOutputCollapsed)}
              apiStatus={oceanData.connectionStatus}
              apiMetrics={oceanData.connectionDetails}
              chatMetrics={oceanData.chatMessages?.length || 0}
            />
          </div>
        </section>

        <section className="border-t border-green-500/30">
          <DataPanels
            data-tutorial="data-panels"
            envData={oceanData.envData}
            holoOceanPOV={oceanData.holoOceanPOV}
            selectedDepth={oceanData.selectedDepth}
            selectedParameter={oceanData.selectedParameter}
            timeSeriesData={oceanData.timeSeriesData}
            currentFrame={oceanData.currentFrame}
            csvData={oceanData.csvData}
            availableDepths={oceanData.availableDepths}
            onDepthChange={oceanData.setSelectedDepth}
            onParameterChange={oceanData.setSelectedParameter}
            onPOVChange={oceanData.setHoloOceanPOV}
            onRefreshData={oceanData.refreshData}
            apiStatus={oceanData.connectionStatus}
          />
        </section>
      </main>

      <Chatbot
        data-tutorial="chatbot"
        timeSeriesData={oceanData.timeSeriesData}
        csvData={oceanData.csvData}
        dataSource={oceanData.dataSource}
        selectedDepth={oceanData.selectedDepth}
        availableDepths={oceanData.availableDepths}
        selectedArea={oceanData.selectedArea}
        selectedModel={oceanData.selectedModel}
        selectedParameter={oceanData.selectedParameter}
        playbackSpeed={oceanData.playbackSpeed}
        currentFrame={oceanData.currentFrame}
        holoOceanPOV={oceanData.holoOceanPOV}
        envData={oceanData.envData}
        timeZone={oceanData.timeZone}
        onAddMessage={oceanData.addChatMessage}
        apiStatus={oceanData.connectionStatus}
        apiConfig={oceanData.connectionDetails}
      />

      <Tutorial
        isOpen={oceanData.showTutorial}
        onClose={oceanData.handleTutorialToggle}
        onComplete={oceanData.handleTutorialComplete}
        tutorialStep={oceanData.tutorialStep}
        onStepChange={oceanData.handleTutorialStepChange}
      />

      <TutorialOverlay
        isActive={oceanData.showTutorial}
        targetSelector={getTutorialTarget(oceanData.tutorialStep)}
        highlightType="spotlight"
        showPointer={oceanData.tutorialStep > 0}
      />
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