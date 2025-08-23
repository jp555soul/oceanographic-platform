import React, { useEffect, useRef, useState } from 'react';
import { generateCurrentsVectorData, getCurrentsColorScale } from '../../services/dataService';

/**
 * CurrentSpeedLayer Component
 * Renders current speed as vector arrows on a Mapbox map
 */
const CurrentSpeedLayer = ({
  map,
  data = [],
  isVisible = false,
  vectorScale = 0.009,
  colorBy = 'speed',
  depthFilter = null,
  displayParameter = 'Current Speed',
  maxVectors = 1000,
  minMagnitude = 0,
  onError = null
}) => {
  const layerIdRef = useRef('current-speed-vectors');
  const sourceIdRef = useRef('current-speed-source');
  const [isLayerAdded, setIsLayerAdded] = useState(false);
  const [lastDataHash, setLastDataHash] = useState('');

  // Generate unique IDs to avoid conflicts
  const layerId = layerIdRef.current;
  const sourceId = sourceIdRef.current;

  // Create a simple hash of the data to detect changes
  const generateDataHash = (data, scale, colorBy, depthFilter) => {
    return `${data.length}-${scale}-${colorBy}-${depthFilter}-${Date.now()}`;
  };

  // Process currents data into GeoJSON format
  const processCurrentsForMap = React.useCallback(() => {
    if (!data || data.length === 0) {
      return {
        type: 'FeatureCollection',
        features: []
      };
    }

    try {
      const vectorData = generateCurrentsVectorData(data, {
        vectorScale,
        minMagnitude,
        colorBy,
        maxVectors,
        depthFilter, // Pass the depthFilter to the data processing function
        displayParameter
      });

      // Add additional properties for styling
      const colorScale = getCurrentsColorScale(
        vectorData.features.map(f => f.properties), 
        colorBy
      );

      vectorData.features.forEach(feature => {
        const props = feature.properties;
        
        // Calculate color based on selected property
        let normalizedValue = 0.5;
        if (colorBy === 'speed' && colorScale.max > colorScale.min) {
          normalizedValue = (props.speed - colorScale.min) / (colorScale.max - colorScale.min);
        } else if (colorBy === 'depth' && colorScale.max > colorScale.min) {
          normalizedValue = (props.depth - colorScale.min) / (colorScale.max - colorScale.min);
        }

        // Clamp to 0-1 range
        normalizedValue = Math.max(0, Math.min(1, normalizedValue));
        
        // Convert to HSL color
        let color;
        if (colorBy === 'uniform') {
          color = `hsl(210, 100%, 50%)`; // Blue for uniform
        } else if (colorBy === 'speed') {
          // Blue to red gradient for speed
          const hue = 240 - (240 * normalizedValue); // 240 (blue) to 0 (red)
          color = `hsl(${hue}, 100%, 50%)`;
        } else {
          // Yellow to blue gradient for depth
          const hue = 60 + (180 * normalizedValue); // 60 (yellow) to 240 (blue)
          color = `hsl(${hue}, 100%, 50%)`;
        }

        feature.properties.color = color;
        feature.properties.normalizedValue = normalizedValue;
      });

      return vectorData;
    } catch (error) {
      console.error('Error processing current speed data:', error);
      onError?.(error);
      return {
        type: 'FeatureCollection',
        features: []
      };
    }
  }, [data, vectorScale, colorBy, minMagnitude, maxVectors, depthFilter, displayParameter, onError]);

  // Add or update the current speed layer
  useEffect(() => {
    if (!map || !map.isStyleLoaded()) return;

    const geoJsonData = processCurrentsForMap();
    const newDataHash = generateDataHash(data, vectorScale, colorBy, depthFilter);

    try {
      // Add source if it doesn't exist
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: 'geojson',
          data: geoJsonData,
          lineMetrics: true
        });
      } else {
        // Update existing source data
        map.getSource(sourceId).setData(geoJsonData);
      }

      // Add layer if it doesn't exist
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: 'line',
          source: sourceId,
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5, 1,
              10, 2,
              15, 3
            ],
            'line-opacity': isVisible ? 0.8 : 0
          }
        });

        // Add arrow heads as symbols
        const arrowLayerId = `${layerId}-arrows`;
        if (!map.getLayer(arrowLayerId)) {
          map.addLayer({
            id: arrowLayerId,
            type: 'symbol',
            source: sourceId,
            layout: {
              'symbol-placement': 'line-center',
              'icon-image': 'triangle-15', // Using built-in triangle
              'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                5, 0.3,
                10, 0.5,
                15, 0.8
              ],
              'icon-rotate': [
                '+',
                ['get', 'direction'],
                90 // Adjust rotation to point in correct direction
              ],
              'icon-rotation-alignment': 'map',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true
            },
            paint: {
              'icon-color': ['get', 'color'],
              'icon-opacity': isVisible ? 0.9 : 0
            }
          });
        }

        setIsLayerAdded(true);
      }

      // Update layer visibility
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'line-opacity', isVisible ? 0.8 : 0);
        
        const arrowLayerId = `${layerId}-arrows`;
        if (map.getLayer(arrowLayerId)) {
          map.setPaintProperty(arrowLayerId, 'icon-opacity', isVisible ? 0.9 : 0);
        }
      }

      setLastDataHash(newDataHash);

    } catch (error) {
      console.error('Error adding/updating current speed layer:', error);
      onError?.(error);
    }
  }, [map, data, isVisible, vectorScale, colorBy, depthFilter, processCurrentsForMap, layerId, sourceId]);

  // Handle visibility changes
  useEffect(() => {
    if (!map || !isLayerAdded) return;

    try {
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, 'line-opacity', isVisible ? 0.8 : 0);
      }
      
      const arrowLayerId = `${layerId}-arrows`;
      if (map.getLayer(arrowLayerId)) {
        map.setPaintProperty(arrowLayerId, 'icon-opacity', isVisible ? 0.9 : 0);
      }
    } catch (error) {
      console.error('Error updating layer visibility:', error);
    }
  }, [map, isVisible, isLayerAdded, layerId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (map && map.isStyleLoaded()) {
        try {
          const arrowLayerId = `${layerId}-arrows`;
          
          if (map.getLayer(arrowLayerId)) {
            map.removeLayer(arrowLayerId);
          }
          
          if (map.getLayer(layerId)) {
            map.removeLayer(layerId);
          }
          
          if (map.getSource(sourceId)) {
            map.removeSource(sourceId);
          }
        } catch (error) {
          console.error('Error cleaning up current speed layer:', error);
        }
      }
    };
  }, [map, layerId, sourceId]);

  // Add click handlers for current speed vectors
  useEffect(() => {
    if (!map || !isLayerAdded || !isVisible) return;

    const handleClick = (e) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const props = feature.properties;
        
        const popupContent = `
          <div class="current-speed-popup">
            <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 14px;">Current Speed</h3>
            <div style="font-size: 12px; line-height: 1.4;">
              <div><strong>Speed:</strong> ${props.speed?.toFixed(2)} m/s</div>
              <div><strong>Direction:</strong> ${props.direction?.toFixed(1)}°</div>
              <div><strong>Depth:</strong> ${props.depth?.toFixed(1)} ft</div>
              <div><strong>Magnitude:</strong> ${props.magnitude?.toFixed(3)}</div>
              ${props.time ? `<div><strong>Time:</strong> ${new Date(props.time).toLocaleString()}</div>` : ''}
            </div>
          </div>
        `;

        new window.mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(popupContent)
          .addTo(map);
      }
    };

    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };

    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = '';
    };

    map.on('click', layerId, handleClick);
    map.on('mouseenter', layerId, handleMouseEnter);
    map.on('mouseleave', layerId, handleMouseLeave);

    const arrowLayerId = `${layerId}-arrows`;
    if (map.getLayer(arrowLayerId)) {
      map.on('click', arrowLayerId, handleClick);
      map.on('mouseenter', arrowLayerId, handleMouseEnter);
      map.on('mouseleave', arrowLayerId, handleMouseLeave);
    }

    return () => {
      // FIX: Add guard to prevent errors when map is destroyed before cleanup
      if (!map || !map.isStyleLoaded()) {
        return;
      }

      map.off('click', layerId, handleClick);
      map.off('mouseenter', layerId, handleMouseEnter);
      map.off('mouseleave', layerId, handleMouseLeave);
      
      // Note: arrowLayerId is already defined in the outer scope of this effect
      if (map.getLayer(arrowLayerId)) {
        map.off('click', arrowLayerId, handleClick);
        map.off('mouseenter', arrowLayerId, handleMouseEnter);
        map.off('mouseleave', arrowLayerId, handleMouseLeave);
      }
    };
  }, [map, isLayerAdded, isVisible, layerId]);

  return null;
};

export default CurrentSpeedLayer;