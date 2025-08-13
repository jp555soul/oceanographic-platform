import React, { useRef, useEffect, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import StationTooltip from './StationTooltip';
import SelectedStationPanel from './SelectedStationPanel';
import 'mapbox-gl/dist/mapbox-gl.css';

const MapContainer = ({
  stationData = [],
  timeSeriesData = [],
  currentFrame = 0,
  selectedDepth = 0,
  selectedArea = '',
  selectedParameter = 'Current Speed',
  holoOceanPOV = { x: 0, y: 0, depth: 0 },
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
    zoom: 2, // Much lower zoom for globe view
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
  const [showOceanBase, setShowOceanBase] = useState(true);
  const [oceanBaseOpacity, setOceanBaseOpacity] = useState(0.6);
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  
  // New state for globe features and oceanographic layers
  const [userInteracting, setUserInteracting] = useState(false);
  const [spinEnabled, setSpinEnabled] = useState(false); // Can be toggled
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v9'); // Default to streets style
  const [showBathymetry, setShowBathymetry] = useState(false);
  const [showSeaTemp, setShowSeaTemp] = useState(false);
  const [bathymetryOpacity, setBathymetryOpacity] = useState(0.7);
  const [seaTempOpacity, setSeaTempOpacity] = useState(0.6);
  const [showMapControls, setShowMapControls] = useState(true); // State to toggle map controls

  // Set Mapbox access token
  useEffect(() => {
    if (mapboxToken) {
      mapboxgl.accessToken = mapboxToken;
    } else {
      mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 
        'pk.eyJ1Ijoiam1wYXVsbWFwYm94IiwiYSI6ImNtZHh0ZmR6MjFoaHIyam9vZmJ4Z2x1MDYifQ.gR60szhfKWhTv8MyqynpVA';
    }
  }, [mapboxToken]);

  // Debug station data when it changes
  useEffect(() => {
    if (stationData.length > 0) {
      // Validate coordinates are in reasonable ocean ranges
      const allLons = stationData.map(s => s.coordinates[0]);
      const allLats = stationData.map(s => s.coordinates[1]);
      
      // Broader range to catch more ocean areas
      const expectedLonRange = [-180, 180]; 
      const expectedLatRange = [-90, 90];   
      
      const validStations = stationData.filter(s => {
        const [lon, lat] = s.coordinates;
        return lon >= expectedLonRange[0] && lon <= expectedLonRange[1] &&
               lat >= expectedLatRange[0] && lat <= expectedLatRange[1];
      });
      
      console.log('Station coordinate validation:', {
        totalStations: stationData.length,
        validStations: validStations.length,
        invalidStations: stationData.length - validStations.length,
        sampleCoordinates: stationData.slice(0, 5).map(s => ({
          name: s.name,
          coords: s.coordinates
        }))
      });
    }
  }, [stationData]);

  // Globe spinning function (similar to sample)
  const spinGlobe = () => {
    if (!mapRef.current) return;
    
    const zoom = mapRef.current.getZoom();
    const secondsPerRevolution = 240;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    
    if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
      let distancePerSecond = 360 / secondsPerRevolution;
      if (zoom > slowSpinZoom) {
        const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
        distancePerSecond *= zoomDif;
      }
      const center = mapRef.current.getCenter();
      center.lng -= distancePerSecond;
      
      mapRef.current.easeTo({ 
        center, 
        duration: 1000, 
        easing: (n) => n 
      });
    }
  };

  // Initialize Mapbox map with updated style and features
  useEffect(() => {
    if (!mapContainerReady || !mapContainerRef.current || mapRef.current) return;

    // Start with global view for globe effect, then zoom to stations if available
    const startingViewState = stationData.length > 0 ? viewState : {
      longitude: 0,
      latitude: 20,
      zoom: 1.5,
      pitch: 0,
      bearing: 0
    };

    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: mapStyle,
      center: [startingViewState.longitude, startingViewState.latitude],
      projection: 'globe',
      zoom: startingViewState.zoom,
      pitch: startingViewState.pitch,
      bearing: startingViewState.bearing
    });

    // Add navigation controls (like the sample)
    mapRef.current.addControl(new mapboxgl.NavigationControl());

    // Optional: Disable scroll zoom (like the sample)
    // mapRef.current.scrollZoom.disable();

    // Add fog/atmosphere effect when style loads
    mapRef.current.on('style.load', () => {
      mapRef.current.setFog({}); // Set the default atmosphere style
    });

    // Globe spinning event handlers
    mapRef.current.on('mousedown', () => {
      setUserInteracting(true);
    });

    mapRef.current.on('dragstart', () => {
      setUserInteracting(true);
    });

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
      
      // Continue spinning after interaction ends
      setTimeout(() => {
        setUserInteracting(false);
        spinGlobe();
      }, 1000);
    });

    // Start spinning
    if (spinEnabled) {
      spinGlobe();
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapContainerReady, mapStyle, spinEnabled]);

  // Enhanced station data validation and processing
  const finalStationData = useMemo(() => {
    if (stationData.length > 0) {
      // Validate that all stations have valid coordinates
      const validStations = stationData.filter(station => {
        if (!station.coordinates || station.coordinates.length !== 2) {
          console.warn('Station missing coordinates array:', station);
          return false;
        }
        
        const [lon, lat] = station.coordinates;
        const isValid = lon !== null && lat !== null && 
                       lon !== undefined && lat !== undefined &&
                       !isNaN(lon) && !isNaN(lat) &&
                       Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
        
        if (!isValid) {
          console.warn('Invalid station coordinates:', {
            name: station.name,
            coordinates: station.coordinates,
            lon, lat,
            lonType: typeof lon,
            latType: typeof lat
          });
        }
        
        return isValid;
      });

      console.log(`Using ${validStations.length} valid stations out of ${stationData.length} total`);
      
      // Auto-fit map to station bounds if we have valid stations
      if (validStations.length > 0 && mapRef.current) {
        const lons = validStations.map(s => s.coordinates[0]);
        const lats = validStations.map(s => s.coordinates[1]);
        const bounds = [
          [Math.min(...lons), Math.min(...lats)], // SW
          [Math.max(...lons), Math.max(...lats)]  // NE
        ];
        
        // Only auto-fit on first load or if significantly different
        const currentCenter = mapRef.current.getCenter();
        const centerLon = (bounds[0][0] + bounds[1][0]) / 2;
        const centerLat = (bounds[0][1] + bounds[1][1]) / 2;
        const distance = Math.sqrt(
          Math.pow(currentCenter.lng - centerLon, 2) + 
          Math.pow(currentCenter.lat - centerLat, 2)
        );
        
        if (distance > 1) { // Only auto-fit if more than 1 degree away
          console.log('Auto-fitting map to station bounds:', bounds);
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.fitBounds(bounds, { 
                padding: 50,
                maxZoom: 12
              });
            }
          }, 1000);
        }
      }
      
      return validStations;
    }
    
    // Fallback stations for testing
    console.log('Using fallback test stations');
    return [
      {
        name: 'Test Station 1 (Gulf)',
        coordinates: [-89.1, 30.3],
        color: [244, 63, 94],
        type: 'test',
        dataPoints: 100
      },
      {
        name: 'Test Station 2 (Gulf)',
        coordinates: [-88.8, 30.1], 
        color: [251, 191, 36],
        type: 'test',
        dataPoints: 150
      }
    ];
  }, [stationData]);

  // Generate DeckGL layers with enhanced debugging and oceanographic layers
  const getDeckLayers = () => {
    const layers = [];
    
    // GEBCO Bathymetry Layer (Ocean depth)
    if (showBathymetry) {
      layers.push(
        new TileLayer({
          id: 'gebco-bathymetry',
          data: 'https://tiles.gebco.net/tiles/gebco_latest/{z}/{x}/{y}.png',
          
          renderSubLayers: props => {
            const {
              bbox: { west, south, east, north }
            } = props.tile;

            return new BitmapLayer(props, {
              data: null,
              image: props.data,
              bounds: [west, south, east, north]
            });
          },
          
          minZoom: 0,
          maxZoom: 10,
          tileSize: 256,
          opacity: bathymetryOpacity,
          
          onTileError: (error) => {
            console.warn('GEBCO Bathymetry tile loading error:', error);
          },
          
          maxRequests: 20
        })
      );
    }

    // NOAA Sea Surface Temperature Layer
    if (showSeaTemp) {
      layers.push(
        new TileLayer({
          id: 'noaa-sea-surface-temp',
          data: 'https://maps.oceandata.sci.gsfc.nasa.gov/mapserver/wms?service=WMS&version=1.1.1&request=GetMap&layers=MODIS_Aqua_L3_SST_4km_32Day&styles=&format=image/png&transparent=true&height=256&width=256&srs=EPSG:3857&bbox={bbox-epsg-3857}',
          
          renderSubLayers: props => {
            const {
              bbox: { west, south, east, north }
            } = props.tile;

            return new BitmapLayer(props, {
              data: null,
              image: props.data,
              bounds: [west, south, east, north]
            });
          },
          
          minZoom: 0,
          maxZoom: 8,
          tileSize: 256,
          opacity: seaTempOpacity,
          
          onTileError: (error) => {
            console.warn('Sea Surface Temperature tile loading error:', error);
          },
          
          maxRequests: 15
        })
      );
    }
    
    // ArcGIS World Ocean Base Layer
    if (showOceanBase) {
      layers.push(
        new TileLayer({
          id: 'arcgis-ocean-base',
          data: 'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
          
          renderSubLayers: props => {
            const {
              bbox: { west, south, east, north }
            } = props.tile;

            return new BitmapLayer(props, {
              data: null,
              image: props.data,
              bounds: [west, south, east, north]
            });
          },
          
          minZoom: 0,
          maxZoom: 13,
          tileSize: 256,
          opacity: oceanBaseOpacity,
          
          onTileError: (error) => {
            console.warn('ArcGIS Ocean Base tile loading error:', error);
          },
          
          maxRequests: 20,
          beforeId: 'stations'
        })
      );
    }
    
    // Enhanced station markers layer
    if (finalStationData.length > 0) {
      layers.push(
        new ScatterplotLayer({
          id: 'stations',
          data: finalStationData,
          getPosition: d => {
            const pos = d.coordinates;
            // Extra validation before rendering
            if (!pos || pos.length !== 2 || isNaN(pos[0]) || isNaN(pos[1])) {
              console.error('Invalid position for station during render:', d);
              return [0, 0]; // Default position to avoid crashes
            }
            return pos;
          },
          getFillColor: d => {
            // Ensure color is valid and add transparency for overlapping points
            if (!d.color || !Array.isArray(d.color) || d.color.length < 3) {
              return [255, 255, 255, 180]; // Default white with transparency
            }
            // Add alpha channel for transparency
            return [...d.color, 180]; // 180/255 = ~70% opacity
          },
          getRadius: d => {
            // Much smaller base radius for high precision data
            const baseRadius = 200; // Reduced from 2000
            const dataPointMultiplier = d.dataPoints ? Math.log(d.dataPoints + 1) * 50 : 0; // Reduced multiplier
            return baseRadius + dataPointMultiplier;
          },
          radiusScale: 1,
          radiusMinPixels: Math.max(1, viewState.zoom / 3),  // Scale with zoom: smaller at low zoom
          radiusMaxPixels: Math.max(4, viewState.zoom * 1.5), // Scale with zoom: larger at high zoom
          pickable: true,
          // Performance optimizations for many points
          autoHighlight: false, // Disable auto-highlighting for performance
          highlightColor: [255, 255, 255, 100],
          // Only show detailed info on hover for larger zoom levels
          onHover: viewState.zoom > 10 ? ({object, x, y}) => {
            setHoveredStation(object ? { ...object, x: x, y: y } : null);
          } : null,
          onClick: ({object}) => {
            if (object) {
              console.log('Clicked station:', object);
              
              const [lng, lat] = object.coordinates;
              
              // Set selected station
              setSelectedStation(object);
              if (onStationSelect) {
                onStationSelect(object);
              }
              
              // Center map on clicked station
              if (mapRef.current) {
                console.log(`Centering map on station at ${lng}, ${lat}`);
                mapRef.current.jumpTo({
                  center: [lng, lat],
                  zoom: Math.max(mapRef.current.getZoom(), 10)
                });
              }

              // Update POV - using original logic but with validation
              if (onPOVChange) {
                // Convert geographic coordinates to POV coordinates (0-100 scale)
                // This assumes your original coordinate system mapping
                const x = ((lng + 89.2) / 0.4) * 100;
                const y = ((lat - 30.0) / 0.4) * 100;
                
                const newPOV = { 
                  x: Math.max(0, Math.min(100, x)), 
                  y: Math.max(0, Math.min(100, y)), 
                  depth: selectedDepth 
                };

                console.log('Updating POV:', { original: {lng, lat}, converted: newPOV });
                onPOVChange(newPOV);
              }
            }
          }
        })
      );
    } else {
      console.warn('No valid station data available for rendering');
    }
    
    // Current vectors layer
    if (timeSeriesData.length > 0 && finalStationData.length > 0) {
      const currentData = timeSeriesData[currentFrame % timeSeriesData.length];

      const parameterMapping = {
        'Current Speed': 'currentSpeed',
        'Temperature': 'temperature',
        'Wave Height': 'waveHeight',
        'Salinity': 'salinity',
        'Pressure': 'pressure'
      };

      const dataKey = parameterMapping[selectedParameter] || 'currentSpeed';
      const parameterValue = currentData[dataKey] || 0;
      
      const currentVectors = finalStationData.map((station, index) => {
        const [lng, lat] = station.coordinates;
        let vectorLength, color;
        
        if (selectedParameter === 'Current Speed') {
          vectorLength = 0.1 * parameterValue / 2;
          color = station.color.map(c => Math.min(255, c + 50));
        } else if (selectedParameter === 'Temperature') {
          vectorLength = 0.05;
          const tempNormalized = (parameterValue - 60) / 40;
          color = [255 * Math.max(0, tempNormalized), 100, 255 * Math.max(0, 1 - tempNormalized)];
        } else {
          vectorLength = 0.05;
          color = station.color;
        }
        
        const angle = ((currentData.heading || (45 + index * 75)) + index * 30) * Math.PI / 180;
        
        return {
          from: [lng, lat],
          to: [
            lng + Math.cos(angle) * vectorLength,
            lat + Math.sin(angle) * vectorLength
          ],
          color: color,
          value: parameterValue
        };
      });
      
      layers.push(
        new LineLayer({
          id: 'current-vectors',
          data: currentVectors,
          getSourcePosition: d => d.from,
          getTargetPosition: d => d.to,
          getColor: d => d.color,
          getWidth: d => Math.max(2, Math.abs(d.value) * 3),
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
          color: [74, 222, 128]
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

  // Coordinate Debug Panel Component
  const CoordinateDebugPanel = () => {
    if (!showDebugPanel || !finalStationData.length) return null;

    const bounds = finalStationData.length > 0 ? {
      minLon: Math.min(...finalStationData.map(s => s.coordinates[0])),
      maxLon: Math.max(...finalStationData.map(s => s.coordinates[0])),
      minLat: Math.min(...finalStationData.map(s => s.coordinates[1])),
      maxLat: Math.max(...finalStationData.map(s => s.coordinates[1]))
    } : null;

    return (
      <div className="absolute top-20 left-2 bg-slate-800/95 border border-slate-600/50 rounded-lg p-3 z-30 max-w-sm text-xs">
        <div className="flex justify-between items-center mb-2">
          <div className="font-semibold text-slate-300">Station Debug</div>
          <button 
            onClick={() => setShowDebugPanel(false)}
            className="text-slate-400 hover:text-slate-200"
          >
            ×
          </button>
        </div>
        
        <div className="text-slate-400 space-y-1">
          <div className="font-semibold">Total Stations: {finalStationData.length}</div>
          
          {bounds && (
            <div className="mt-2">
              <div className="font-semibold text-slate-300">Coordinate Bounds:</div>
              <div className="font-mono">
                Lat: {bounds.minLat.toFixed(4)} to {bounds.maxLat.toFixed(4)}
              </div>
              <div className="font-mono">
                Lon: {bounds.minLon.toFixed(4)} to {bounds.maxLon.toFixed(4)}
              </div>
            </div>
          )}
          
          <div className="mt-2">
            <div className="font-semibold text-slate-300">Sample Stations:</div>
            {finalStationData.slice(0, 3).map((station, idx) => (
              <div key={idx} className="font-mono text-xs">
                {station.name.slice(0, 20)}...
                <br />
                [{station.coordinates[0].toFixed(4)}, {station.coordinates[1].toFixed(4)}]
                <br />
                {station.dataPoints} points
              </div>
            ))}
            {finalStationData.length > 3 && (
              <div className="text-slate-500">... and {finalStationData.length - 3} more</div>
            )}
          </div>
        </div>
      </div>
    );
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
          onViewStateChange={({viewState: newViewState}) => {
            setViewState(newViewState);
            
            // Sync with Mapbox
            if (mapRef.current) {
              mapRef.current.jumpTo({
                center: [newViewState.longitude, newViewState.latitude],
                zoom: newViewState.zoom,
                pitch: newViewState.pitch,
                bearing: newViewState.bearing
              });
            }
          }}
          controller={true}
          layers={getDeckLayers()}
          onClick={(info, event) => {
            if (info.object) {
              if (info.layer.id === 'stations') {
                const object = info.object;
                const [lng, lat] = object.coordinates;
                
                setSelectedStation(object);
                if (onStationSelect) {
                  onStationSelect(object);
                }
                
                if (mapRef.current) {
                  mapRef.current.jumpTo({
                    center: [lng, lat],
                    zoom: Math.max(mapRef.current.getZoom(), 10)
                  });
                }
                
                if (onPOVChange) {
                  const x = ((lng + 89.2) / 0.4) * 100;
                  const y = ((lat - 30.0) / 0.4) * 100;
                  
                  const newPOV = { 
                    x: Math.max(0, Math.min(100, x)), 
                    y: Math.max(0, Math.min(100, y)), 
                    depth: selectedDepth 
                  };

                  onPOVChange(newPOV);
                }
              }
            } else if (info.coordinate && onPOVChange) {
              const [lng, lat] = info.coordinate;
              const x = ((lng + 89.2) / 0.4) * 100;
              const y = ((lat - 30.0) / 0.4) * 100;
              
              const newPOV = { 
                x: Math.max(0, Math.min(100, x)), 
                y: Math.max(0, Math.min(100, y)), 
                depth: selectedDepth 
              };

              onPOVChange(newPOV);
              
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
          }}
          className="absolute inset-0 w-full h-full z-10"
        />
      )}

      {/* Coordinate Debug Panel */}
      {/* <CoordinateDebugPanel /> */}

      {/* Enhanced Map Style Controls */}
      <div className="absolute top-2 md:top-2 left-[140px] md:left-[140px] bg-slate-800/90 border border-slate-600/50 rounded-lg p-2 z-20 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-semibold text-slate-300">Map Controls</div>
          <button 
            onClick={() => setShowMapControls(!showMapControls)}
            className="text-slate-400 hover:text-slate-200"
          >
            {showMapControls ? '−' : '+'}
          </button>
        </div>
        
        {showMapControls && (
          <>
            {/* Map Style Selector */}
            <div className="mb-3">
              <label className="text-xs text-slate-400 block mb-1">Map Style</label>
              <select
                value={mapStyle}
                onChange={(e) => {
                  setMapStyle(e.target.value);
                  if (mapRef.current) {
                    mapRef.current.setStyle(e.target.value);
                  }
                }}
                className="w-full text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-200"
              >
                <option value="mapbox://styles/mapbox/streets-v9">Streets</option>
                <option value="mapbox://styles/mapbox/satellite-v9">Satellite</option>
                <option value="mapbox://styles/mapbox/light-v10">Light</option>
                <option value="mapbox://styles/mapbox/dark-v10">Dark</option>
                <option value="mapbox://styles/mapbox/outdoors-v11">Outdoors</option>
                <option value="mapbox://styles/mapbox/navigation-day-v1">Navigation</option>
              </select>
            </div>

            {/* Globe Controls */}
            <div className="mb-3 pb-2 border-b border-slate-600">
              <div className="text-xs font-semibold text-slate-300 mb-2">Globe Controls</div>
              
              {/* Globe Spinning Control */}
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={() => {
                    setSpinEnabled(!spinEnabled);
                    if (!spinEnabled) {
                      spinGlobe();
                    }
                  }}
                  className={`w-4 h-4 rounded border ${
                    spinEnabled 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'bg-transparent border-slate-500'
                  }`}
                >
                  {spinEnabled && (
                    <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-slate-400">Auto Rotate Globe</span>
              </div>

              {/* Reset to Global View Button */}
              <button
                onClick={() => {
                  if (mapRef.current) {
                    mapRef.current.easeTo({
                      center: [0, 20],
                      zoom: 1.5,
                      pitch: 0,
                      bearing: 0,
                      duration: 2000
                    });
                    setShowOceanBase(false); // Turn off Ocean Base Layer when Global View is active
                  }
                }}
                className="w-full text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 px-2 py-1 rounded mb-2"
              >
                🌍 Global View
              </button>

              {/* Zoom to Stations Button */}
              {finalStationData.length > 0 && (
                <button
                  onClick={() => {
                    if (mapRef.current && finalStationData.length > 0) {
                      const lons = finalStationData.map(s => s.coordinates[0]);
                      const lats = finalStationData.map(s => s.coordinates[1]);
                      const bounds = [
                        [Math.min(...lons), Math.min(...lats)], // SW
                        [Math.max(...lons), Math.max(...lats)]  // NE
                      ];
                      
                      mapRef.current.fitBounds(bounds, { 
                        padding: 50,
                        maxZoom: 12,
                        duration: 2000
                      });
                      setShowOceanBase(true); // Ensure Ocean Base Layer is active
                    }
                  }}
                  className="w-full text-xs bg-green-600 hover:bg-green-500 text-slate-200 px-2 py-1 rounded mb-2"
                >
                  📍 Zoom to Stations
                </button>
              )}
            </div>

            {/* Oceanographic Layers */}
            <div className="mb-3">
              <div className="text-xs font-semibold text-slate-300 mb-2">Oceanographic Layers</div>

              {/* Bathymetry Layer */}
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={() => setShowBathymetry(!showBathymetry)}
                    className={`w-4 h-4 rounded border ${
                      showBathymetry 
                        ? 'bg-blue-500 border-blue-500' 
                        : 'bg-transparent border-slate-500'
                    }`}
                  >
                    {showBathymetry && (
                      <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs text-slate-400">Bathymetry (GEBCO)</span>
                </div>
                {showBathymetry && (
                  <div className="ml-6">
                    <label className="text-xs text-slate-400 block mb-1">
                      Opacity: {Math.round(bathymetryOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={bathymetryOpacity}
                      onChange={(e) => setBathymetryOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Sea Surface Temperature Layer */}
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={() => setShowSeaTemp(!showSeaTemp)}
                    className={`w-4 h-4 rounded border ${
                      showSeaTemp 
                        ? 'bg-red-500 border-red-500' 
                        : 'bg-transparent border-slate-500'
                    }`}
                  >
                    {showSeaTemp && (
                      <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs text-slate-400">Sea Surface Temp</span>
                </div>
                {showSeaTemp && (
                  <div className="ml-6">
                    <label className="text-xs text-slate-400 block mb-1">
                      Opacity: {Math.round(seaTempOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={seaTempOpacity}
                      onChange={(e) => setSeaTempOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Ocean Base Layer */}
              <div className="mb-2">
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={() => setShowOceanBase(!showOceanBase)}
                    className={`w-4 h-4 rounded border ${
                      showOceanBase 
                        ? 'bg-cyan-500 border-cyan-500' 
                        : 'bg-transparent border-slate-500'
                    }`}
                  >
                    {showOceanBase && (
                      <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs text-slate-400">Ocean Base Layer</span>
                </div>
                {showOceanBase && (
                  <div className="ml-6">
                    <label className="text-xs text-slate-400 block mb-1">
                      Opacity: {Math.round(oceanBaseOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={oceanBaseOpacity}
                      onChange={(e) => setOceanBaseOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Debug Panel Toggle */}
      {!showDebugPanel && (
        <button
          onClick={() => setShowDebugPanel(true)}
          className="absolute top-2 right-16 bg-slate-700/80 hover:bg-slate-600/80 text-slate-300 px-2 py-1 rounded text-xs z-20"
        >
          Debug
        </button>
      )}

      {/* Frame Indicator Overlay */}
      <div className="absolute top-2 md:top-4 right-9 md:right-11 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none z-20">
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
      <div className="absolute bottom-5 md:bottom-7 left-2 md:left-4 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none z-20">
        <div className="text-xs md:text-sm font-semibold text-slate-300">
          Interactive Ocean Current Map
        </div>
        <div className="text-xs text-slate-400">
          {selectedParameter} at {selectedDepth}ft depth
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {showBathymetry && <span className="text-blue-300">🗺️ Bathymetry </span>}
          {showSeaTemp && <span className="text-red-300">🌡️ Sea Temp </span>}
          {showOceanBase && <span className="text-cyan-300">🌊 Ocean Base </span>}
        </div>
        {spinEnabled && (
          <div className="text-xs text-cyan-300 mt-1">
            🌍 Globe Auto-Rotating
          </div>
        )}
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
          const stationData = csvData.filter(row => {
            if (!row.lat || !row.lon) return false;
            const latDiff = Math.abs(row.lat - station.coordinates[1]);
            const lngDiff = Math.abs(row.lon - station.coordinates[0]);
            return latDiff < 0.001 && lngDiff < 0.001;
          });
          
          return stationData;
        }}
      />

      {/* Enhanced Data Quality Indicator */}
      {finalStationData.length > 0 && (
        <div className="absolute bottom-16 right-2 bg-green-800/80 border border-green-500/30 rounded-lg p-2 z-20">
          <div className="text-green-300 text-xs font-semibold">Station Data</div>
          <div className="text-green-200 text-xs">
            {finalStationData.length} stations loaded
          </div>
          <div className="text-green-200 text-xs">
            Total: {finalStationData.reduce((sum, s) => sum + (s.dataPoints || 0), 0)} measurements
          </div>
          {finalStationData.length > 0 && (
            <div className="text-green-200 text-xs mt-1 font-mono">
              Lat: {Math.min(...finalStationData.map(s => s.coordinates[1])).toFixed(2)} to {Math.max(...finalStationData.map(s => s.coordinates[1])).toFixed(2)}
              <br />
              Lon: {Math.min(...finalStationData.map(s => s.coordinates[0])).toFixed(2)} to {Math.max(...finalStationData.map(s => s.coordinates[0])).toFixed(2)}
            </div>
          )}
        </div>
      )}

      {/* POV Coordinates Display */}
      <div className="absolute top-2 md:top-2 left-2 md:left-4 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none z-20">
        <div className="text-xs text-slate-400">HoloOcean POV</div>
        <div className="text-xs md:text-sm font-mono text-cyan-300">
          ({holoOceanPOV.x.toFixed(1)}, {holoOceanPOV.y.toFixed(1)})
        </div>
        <div className="text-xs text-slate-400">Depth: {selectedDepth}ft</div>
      </div>
    </div>
  );
};

export default MapContainer;