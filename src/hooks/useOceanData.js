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
  const uiControls = useUIControls();
  const [currentsVectorScale, setCurrentsVectorScale] = useState(0.009);
  const [currentsColorBy, setCurrentsColorBy] = useState('speed');
  const [showOceanBaseLayer, setShowOceanBaseLayer] = useState(false);
  const [oceanBaseOpacity, setOceanBaseOpacity] = useState(1.0);

  const timeManagement = useTimeManagement();

  const dataManagement = useDataManagement(
    uiControls.selectedArea,
    uiControls.selectedModel,
    null,
    null,
    uiControls.selectedDepth,
    null,
    timeManagement.startDate,
    timeManagement.endDate
  );

  useEffect(() => {
    if (dataManagement.availableModels.length > 0) {
      if (!dataManagement.availableModels.includes(uiControls.selectedModel)) {
        uiControls.setSelectedModel(dataManagement.availableModels[0]);
      }
    }
  }, [dataManagement.availableModels, uiControls.selectedModel, uiControls.setSelectedModel]);

  useEffect(() => {
    if (dataManagement.availableDepths.length > 0) {
      const isInvalid = uiControls.selectedDepth === null || !dataManagement.availableDepths.includes(uiControls.selectedDepth);

      if (isInvalid) {
        console.warn("SELECTION IS INVALID. Resetting depth to:", dataManagement.availableDepths[0]);
        uiControls.setSelectedDepth(dataManagement.availableDepths[0]);
      }
    } else {
      console.log("No available depths to check against yet.");
    }
  }, [dataManagement.availableDepths, uiControls.setSelectedDepth]);

  useEffect(() => {
    if (dataManagement.rawData) {
      timeManagement.processRawData(dataManagement.rawData);
    }
  }, [dataManagement.rawData, timeManagement]);

  const animationControl = useAnimationControl(dataManagement.totalFrames);

  const environmentalDataSource = dataManagement.rawData;
  const environmentalData = useEnvironmentalData(
    environmentalDataSource,
    animationControl.currentFrame,
    uiControls.selectedDepth
  );

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
        speed: parseFloat(row.nspeed),
      },
    })).filter(feature =>
      !isNaN(feature.geometry.coordinates[0]) &&
      !isNaN(feature.geometry.coordinates[1]) &&
      !isNaN(feature.properties.direction) &&
      !isNaN(feature.properties.speed)
    );

    return {
      type: 'FeatureCollection',
      features,
    };
  }, [dataManagement.rawData]);

  const apiIntegration = useApiIntegration();
  const chatManagement = useChatManagement();
  const tutorial = useTutorial();

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

  const handleFrameChange = (frameIndex) => {
    animationControl.jumpToFrame(frameIndex);

    if (dataManagement.rawData.length > frameIndex && dataManagement.rawData[frameIndex]?.time) {
      const frameData = dataManagement.rawData[frameIndex];
      const frameTime = new Date(frameData.time);
      timeManagement.setCurrentDate(frameTime);
    }
  };

  const handlePointAnalysis = (point) => {
    const pointData = dataManagement.rawData.filter(row => {
      if (!row.lat || !row.lon) return false;
      const latDiff = Math.abs(row.lat - point.latitude);
      const lngDiff = Math.abs(row.lon - point.longitude);
      return latDiff < 0.001 && lngDiff < 0.001;
    });

    const latest = pointData[pointData.length - 1];
    const analysisContent = `Point Analysis: ${pointData.length} measurements found at [${point.latitude}, ${point.longitude}]. ` +
      (latest ? `Latest temp: ${latest.temp || 'N/A'}Â°C, current speed: ${latest.nspeed || 'N/A'} m/s` : 'No recent measurements.');

    chatManagement.addAIResponse(analysisContent, 'system');
  };

  const enhancedDateTimeChange = (newDate, newTime) => {
    const result = timeManagement.handleDateTimeChange(newDate, newTime);
    if (result && result.index !== undefined) {
      animationControl.jumpToFrame(result.index);
    }
    return result;
  };

  return {
    isLoading: dataManagement.isLoading,
    hasError: dataManagement.hasError,
    errorMessage: dataManagement.errorMessage,
    dataLoaded: dataManagement.dataLoaded,
    dataSource: dataManagement.dataSource,
    dataQuality: dataManagement.dataQuality,
    connectionStatus: apiIntegration.connectionStatus,
    connectionDetails: apiIntegration.connectionDetails,

    // Raw data
    rawData: dataManagement.rawData,
    data: dataManagement.data,
    timeSeriesData: dataManagement.timeSeriesData,
    totalFrames: dataManagement.totalFrames,
    currentsGeoJSON,

    // UI state
    selectedArea: uiControls.selectedArea,
    selectedModel: uiControls.selectedModel,
    selectedDepth: uiControls.selectedDepth,
    selectedParameter: uiControls.selectedParameter,
    setSelectedArea: uiControls.setSelectedArea,
    setSelectedModel: uiControls.setSelectedModel,
    setSelectedDepth: uiControls.setSelectedDepth,
    setSelectedParameter: uiControls.setSelectedParameter,
    availableAreas: uiControls.availableAreas,
    availableParameters: uiControls.availableParameters,
    availableModels: dataManagement.availableModels,
    availableDepths: dataManagement.availableDepths,

    // Layer visibility
    mapLayerVisibility: uiControls.mapLayerVisibility,
    isSstHeatmapVisible: uiControls.isSstHeatmapVisible,
    heatmapScale: uiControls.heatmapScale,

    // Wind particle controls
    windVelocityParticleCount: uiControls.windVelocityParticleCount,
    windVelocityParticleOpacity: uiControls.windVelocityParticleOpacity,
    windVelocityParticleSpeed: uiControls.windVelocityParticleSpeed,

    // Custom layer controls
    oceanBaseOpacity,
    currentsVectorScale,
    currentsColorBy,

    // Animation
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

    // Environmental data
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
    handlePointAnalysis,
    refreshData: dataManagement.refreshData,
    handleDateTimeChange: enhancedDateTimeChange,

    // Layer actions
    toggleMapLayer: uiControls.toggleMapLayer,
    toggleSstHeatmap: uiControls.toggleSstHeatmap,
    onHeatmapScaleChange: uiControls.setHeatmapScale,

    // Wind particle actions
    onWindVelocityParticleCountChange: uiControls.setWindVelocityParticleCount,
    onWindVelocityParticleOpacityChange: uiControls.setWindVelocityParticleOpacity,
    onWindVelocityParticleSpeedChange: uiControls.setWindVelocityParticleSpeed,

    // Vector/custom layer config
    handleCurrentsScaleChange,
    handleCurrentsColorChange,
    handleOceanBaseToggle,
    handleOceanBaseOpacityChange
  };
};