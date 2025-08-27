import React, { useState, useEffect } from 'react';

// Context and hook imports
import { OceanDataProvider, useOcean } from './contexts/OceanDataContext';

// Component imports
import Header from './components/layout/Header';
import ControlPanel from './components/panels/ControlPanel';
import MapContainer from './components/map/MapContainer';
import DataPanels from './components/panels/DataPanels';
import OutputModule from './components/panels/OutputModule';
import Chatbot from './components/chatbot/Chatbot';
import PasswordProtect from './components/admin/PasswordProtect'; 

// Tutorial imports
import Tutorial from './components/tutorial/Tutorial';
import TutorialOverlay from './components/tutorial/TutorialOverlay';

// CSS imports
import 'mapbox-gl/dist/mapbox-gl.css';

// Helper function for tutorial targeting
const getTutorialTarget = (step) => {
  const targets = {
    1: '[data-tutorial="control-panel"]',
    2: '[data-tutorial="map-container"]', 
    3: '[data-tutorial="data-panels"]',
    4: '[data-tutorial="output-module"]',
    5: '[data-tutorial="chatbot"]',
    6: '[data-tutorial="holoocean-panel"]'
  };
  return targets[step] || null;
};

/**
 * This component contains the main layout and view of the platform.
 * It consumes the ocean data from the context provided by OceanDataProvider.
 */
const OceanPlatform = () => {
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(true);
  const [showApiConfig, setShowApiConfig] = useState(false);

  // Consume the unified ocean data from the context
  const oceanData = useOcean();

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

  // Note: The global Loading and Error screens are now handled inside OceanDataProvider
  // so we don't need to render them here.

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
            isLoading={oceanData.isLoading}
            availableModels={oceanData.availableModels}
            availableDepths={oceanData.availableDepths}
            dataLoaded={oceanData.dataLoaded}
            selectedArea={oceanData.selectedArea}
            selectedModel={oceanData.selectedModel}
            selectedDepth={oceanData.selectedDepth}
            startDate={oceanData.startDate}
            endDate={oceanData.endDate}
            timeZone={oceanData.timeZone}
            currentFrame={oceanData.currentFrame}
            isPlaying={oceanData.isPlaying}
            playbackSpeed={oceanData.playbackSpeed}
            loopMode={oceanData.loopMode}
            holoOceanPOV={oceanData.holoOceanPOV}
            availableDates={oceanData.availableDates}
            availableTimes={oceanData.availableTimes}
            totalFrames={oceanData.totalFrames}
            data={oceanData.data}
            mapLayerVisibility={oceanData.mapLayerVisibility}
            isSstHeatmapVisible={oceanData.isSstHeatmapVisible}
            currentsVectorScale={oceanData.currentsVectorScale}
            currentsColorBy={oceanData.currentsColorBy}
            onAreaChange={oceanData.setSelectedArea}
            onModelChange={oceanData.setSelectedModel}
            onDepthChange={oceanData.setSelectedDepth}
            onDateRangeChange={oceanData.onDateRangeChange}
            onTimeZoneChange={oceanData.setTimeZone}
            onPlayToggle={oceanData.handlePlayToggle}
            onSpeedChange={oceanData.setPlaybackSpeed}
            onLoopModeChange={oceanData.setLoopMode}
            onFrameChange={oceanData.handleFrameChange}
            onReset={oceanData.handleReset}
            onSquery={oceanData.refreshData}
            onLayerToggle={oceanData.toggleMapLayer}
            onSstHeatmapToggle={oceanData.toggleSstHeatmap}
            onCurrentsScaleChange={oceanData.handleCurrentsScaleChange}
            onCurrentsColorChange={oceanData.handleCurrentsColorChange}
            heatmapScale={oceanData.heatmapScale}
            onHeatmapScaleChange={oceanData.onHeatmapScaleChange}
            apiStatus={oceanData.connectionStatus}
            // Wind Velocity Particle Configuration
            windVelocityParticleCount={oceanData.windVelocityParticleCount}
            onWindVelocityParticleCountChange={oceanData.onWindVelocityParticleCountChange}
            windVelocityParticleOpacity={oceanData.windVelocityParticleOpacity}
            onWindVelocityParticleOpacityChange={oceanData.onWindVelocityParticleOpacityChange}
            windVelocityParticleSpeed={oceanData.windVelocityParticleSpeed}
            onWindVelocityParticleSpeedChange={oceanData.onWindVelocityParticleSpeedChange}
          />
        </section>

        <section className="flex h-96 md:h-[500px] lg:h-[600px] min-h-0">
          <div className={`relative min-h-0 h-full transition-all duration-300 ${isOutputCollapsed ? 'flex-1' : 'w-1/2'}`}>
            <MapContainer
              data-tutorial="map-container"
              stationData={oceanData.stationData}
              timeSeriesData={oceanData.timeSeriesData}
              rawData={oceanData.rawData}
              currentsGeoJSON={oceanData.currentsGeoJSON}
              currentFrame={oceanData.currentFrame}
              selectedDepth={oceanData.selectedDepth}
              selectedArea={oceanData.selectedArea}
              holoOceanPOV={oceanData.holoOceanPOV}
              onPOVChange={oceanData.setHoloOceanPOV}
              onDepthChange={oceanData.setSelectedDepth}
              onStationSelect={oceanData.setSelectedStation}
              onEnvironmentUpdate={oceanData.setEnvData}
              currentDate={oceanData.currentDate}
              currentTime={oceanData.currentTime}
              mapLayerVisibility={oceanData.mapLayerVisibility}
              isSstHeatmapVisible={oceanData.isSstHeatmapVisible}
              currentsVectorScale={oceanData.currentsVectorScale}
              currentsColorBy={oceanData.currentsColorBy}
              heatmapScale={oceanData.heatmapScale}
              mapboxToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
              isOutputCollapsed={isOutputCollapsed}
              availableDepths={oceanData.availableDepths}
              // Wind Velocity Particle Configuration
              windVelocityParticleCount={oceanData.windVelocityParticleCount}
              windVelocityParticleOpacity={oceanData.windVelocityParticleOpacity}
              windVelocityParticleSpeed={oceanData.windVelocityParticleSpeed}
            />
          </div>

          <div className={`relative min-h-0 h-full transition-all duration-300 ${isOutputCollapsed ? 'w-1/5' : 'w-1/2'}`}>
            <OutputModule
              data-tutorial="output-module"
              chatMessages={oceanData.chatMessages}
              timeSeriesData={oceanData.timeSeriesData}
              currentFrame={oceanData.currentFrame}
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
            timeSeriesData={oceanData.timeSeriesData}
            currentFrame={oceanData.currentFrame}
            data={oceanData.data}
            availableDepths={oceanData.availableDepths}
            onDepthChange={oceanData.setSelectedDepth}
            onPOVChange={oceanData.setHoloOceanPOV}
            onRefreshData={oceanData.refreshData}
            apiStatus={oceanData.connectionStatus}
          />
        </section>
      </main>

      <Chatbot
        data-tutorial="chatbot"
        timeSeriesData={oceanData.timeSeriesData}
        data={oceanData.data}
        dataSource={oceanData.dataSource}
        selectedDepth={oceanData.selectedDepth}
        availableDepths={oceanData.availableDepths}
        selectedArea={oceanData.selectedArea}
        selectedModel={oceanData.selectedModel}
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

/**
 * Main application entry point.
 * Wraps the entire platform in the OceanDataProvider to provide global state.
 * Conditionally renders the PasswordProtect component or the main app.
 */
const App = () => {
  // Initialize state by checking localStorage for the authentication flag.
  // This function runs only once on the initial component render.
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  // If the user is not authenticated, show the password protection screen.
  // The `onSuccess` callback will update the state and render the main app.
  if (!isAuthenticated) {
    return <PasswordProtect onSuccess={() => setIsAuthenticated(true)} />;
  }

  // Once authenticated, render the main application.
  return (
    <OceanDataProvider>
      <OceanPlatform />
    </OceanDataProvider>
  );
};

export default App;