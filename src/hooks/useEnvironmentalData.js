import { useState, useCallback, useEffect } from 'react';

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
    density: null,
    currentSpeed: null,
    currentDirection: null,
    windSpeed: null,
    windDirection: null,
    seaSurfaceHeight: null
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
          currentSpeed: currentDataPoint.speed ?? null,
          currentDirection: currentDataPoint.direction ?? null,
          windSpeed: currentDataPoint.nspeed ?? null,
          windDirection: currentDataPoint.ndirection ?? null,
          seaSurfaceHeight: currentDataPoint.ssh ?? null,
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

  // --- Current velocity vector calculation ---
  const getCurrentVector = useCallback(() => {
    if (envData.currentSpeed === null || envData.currentDirection === null) {
      return { u: null, v: null, magnitude: null, direction: null };
    }
    
    const speed = envData.currentSpeed;
    const direction = envData.currentDirection;
    const directionRad = (direction * Math.PI) / 180;
    
    return {
      u: speed * Math.sin(directionRad), // East component
      v: speed * Math.cos(directionRad), // North component
      magnitude: speed,
      direction: direction
    };
  }, [envData.currentSpeed, envData.currentDirection]);

  // --- Wind vector calculation ---
  const getWindVector = useCallback(() => {
    if (envData.windSpeed === null || envData.windDirection === null) {
      return { u: null, v: null, magnitude: null, direction: null };
    }
    
    const speed = envData.windSpeed;
    const direction = envData.windDirection;
    const directionRad = (direction * Math.PI) / 180;
    
    return {
      u: speed * Math.sin(directionRad), // East component
      v: speed * Math.cos(directionRad), // North component
      magnitude: speed,
      direction: direction
    };
  }, [envData.windSpeed, envData.windDirection]);

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
          currentSpeed: currentDataPoint.speed ?? null,
          currentDirection: currentDataPoint.direction ?? null,
          windSpeed: currentDataPoint.nspeed ?? null,
          windDirection: currentDataPoint.ndirection ?? null,
          seaSurfaceHeight: currentDataPoint.ssh ?? null,
          density: calculateSeawaterDensity(
            currentDataPoint.temp ?? currentDataPoint.temperature,
            currentDataPoint.salinity,
            currentDataPoint.pressure_dbars ?? currentDataPoint.pressure
          )
        });
      }
    }
  }, [csvData, currentFrame, selectedDepth, calculateSeawaterDensity]);

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
    
    // Functions
    updateFromCurrentFrame,
    calculateSeawaterDensity,
    getWaterColumnProfile,
    getEnvironmentalTrends,
    getCurrentVector,
    getWindVector,
    
    // Computed values
    hasEnvironmentalData: Object.values(envData).some(v => v !== null),
    currentTemperature: envData.temperature,
    currentSalinity: envData.salinity,
    currentPressure: envData.pressure,
    currentDepth: envData.depth,
    waterDensity: envData.density,
    currentSpeed: envData.currentSpeed,
    currentDirection: envData.currentDirection,
    windSpeed: envData.windSpeed,
    windDirection: envData.windDirection,
    seaSurfaceHeight: envData.seaSurfaceHeight,
    currentVector: getCurrentVector(),
    windVector: getWindVector()
  };
};