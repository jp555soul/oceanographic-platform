import React, { createContext, useContext } from 'react';
import { useOceanData } from '../hooks/useOceanData';
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
  const oceanData = useOceanData();

  // The provider value is the entire object returned from our custom hook.
  const value = oceanData;

  // Handle global loading and error states before rendering children
  if (!value.dataLoaded) {
    // You would create this simple component to show a loading spinner
    return <LoadingScreen />;
  }

  if (value.dataSource === 'none') {
    // You would create this component to show a data loading error message
    return <ErrorScreen />;
  }

  return (
    <OceanDataContext.Provider value={value}>
      {children}
    </OceanDataContext.Provider>
  );
};