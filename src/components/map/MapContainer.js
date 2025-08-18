import React, { useRef, useEffect, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, LineLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers'; // Import HeatmapLayer
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import StationTooltip from './StationTooltip';
import SelectedStationPanel from './SelectedStationPanel';
import { generateOptimizedStationDataFromCSV, validateOceanStations, generateTemperatureHeatmapData } from '../../services/dataService'; // Import heatmap data generator
import 'mapbox-gl/dist/mapbox-gl.css';

const MapContainer = ({
  stationData = [],
  timeSeriesData = [],
  currentFrame = 0,
  selectedDepth = 0,
  selectedArea = '',
  selectedParameter = 'Current Speed',
  isHeatmapVisible = false, // Add prop to control heatmap
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
  
  // Ocean-focused controls with default settings
  const [userInteracting, setUserInteracting] = useState(false);
  const [spinEnabled, setSpinEnabled] = useState(false);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/outdoors-v11');
  const [showMapControls, setShowMapControls] = useState(true);
  const [showCurrentVectors, setShowCurrentVectors] = useState(true);
  const [showOceanBase, setShowOceanBase] = useState(false);
  const [oceanBaseOpacity, setOceanBaseOpacity] = useState(1.0);

  // Wind layer controls
  const [showWindLayer, setShowWindLayer] = useState(false);
  const [windOpacity, setWindOpacity] = useState(0.8);
  const [windVectorLength, setWindVectorLength] = useState(1.0);
  const [windAnimationSpeed, setWindAnimationSpeed] = useState(1.0);
  const [windGridDensity, setWindGridDensity] = useState(50);
  
  // Wind particle controls
  const [showWindParticles, setShowWindParticles] = useState(false);
  const [particleCount, setParticleCount] = useState(4000);
  const [particleSpeed, setParticleSpeed] = useState(0.4);
  const [particleFade, setParticleFade] = useState(0.9);
  const [particleReset, setParticleReset] = useState(0.4);

  // Grid layer controls
  const [showGrid, setShowGrid] = useState(false);
  const [gridOpacity, setGridOpacity] = useState(1.0);
  const [gridSpacing, setGridSpacing] = useState(1);
  const [gridColor, setGridColor] = useState([100, 149, 237, 128]); // Cornflower blue

  // Set Mapbox access token
  useEffect(() => {
    if (mapboxToken) {
      mapboxgl.accessToken = mapboxToken;
    } else {
      mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 
        'pk.eyJ1Ijoiam1wYXVsbWFwYm94IiwiYSI6ImNtZHh0ZmR6MjFoaHIyam9vZmJ4Z2x1MDYifQ.gR60szhfKWhTv8MyqynpVA';
    }
  }, [mapboxToken]);

  // Color mapping for wind speeds
  const getWindSpeedColor = (windSpeed) => {
    if (windSpeed < 4) return [135, 206, 235, 200];
    if (windSpeed < 7) return [100, 149, 237, 200];
    if (windSpeed < 11) return [70, 130, 180, 200];
    if (windSpeed < 16) return [25, 25, 112, 200];
    if (windSpeed < 22) return [255, 255, 0, 200];
    if (windSpeed < 28) return [255, 165, 0, 200];
    if (windSpeed < 34) return [255, 69, 0, 200];
    if (windSpeed < 41) return [220, 20, 60, 200];
    if (windSpeed < 48) return [128, 0, 128, 200];
    return [75, 0, 130, 200];
  };

  // Enhanced station data validation and processing with optimized generation
  const finalStationData = useMemo(() => {
    // If external station data is provided, use it
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

      console.log(`Using ${validStations.length} valid external stations out of ${stationData.length} total`);
      
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
    
    // Generate optimized stations from CSV data
    if (csvData.length > 0) {
      console.log('Generating optimized ocean stations from CSV data...');
      const optimizedStations = generateOptimizedStationDataFromCSV(csvData);
      const validatedStations = validateOceanStations(optimizedStations);
      
      // Filter out stations that failed validation
      const activeStations = validatedStations.filter(station => 
        station.validation.isOnWater && 
        station.validation.hasData &&
        station.validation.isActive
      );
      
      console.log(`Generated ${activeStations.length} validated ocean stations from ${csvData.length} CSV rows`);
      
      // Auto-fit to station bounds
      if (activeStations.length > 0 && mapRef.current) {
        const lons = activeStations.map(s => s.coordinates[0]);
        const lats = activeStations.map(s => s.coordinates[1]);
        const bounds = [
          [Math.min(...lons), Math.min(...lats)],
          [Math.max(...lons), Math.max(...lats)]
        ];
        
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.fitBounds(bounds, { 
              padding: 50,
              maxZoom: 10
            });
          }
        }, 1000);
      }
      
      return activeStations;
    }
    
    // Fallback test stations for Gulf of Mexico
    console.log('Using fallback test stations');
    return [
      {
        name: 'Test Station 1 (Gulf)',
        coordinates: [-89.1, 30.3],
        color: [244, 63, 94],
        type: 'test',
        dataPoints: 100,
        validation: { isOnWater: true, hasData: true, isActive: true, dataQuality: 'good' }
      },
      {
        name: 'Test Station 2 (Gulf)',
        coordinates: [-88.8, 30.1], 
        color: [251, 191, 36],
        type: 'test',
        dataPoints: 150,
        validation: { isOnWater: true, hasData: true, isActive: true, dataQuality: 'good' }
      }
    ];
  }, [stationData, csvData]);

  // Generate coordinate grid lines
  const generateGridData = useMemo(() => {
    if (!showGrid) return [];
    
    const gridLines = [];
    
    // Calculate viewport bounds
    const bounds = finalStationData.length > 0 ? {
      minLon: Math.min(...finalStationData.map(s => s.coordinates[0])) - 5,
      maxLon: Math.max(...finalStationData.map(s => s.coordinates[0])) + 5,
      minLat: Math.min(...finalStationData.map(s => s.coordinates[1])) - 5,
      maxLat: Math.max(...finalStationData.map(s => s.coordinates[1])) + 5
    } : {
      minLon: -180, maxLon: 180,
      minLat: -85, maxLat: 85
    };
    
    // Ensure reasonable bounds
    bounds.minLon = Math.max(-180, bounds.minLon);
    bounds.maxLon = Math.min(180, bounds.maxLon);
    bounds.minLat = Math.max(-85, bounds.minLat);
    bounds.maxLat = Math.min(85, bounds.maxLat);
    
    // Generate longitude lines (vertical)
    const lonStart = Math.floor(bounds.minLon / gridSpacing) * gridSpacing;
    const lonEnd = Math.ceil(bounds.maxLon / gridSpacing) * gridSpacing;
    
    for (let lon = lonStart; lon <= lonEnd; lon += gridSpacing) {
      if (lon >= bounds.minLon && lon <= bounds.maxLon) {
        gridLines.push({
          type: 'longitude',
          value: lon,
          sourcePosition: [lon, bounds.minLat],
          targetPosition: [lon, bounds.maxLat],
          color: gridColor
        });
      }
    }
    
    // Generate latitude lines (horizontal)
    const latStart = Math.floor(bounds.minLat / gridSpacing) * gridSpacing;
    const latEnd = Math.ceil(bounds.maxLat / gridSpacing) * gridSpacing;
    
    for (let lat = latStart; lat <= latEnd; lat += gridSpacing) {
      if (lat >= bounds.minLat && lat <= bounds.maxLat) {
        gridLines.push({
          type: 'latitude',
          value: lat,
          sourcePosition: [bounds.minLon, lat],
          targetPosition: [bounds.maxLon, lat],
          color: gridColor
        });
      }
    }
    
    return gridLines;
  }, [showGrid, gridSpacing, gridColor, finalStationData]);

  // Generate synthetic wind data based on current frame and geographic patterns
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
    const gridSpacing = windGridDensity / 111; // Convert km to degrees
    
    // Generate wind vectors on a grid
    for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += gridSpacing) {
      for (let lon = bounds.minLon; lon <= bounds.maxLon; lon += gridSpacing) {
        // Simulate realistic wind patterns
        const timeOffset = currentFrame * windAnimationSpeed;
        
        // Base wind direction (prevailing westerlies)
        let windDirection = 270 + Math.sin((lat - 30) * 0.1) * 30;
        
        // Add temporal variation
        windDirection += Math.sin(timeOffset * 0.1 + lon * 0.02) * 15;
        windDirection += Math.cos(timeOffset * 0.08 + lat * 0.03) * 10;
        
        // Add geographic variation
        const coastalEffect = Math.sin(lon * 0.5) * Math.cos(lat * 0.3) * 20;
        windDirection += coastalEffect;
        
        // Wind speed (knots)
        let windSpeed = 10 + Math.sin(timeOffset * 0.05 + lat * 0.1) * 8;
        windSpeed += Math.cos(timeOffset * 0.03 + lon * 0.08) * 5;
        windSpeed = Math.max(2, windSpeed);
        
        // Add weather system effects
        const weatherSystemEffect = Math.sin(timeOffset * 0.02 + (lat + lon) * 0.1) * 5;
        windSpeed += weatherSystemEffect;
        
        // Convert to vector components
        const windDirectionRad = windDirection * Math.PI / 180;
        const vectorLength = (windSpeed / 30) * windVectorLength * 0.1;
        
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
  
  // START: Process CSV data for heatmap layer
  const heatmapData = useMemo(() => {
    if (!isHeatmapVisible || !csvData || csvData.length === 0) {
      return [];
    }
    console.log('Generating SST Heatmap data from CSV...');
    return generateTemperatureHeatmapData(csvData, { normalizeTemperature: true });
  }, [csvData, isHeatmapVisible]);
  // END: Process CSV data for heatmap layer

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

  // Auto-disable Ocean Base Layer when Wind Particles are enabled
  useEffect(() => {
    if (showWindParticles && showOceanBase) {
      setShowOceanBase(false);
    }
  }, [showWindParticles]);

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

    const startingViewState = stationData.length > 0 || csvData.length > 0 ? viewState : {
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
      bearing: startingViewState.bearing,
      antialias: true
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

    mapRef.current.on('error', (e) => {
      console.error('Map error:', e);
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

  // Generate DeckGL layers focused on oceanography
  const getDeckLayers = () => {
    const layers = [];

    // START: Add SST Heatmap Layer
    if (isHeatmapVisible && heatmapData.length > 0) {
      layers.push(
        new HeatmapLayer({
          id: 'sst-heatmap-layer',
          data: heatmapData,
          getPosition: d => [d[1], d[0]], // Data is [lat, lng], Deck needs [lng, lat]
          getWeight: d => d[2],           // Use normalized intensity from dataService
          radiusPixels: 70,
          intensity: 1.5,
          threshold: 0.05,
          aggregation: 'SUM',
        })
      );
    }
    // END: Add SST Heatmap Layer
    
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
          
          maxRequests: 20
        })
      );
    }

    // Generate coordinate grid layer
    if (showGrid && generateGridData.length > 0) {
      layers.push(
        new LineLayer({
          id: 'coordinate-grid',
          data: generateGridData,
          getSourcePosition: d => d.sourcePosition,
          getTargetPosition: d => d.targetPosition,
          getColor: d => d.color,
          getWidth: d => d.type === 'latitude' && Math.abs(d.value) < 0.001 ? 3 : 1, // Thicker equator line
          widthScale: 1,
          widthMinPixels: 0.5,
          widthMaxPixels: 2,
          opacity: gridOpacity,
          pickable: true,
          autoHighlight: false,
          onHover: ({object, x, y}) => {
            if (object && viewState.zoom > 4) {
              const label = object.type === 'latitude' ? 
                `${Math.abs(object.value)}°${object.value >= 0 ? 'N' : 'S'}` :
                `${Math.abs(object.value)}°${object.value >= 0 ? 'E' : 'W'}`;
              
              setHoveredStation({
                name: `Grid Line`,
                details: `${object.type === 'latitude' ? 'Latitude' : 'Longitude'}: ${label}`,
                x, y,
                isGrid: true
              });
            } else {
              setHoveredStation(null);
            }
          }
        })
      );
    }

    // Wind Direction Layer
    if (showWindLayer && generateWindData.length > 0) {
      // Wind vector arrows
      layers.push(
        new LineLayer({
          id: 'wind-vectors',
          data: generateWindData,
          getSourcePosition: d => d.position,
          getTargetPosition: d => d.vectorEnd,
          getColor: d => d.color,
          getWidth: d => Math.max(1, d.windSpeed / 8),
          widthScale: 1,
          widthMinPixels: 1,
          widthMaxPixels: 4,
          opacity: windOpacity,
          pickable: true,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 150],
          onHover: ({object, x, y}) => {
            if (object && viewState.zoom > 6) {
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

      // Wind arrow heads
      layers.push(
        new ScatterplotLayer({
          id: 'wind-arrow-heads',
          data: generateWindData.filter((_, index) => index % 2 === 0),
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
    
    // Enhanced station markers layer with validation indicators
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
            // Use validation status to modify color
            if (d.validation && !d.validation.isOnWater) {
              return [128, 128, 128, 100]; // Gray for land stations
            }
            
            if (!d.color || !Array.isArray(d.color) || d.color.length < 3) {
              return [255, 255, 255, 180];
            }
            
            // Add alpha based on data quality
            const alpha = d.validation?.dataQuality === 'good' ? 200 : 150;
            return [...d.color, alpha];
          },
          getRadius: d => {
            const baseRadius = 300;
            const dataPointMultiplier = d.dataPoints ? Math.log(d.dataPoints + 1) * 50 : 0;
            // Larger radius for high-quality stations
            const qualityMultiplier = d.validation?.dataQuality === 'good' ? 1.2 : 1.0;
            return (baseRadius + dataPointMultiplier) * qualityMultiplier;
          },
          radiusScale: 1,
          radiusMinPixels: Math.max(2, viewState.zoom / 2),
          radiusMaxPixels: Math.max(8, viewState.zoom * 3),
          pickable: true,
          autoHighlight: false,
          highlightColor: [255, 255, 255, 100],
          onHover: viewState.zoom > 8 ? ({object, x, y}) => {
            if (object) {
              const validationText = object.validation ? 
                `\nData Quality: ${object.validation.dataQuality}\nOn Water: ${object.validation.isOnWater ? 'Yes' : 'No'}` : '';
              
              setHoveredStation({ 
                ...object, 
                x: x, 
                y: y,
                details: `${object.dataPoints} measurements${validationText}`
              });
            } else {
              setHoveredStation(null);
            }
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
    }
    
    // Current vectors layer
    if (showCurrentVectors && timeSeriesData.length > 0 && finalStationData.length > 0) {
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
          color: [74, 222, 128],
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

      {/* Ocean-focused Map Controls */}
      <div className="absolute top-2 md:top-2 left-[140px] md:left-[140px] bg-slate-800/90 border border-slate-600/50 rounded-lg p-2 z-20 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-semibold text-slate-300">Ocean Controls</div>
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
                <option value="mapbox://styles/mapbox/outdoors-v11">Outdoors</option>
                <option value="mapbox://styles/mapbox/satellite-v9">Satellite</option>
                <option value="mapbox://styles/mapbox/dark-v10">Dark</option>
                <option value="mapbox://styles/mapbox/light-v10">Light</option>
                <option value="mapbox://styles/mapbox/streets-v9">Streets</option>
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
                    }
                  }}
                  className="w-full text-xs bg-green-600 hover:bg-green-500 text-slate-200 px-2 py-1 rounded mb-2"
                >
                  🔍 Zoom to Stations
                </button>
              )}
            </div>

            {/* Coordinate Grid Controls */}
            <div className="mb-3 pb-2 border-b border-slate-600">
              <div className="text-xs font-semibold text-slate-300 mb-2">Coordinate Grid</div>

              <div className="flex items-center space-x-2 mb-2">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`w-4 h-4 rounded border ${
                    showGrid 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'bg-transparent border-slate-500'
                  }`}
                >
                  {showGrid && (
                    <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                <span className="text-xs text-slate-400">🌐 Lat/Lon Grid</span>
              </div>

              {showGrid && (
                <div className="ml-4 space-y-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Opacity: {Math.round(gridOpacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={gridOpacity}
                      onChange={(e) => setGridOpacity(parseFloat(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Grid Spacing: {gridSpacing}°
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={gridSpacing}
                      onChange={(e) => setGridSpacing(parseInt(e.target.value))}
                      className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Grid Color</label>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setGridColor([100, 149, 237, 128])}
                        className={`w-6 h-4 rounded border-2 ${
                          JSON.stringify(gridColor) === JSON.stringify([100, 149, 237, 128]) 
                            ? 'border-white' : 'border-slate-500'
                        }`}
                        style={{backgroundColor: 'rgb(100, 149, 237)'}}
                      />
                      <button
                        onClick={() => setGridColor([255, 255, 255, 128])}
                        className={`w-6 h-4 rounded border-2 ${
                          JSON.stringify(gridColor) === JSON.stringify([255, 255, 255, 128]) 
                            ? 'border-white' : 'border-slate-500'
                        }`}
                        style={{backgroundColor: 'rgb(255, 255, 255)'}}
                      />
                      <button
                        onClick={() => setGridColor([255, 255, 0, 128])}
                        className={`w-6 h-4 rounded border-2 ${
                          JSON.stringify(gridColor) === JSON.stringify([255, 255, 0, 128]) 
                            ? 'border-white' : 'border-slate-500'
                        }`}
                        style={{backgroundColor: 'rgb(255, 255, 0)'}}
                      />
                      <button
                        onClick={() => setGridColor([255, 100, 100, 128])}
                        className={`w-6 h-4 rounded border-2 ${
                          JSON.stringify(gridColor) === JSON.stringify([255, 100, 100, 128]) 
                            ? 'border-white' : 'border-slate-500'
                        }`}
                        style={{backgroundColor: 'rgb(255, 100, 100)'}}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Wind Layer Controls */}
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

              {/* Ocean Base Layer */}
              <div className="mb-2">
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={() => setShowOceanBase(!showOceanBase)}
                    className={`w-4 h-4 rounded border ${
                      showOceanBase 
                        ? 'bg-indigo-500 border-indigo-500' 
                        : 'bg-transparent border-slate-500'
                    }`}
                  >
                    {showOceanBase && (
                      <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs text-slate-400">🗺️ Ocean Base Layer</span>
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

              {/* Current Vectors */}
              <div className="mb-3">
                <div className="flex items-center space-x-2 mb-2">
                  <button
                    onClick={() => setShowCurrentVectors(!showCurrentVectors)}
                    className={`w-4 h-4 rounded border ${
                      showCurrentVectors 
                        ? 'bg-cyan-500 border-cyan-500' 
                        : 'bg-transparent border-slate-500'
                    }`}
                  >
                    {showCurrentVectors && (
                      <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs text-slate-400">🌊 Ocean Current Vectors</span>
                </div>
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
          {isHeatmapVisible && <span className="text-red-300">🌡️ SST Heatmap </span>}
          {showWindParticles && <span className="text-emerald-300">🌪️ Live Wind </span>}
          {showWindLayer && <span className="text-cyan-300">🌬️ Wind Vectors </span>}
          {showCurrentVectors && <span className="text-cyan-300">🌊 Currents </span>}
          {showOceanBase && <span className="text-indigo-300">🗺️ Ocean Base </span>}
          {showGrid && <span className="text-blue-300">🌐 Grid </span>}
        </div>
        {spinEnabled && (
          <div className="text-xs text-cyan-300 mt-1">
            🌍 Globe Auto-Rotating
          </div>
        )}
      </div>

      {/* Wind Legend */}
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

      {/* Enhanced Ocean Data Quality Indicator */}
      {finalStationData.length > 0 && (
        <div className="absolute bottom-16 right-2 bg-blue-800/80 border border-blue-500/30 rounded-lg p-2 z-20">
          <div className="text-blue-300 text-xs font-semibold">Ocean Station Data</div>
          <div className="text-blue-200 text-xs">
            {finalStationData.length} monitoring stations
          </div>
          <div className="text-blue-200 text-xs">
            Total: {finalStationData.reduce((sum, s) => sum + (s.dataPoints || 0), 0)} measurements
          </div>
          {finalStationData.some(s => s.validation) && (
            <div className="text-blue-200 text-xs mt-1">
              Validated: {finalStationData.filter(s => s.validation?.isOnWater).length} ocean stations
            </div>
          )}
          {finalStationData.length > 0 && (
            <div className="text-blue-200 text-xs mt-1 font-mono">
              Coverage: {Math.min(...finalStationData.map(s => s.coordinates[1])).toFixed(2)}°N to {Math.max(...finalStationData.map(s => s.coordinates[1])).toFixed(2)}°N
              <br />
              Span: {Math.min(...finalStationData.map(s => s.coordinates[0])).toFixed(2)}°W to {Math.max(...finalStationData.map(s => s.coordinates[0])).toFixed(2)}°W
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