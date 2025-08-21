import { useState, useCallback, useMemo, useEffect } from 'react';

// Define the specific start date
const initialStartDate = new Date('2025-08-01T00:00:00Z');

// Define a default end date (e.g., 24 hours after the start)
const initialEndDate = new Date(initialStartDate);
initialEndDate.setDate(initialEndDate.getDate() + 1);


/**
 * Hook for managing time-related functionality and temporal data navigation
 * @param {Array} initialData - Optional initial raw data with time information
 * @returns {object} Time management state and functions
 */
export const useTimeManagement = (initialData = []) => {
  // --- Internal State ---
  const [rawData, setRawData] = useState(initialData || []);
  const [currentDate, setCurrentDate] = useState(initialStartDate);
  const [currentEndDate, setCurrentEndDate] = useState(initialEndDate);
  const [timeZone, setTimeZone] = useState('UTC');
  
  // --- Time Configuration ---
  const [timeConfig, setTimeConfig] = useState({
    format24Hour: true,
    showSeconds: false,
    autoSync: true,
    timeStep: 3600000 // 1 hour in milliseconds
  });

  // --- Function to process incoming raw data ---
  const processRawData = useCallback((newData) => {
    setRawData(newData || []);
  }, []);

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

  // --- Set default date range when data is loaded ---
  useEffect(() => {
    if (getTimeRange && !currentDate && !currentEndDate) {
      setCurrentDate(new Date(getTimeRange.start));
      setCurrentEndDate(new Date(getTimeRange.end));
    }
  }, [getTimeRange, currentDate, currentEndDate]);

  // --- Handle date/time changes ---
  const handleDateRangeChange = useCallback(({ startDate, endDate }) => {
    setCurrentDate(startDate);
    setCurrentEndDate(endDate);
  }, []);

  const setCurrentTime = useCallback((timeString) => {
    if (!timeString || typeof timeString !== 'string') return;
    const [hours, minutes] = timeString.split(':').map(Number);
    
    if (!isNaN(hours) && !isNaN(minutes)) {
      setCurrentDate(prevDate => {
        const newDate = prevDate ? new Date(prevDate) : new Date();
        newDate.setHours(hours, minutes, 0, 0);
        return newDate;
      });
    }
  }, []);

  // --- Find closest data point by time ---
  const findClosestDataPoint = useCallback((targetDateTime) => {
    if (!rawData || rawData.length === 0 || !targetDateTime) return { index: 0, dataPoint: null, timeDiff: 0 };
    
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

  // --- Time formatting utilities ---
  const formatDateTime = useCallback((date, timezone = timeZone) => {
    if (!date) return '';

    const dateTime = new Date(date);
    
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

  const formatTimeOnly = useCallback((date, timezone = timeZone) => {
    if (!date) return '';

    const dateTime = new Date(date);
    
    const options = {
      hour: timeConfig.format24Hour ? '2-digit' : 'numeric',
      minute: '2-digit',
      ...(timeConfig.showSeconds && { second: '2-digit' }),
      timeZone: timezone,
      hour12: !timeConfig.format24Hour
    };

    return dateTime.toLocaleTimeString('en-US', options);
  }, [timeZone, timeConfig.format24Hour, timeConfig.showSeconds]);

  // --- Time statistics ---
  const timeStatistics = useMemo(() => {
    const range = getTimeRange;
    if (!range) return null;
    if (!rawData || rawData.length === 0) return null;

    const gaps = [];
    const intervals = [];
    
    // Create a sorted copy to ensure correct interval calculation
    const sortedData = [...rawData].sort((a, b) => new Date(a.time) - new Date(b.time));

    for (let i = 1; i < sortedData.length; i++) {
      const prev = sortedData[i-1]?.time;
      const curr = sortedData[i]?.time;
      
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

  // --- Return public API ---
  return {
    // State
    startDate: currentDate, // Keep alias for backward compatibility if needed
    endDate: currentEndDate,
    currentDate,
    currentEndDate,
    timeZone,
    
    // Setters
    setTimeZone,
    setCurrentDate,
    setCurrentEndDate,
    setCurrentTime,
    
    // Configuration
    timeConfig,
    updateTimeConfig,
    
    // Handlers
    handleDateRangeChange,
    processRawData, // Expose the new function
    
    // Search and analysis
    findClosestDataPoint,
    
    // Formatting
    formatDateTime,
    formatTimeOnly,
    
    // Statistics
    getTimeRange,
    timeStatistics,
    
    // Computed values
    hasTimeData: rawData && rawData.length > 0,
    isValidDateRange: currentDate && currentEndDate && currentDate < currentEndDate,
  };
};