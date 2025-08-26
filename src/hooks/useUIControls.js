import { useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Hook for managing UI control selections and validation
 * @param {Array} availableModels - Available model options
 * @param {Array} availableDepths - Available depth options
 *param {Array} availableDates - Available date options
 * @param {Array} availableTimes - Available time options
 * @returns {object} UI controls state and functions
 */
export const useUIControls = (
  availableModels = [], 
  availableDepths = [], 
  availableDates = [], 
  availableTimes = []
) => {
  // --- Core UI State ---
  const [selectedArea, setSelectedArea] = useState('USM');
  const [selectedModel, setSelectedModel] = useState('NGOFS2');
  const [selectedDepth, setSelectedDepth] = useState(0);
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [selectedStation, setSelectedStation] = useState(null);
  const [activeParameter, setActiveParameter] = useState('oceanCurrents'); // Tracks the last active layer

  // --- Map Layer Visibility State ---
  const [mapLayerVisibility, setMapLayerVisibility] = useState({
    oceanCurrents: true,
    temperature: false,
    stations: true,
    currentSpeed: false,
    currentDirection: false,
    ssh: false,
    waveDirection: false,
    salinity: false,
    pressure: false,
    windSpeed: false,
    windDirection: false,
    windVelocity: false,
  });

  // --- Heatmap Scale State ---
  const [heatmapScale, setHeatmapScale] = useState(1); // Default scale is 1x

  // --- Wind Velocity Particle Configuration ---
  const [windVelocityParticleCount, setWindVelocityParticleCount] = useState(2000);
  const [windVelocityParticleOpacity, setWindVelocityParticleOpacity] = useState(0.9);
  const [windVelocityParticleSpeed, setWindVelocityParticleSpeed] = useState(1.2);

  // --- UI Configuration ---
  const [uiConfig, setUiConfig] = useState({
    autoSelectDefaults: true,
    validateSelections: true,
    persistSelections: false
  });

  // Heatmap visibility is now automatically controlled by temperature layer
  const isSstHeatmapVisible = mapLayerVisibility.temperature;
  
  // Toggle function for the Heatmap (now a no-op since heatmap is automatic)
  const toggleSstHeatmap = useCallback(() => {
    // No-op: heatmap is now automatically controlled by temperature layer
  }, []);

  // Toggle function for primary map layers
  const toggleMapLayer = useCallback((layerName) => {
    setMapLayerVisibility(prev => {
      const isTurningOn = !prev[layerName];
      if (isTurningOn) {
        setActiveParameter(layerName);
      }
      return {
        ...prev,
        [layerName]: !prev[layerName],
      };
    });
  }, []);

  // --- Available Options ---
  const availableAreas = useMemo(() => [
    { value: 'MBL', label: 'MBL', region: 'Gulf Coast' },
    { value: 'MSR', label: 'MSR', region: 'Gulf Coast' },
    { value: 'USM', label: 'USM', region: 'Gulf Coast' }
  ], []);

  // Default ocean models list
  const defaultOceanModels = useMemo(() => [
    'NGOFS2'
  ], []);

  // --- Validated setters ---
  const setSelectedAreaValidated = useCallback((area) => {
    const validArea = availableAreas.find(a => a.value === area);
    if (validArea || !uiConfig.validateSelections) {
      setSelectedArea(area);
    }
  }, [availableAreas, uiConfig.validateSelections]);

  const setSelectedModelValidated = useCallback((model) => {
    const modelsToCheck = availableModels.length > 0 ? availableModels : defaultOceanModels;
    if (modelsToCheck.includes(model) || !uiConfig.validateSelections) {
      setSelectedModel(model);
    }
  }, [availableModels, defaultOceanModels, uiConfig.validateSelections]);

  const setSelectedDepthValidated = useCallback((depth) => {
    if (availableDepths.includes(depth) || depth === null || !uiConfig.validateSelections) {
      setSelectedDepth(depth);
    }
  }, [availableDepths, uiConfig.validateSelections]);

  const setSelectedDateValidated = useCallback((date) => {
    if (date === '' || availableDates.includes(date) || !uiConfig.validateSelections) {
      setCurrentDate(date);
    }
  }, [availableDates, uiConfig.validateSelections]);

  const setSelectedTimeValidated = useCallback((time) => {
    if (time === '' || availableTimes.includes(time) || !uiConfig.validateSelections) {
      setCurrentTime(time);
    }
  }, [availableTimes, uiConfig.validateSelections]);


  // --- Selection validation ---
  const selectionValidation = useMemo(() => {
    const errors = [];
    const warnings = [];
    const modelsToCheck = availableModels.length > 0 ? availableModels : defaultOceanModels;

    if (!availableAreas.find(a => a.value === selectedArea)) {
      warnings.push(`Selected area "${selectedArea}" may not be available`);
    }

    if (modelsToCheck.length > 0 && !modelsToCheck.includes(selectedModel)) {
      errors.push(`Selected model "${selectedModel}" is not available`);
    }

    if (availableDepths.length > 0 && selectedDepth !== null && !availableDepths.includes(selectedDepth)) {
      errors.push(`Selected depth "${selectedDepth}ft" is not available`);
    }

    if (availableDates.length > 0 && currentDate && !availableDates.includes(currentDate)) {
      errors.push(`Selected date "${currentDate}" is not available`);
    }

    if (availableTimes.length > 0 && currentTime && !availableTimes.includes(currentTime)) {
      errors.push(`Selected time "${currentTime}" is not available`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [
    selectedArea, selectedModel, selectedDepth, currentDate, currentTime,
    availableAreas, availableModels, defaultOceanModels, availableDepths, availableDates, availableTimes
  ]);

  // --- Current selections info ---
  const currentSelections = useMemo(() => {
    const areaInfo = availableAreas.find(a => a.value === selectedArea);
    const modelsToCheck = availableModels.length > 0 ? availableModels : defaultOceanModels;

    return {
      area: {
        value: selectedArea,
        label: areaInfo?.label || selectedArea,
        region: areaInfo?.region || 'Unknown'
      },
      model: {
        value: selectedModel,
        available: modelsToCheck.includes(selectedModel)
      },
      depth: {
        value: selectedDepth,
        available: selectedDepth === null || availableDepths.includes(selectedDepth),
        unit: 'ft'
      },
      parameter: {
        value: activeParameter, // Reflects the last active layer
        label: activeParameter,
        category: 'Unknown'
      },
      date: {
        value: currentDate,
        available: !currentDate || availableDates.includes(currentDate)
      },
      time: {
        value: currentTime,
        available: !currentTime || availableTimes.includes(currentTime)
      },
      station: selectedStation
    };
  }, [
    selectedArea, selectedModel, selectedDepth, activeParameter, currentDate, currentTime, selectedStation, 
    availableAreas, availableModels, defaultOceanModels, availableDepths, availableDates, availableTimes
  ]);

  // --- Bulk selection update ---
  const updateSelections = useCallback((selections) => {
    if (selections.area !== undefined) setSelectedAreaValidated(selections.area);
    if (selections.model !== undefined) setSelectedModelValidated(selections.model);
    if (selections.depth !== undefined) setSelectedDepthValidated(selections.depth);
    if (selections.parameter !== undefined) setActiveParameter(selections.parameter); // Kept for potential external control
    if (selections.date !== undefined) setSelectedDateValidated(selections.date);
    if (selections.time !== undefined) setSelectedTimeValidated(selections.time);
    if (selections.station !== undefined) setSelectedStation(selections.station);
  }, [
    setSelectedAreaValidated, setSelectedModelValidated, setSelectedDepthValidated, 
    setSelectedDateValidated, setSelectedTimeValidated
  ]);

  // --- Reset to defaults ---
  const resetToDefaults = useCallback(() => {
    const modelsToUse = availableModels.length > 0 ? availableModels : defaultOceanModels;
    setSelectedArea('USM');
    setSelectedModel(modelsToUse[0] || 'NGOFS2');
    setSelectedDepth(availableDepths[0] || 0);
    setActiveParameter('oceanCurrents');
    setCurrentDate(availableDates[0] || '');
    setCurrentTime(availableTimes[0] || '');
    setSelectedStation(null);
  }, [availableModels, defaultOceanModels, availableDepths, availableDates, availableTimes]);

  // --- Update configuration ---
  const updateUiConfig = useCallback((newConfig) => {
    setUiConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // --- Export current configuration ---
  const exportConfiguration = useCallback(() => {
    const modelsToExport = availableModels.length > 0 ? availableModels : defaultOceanModels;
    return {
      timestamp: new Date().toISOString(),
      selections: {
        area: selectedArea,
        model: selectedModel,
        depth: selectedDepth,
        activeParameter: activeParameter,
        date: currentDate,
        time: currentTime,
        station: selectedStation?.name || null
      },
      validation: selectionValidation,
      availableOptions: {
        models: modelsToExport,
        depths: availableDepths,
        areas: availableAreas.map(a => a.value),
        dates: availableDates,
        times: availableTimes
      }
    };
  }, [
    selectedArea, selectedModel, selectedDepth, activeParameter, currentDate, currentTime, selectedStation, 
    selectionValidation, availableModels, defaultOceanModels, availableDepths, availableAreas, 
    availableDates, availableTimes
  ]);

  // --- Quick selection shortcuts ---
  const selectNextDepth = useCallback(() => {
    if (availableDepths.length === 0) return;
    const currentIndex = availableDepths.indexOf(selectedDepth);
    const nextIndex = (currentIndex + 1) % availableDepths.length;
    setSelectedDepthValidated(availableDepths[nextIndex]);
  }, [availableDepths, selectedDepth, setSelectedDepthValidated]);

  const selectPreviousDepth = useCallback(() => {
    if (availableDepths.length === 0) return;
    const currentIndex = availableDepths.indexOf(selectedDepth);
    const prevIndex = currentIndex <= 0 ? availableDepths.length - 1 : currentIndex - 1;
    setSelectedDepthValidated(availableDepths[prevIndex]);
  }, [availableDepths, selectedDepth, setSelectedDepthValidated]);

  const selectNextModel = useCallback(() => {
    const modelsToUse = availableModels.length > 0 ? availableModels : defaultOceanModels;
    if (modelsToUse.length === 0) return;
    const currentIndex = modelsToUse.indexOf(selectedModel);
    const nextIndex = (currentIndex + 1) % modelsToUse.length;
    setSelectedModelValidated(modelsToUse[nextIndex]);
  }, [availableModels, defaultOceanModels, selectedModel, setSelectedModelValidated]);

  // --- Return public API ---
  return {
    // Current selections
    selectedArea,
    selectedModel,
    selectedDepth,
    selectedParameter: activeParameter, // Keep name for compatibility
    currentDate,
    currentTime,
    selectedStation,
    
    // Layer visibility
    mapLayerVisibility,
    isSstHeatmapVisible,

    // Heatmap Scale
    heatmapScale,
    setHeatmapScale,

    // Wind Velocity Particle Configuration
    windVelocityParticleCount,
    setWindVelocityParticleCount,
    windVelocityParticleOpacity,
    setWindVelocityParticleOpacity,
    windVelocityParticleSpeed,
    setWindVelocityParticleSpeed,

    // Setters (validated)
    setSelectedArea: setSelectedAreaValidated,
    setSelectedModel: setSelectedModelValidated,
    setSelectedDepth: setSelectedDepth,
    setSelectedParameter: setActiveParameter, // Keep name for compatibility
    setSelectedDate: setSelectedDateValidated,
    setSelectedTime: setSelectedTimeValidated,
    setSelectedStation,
    
    // Layer toggles
    toggleSstHeatmap,
    toggleMapLayer,

    // Available options
    availableAreas,
    defaultOceanModels,

    // Configuration
    uiConfig,
    updateUiConfig,

    // Bulk operations
    updateSelections,
    resetToDefaults,

    // Navigation shortcuts
    selectNextDepth,
    selectPreviousDepth,
    selectNextModel,

    // Validation and info
    selectionValidation,
    currentSelections,

    // Export
    exportConfiguration,

    // Computed values
    hasValidSelections: selectionValidation.isValid,
    selectedAreaInfo: currentSelections.area,
    selectedParameterInfo: currentSelections.parameter,
    isDepthSelected: selectedDepth !== null,
    isStationSelected: selectedStation !== null
  };
};