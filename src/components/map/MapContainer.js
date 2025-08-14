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
    zoom: 2,
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
  
  // Globe features and oceanographic layers
  const [userInteracting, setUserInteracting] = useState(false);
  const [spinEnabled, setSpinEnabled] = useState(false);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v9');
  const [showBathymetry, setShowBathymetry] = useState(false);
  const [showSeaTemp, setShowSeaTemp] = useState(false);
  const [bathymetryOpacity, setBathymetryOpacity] = useState(0.7);
  const [seaTempOpacity, setSeaTempOpacity] = useState(0.6);
  const [showMapControls, setShowMapControls] = useState(true);

  // NEW: Wind layer controls
  const [showWindLayer, setShowWindLayer] = useState(false);
  const [windOpacity, setWindOpacity] = useState(0.8);
  const [windVectorLength, setWindVectorLength] = useState(1.0);
  const [windAnimationSpeed, setWindAnimationSpeed] = useState(1.0);
  const [windGridDensity, setWindGridDensity] = useState(50); // km between wind vectors
  
  // NEW: Native wind particle controls
  const [showWindParticles, setShowWindParticles] = useState(false);
  const [particleCount, setParticleCount] = useState(4000);
  const [particleSpeed, setParticleSpeed] = useState(0.4);
  const [particleFade, setParticleFade] = useState(0.9);
  const [particleReset, setParticleReset] = useState(0.4);

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
      const allLons = stationData.map(s => s.coordinates[0]);
      const allLats = stationData.map(s => s.coordinates[1]);
      
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

  // NEW: Color mapping for wind speeds
  const getWindSpeedColor = (windSpeed) => {
    // Beaufort scale color mapping
    if (windSpeed < 4) return [135, 206, 235, 200]; // Light blue - Light air
    if (windSpeed < 7) return [100, 149, 237, 200]; // Blue - Light breeze
    if (windSpeed < 11) return [70, 130, 180, 200]; // Steel blue - Gentle breeze
    if (windSpeed < 16) return [25, 25, 112, 200]; // Navy - Moderate breeze
    if (windSpeed < 22) return [255, 255, 0, 200]; // Yellow - Fresh breeze
    if (windSpeed < 28) return [255, 165, 0, 200]; // Orange - Strong breeze
    if (windSpeed < 34) return [255, 69, 0, 200]; // Red-orange - Near gale
    if (windSpeed < 41) return [220, 20, 60, 200]; // Crimson - Gale
    if (windSpeed < 48) return [128, 0, 128, 200]; // Purple - Strong gale
    return [75, 0, 130, 200]; // Indigo - Storm
  };

  // Update wind particle layer when controls change
  useEffect(() => {
    if (mapRef.current && mapRef.current.getLayer('wind-particles-layer')) {
      mapRef.current.setLayoutProperty('wind-particles-layer', 'visibility', 
        showWindParticles ? 'visible' : 'none');
      
      if (showWindParticles) {
        mapRef.current.setPaintProperty('wind-particles-layer', 'raster-particle-speed-factor', particleSpeed);
        mapRef.current.setPaintProperty('wind-particles-layer', 'raster-particle-fade-opacity-factor', particleFade);
        mapRef.current.setPaintProperty('wind-particles-layer', 'raster-particle-reset-rate-factor', particleReset);
        mapRef.current.setPaintProperty('wind-particles-layer', 'raster-particle-count', particleCount);
      }
    }
  }, [showWindParticles, particleSpeed, particleFade, particleReset, particleCount]);

  // Enhanced station data validation and processing (moved before generateWindData)
  const finalStationData = useMemo(() => {
    if (stationData.length > 0) {
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
      
      if (validStations.length > 0 && mapRef.current) {
        const lons = validStations.map(s => s.coordinates[0]);
        const lats = validStations.map(s => s.coordinates[1]);
        const bounds = [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)]
        ];
        
        const currentCenter = mapRef.current.getCenter();
        const centerLon = (bounds[0][0] + bounds[1][0]) / 2;
        const centerLat = (bounds[0][1] + bounds[1][1]) / 2;
        const distance = Math.sqrt(
          Math.pow(currentCenter.lng - centerLon, 2) + 
          Math.pow(currentCenter.lat - centerLat, 2)
        );
        
        if (distance > 1) {
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

  // NEW: Generate synthetic wind data based on current frame and geographic patterns
  const generateWindData = useMemo(() => {
    if (!timeSeriesData.length) return [];
    
    const currentData = timeSeriesData[currentFrame % timeSeriesData.length];
    const windData = [];
    
    // Calculate viewport bounds
    const bounds = finalStationData.length > 0 ? {
      minLon: Math.min(...finalStationData.map(s => s.coordinates[0])) - 1,
      maxLon: Math.max(...finalStationData.map(s => s.coordinates[0])) + 1,
      minLat: Math.min(...finalStationData.map(s => s.coordinates[1])) - 1,
      maxLat: Math.max(...finalStationData.map(s => s.coordinates[1])) + 1
    } : {
      minLon: -95, maxLon: -80,
      minLat: 25, maxLat: 35
    };
    
    // Calculate grid spacing based on density setting
    const gridSpacing = windGridDensity / 111; // Convert km to degrees (rough approximation)
    
    // Generate wind vectors on a grid
    for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += gridSpacing) {
      for (let lon = bounds.minLon; lon <= bounds.maxLon; lon += gridSpacing) {
        // Simulate realistic wind patterns
        const timeOffset = currentFrame * windAnimationSpeed;
        
        // Base wind direction (prevailing westerlies)
        let windDirection = 270 + Math.sin((lat - 30) * 0.1) * 30; // Degrees
        
        // Add temporal variation
        windDirection += Math.sin(timeOffset * 0.1 + lon * 0.02) * 15;
        windDirection += Math.cos(timeOffset * 0.08 + lat * 0.03) * 10;
        
        // Add geographic variation (coastal effects, etc.)
        const coastalEffect = Math.sin(lon * 0.5) * Math.cos(lat * 0.3) * 20;
        windDirection += coastalEffect;
        
        // Wind speed (knots) - varies with location and time
        let windSpeed = 10 + Math.sin(timeOffset * 0.05 + lat * 0.1) * 8;
        windSpeed += Math.cos(timeOffset * 0.03 + lon * 0.08) * 5;
        windSpeed = Math.max(2, windSpeed); // Minimum wind speed
        
        // Add weather system effects
        const weatherSystemEffect = Math.sin(timeOffset * 0.02 + (lat + lon) * 0.1) * 5;
        windSpeed += weatherSystemEffect;
        
        // Convert to vector components
        const windDirectionRad = windDirection * Math.PI / 180;
        const vectorLength = (windSpeed / 30) * windVectorLength * 0.1; // Scale factor
        
        windData.push({
          position: [lon, lat],
          windSpeed: windSpeed,
          windDirection: windDirection,
          vectorEnd: [
            lon + Math.cos(windDirectionRad) * vectorLength,
            lat + Math.sin(windDirectionRad) * vectorLength
          ],
          color: getWindSpeedColor(windSpeed),
          timestamp: timeOffset
        });
      }
    }
    
    return windData;
  }, [currentFrame, timeSeriesData, windVectorLength, windAnimationSpeed, windGridDensity, finalStationData]);

  // Globe spinning function
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

  // Initialize Mapbox map
  useEffect(() => {
    if (!mapContainerReady || !mapContainerRef.current || mapRef.current) return;

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
      //projection: 'globe',
      zoom: startingViewState.zoom,
      pitch: startingViewState.pitch,
      bearing: startingViewState.bearing
    });

    mapRef.current.addControl(new mapboxgl.NavigationControl());

    mapRef.current.on('style.load', () => {
      mapRef.current.setFog({});
      
      // Add wind particle data source and layer
      if (!mapRef.current.getSource('wind-particles-source')) {
        mapRef.current.addSource('wind-particles-source', {
          type: 'raster-array',
          url: 'mapbox://rasterarrayexamples.gfs-winds',
          tileSize: 512
        });
      }
      
      if (!mapRef.current.getLayer('wind-particles-layer')) {
        mapRef.current.addLayer({
          id: 'wind-particles-layer',
          type: 'raster-particle',
          source: 'wind-particles-source',
          'source-layer': '10winds',
          layout: {
            visibility: showWindParticles ? 'visible' : 'none'
          },
          paint: {
            'raster-particle-speed-factor': particleSpeed,
            'raster-particle-fade-opacity-factor': particleFade,
            'raster-particle-reset-rate-factor': particleReset,
            'raster-particle-count': particleCount,
            'raster-particle-max-speed': 40,
            'raster-particle-color': [
              'interpolate',
              ['linear'],
              ['raster-particle-speed'],
              1.5, 'rgba(134,163,171,256)',
              2.5, 'rgba(126,152,188,256)',
              4.12, 'rgba(110,143,208,256)',
              6.17, 'rgba(15,147,167,256)',
              9.26, 'rgba(57,163,57,256)',
              11.83, 'rgba(194,134,62,256)',
              14.92, 'rgba(200,66,13,256)',
              18.0, 'rgba(210,0,50,256)',
              21.6, 'rgba(175,80,136,256)',
              25.21, 'rgba(117,74,147,256)',
              29.32, 'rgba(68,105,141,256)',
              33.44, 'rgba(194,251,119,256)',
              43.72, 'rgba(241,255,109,256)',
              50.41, 'rgba(256,256,256,256)',
              59.16, 'rgba(0,256,256,256)',
              69.44, 'rgba(256,37,256,256)'
            ]
          }
        });
      }
    });

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
      
      setTimeout(() => {
        setUserInteracting(false);
        spinGlobe();
      }, 1000);
    });

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

  // Generate DeckGL layers with wind direction layer
  const getDeckLayers = () => {
    const layers = [];
    
    // GEBCO Bathymetry Layer
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

    // NEW: Wind Direction Layer
    if (showWindLayer && generateWindData.length > 0) {
      // Wind vector arrows
      layers.push(
        new LineLayer({
          id: 'wind-vectors',
          data: generateWindData,
          getSourcePosition: d => d.position,
          getTargetPosition: d => d.vectorEnd,
          getColor: d => d.color,
          getWidth: d => Math.max(1, d.windSpeed / 8), // Width based on wind speed
          widthScale: 1,
          widthMinPixels: 1,
          widthMaxPixels: 4,
          opacity: windOpacity,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 150],
          onHover: ({object, x, y}) => {
            if (object && viewState.zoom > 6) { // Only show detailed tooltips at higher zoom
              setHoveredStation({
                name: `Wind Data`,
                details: `Speed: ${object.windSpeed.toFixed(1)} knots\nDirection: ${object.windDirection.toFixed(0)}°`,
                x, y,
                isWind: true
              });
            } else {
              setHoveredStation(null);
            }
          }
        })
      );

      // Wind arrow heads (for direction indication)
      layers.push(
        new ScatterplotLayer({
          id: 'wind-arrow-heads',
          data: generateWindData.filter((_, index) => index % 2 === 0), // Show fewer arrows for performance
          getPosition: d => d.vectorEnd,
          getFillColor: d => d.color,
          getRadius: d => Math.max(100, d.windSpeed * 20),
          radiusScale: 1,
          radiusMinPixels: 2,
          radiusMaxPixels: 6,
          opacity: windOpacity * 0.8,
          pickable: false
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
            if (!pos || pos.length !== 2 || isNaN(pos[0]) || isNaN(pos[1])) {
              console.error('Invalid position for station during render:', d);
              return [0, 0];
            }
            return pos;
          },
          getFillColor: d => {
            if (!d.color || !Array.isArray(d.color) || d.color.length < 3) {
              return [255, 255, 255, 180];
            }
            return [...d.color, 180];
          },
          getRadius: d => {
            const baseRadius = 200;
            const dataPointMultiplier = d.dataPoints ? Math.log(d.dataPoints + 1) * 50 : 0;
            return baseRadius + dataPointMultiplier;
          },
          radiusScale: 1,
          radiusMinPixels: Math.max(1, viewState.zoom / 3),
          radiusMaxPixels: Math.max(4, viewState.zoom * 1.5),
          pickable: true,
          autoHighlight: false,
          highlightColor: [255, 255, 255, 100],
          onHover: viewState.zoom > 10 ? ({object, x, y}) => {
            setHoveredStation(object ? { ...object, x: x, y: y } : null);
          } : null,
          onClick: ({object}) => {
            if (object) {
              console.log('Clicked station:', object);
              
              const [lng, lat] = object.coordinates;
              
              setSelectedStation(object);
              if (onStationSelect) {
                onStationSelect(object);
              }
              
              if (mapRef.current) {
                console.log(`Centering map on station at ${lng}, ${lat}`);
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
          color: [74, 222, 128], // Keep green or change to [255, 165, 0] for orange
          name: 'HoloOcean Viewpoint',
          type: 'pov-indicator'
        }],
        getPosition: d => d.coordinates,
        getFillColor: d => d.color,
        getRadius: 1500,
        radiusMinPixels: 8,
        radiusMaxPixels: 15,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 150],
        onHover: ({object, x, y}) => {
          if (object) {
            setHoveredStation({
              name: 'HoloOcean POV',
              details: `Simulation Viewpoint\nPosition: (${holoOceanPOV.x.toFixed(1)}, ${holoOceanPOV.y.toFixed(1)})\nDepth: ${selectedDepth}ft`,
              x, y,
              isPOV: true
            });
          } else {
            setHoveredStation(null);
          }
        }
      })
    );
    
    return layers;
  };

  // Mapbox container
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

      {/* Enhanced Map Style Controls with Wind Layer */}
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
                    setShowOceanBase(false);
                  }
                }}
                className="w-full text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 px-2 py-1 rounded mb-2"
              >
                🌍 Global View
              </button>

              {finalStationData.length > 0 && (
                <button
                  onClick={() => {
                    if (mapRef.current && finalStationData.length > 0) {
                      const lons = finalStationData.map(s => s.coordinates[0]);
                      const lats = finalStationData.map(s => s.coordinates[1]);
                      const bounds = [
                        [Math.min(...lons), Math.min(...lats)],
                        [Math.max(...lons), Math.max(...lats)]
                      ];
                      
                      mapRef.current.fitBounds(bounds, { 
                        padding: 50,
                        maxZoom: 12,
                        duration: 2000
                      });
                      setShowOceanBase(true);
                    }
                  }}
                  className="w-full text-xs bg-green-600 hover:bg-green-500 text-slate-200 px-2 py-1 rounded mb-2"
                >
                  🔍 Zoom to Stations
                </button>
              )}
            </div>

            {/* NEW: Wind Layer Controls */}
            <div className="mb-3 pb-2 border-b border-slate-600">
              <div className="text-xs font-semibold text-slate-300 mb-2">Wind Layers</div>

              {/* Wind Particles Toggle */}
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={() => setShowWindParticles(!showWindParticles)}
                  className={`w-4 h-4 rounded border ${
                    showWindParticles 
                      ? 'bg-emerald-500 border-emerald-500' 
                      : 'bg-transparent border-slate-500'
                  }`}
                >
                  {showWindParticles && (
                    <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-slate-400">🌪️ Wind Particles (Live)</span>
              </div>

              {showWindParticles && (
                <div className="ml-4 space-y-2 mb-3">
                  {/* Particle Count */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Particles: {particleCount}
                    </label>
                    <input
                      type="range"
                      min="1000"
                      max="8000"
                      step="500"
                      value={particleCount}
                      onChange={(e) => setParticleCount(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Speed Factor */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Speed: {particleSpeed.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={particleSpeed}
                      onChange={(e) => setParticleSpeed(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Fade Factor */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Fade: {particleFade.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={particleFade}
                      onChange={(e) => setParticleFade(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Reset Rate */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Reset Rate: {particleReset.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={particleReset}
                      onChange={(e) => setParticleReset(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Wind Vector Layer Toggle */}
              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={() => setShowWindLayer(!showWindLayer)}
                  className={`w-4 h-4 rounded border ${
                    showWindLayer 
                      ? 'bg-cyan-500 border-cyan-500' 
                      : 'bg-transparent border-slate-500'
                  }`}
                >
                  {showWindLayer && (
                    <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-slate-400">🌬️ Wind Vectors (Synthetic)</span>
              </div>

              {showWindLayer && (
                <div className="ml-4 space-y-2">
                  {/* Wind Opacity */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Opacity: {Math.round(windOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={windOpacity}
                      onChange={(e) => setWindOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Vector Length */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Vector Size: {windVectorLength.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={windVectorLength}
                      onChange={(e) => setWindVectorLength(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Animation Speed */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Animation Speed: {windAnimationSpeed.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="3"
                      step="0.1"
                      value={windAnimationSpeed}
                      onChange={(e) => setWindAnimationSpeed(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Grid Density */}
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Grid Density: {windGridDensity}km
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="10"
                      value={windGridDensity}
                      onChange={(e) => setWindGridDensity(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
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
          {showWindParticles && <span className="text-emerald-300">🌪️ Live Wind </span>}
          {showWindLayer && <span className="text-cyan-300">🌬️ Wind Vectors </span>}
          {showOceanBase && <span className="text-cyan-300">🌊 Ocean Base </span>}
        </div>
        {spinEnabled && (
          <div className="text-xs text-cyan-300 mt-1">
            🌍 Globe Auto-Rotating
          </div>
        )}
      </div>

      {/* Enhanced Wind Legend */}
      {(showWindLayer || showWindParticles) && (
        <div className="absolute bottom-5 right-2 bg-slate-800/90 border border-slate-600/50 rounded-lg p-2 z-20">
          {showWindParticles ? (
            <>
              <div className="text-xs font-semibold text-slate-300 mb-2">Live Wind Data (m/s)</div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1" style={{backgroundColor: 'rgba(134,163,171,1)'}}></div>
                  <span className="text-xs text-slate-400">1.5: Light air</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1" style={{backgroundColor: 'rgba(15,147,167,1)'}}></div>
                  <span className="text-xs text-slate-400">6.17: Light breeze</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1" style={{backgroundColor: 'rgba(57,163,57,1)'}}></div>
                  <span className="text-xs text-slate-400">9.26: Gentle breeze</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1" style={{backgroundColor: 'rgba(194,134,62,1)'}}></div>
                  <span className="text-xs text-slate-400">11.83: Moderate</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1" style={{backgroundColor: 'rgba(200,66,13,1)'}}></div>
                  <span className="text-xs text-slate-400">14.92: Fresh</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1" style={{backgroundColor: 'rgba(210,0,50,1)'}}></div>
                  <span className="text-xs text-slate-400">18+: Strong</span>
                </div>
              </div>
              <div className="text-xs text-emerald-300 mt-2">
                🌪️ {particleCount} particles
              </div>
            </>
          ) : (
            <>
              <div className="text-xs font-semibold text-slate-300 mb-2">Wind Speed (knots)</div>
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1 bg-sky-300"></div>
                  <span className="text-xs text-slate-400">0-7: Light</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1 bg-blue-500"></div>
                  <span className="text-xs text-slate-400">7-16: Moderate</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1 bg-yellow-400"></div>
                  <span className="text-xs text-slate-400">16-28: Fresh</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1 bg-orange-500"></div>
                  <span className="text-xs text-slate-400">28-41: Gale</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-1 bg-red-600"></div>
                  <span className="text-xs text-slate-400">41+: Storm</span>
                </div>
              </div>
              <div className="text-xs text-cyan-300 mt-2">
                🌬️ {generateWindData.length} vectors
              </div>
            </>
          )}
        </div>
      )}

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
          {showWindLayer && (
            <div className="text-cyan-200 text-xs mt-1">
              Wind grid: {generateWindData.length} vectors
            </div>
          )}
          {showWindParticles && (
            <div className="text-emerald-200 text-xs mt-1">
              Live particles: {particleCount}
            </div>
          )}
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