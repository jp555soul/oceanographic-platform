import React, { useRef, useEffect, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import StationTooltip from './StationTooltip';
import SelectedStationPanel from './SelectedStationPanel';
import 'mapbox-gl/dist/mapbox-gl.css';

const MapContainer = ({
  stationData = [],
  timeSeriesData = [],
  currentFrame = 0,
  selectedDepth = 33,
  selectedArea = '',
  selectedParameter = 'Current Speed',
  holoOceanPOV = { x: 0, y: 0, depth: 33 },
  onPOVChange,
  onStationSelect,
  onEnvironmentUpdate,
  csvData = [],
  currentDate = '',
  currentTime = '',
  mapboxToken,
  initialViewState = {
    longitude: -89.0,
    latitude: 30.2,
    zoom: 8,
    pitch: 0,
    bearing: 0
  }
}) => {
  const mapRef = useRef();
  const mapContainerRef = useRef();
  
  const [mapContainerReady, setMapContainerReady] = useState(false);
  const [viewState, setViewState] = useState(initialViewState);
  const [hoveredStation, setHoveredStation] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);

  // Set Mapbox access token
  useEffect(() => {
    if (mapboxToken) {
      mapboxgl.accessToken = mapboxToken;
    } else {
      mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 
        'pk.eyJ1Ijoiam1wYXVsbWFwYm94IiwiYSI6ImNtZHh0ZmR6MjFoaHIyam9vZmJ4Z2x1MDYifQ.gR60szhfKWhTv8MyqynpVA';
    }
  }, [mapboxToken]);

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerReady || !mapContainerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing
    });

    // Sync map movements to viewState
    mapRef.current.on('moveend', () => {
      if (mapRef.current) {
        const center = mapRef.current.getCenter();
        const zoom = mapRef.current.getZoom();
        const pitch = mapRef.current.getPitch();
        const bearing = mapRef.current.getBearing();
        
        setViewState({
          longitude: center.lng,
          latitude: center.lat,
          zoom,
          pitch,
          bearing
        });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapContainerReady]);

  // Generate station data with fallback to hardcoded stations
  const finalStationData = useMemo(() => {
    if (stationData.length > 0) {
      return stationData;
    }
    
    // Fallback to original hardcoded stations if no CSV data
    return [
      {
        name: 'USM-1 Station',
        coordinates: [-89.1, 30.3],
        color: [244, 63, 94], // red-400
        type: 'usm',
        dataPoints: 100
      },
      {
        name: 'NDBC-42012',
        coordinates: [-88.8, 30.1], 
        color: [251, 191, 36], // yellow-400
        type: 'ndbc',
        dataPoints: 150
      }
    ];
  }, [stationData]);

  // Generate DeckGL layers
  const getDeckLayers = () => {
    const layers = [];
    
    // Station markers layer
    if (finalStationData.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'stations',
          data: finalStationData,
          getPosition: d => d.coordinates,
          getFillColor: d => d.color,
          getRadius: d => {
            // Make radius proportional to data points available
            const baseRadius = 2000;
            const dataPointMultiplier = d.dataPoints ? Math.log(d.dataPoints + 1) * 500 : 0;
            return baseRadius + dataPointMultiplier;
          },
          radiusScale: 1,
          radiusMinPixels: 8,
          radiusMaxPixels: 25,
          pickable: true,
          onHover: ({object, x, y}) => {
            setHoveredStation(object ? {
              ...object,
              x: x,
              y: y
            } : null);
          },
          onClick: ({object}) => {
            if (object) {
              // Update POV to clicked station
              const [lng, lat] = object.coordinates;
              const x = ((lng + 89.2) / 0.4) * 100;
              const y = ((lat - 30.0) / 0.4) * 100;
              
              const newPOV = { 
                x: Math.max(0, Math.min(100, x)), 
                y: Math.max(0, Math.min(100, y)), 
                depth: selectedDepth 
              };

              if (onPOVChange) {
                onPOVChange(newPOV);
              }
              
              // Set selected station
              setSelectedStation(object);
              if (onStationSelect) {
                onStationSelect(object);
              }
              
              // Center map on clicked station
              if (mapRef.current) {
                mapRef.current.jumpTo({
                  center: [lng, lat],
                  zoom: Math.max(mapRef.current.getZoom(), 10)
                });
              }
              
              console.log(`Selected station: ${object.name} at [${lat}, ${lng}]`);
            }
          }
        })
      );
    }
    
    // Current vectors layer (using CSV data if available)
    if (timeSeriesData.length > 0 && finalStationData.length > 0) {
      const currentData = timeSeriesData[currentFrame % timeSeriesData.length];
      
      // Create current vectors at each station location
      const currentVectors = finalStationData.map((station, index) => {
        const [lng, lat] = station.coordinates;
        const vectorLength = 0.1 * (currentData.currentSpeed || 0.5) / 2; // Scale vector by current speed
        const angle = ((currentData.heading || (45 + index * 75)) + index * 30) * Math.PI / 180;
        
        return {
          from: [lng, lat],
          to: [
            lng + Math.cos(angle) * vectorLength,
            lat + Math.sin(angle) * vectorLength
          ],
          color: station.color.map(c => Math.min(255, c + 50)), // Slightly brighter for vectors
          speed: currentData.currentSpeed || 0.5
        };
      });
      
      layers.push(
        new LineLayer({
          id: 'current-vectors',
          data: currentVectors,
          getSourcePosition: d => d.from,
          getTargetPosition: d => d.to,
          getColor: d => d.color,
          getWidth: d => Math.max(2, d.speed * 3), // Width based on current speed
          widthScale: 1,
          widthMinPixels: 2,
          widthMaxPixels: 8
        })
      );
    }
    
    // POV indicator layer
    layers.push(
      new ScatterplotLayer({
        id: 'pov-indicator',
        data: [{
          coordinates: [
            -89.2 + (holoOceanPOV.x / 100) * 0.4,
            30.0 + (holoOceanPOV.y / 100) * 0.4
          ],
          color: [74, 222, 128] // green-400
        }],
        getPosition: d => d.coordinates,
        getFillColor: d => d.color,
        getRadius: 1500,
        radiusMinPixels: 6,
        radiusMaxPixels: 12,
        pickable: true
      })
    );
    
    return layers;
  };

  // Handle map clicks for POV setting
  const handleMapClick = (info, event) => {
    if (info.coordinate && onPOVChange) {
      // Convert deck.gl coordinates back to percentage for POV
      const [lng, lat] = info.coordinate;
      const x = ((lng + 89.2) / 0.4) * 100;
      const y = ((lat - 30.0) / 0.4) * 100;
      
      const newPOV = { 
        x: Math.max(0, Math.min(100, x)), 
        y: Math.max(0, Math.min(100, y)), 
        depth: selectedDepth 
      };

      onPOVChange(newPOV);
      
      // Update environmental data if callback provided
      if (onEnvironmentUpdate && timeSeriesData.length > 0) {
        const currentData = timeSeriesData[currentFrame % timeSeriesData.length];
        const tempVariation = (x - 50) * 0.05 + (y - 50) * 0.03;
        const salinityVariation = (x - 50) * 0.01;
        
        onEnvironmentUpdate({
          temperature: currentData.temperature ? currentData.temperature + tempVariation : null,
          salinity: currentData.salinity ? currentData.salinity + salinityVariation : null,
          pressure: currentData.pressure || null,
          depth: selectedDepth
        });
      }
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Mapbox container */}
      <div 
        ref={(el) => {
          mapContainerRef.current = el;
          if (el && !mapContainerReady) {
            setMapContainerReady(true);
          }
        }} 
        className="absolute inset-0 w-full h-full"
      />
      
      {/* DeckGL overlay */}
      {mapContainerReady && (
        <DeckGL
          viewState={viewState}
          onViewStateChange={({viewState: newViewState}) => setViewState(newViewState)}
          controller={true}
          layers={getDeckLayers()}
          onClick={handleMapClick}
          className="absolute inset-0 w-full h-full z-10"
        />
      )}

      {/* Frame Indicator Overlay */}
      <div className="absolute top-2 md:top-4 right-2 md:right-4 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none z-20">
        <div className="text-xs md:text-sm font-mono">
          Frame: {currentFrame + 1}/{csvData.length > 0 ? csvData.length : 24}
        </div>
        <div className="text-xs text-slate-400">{selectedArea}</div>
        {csvData.length > 0 && currentDate && currentTime && (
          <div className="text-xs text-green-300 mt-1">
            {currentDate} {currentTime}
          </div>
        )}
      </div>
      
      {/* Map Info Overlay */}
      <div className="absolute bottom-2 md:bottom-4 left-2 md:left-4 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none z-20">
        <div className="text-xs md:text-sm font-semibold text-slate-300">
          Interactive Ocean Current Map
        </div>
        <div className="text-xs text-slate-400 hidden md:block">
          Click to set HoloOcean POV
        </div>
        <div className="text-xs text-slate-400">
          {selectedParameter} at {selectedDepth}ft depth
        </div>
      </div>

      {/* Station Tooltip */}
      <StationTooltip station={hoveredStation} />

      {/* Selected Station Panel */}
      <SelectedStationPanel 
        station={selectedStation}
        csvData={csvData}
        onClose={() => {
          setSelectedStation(null);
          if (onStationSelect) {
            onStationSelect(null);
          }
        }}
        onAnalyze={(station) => {
          // Filter CSV data for this station
          const stationData = csvData.filter(row => {
            if (!row.lat || !row.lon) return false;
            const latDiff = Math.abs(row.lat - station.coordinates[1]);
            const lngDiff = Math.abs(row.lon - station.coordinates[0]);
            return latDiff < 0.001 && lngDiff < 0.001; // Within ~100m
          });
          
          console.log(`Station ${station.name} data:`, stationData);
          
          // Could trigger additional analysis or chatbot interaction
          return stationData;
        }}
      />

      {/* Data Quality Indicator */}
      {finalStationData.length > 0 && (
        <div className="absolute bottom-12 md:bottom-16 left-2 md:left-4 bg-green-800/80 border border-green-500/30 rounded-lg p-2 z-20">
          <div className="text-green-300 text-xs font-semibold">Data Quality</div>
          <div className="text-green-200 text-xs">
            {finalStationData.length} stations • {finalStationData.reduce((sum, s) => sum + (s.dataPoints || 0), 0)} measurements
          </div>
        </div>
      )}

      {/* POV Coordinates Display */}
      <div className="absolute top-2 md:top-4 left-2 md:left-4 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none z-20">
        <div className="text-xs text-slate-400">HoloOcean POV</div>
        <div className="text-xs md:text-sm font-mono text-cyan-300">
          ({holoOceanPOV.x.toFixed(1)}, {holoOceanPOV.y.toFixed(1)})
        </div>
        <div className="text-xs text-slate-400">Depth: {holoOceanPOV.depth}ft</div>
      </div>
    </div>
  );
};

export default MapContainer;