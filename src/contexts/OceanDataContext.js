import React, { createContext, useContext, useState, useCallback } from 'react';
import { useOceanData } from '../hooks/useOceanData';
import { useAnimationControl } from '../hooks/useAnimationControl';
import LoadingScreen from '../components/common/LoadingScreen';
import ErrorScreen from '../components/common/ErrorScreen';

// 1. Create the context
const OceanDataContext = createContext(null);

/**
 * A custom hook that provides a simple way for components to access the OceanDataContext.
 * It's a convenient wrapper around useContext.
 * @returns {object} The value of the OceanDataContext (all the state and handlers from useOceanData).
 */
export const useOcean = () => {
  const context = useContext(OceanDataContext);
  if (context === null) {
    throw new Error('useOcean must be used within an OceanDataProvider');
  }
  return context;
};

/**
 * The Provider component that wraps your application or parts of it.
 * It initializes the data using the useOceanData hook and provides this data
 * to all descendant components via the OceanDataContext.
 * It also handles the loading and error states for the entire application.
 * @param {object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to be rendered within the provider.
 */
export const OceanDataProvider = ({ children }) => {
  // Manages data fetching and state
  const oceanData = useOceanData();

  // The single source of truth for play/pause state
  const [isPlaying, setIsPlaying] = useState(false);
  const playAnimation = useCallback(() => setIsPlaying(true), []);
  const pauseAnimation = useCallback(() => setIsPlaying(false), []);
  const togglePlay = useCallback(() => setIsPlaying(prev => !prev), []);

  // Manages animation logic (e.g., currentFrame)
  // It RECEIVES the play state and control functions as arguments.
  const animationControl = useAnimationControl(
    oceanData.totalFrames,
    isPlaying,
    { pauseAnimation, togglePlay }
  );


  // The provider value combines data, animation controls, and the play state.
  const value = {
    ...oceanData,
    ...animationControl,
    isPlaying,
    playAnimation,
    pauseAnimation,
    togglePlay,
  };

  // Handle global loading and error states before rendering children
  // Show a loading spinner only while the INITIAL data is being fetched.
  if (value.isLoading && !value.dataLoaded) {
    return <LoadingScreen />;
  }

  if (value.hasError) {
    // Show a data loading error message if the API call fails.
    return <ErrorScreen message={value.errorMessage} />;
  }

  return (
    <OceanDataContext.Provider value={value}>
      {children}
    </OceanDataContext.Provider>
  );
};