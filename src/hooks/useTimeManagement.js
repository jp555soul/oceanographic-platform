import { useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Hook for managing time-related functionality and temporal data navigation
 * @param {Array} rawData - Raw data with time information
 * @returns {object} Time management state and functions
 */
export const useTimeManagement = (rawData = []) => {
  // --- Time State ---
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');
  const [timeZone, setTimeZone] = useState('UTC');
  
  // --- Time Configuration ---
  const [timeConfig, setTimeConfig] = useState({
    format24Hour: true,
    showSeconds: false,
    autoSync: true,
    timeStep: 3600000 // 1 hour in milliseconds
  });

  // --- Extract available dates and times from data ---
  const { availableDates, availableTimes } = useMemo(() => {
    if (!rawData || rawData.length === 0) return { availableDates: [], availableTimes: [] };

    const dates = [...new Set(
      rawData
        .map(row => row.time ? new Date(row.time).toISOString().split('T')[0] : null)
        .filter(Boolean)
    )].sort();

    const times = [...new Set(
      rawData
        .map(row => {
          if (!row.time) return null;
          const date = new Date(row.time);
          return date.toTimeString().split(' ')[0].substring(0, timeConfig.showSeconds ? 8 : 5);
        })
        .filter(Boolean)
    )].sort();

    return { availableDates: dates, availableTimes: times };
  }, [rawData, timeConfig.showSeconds]);

  // --- Find closest data point by time ---
  const findClosestDataPoint = useCallback((targetDate, targetTime) => {
    if (!rawData || rawData.length === 0) return { index: 0, dataPoint: null, timeDiff: 0 };
    
    const targetDateTime = new Date(`${targetDate}T${targetTime}:00Z`);
    let closestIndex = 0;
    let minDifference = Infinity;
    let closestDataPoint = null;
    
    rawData.forEach((row, index) => {
      if (row.time) {
        const rowDateTime = new Date(row.time);
        const difference = Math.abs(rowDateTime - targetDateTime);
        if (difference < minDifference) {
          minDifference = difference;
          closestIndex = index;
          closestDataPoint = row;
        }
      }
    });
    
    return {
      index: closestIndex,
      dataPoint: closestDataPoint,
      timeDiff: minDifference
    };
  }, [rawData]);

  // --- Handle date/time changes ---
  const handleDateTimeChange = useCallback((newDate, newTime) => {
    if (!newDate || !newTime) return null;

    const result = findClosestDataPoint(newDate, newTime);
    
    if (result.dataPoint?.time) {
      const actualDateTime = new Date(result.dataPoint.time);
      setCurrentDate(actualDateTime.toISOString().split('T')[0]);
      setCurrentTime(actualDateTime.toTimeString().split(' ')[0].substring(0, timeConfig.showSeconds ? 8 : 5));
    } else {
      setCurrentDate(newDate);
      setCurrentTime(newTime);
    }
    
    return result;
  }, [findClosestDataPoint, timeConfig.showSeconds]);

  // --- Navigate through time ---
  const navigateTime = useCallback((direction, step = 'hour') => {
    if (!currentDate || !currentTime) return null;

    const current = new Date(`${currentDate}T${currentTime}:00Z`);
    let stepMs;

    switch (step) {
      case 'minute': stepMs = 60000; break;
      case 'hour': stepMs = 3600000; break;
      case 'day': stepMs = 86400000; break;
      default: stepMs = timeConfig.timeStep;
    }

    const newTime = new Date(current.getTime() + (direction * stepMs));
    const newDate = newTime.toISOString().split('T')[0];
    const newTimeStr = newTime.toTimeString().split(' ')[0].substring(0, timeConfig.showSeconds ? 8 : 5);

    return handleDateTimeChange(newDate, newTimeStr);
  }, [currentDate, currentTime, timeConfig.timeStep, timeConfig.showSeconds, handleDateTimeChange]);

  const stepForward = useCallback((step = 'hour') => navigateTime(1, step), [navigateTime]);
  const stepBackward = useCallback((step = 'hour') => navigateTime(-1, step), [navigateTime]);

  // --- Jump to time boundaries ---
  const jumpToTimeOfDay = useCallback((timeOfDay) => {
    if (!currentDate) return null;

    const timeMap = {
      'dawn': '06:00',
      'morning': '09:00',
      'noon': '12:00',
      'afternoon': '15:00',
      'evening': '18:00',
      'night': '21:00',
      'midnight': '00:00'
    };

    const targetTime = timeMap[timeOfDay] || timeOfDay;
    return handleDateTimeChange(currentDate, targetTime);
  }, [currentDate, handleDateTimeChange]);

  // --- Time formatting utilities ---
  const formatDateTime = useCallback((date, time, timezone = timeZone) => {
    if (!date || !time) return '';

    const dateTime = new Date(`${date}T${time}:00Z`);
    
    const options = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: timeConfig.format24Hour ? '2-digit' : 'numeric',
      minute: '2-digit',
      ...(timeConfig.showSeconds && { second: '2-digit' }),
      timeZone: timezone,
      hour12: !timeConfig.format24Hour
    };

    return dateTime.toLocaleString('en-US', options);
  }, [timeZone, timeConfig.format24Hour, timeConfig.showSeconds]);

  const formatTimeOnly = useCallback((time, timezone = timeZone) => {
    if (!time) return '';

    const dateTime = new Date(`1970-01-01T${time}:00Z`);
    
    const options = {
      hour: timeConfig.format24Hour ? '2-digit' : 'numeric',
      minute: '2-digit',
      ...(timeConfig.showSeconds && { second: '2-digit' }),
      timeZone: timezone,
      hour12: !timeConfig.format24Hour
    };

    return dateTime.toLocaleTimeString('en-US', options);
  }, [timeZone, timeConfig.format24Hour, timeConfig.showSeconds]);

  // --- Time range analysis ---
  const getTimeRange = useMemo(() => {
    if (!rawData || rawData.length === 0) return null;

    const times = rawData
      .map(row => row.time ? new Date(row.time) : null)
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (times.length === 0) return null;

    const start = times[0];
    const end = times[times.length - 1];
    const duration = end - start;

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      duration,
      durationDays: Math.round(duration / 86400000),
      durationHours: Math.round(duration / 3600000),
      totalDataPoints: times.length
    };
  }, [rawData]);

  // --- Time statistics ---
  const timeStatistics = useMemo(() => {
    const range = getTimeRange;
    if (!range) return null;
    if (!rawData || rawData.length === 0) return null;

    const gaps = [];
    const intervals = [];
    
    for (let i = 1; i < rawData.length; i++) {
      const prev = rawData[i-1]?.time;
      const curr = rawData[i]?.time;
      
      if (prev && curr) {
        const interval = new Date(curr) - new Date(prev);
        intervals.push(interval);
        
        if (interval > timeConfig.timeStep * 2) {
          gaps.push({
            start: prev,
            end: curr,
            duration: interval
          });
        }
      }
    }

    const avgInterval = intervals.length > 0 
      ? intervals.reduce((sum, int) => sum + int, 0) / intervals.length
      : 0;

    return {
      averageInterval: avgInterval,
      averageIntervalHours: Math.round(avgInterval / 3600000 * 100) / 100,
      dataGaps: gaps.length,
      largestGap: gaps.length > 0 ? Math.max(...gaps.map(g => g.duration)) : 0,
      dataFrequency: avgInterval > 0 ? Math.round(3600000 / avgInterval * 100) / 100 : 0
    };
  }, [rawData, getTimeRange, timeConfig.timeStep]);

  // --- Update configuration ---
  const updateTimeConfig = useCallback((newConfig) => {
    setTimeConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // --- Initialize with first available date/time (FIXED) ---
  useEffect(() => {
    if (availableDates.length > 0 && !currentDate) {
      setCurrentDate(availableDates[0]);
    }
  }, [availableDates, currentDate]);

  useEffect(() => {
    if (availableTimes.length > 0 && !currentTime) {
      setCurrentTime(availableTimes[0]);
    }
  }, [availableTimes, currentTime]);

  // --- Return public API ---
  return {
    // State
    currentDate,
    currentTime,
    timeZone,
    
    // Setters
    setCurrentDate,
    setCurrentTime,
    setTimeZone,
    
    // Available options
    availableDates,
    availableTimes,
    
    // Configuration
    timeConfig,
    updateTimeConfig,
    
    // Navigation
    handleDateTimeChange,
    stepForward,
    stepBackward,
    jumpToTimeOfDay,
    
    // Search and analysis
    findClosestDataPoint,
    
    // Formatting
    formatDateTime,
    formatTimeOnly,
    
    // Statistics
    getTimeRange,
    timeStatistics,
    
    // Computed values
    hasTimeData: availableDates.length > 0,
    currentDateTime: currentDate && currentTime ? `${currentDate}T${currentTime}:00Z` : null,
    formattedCurrentTime: formatDateTime(currentDate, currentTime),
    isValidDateTime: currentDate && currentTime && availableDates.includes(currentDate)
  };
};