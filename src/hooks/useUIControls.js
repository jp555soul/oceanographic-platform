import { useState, useCallback, useMemo } from 'react';

/**
 * Hook for managing UI control selections and validation
 * @param {Array} availableModels - Available model options
 * @param {Array} availableDepths - Available depth options
 * @returns {object} UI controls state and functions
 */
export const useUIControls = (availableModels = [], availableDepths = []) => {
  // --- Core UI State ---
  const [selectedArea, setSelectedArea] = useState('MSP');
  const [selectedModel, setSelectedModel] = useState('NGOSF2');
  const [selectedDepth, setSelectedDepth] = useState(0);
  const [selectedParameter, setSelectedParameter] = useState('Current Speed');
  const [selectedStation, setSelectedStation] = useState(null);
  const [isHeatmapVisible, setIsHeatmapVisible] = useState(false); // Add heatmap state

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
    { value: 'MSP', label: 'Mississippi Sound', region: 'Gulf Coast' },
    { value: 'GOM', label: 'Gulf of Mexico', region: 'Gulf Coast' },
    { value: 'NGOM', label: 'Northern Gulf', region: 'Gulf Coast' },
    { value: 'CGOM', label: 'Central Gulf', region: 'Gulf Coast' },
    { value: 'SGOM', label: 'Southern Gulf', region: 'Gulf Coast' }
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
    if (availableModels.includes(model) || !uiConfig.validateSelections) {
      setSelectedModel(model);
    }
  }, [availableModels, uiConfig.validateSelections]);

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

  // --- Selection validation ---
  const selectionValidation = useMemo(() => {
    const errors = [];
    const warnings = [];

    if (!availableAreas.find(a => a.value === selectedArea)) {
      warnings.push(`Selected area "${selectedArea}" may not be available`);
    }

    if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
      errors.push(`Selected model "${selectedModel}" is not available`);
    }

    if (availableDepths.length > 0 && selectedDepth !== null && !availableDepths.includes(selectedDepth)) {
      errors.push(`Selected depth "${selectedDepth}ft" is not available`);
    }

    if (!availableParameters.find(p => p.value === selectedParameter)) {
      errors.push(`Selected parameter "${selectedParameter}" is not recognized`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }, [selectedArea, selectedModel, selectedDepth, selectedParameter, availableAreas, availableModels, availableDepths, availableParameters]);

  // --- Current selections info ---
  const currentSelections = useMemo(() => {
    const areaInfo = availableAreas.find(a => a.value === selectedArea);
    const parameterInfo = availableParameters.find(p => p.value === selectedParameter);

    return {
      area: {
        value: selectedArea,
        label: areaInfo?.label || selectedArea,
        region: areaInfo?.region || 'Unknown'
      },
      model: {
        value: selectedModel,
        available: availableModels.includes(selectedModel)
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
      station: selectedStation
    };
  }, [selectedArea, selectedModel, selectedDepth, selectedParameter, selectedStation, availableAreas, availableParameters, availableModels, availableDepths]);

  // --- Bulk selection update ---
  const updateSelections = useCallback((selections) => {
    if (selections.area !== undefined) setSelectedAreaValidated(selections.area);
    if (selections.model !== undefined) setSelectedModelValidated(selections.model);
    if (selections.depth !== undefined) setSelectedDepthValidated(selections.depth);
    if (selections.parameter !== undefined) setSelectedParameterValidated(selections.parameter);
    if (selections.station !== undefined) setSelectedStation(selections.station);
  }, [setSelectedAreaValidated, setSelectedModelValidated, setSelectedDepthValidated, setSelectedParameterValidated]);

  // --- Reset to defaults ---
  const resetToDefaults = useCallback(() => {
    setSelectedArea('MSP');
    setSelectedModel(availableModels[0] || 'NGOSF2');
    setSelectedDepth(availableDepths[0] || null);
    setSelectedParameter('Current Speed');
    setSelectedStation(null);
  }, [availableModels, availableDepths]);

  // --- Update configuration ---
  const updateUiConfig = useCallback((newConfig) => {
    setUiConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // --- Export current configuration ---
  const exportConfiguration = useCallback(() => {
    return {
      timestamp: new Date().toISOString(),
      selections: {
        area: selectedArea,
        model: selectedModel,
        depth: selectedDepth,
        parameter: selectedParameter,
        station: selectedStation?.name || null
      },
      validation: selectionValidation,
      availableOptions: {
        models: availableModels,
        depths: availableDepths,
        areas: availableAreas.map(a => a.value),
        parameters: availableParameters.map(p => p.value)
      }
    };
  }, [selectedArea, selectedModel, selectedDepth, selectedParameter, selectedStation, selectionValidation, availableModels, availableDepths, availableAreas, availableParameters]);

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
    if (availableModels.length === 0) return;
    const currentIndex = availableModels.indexOf(selectedModel);
    const nextIndex = (currentIndex + 1) % availableModels.length;
    setSelectedModelValidated(availableModels[nextIndex]);
  }, [availableModels, selectedModel, setSelectedModelValidated]);

  // --- Return public API ---
  return {
    // Current selections
    selectedArea,
    selectedModel,
    selectedDepth,
    selectedParameter,
    selectedStation,
    isHeatmapVisible, // Expose heatmap state

    // Setters (validated)
    setSelectedArea: setSelectedAreaValidated,
    setSelectedModel: setSelectedModelValidated,
    setSelectedDepth: setSelectedDepthValidated,
    setSelectedParameter: setSelectedParameterValidated,
    setSelectedStation,
    toggleHeatmapVisibility, // Expose toggle function

    // Available options
    availableAreas,
    availableParameters,

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