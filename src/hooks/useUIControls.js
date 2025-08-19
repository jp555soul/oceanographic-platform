import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing UI control selections and validation
 * @param {Array} availableModels - Available model options
 * @param {Array} availableDepths - Available depth options
 * @param {Array} availableDates - Available date options
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
  const [selectedArea, setSelectedArea] = useState('MBL');
  const [selectedModel, setSelectedModel] = useState('NGOFS2');
  const [selectedDepth, setSelectedDepth] = useState(0);
  const [selectedParameter, setSelectedParameter] = useState('Current Speed');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [selectedStation, setSelectedStation] = useState(null);
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(false);

  // --- UI Configuration ---
  const [uiConfig, setUiConfig] = useState({
    autoSelectDefaults: true,
    validateSelections: true,
    persistSelections: false
  });
  
  // Add heatmap toggle function
  const toggleHeatmapVisibility = useCallback(() => {
    setIsHeatmapVisible(prev => !prev);
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

  const availableParameters = useMemo(() => [
    { value: 'Current Speed', label: 'Current Speed (m/s)', category: 'Flow' },
    { value: 'Current Direction', label: 'Current Direction (°)', category: 'Flow' },
    { value: 'Wave Height', label: 'Wave Height (m)', category: 'Waves' },
    { value: 'Wave Direction', label: 'Wave Direction (°)', category: 'Waves' },
    { value: 'Temperature', label: 'Water Temperature (°F)', category: 'Environment' },
    { value: 'Salinity', label: 'Salinity (PSU)', category: 'Environment' },
    { value: 'Sound Speed', label: 'Sound Speed (m/s)', category: 'Acoustic' },
    { value: 'Pressure', label: 'Pressure (dbar)', category: 'Environment' }
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

  const setSelectedParameterValidated = useCallback((parameter) => {
    const validParameter = availableParameters.find(p => p.value === parameter);
    if (validParameter || !uiConfig.validateSelections) {
      setSelectedParameter(parameter);
    }
  }, [availableParameters, uiConfig.validateSelections]);

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

    if (!availableParameters.find(p => p.value === selectedParameter)) {
      errors.push(`Selected parameter "${selectedParameter}" is not recognized`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [
    selectedArea, selectedModel, selectedDepth, selectedParameter, currentDate, currentTime,
    availableAreas, availableModels, defaultOceanModels, availableDepths, availableDates, availableTimes, availableParameters
  ]);

  // --- Current selections info ---
  const currentSelections = useMemo(() => {
    const areaInfo = availableAreas.find(a => a.value === selectedArea);
    const parameterInfo = availableParameters.find(p => p.value === selectedParameter);
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
        value: selectedParameter,
        label: parameterInfo?.label || selectedParameter,
        category: parameterInfo?.category || 'Unknown'
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
    selectedArea, selectedModel, selectedDepth, selectedParameter, currentDate, currentTime, selectedStation, 
    availableAreas, availableParameters, availableModels, defaultOceanModels, availableDepths, availableDates, availableTimes
  ]);

  // --- Bulk selection update ---
  const updateSelections = useCallback((selections) => {
    if (selections.area !== undefined) setSelectedAreaValidated(selections.area);
    if (selections.model !== undefined) setSelectedModelValidated(selections.model);
    if (selections.depth !== undefined) setSelectedDepthValidated(selections.depth);
    if (selections.parameter !== undefined) setSelectedParameterValidated(selections.parameter);
    if (selections.date !== undefined) setSelectedDateValidated(selections.date);
    if (selections.time !== undefined) setSelectedTimeValidated(selections.time);
    if (selections.station !== undefined) setSelectedStation(selections.station);
  }, [
    setSelectedAreaValidated, setSelectedModelValidated, setSelectedDepthValidated, 
    setSelectedParameterValidated, setSelectedDateValidated, setSelectedTimeValidated
  ]);

  // --- Reset to defaults ---
  const resetToDefaults = useCallback(() => {
    const modelsToUse = availableModels.length > 0 ? availableModels : defaultOceanModels;
    setSelectedArea('MBL');
    setSelectedModel(modelsToUse[0] || 'NGOFS2');
    setSelectedDepth(availableDepths[0] || 0);
    setSelectedParameter('Current Speed');
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
        parameter: selectedParameter,
        date: currentDate,
        time: currentTime,
        station: selectedStation?.name || null
      },
      validation: selectionValidation,
      availableOptions: {
        models: modelsToExport,
        depths: availableDepths,
        areas: availableAreas.map(a => a.value),
        parameters: availableParameters.map(p => p.value),
        dates: availableDates,
        times: availableTimes
      }
    };
  }, [
    selectedArea, selectedModel, selectedDepth, selectedParameter, currentDate, currentTime, selectedStation, 
    selectionValidation, availableModels, defaultOceanModels, availableDepths, availableAreas, 
    availableParameters, availableDates, availableTimes
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
    selectedParameter,
    currentDate,
    currentTime,
    selectedStation,
    isHeatmapVisible,

    // Setters (validated)
    setSelectedArea: setSelectedAreaValidated,
    setSelectedModel: setSelectedModelValidated,
    setSelectedDepth: setSelectedDepthValidated,
    setSelectedParameter: setSelectedParameterValidated,
    setSelectedDate: setSelectedDateValidated,
    setSelectedTime: setSelectedTimeValidated,
    setSelectedStation,
    toggleHeatmapVisibility,

    // Available options
    availableAreas,
    availableParameters,
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