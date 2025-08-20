import { useEffect, useMemo, useState, useCallback } from 'react';
import { useDataManagement } from './useDataManagement';
import { useApiIntegration } from './useApiIntegration';
import { useChatManagement } from './useChatManagement';
import { useAnimationControl } from './useAnimationControl';
import { useUIControls } from './useUIControls';
import { useEnvironmentalData } from './useEnvironmentalData';
import { useTutorial } from './useTutorial';
import { useTimeManagement } from './useTimeManagement';

export const useOceanData = () => {
  // Initialize UI controls without dependencies first
  const uiControls = useUIControls();
  
  // Currents layer configuration
  const [currentsVectorScale, setCurrentsVectorScale] = useState(0.001);
  const [currentsColorBy, setCurrentsColorBy] = useState('speed');
  const [showOceanBaseLayer, setShowOceanBaseLayer] = useState(false);
  const [oceanBaseOpacity, setOceanBaseOpacity] = useState(1.0);

  // Initialize time management first to handle the date range state.
  // We call it without raw data, as it's not available yet.
  const timeManagement = useTimeManagement();

  // Data management is driven by the user's UI selections, now including the correct date range.
  const dataManagement = useDataManagement(
    uiControls.selectedArea,
    uiControls.selectedModel,
    null, // Pass null for legacy currentDate
    null, // Pass null for legacy currentTime
    uiControls.selectedDepth,
    uiControls.selectedStation,
    timeManagement.startDate, // Correctly pass startDate
    timeManagement.endDate    // Correctly pass endDate
  );
  
  // Update UI controls when new options become available from data management
  useEffect(() => {
    // Update available models if current selection is invalid
    if (dataManagement.availableModels.length > 0) {
      if (!dataManagement.availableModels.includes(uiControls.selectedModel)) {
        uiControls.setSelectedModel(dataManagement.availableModels[0]);
      }
    }
  }, [dataManagement.availableModels, uiControls.selectedModel, uiControls.setSelectedModel]);

  useEffect(() => {
    // Update available depths if current selection is invalid  
    if (dataManagement.availableDepths.length > 0) {
      if (uiControls.selectedDepth === null || !dataManagement.availableDepths.includes(uiControls.selectedDepth)) {
        uiControls.setSelectedDepth(dataManagement.availableDepths[0]);
      }
    }
  }, [dataManagement.availableDepths, uiControls.selectedDepth, uiControls.setSelectedDepth]);
  
  // Once data is loaded, pass it to the timeManagement hook to process and update its state.
  useEffect(() => {
    if (dataManagement.rawData) {
      timeManagement.processRawData(dataManagement.rawData);
    }
  }, [dataManagement.rawData, timeManagement]);

  // Initialize dependent hooks now that data is available
  const animationControl = useAnimationControl(dataManagement.totalFrames);

  // Determine the correct data source for environmental data
  const environmentalDataSource =
    dataManagement.selectedStationEnvironmentalData && dataManagement.selectedStationEnvironmentalData.length > 0
      ? dataManagement.selectedStationEnvironmentalData
      : dataManagement.rawData;

  const environmentalData = useEnvironmentalData(
    environmentalDataSource, 
    animationControl.currentFrame, 
    uiControls.selectedDepth
  );

  // Convert raw data to GeoJSON for the currents layer
  const currentsGeoJSON = useMemo(() => {
    if (!dataManagement.rawData || dataManagement.rawData.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features = dataManagement.rawData.map(row => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [parseFloat(row.lon), parseFloat(row.lat)],
      },
      properties: {
        direction: parseFloat(row.direction),
      },
    })).filter(feature => 
      !isNaN(feature.geometry.coordinates[0]) &&
      !isNaN(feature.geometry.coordinates[1]) &&
      !isNaN(feature.properties.direction)
    );
    
    return {
      type: 'FeatureCollection',
      features,
    };
  }, [dataManagement.rawData]);
  
  // API Integration, Chat, and Tutorial hooks
  const apiIntegration = useApiIntegration();
  const chatManagement = useChatManagement();
  const tutorial = useTutorial();

  /**
   * Updates the state for various query parameters.
   * This triggers the useEffect within useDataManagement to refetch data.
   * @param {object} settings - The new settings to apply.
   * @param {string} [settings.area] - The new selected area.
   * @param {string} [settings.model] - The new selected model.
   * @param {number} [settings.depth] - The new selected depth.
   * @param {Date} [settings.startDate] - The new start date.
   * @param {Date} [settings.endDate] - The new end date.
   */
  const fetchData = useCallback((settings) => {
    if (!settings) return;

    if (settings.area && settings.area !== uiControls.selectedArea) {
      uiControls.setSelectedArea(settings.area);
    }
    if (settings.model && settings.model !== uiControls.selectedModel) {
      uiControls.setSelectedModel(settings.model);
    }
    if (settings.depth !== undefined && settings.depth !== uiControls.selectedDepth) {
      uiControls.setSelectedDepth(settings.depth);
    }
    if (settings.startDate && settings.endDate && (settings.startDate !== timeManagement.startDate || settings.endDate !== timeManagement.endDate)) {
      timeManagement.handleDateRangeChange({ startDate: settings.startDate, endDate: settings.endDate });
    }
  }, [
    uiControls,
    timeManagement
  ]);

  const handleCurrentsScaleChange = (newScale) => {
    setCurrentsVectorScale(newScale);
  };

  const handleCurrentsColorChange = (newColorBy) => {
    setCurrentsColorBy(newColorBy);
  };

  const handleOceanBaseToggle = () => {
    setShowOceanBaseLayer(prev => !prev);
  };

  const handleOceanBaseOpacityChange = (newOpacity) => {
    setOceanBaseOpacity(newOpacity);
  };

  // Enhanced frame change handler
  const handleFrameChange = (frameIndex) => {
    animationControl.jumpToFrame(frameIndex);
    
    // Update time if we have temporal data
    if (dataManagement.rawData.length > frameIndex && dataManagement.rawData[frameIndex]?.time) {
      const frameData = dataManagement.rawData[frameIndex];
      const frameTime = new Date(frameData.time);
      timeManagement.setCurrentDate(frameTime);
    }
  };

  // Enhanced station analysis
  const handleStationAnalysis = (station) => {
    const stationData = dataManagement.rawData.filter(row => {
      if (!row.lat || !row.lon) return false;
      const latDiff = Math.abs(row.lat - station.coordinates[1]);
      const lngDiff = Math.abs(row.lon - station.coordinates[0]);
      return latDiff < 0.001 && lngDiff < 0.001;
    });
    
    const analysisContent = `Station Analysis: ${station.name} contains ${stationData.length} measurements. ${
      stationData.length > 0 
        ? `Latest data shows temperature: ${stationData[stationData.length-1]?.temperature || 'N/A'}°F, current speed: ${stationData[stationData.length-1]?.currentSpeed || 'N/A'} m/s` 
        : 'no recent measurements available'
    }. Located at ${station.coordinates[1]}, ${station.coordinates[0]}`;
    
    chatManagement.addAIResponse(analysisContent, 'system');
  };

  // Enhanced date/time change handler
  const enhancedDateTimeChange = (newDate, newTime) => {
    const result = timeManagement.handleDateTimeChange(newDate, newTime);
    if (result && result.index !== undefined) {
      animationControl.jumpToFrame(result.index);
    }
    return result;
  };

  // Return unified API
  return {
    // Loading/Error states
    isLoading: dataManagement.isLoading,
    hasError: dataManagement.hasError,
    errorMessage: dataManagement.errorMessage,
    dataLoaded: dataManagement.dataLoaded,
    dataSource: dataManagement.dataSource,
    dataQuality: dataManagement.dataQuality,
    connectionStatus: apiIntegration.connectionStatus,
    connectionDetails: apiIntegration.connectionDetails,
    
    // Data
    stationData: dataManagement.stationData,
    timeSeriesData: dataManagement.timeSeriesData,
    totalFrames: dataManagement.totalFrames,
    data: dataManagement.data,
    rawData: dataManagement.rawData,
    currentsGeoJSON,
    
    // UI Control state from useUIControls
    selectedArea: uiControls.selectedArea,
    selectedModel: uiControls.selectedModel,
    selectedDepth: uiControls.selectedDepth,
    selectedParameter: uiControls.selectedParameter,
    selectedStation: uiControls.selectedStation,
    setSelectedArea: uiControls.setSelectedArea,
    setSelectedModel: uiControls.setSelectedModel,
    setSelectedDepth: uiControls.setSelectedDepth,
    setSelectedParameter: uiControls.setSelectedParameter,
    setSelectedStation: uiControls.setSelectedStation,
    availableAreas: uiControls.availableAreas,
    availableParameters: uiControls.availableParameters,
    availableModels: dataManagement.availableModels,
    availableDepths: dataManagement.availableDepths,
    
    // Layer visibility state from useUIControls
    mapLayerVisibility: uiControls.mapLayerVisibility,
    isSstHeatmapVisible: uiControls.isSstHeatmapVisible,
    
    // Layer configuration (still local to this hook)
    oceanBaseOpacity,
    currentsVectorScale,
    currentsColorBy,
    
    // Animation/Time state
    isPlaying: animationControl.isPlaying,
    currentFrame: animationControl.currentFrame,
    playbackSpeed: animationControl.playbackSpeed,
    loopMode: animationControl.loopMode,
    setIsPlaying: animationControl.setIsPlaying,
    setCurrentFrame: animationControl.setCurrentFrame,
    setPlaybackSpeed: animationControl.setPlaybackSpeed,
    setLoopMode: animationControl.setLoopMode,
    handlePlayToggle: animationControl.handlePlayToggle,
    handleReset: animationControl.handleReset,
    
    // Time management
    startDate: timeManagement.startDate,
    endDate: timeManagement.endDate,
    currentDate: timeManagement.currentDate,
    timeZone: timeManagement.timeZone,
    setCurrentDate: timeManagement.setCurrentDate,
    setCurrentTime: timeManagement.setCurrentTime,
    setTimeZone: timeManagement.setTimeZone,
    availableDates: timeManagement.availableDates,
    availableTimes: timeManagement.availableTimes,
    onDateRangeChange: timeManagement.handleDateRangeChange,
    
    // Environment/POV
    envData: environmentalData.envData,
    holoOceanPOV: environmentalData.holoOceanPOV,
    setEnvData: environmentalData.setEnvData,
    setHoloOceanPOV: environmentalData.setHoloOceanPOV,
    
    // Chat
    chatMessages: chatManagement.chatMessages,
    isTyping: chatManagement.isTyping,
    setIsTyping: chatManagement.startTyping,
    addChatMessage: chatManagement.addChatMessage,
    clearChatMessages: chatManagement.clearChatMessages,
    
    // Tutorial
    showTutorial: tutorial.showTutorial,
    tutorialStep: tutorial.tutorialStep,
    tutorialMode: tutorial.tutorialMode,
		isFirstTimeUser: tutorial.isFirstTimeUser,
    handleTutorialToggle: tutorial.handleTutorialToggle,
    handleTutorialComplete: tutorial.handleTutorialComplete,
    handleTutorialStepChange: tutorial.goToStep,
    
    // Actions
    fetchData,
    handleFrameChange,
    handleStationAnalysis,
    refreshData: dataManagement.refreshData,
    handleDateTimeChange: enhancedDateTimeChange,
    
    // Layer control actions from useUIControls
    toggleMapLayer: uiControls.toggleMapLayer,
    toggleSstHeatmap: uiControls.toggleSstHeatmap,

    // Remaining local layer control actions
    handleCurrentsScaleChange,
    handleCurrentsColorChange,
    handleOceanBaseToggle,
    handleOceanBaseOpacityChange
  };
};