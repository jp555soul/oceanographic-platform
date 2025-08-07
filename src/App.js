import React from 'react';
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

// CSS imports
import 'mapbox-gl/dist/mapbox-gl.css';

/**
 * Main Oceanographic Platform Component
 * Orchestrates the entire application layout and data flow
 */
const OceanographicPlatformContent = () => {
  const {
    // Loading states
    isLoading,
    hasError,
    errorMessage,
    
    // Data states
    csvData,
    timeSeriesData,
    stationData,
    dataSource,
    dataQuality,
    availableModels,
    dataLoaded, 
    
    // UI states
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
    
    // Chat states
    chatMessages,
    isTyping,
    
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
    refreshData
  } = useOceanData();

  // Handle loading states
  if (isLoading) {
    return (
      <LoadingScreen 
        title="Loading Oceanographic Data"
        message="Initializing ocean monitoring systems..."
        type="data"
        details={[
          { message: "Scanning data directory...", status: "completed" },
          { message: "Loading CSV files...", status: "loading" },
          { message: "Validating coordinates...", status: "pending" },
          { message: "Generating station data...", status: "pending" },
          { message: "Initializing map interface...", status: "pending" }
        ]}
      />
    );
  }

  // Handle error states
  if (hasError) {
    return (
      <ErrorScreen 
        type="no-data"
        title="No Oceanographic Data Available"
        message={errorMessage}
        onRetry={() => window.location.reload()}
        onGoHome={() => window.location.href = '/'}
        customActions={[
          {
            label: "Download Sample Data",
            onClick: () => {
              // Could implement sample data download
              console.log("Sample data download requested");
            },
            className: "bg-green-600 hover:bg-green-700"
          }
        ]}
      />
    );
  }

  return (
    <div className="bg-slate-900 text-white min-h-screen">
      
      {/* Header */}
      <Header 
        dataSource={dataSource}
        timeZone={timeZone}
        onTimeZoneChange={setTimeZone}
        connectionStatus={connectionStatus}
        dataQuality={dataQuality}
        showDataStatus={true}
      />

      {/* Main Application Layout */}
      <main className="flex flex-col lg:h-screen">
        
        {/* Zone 1: Control Panel */}
        <section className="border-b border-pink-500/30">
          <ControlPanel
            availableModels={availableModels}
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
        <section className="grid grid-cols-1 lg:grid-cols-2 flex-1">
          
          {/* Interactive Map */}
          <div className="relative h-64 md:h-96 lg:h-full">
            <MapContainer
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
              currentDate={currentDate}
              currentTime={currentTime}
              mapboxToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
            />
          </div>

          {/* Output Module */}
          <div className="h-64 md:h-96 lg:h-full">
            <OutputModule
              chatMessages={chatMessages}
              timeSeriesData={timeSeriesData}
              currentFrame={currentFrame}
              selectedParameter={selectedParameter}
              selectedDepth={selectedDepth}
              showCharts={true}
              showTables={true}
              isTyping={isTyping}
              onExportResponse={(response, index) => {
                // Handle response export
                console.log('Exporting response:', response);
              }}
              onCopyResponse={(response) => {
                // Handle response copy
                navigator.clipboard.writeText(response.content);
              }}
            />
          </div>
        </section>

        {/* Zone 3: Data Panels */}
        <section className="border-t border-green-500/30">
          <DataPanels
            envData={envData}
            holoOceanPOV={holoOceanPOV}
            selectedDepth={selectedDepth}
            timeSeriesData={timeSeriesData}
            currentFrame={currentFrame}
            showHoloOcean={true}
            showEnvironmental={true}
            showCharts={true}
            showAdvancedMetrics={false}
            onDepthChange={setSelectedDepth}
            onPOVChange={setHoloOceanPOV}
            onRefreshData={refreshData}
          />
        </section>
      </main>

      {/* Floating Components */}
      <Chatbot
        timeSeriesData={timeSeriesData}
        csvData={csvData}
        dataSource={dataSource}
        selectedDepth={selectedDepth}
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
    </div>
  );
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