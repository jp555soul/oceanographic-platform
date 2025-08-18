import { useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Hook for managing environmental data and HoloOcean POV
 * @param {Array} csvData - Raw CSV data
 * @param {number} currentFrame - Current animation frame
 * @param {number} selectedDepth - Currently selected depth
 * @returns {object} Environmental data state and functions
 */
export const useEnvironmentalData = (csvData = [], currentFrame = 0, selectedDepth = 0) => {
  // --- Environmental Data State ---
  const [envData, setEnvData] = useState({
    temperature: null,
    salinity: null,
    pressure: null,
    depth: 0,
    soundSpeed: null,
    density: null
  });

  // --- HoloOcean POV State ---
  const [holoOceanPOV, setHoloOceanPOV] = useState({ 
    x: 0, 
    y: 0, 
    depth: 0,
    heading: 0,
    pitch: 0,
    roll: 0
  });

  // --- Environmental Thresholds ---
  const [environmentalThresholds, setEnvironmentalThresholds] = useState({
    temperature: { min: 32, max: 95, warn: { min: 40, max: 85 } },
    salinity: { min: 0, max: 40, warn: { min: 30, max: 37 } },
    pressure: { min: 0, max: 500, warn: { min: 50, max: 300 } },
    depth: { min: 0, max: 1000, warn: { min: 100, max: 500 } }
  });

  // --- Calculate seawater density ---
  const calculateSeawaterDensity = useCallback((temp, salinity, pressure) => {
    if (temp === null || salinity === null) return null;
    
    // Simplified UNESCO seawater density formula
    const T = temp;
    const S = salinity;
    const P = pressure || 0;
    
    // Pure water density at atmospheric pressure
    const rho0 = 999.842594 + (6.793952e-2 * T) - (9.095290e-3 * T * T) + 
                 (1.001685e-4 * T * T * T) - (1.120083e-6 * T * T * T * T) + 
                 (6.536336e-9 * T * T * T * T * T);
    
    // Salinity contribution
    const A = 8.24493e-1 - 4.0899e-3 * T + 7.6438e-5 * T * T - 8.2467e-7 * T * T * T + 5.3875e-9 * T * T * T * T;
    const B = -5.72466e-3 + 1.0227e-4 * T - 1.6546e-6 * T * T;
    const C = 4.8314e-4;
    
    const rho = rho0 + A * S + B * S * Math.sqrt(S) + C * S * S;
    
    return Math.round(rho * 100) / 100; // Round to 2 decimal places
  }, []);

  // --- Update environmental data from current frame ---
  const updateFromCurrentFrame = useCallback(() => {
    if (csvData.length > 0 && currentFrame < csvData.length) {
      const currentDataPoint = csvData[currentFrame];
      
      if (currentDataPoint) {
        setEnvData({
          temperature: currentDataPoint.temp ?? currentDataPoint.temperature ?? null,
          salinity: currentDataPoint.salinity ?? null,
          pressure: currentDataPoint.pressure_dbars ?? currentDataPoint.pressure ?? null,
          depth: currentDataPoint.depth ?? selectedDepth,
          soundSpeed: currentDataPoint.sound_speed_ms ?? null,
          density: calculateSeawaterDensity(
            currentDataPoint.temp ?? currentDataPoint.temperature,
            currentDataPoint.salinity,
            currentDataPoint.pressure_dbars ?? currentDataPoint.pressure
          )
        });
      }
    }
  }, [csvData, currentFrame, selectedDepth, calculateSeawaterDensity]);

  // --- Manual environmental data update ---
  const updateEnvData = useCallback((newData) => {
    setEnvData(prev => ({ ...prev, ...newData }));
  }, []);

  // --- Update HoloOcean POV ---
  const updateHoloOceanPOV = useCallback((newPOV) => {
    setHoloOceanPOV(prev => ({ ...prev, ...newPOV }));
  }, []);

  // --- Environmental data validation ---
  const validateEnvironmentalData = useCallback((data) => {
    const alerts = [];
    
    Object.keys(environmentalThresholds).forEach(param => {
      const value = data[param];
      const thresholds = environmentalThresholds[param];
      
      if (value !== null && value !== undefined) {
        if (value < thresholds.min || value > thresholds.max) {
          alerts.push({
            type: 'error',
            parameter: param,
            value,
            message: `${param} value ${value} is outside valid range (${thresholds.min}-${thresholds.max})`
          });
        } else if (value < thresholds.warn.min || value > thresholds.warn.max) {
          alerts.push({
            type: 'warning',
            parameter: param,
            value,
            message: `${param} value ${value} is outside normal range (${thresholds.warn.min}-${thresholds.warn.max})`
          });
        }
      }
    });
    
    return alerts;
  }, [environmentalThresholds]);

  // --- Environmental summary ---
  const environmentalSummary = useMemo(() => {
    const alerts = validateEnvironmentalData(envData);
    const hasData = Object.values(envData).some(v => v !== null);
    
    return {
      hasData,
      alerts,
      alertCount: alerts.length,
      hasErrors: alerts.some(a => a.type === 'error'),
      hasWarnings: alerts.some(a => a.type === 'warning'),
      completeness: Object.values(envData).filter(v => v !== null).length / Object.keys(envData).length * 100
    };
  }, [envData, validateEnvironmentalData]);

  // --- Water column profile ---
  const getWaterColumnProfile = useCallback((parameter = 'temperature') => {
    if (csvData.length === 0) return [];
    
    // Group data by depth for the current location/time
    const depthData = new Map();
    
    csvData.forEach(row => {
      if (row.depth !== null && row[parameter] !== null) {
        if (!depthData.has(row.depth)) {
          depthData.set(row.depth, []);
        }
        depthData.get(row.depth).push(row[parameter]);
      }
    });
    
    // Average values at each depth
    return Array.from(depthData.entries())
      .map(([depth, values]) => ({
        depth,
        value: values.reduce((sum, val) => sum + val, 0) / values.length,
        count: values.length
      }))
      .sort((a, b) => a.depth - b.depth);
  }, [csvData]);

  // --- Environmental trends ---
  const getEnvironmentalTrends = useCallback((parameter = 'temperature', timeWindow = 24) => {
    if (csvData.length === 0) return [];
    
    const startFrame = Math.max(0, currentFrame - timeWindow);
    const endFrame = Math.min(csvData.length - 1, currentFrame);
    
    const trendData = [];
    for (let i = startFrame; i <= endFrame; i++) {
      const dataPoint = csvData[i];
      if (dataPoint && dataPoint[parameter] !== null) {
        trendData.push({
          frame: i,
          timestamp: dataPoint.time,
          value: dataPoint[parameter],
          depth: dataPoint.depth
        });
      }
    }
    
    return trendData;
  }, [csvData, currentFrame]);

  // --- Auto-update when frame changes ---
  useEffect(() => {
    if (csvData.length > 0 && currentFrame < csvData.length) {
      const currentDataPoint = csvData[currentFrame];
      
      if (currentDataPoint) {
        setEnvData({
          temperature: currentDataPoint.temp ?? currentDataPoint.temperature ?? null,
          salinity: currentDataPoint.salinity ?? null,
          pressure: currentDataPoint.pressure_dbars ?? currentDataPoint.pressure ?? null,
          depth: currentDataPoint.depth ?? selectedDepth,
          soundSpeed: currentDataPoint.sound_speed_ms ?? null,
          density: calculateSeawaterDensity(
            currentDataPoint.temp ?? currentDataPoint.temperature,
            currentDataPoint.salinity,
            currentDataPoint.pressure_dbars ?? currentDataPoint.pressure
          )
        });
      }
    }
  }, [csvData, currentFrame, selectedDepth]);

  // --- Sync HoloOcean depth with selected depth ---
  useEffect(() => {
    setHoloOceanPOV(prev => ({
      ...prev,
      depth: selectedDepth
    }));
  }, [selectedDepth]);

  // --- Return public API ---
  return {
    // Environmental data
    envData,
    setEnvData: updateEnvData,
    
    // HoloOcean POV
    holoOceanPOV,
    setHoloOceanPOV: updateHoloOceanPOV,
    
    // Thresholds
    environmentalThresholds,
    setEnvironmentalThresholds,
    
    // Functions
    updateFromCurrentFrame,
    validateEnvironmentalData,
    calculateSeawaterDensity,
    getWaterColumnProfile,
    getEnvironmentalTrends,
    
    // Analysis
    environmentalSummary,
    
    // Computed values
    hasEnvironmentalData: environmentalSummary.hasData,
    environmentalAlerts: environmentalSummary.alerts,
    dataCompleteness: environmentalSummary.completeness,
    currentTemperature: envData.temperature,
    currentSalinity: envData.salinity,
    currentPressure: envData.pressure,
    currentDepth: envData.depth,
    waterDensity: envData.density
  };
};