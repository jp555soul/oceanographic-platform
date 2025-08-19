import { useEffect, useMemo, useState } from 'react';
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
  
  // Layer visibility state
  const [showCurrentsLayer, setShowCurrentsLayer] = useState(false);
  const [showTemperatureLayer, setShowTemperatureLayer] = useState(false);
  const [showStationsLayer, setShowStationsLayer] = useState(true);
  
  // Currents layer configuration
  const [currentsVectorScale, setCurrentsVectorScale] = useState(0.001);
  const [currentsColorBy, setCurrentsColorBy] = useState('speed');
  
  // Data management with initial selections
  const dataManagement = useDataManagement(uiControls.selectedDepth, uiControls.selectedModel);
  
  // Update UI controls when new options become available
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

  // Time Management
  const timeManagement = useTimeManagement(dataManagement.rawCsvData);

  // Animation Control  
  const animationControl = useAnimationControl(dataManagement.totalFrames);

  // Environmental Data
  const environmentalData = useEnvironmentalData(
    dataManagement.rawCsvData, 
    animationControl.currentFrame, 
    uiControls.selectedDepth
  );

  // Convert raw data to GeoJSON for the currents layer
  const currentsGeoJSON = useMemo(() => {
    if (!dataManagement.rawCsvData || dataManagement.rawCsvData.length === 0) {
      return { type: 'FeatureCollection', features: [] };
    }

    const features = dataManagement.rawCsvData.map(row => ({
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
  }, [dataManagement.rawCsvData]);

  // API Integration
  const apiIntegration = useApiIntegration();

  // Chat Management
  const chatManagement = useChatManagement();

  // Tutorial
  const tutorial = useTutorial();

  // Layer control handlers
  const handleLayerToggle = (layerName, isVisible) => {
    switch (layerName) {
      case 'currents':
        setShowCurrentsLayer(isVisible);
        break;
      case 'temperature':
        setShowTemperatureLayer(isVisible);
        break;
      case 'stations':
        setShowStationsLayer(isVisible);
        break;
      default:
        console.warn(`Unknown layer: ${layerName}`);
    }
  };

  const handleCurrentsScaleChange = (newScale) => {
    setCurrentsVectorScale(newScale);
  };

  const handleCurrentsColorChange = (newColorBy) => {
    setCurrentsColorBy(newColorBy);
  };

  // Enhanced frame change handler
  const handleFrameChange = (frameIndex) => {
    animationControl.jumpToFrame(frameIndex);
    
    // Update time if we have temporal data
    if (dataManagement.rawCsvData.length > frameIndex && dataManagement.rawCsvData[frameIndex]?.time) {
      const frameData = dataManagement.rawCsvData[frameIndex];
      const frameTime = new Date(frameData.time);
      timeManagement.setCurrentDate(frameTime.toISOString().split('T')[0]);
      timeManagement.setCurrentTime(frameTime.toTimeString().split(' ')[0].substring(0, 5));
    }
  };

  // Enhanced station analysis
  const handleStationAnalysis = (station) => {
    const stationData = dataManagement.rawCsvData.filter(row => {
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
    csvData: dataManagement.csvData,
    rawCsvData: dataManagement.rawCsvData,
    currentsGeoJSON,
    
    // UI Control state
    selectedArea: uiControls.selectedArea,
    selectedModel: uiControls.selectedModel,
    selectedDepth: uiControls.selectedDepth,
    selectedParameter: uiControls.selectedParameter,
    selectedStation: uiControls.selectedStation,
    isHeatmapVisible: uiControls.isHeatmapVisible,
    setSelectedArea: uiControls.setSelectedArea,
    setSelectedModel: uiControls.setSelectedModel,
    setSelectedDepth: uiControls.setSelectedDepth,
    setSelectedParameter: uiControls.setSelectedParameter,
    setSelectedStation: uiControls.setSelectedStation,
    toggleHeatmapVisibility: uiControls.toggleHeatmapVisibility,
    availableAreas: uiControls.availableAreas,
    availableParameters: uiControls.availableParameters,
    availableModels: dataManagement.availableModels,
    availableDepths: dataManagement.availableDepths,
    
    // Layer visibility state
    showCurrentsLayer,
    showTemperatureLayer,
    showStationsLayer,
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
    currentDate: timeManagement.currentDate,
    currentTime: timeManagement.currentTime,
    timeZone: timeManagement.timeZone,
    setCurrentDate: timeManagement.setCurrentDate,
    setCurrentTime: timeManagement.setCurrentTime,
    setTimeZone: timeManagement.setTimeZone,
    availableDates: timeManagement.availableDates,
    availableTimes: timeManagement.availableTimes,
    
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
    handleFrameChange,
    handleStationAnalysis,
    refreshData: dataManagement.refreshData,
    handleDateTimeChange: enhancedDateTimeChange,
    
    // Layer control actions
    handleLayerToggle,
    handleCurrentsScaleChange,
    handleCurrentsColorChange
  };
};