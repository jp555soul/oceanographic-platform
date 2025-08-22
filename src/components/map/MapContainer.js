import React, { useRef, useEffect, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, LineLayer, IconLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { Thermometer } from 'lucide-react';
import StationTooltip from './StationTooltip';
import SelectedStationPanel from './SelectedStationPanel';
import CurrentsLayer from './CurrentsLayer';
import { generateTemperatureHeatmapData } from '../../services/dataService';
import arrowIcon from '../../assets/icons/arrow.svg';
import 'mapbox-gl/dist/mapbox-gl.css';

const MapContainer = ({
  stationData = [],
  timeSeriesData = [],
  rawData = [],
  currentsGeoJSON = { type: 'FeatureCollection', features: [] },
  totalFrames = 0,
  currentFrame = 0,
  selectedDepth = 0,
  selectedArea = '',
  selectedParameter = 'Current Speed',
  isSstHeatmapVisible = false,
  holoOceanPOV = { x: 0, y: 0, depth: 0 },
  onPOVChange,
  onStationSelect,
  onEnvironmentUpdate,
  currentDate = '',
  currentTime = '',
  mapboxToken,
  isOutputCollapsed = false,
  initialViewState = {
    longitude: -89.0,
    latitude: 30.1,
    zoom: 8,
    pitch: 0,
    bearing: 0
  },
  // Layer props
  mapLayerVisibility = {
    oceanCurrents: false,
    temperature: false,
    stations: true,
  },
  currentsVectorScale = 0.009,
  currentsColorBy = 'speed'
}) => {
  const mapRef = useRef();
  const mapContainerRef = useRef();
  const currentMapStyleRef = useRef('arcgis-ocean'); // Track current map style
  
  const [mapContainerReady, setMapContainerReady] = useState(false);
  const [viewState, setViewState] = useState(initialViewState);
  const [hoveredStation, setHoveredStation] = useState(null);
  const [selectedStation, setSelectedStation] = useState(null);
  
  // Ocean-focused controls with default settings - ArcGIS Ocean as default
  const [userInteracting, setUserInteracting] = useState(false);
  const [spinEnabled, setSpinEnabled] = useState(false);
  const [mapStyle, setMapStyle] = useState('arcgis-ocean');
  const [showMapControls, setShowMapControls] = useState(false);

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
  const [showGrid, setShowGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(1.0);
  const [gridSpacing, setGridSpacing] = useState(1);
  const [gridColor, setGridColor] = useState([100, 149, 237, 128]); // Cornflower blue

  // Data availability tooltip state
  const [coordinateHover, setCoordinateHover] = useState(null);

  // Station data processing is now simplified to only validate incoming props.
  const finalStationData = useMemo(() => {
    if (stationData.length > 0) {
      const validStations = stationData.filter(station => {
        if (!station.coordinates || station.coordinates.length !== 2) return false;
        const [lon, lat] = station.coordinates;
        return lon !== null && lat !== null && !isNaN(lon) && !isNaN(lat) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
      });

      if (validStations.length > 0 && mapRef.current) {
        const lons = validStations.map(s => s.coordinates[0]);
        const lats = validStations.map(s => s.coordinates[1]);
        const bounds = [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]];
        const currentCenter = mapRef.current.getCenter();
        const centerLon = (bounds[0][0] + bounds[1][0]) / 2;
        const centerLat = (bounds[0][1] + bounds[1][1]) / 2;
        const distance = Math.sqrt(Math.pow(currentCenter.lng - centerLon, 2) + Math.pow(currentCenter.lat - centerLat, 2));
        
        if (distance > 1) {
          setTimeout(() => {
            if (mapRef.current) mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
          }, 1000);
        }
      }
      return validStations;
    }
    
    console.log('Using fallback test stations');
    return [
      { name: 'Test Station 1 (Gulf)', coordinates: [-89.1, 30.3], color: [244, 63, 94], type: 'test', dataPoints: 100 },
      { name: 'Test Station 2 (Gulf)', coordinates: [-88.8, 30.1], color: [251, 191, 36], type: 'test', dataPoints: 150 }
    ];
  }, [stationData]);

  // Heatmap data generation now uses the full rawData prop.
  const heatmapData = useMemo(() => {
    if (!isSstHeatmapVisible || !rawData || rawData.length === 0) return [];
    return generateTemperatureHeatmapData(rawData, { 
      normalizeTemperature: true,
      depthFilter: selectedDepth 
    });
  }, [rawData, isSstHeatmapVisible, selectedDepth]);

  // Function to check data availability at coordinates
  const checkDataAvailability = useMemo(() => {
    return (longitude, latitude) => {
      const availableData = [];
      const searchRadius = 0.1; // degrees
      
      // Check station data
      const nearbyStations = finalStationData.filter(station => {
        if (!station.coordinates) return false;
        const [stationLon, stationLat] = station.coordinates;
        const distance = Math.sqrt(
          Math.pow(longitude - stationLon, 2) + Math.pow(latitude - stationLat, 2)
        );
        return distance <= searchRadius;
      });
      
      if (nearbyStations.length > 0) {
        const totalDataPoints = nearbyStations.reduce((sum, station) => sum + (station.dataPoints || 0), 0);
        availableData.push(`${nearbyStations.length} Station${nearbyStations.length > 1 ? 's' : ''} (${totalDataPoints} measurements)`);
      }
      
      // Check raw data availability with detailed measurements
      if (rawData && rawData.length > 0) {
        const nearbyRawData = rawData.filter(data => {
          if (!data.lon || !data.lat) return false;
          const distance = Math.sqrt(
            Math.pow(longitude - data.lon, 2) + Math.pow(latitude - data.lat, 2)
          );
          return distance <= searchRadius;
        });
        
        if (nearbyRawData.length > 0) {
          // Get latest measurements
          const latestData = nearbyRawData
            .filter(d => d.time)
            .sort((a, b) => new Date(b.time) - new Date(a.time))[0];
          
          if (latestData) {
            if (latestData.nspeed !== null && latestData.nspeed !== undefined) {
              availableData.push(`Current Speed: ${latestData.nspeed.toFixed(2)} m/s`);
            }
            if (latestData.direction !== null && latestData.direction !== undefined) {
              availableData.push(`Current Direction: ${latestData.direction.toFixed(0)}°`);
            }
            if (latestData.temp !== null && latestData.temp !== undefined) {
              availableData.push(`Temperature: ${latestData.temp.toFixed(1)}°C`);
            }
            if (latestData.salinity !== null && latestData.salinity !== undefined) {
              availableData.push(`Salinity: ${latestData.salinity.toFixed(1)} PSU`);
            }
            if (latestData.ssh !== null && latestData.ssh !== undefined) {
              availableData.push(`Sea Surface Height: ${latestData.ssh.toFixed(2)} m`);
            }
            if (latestData.pressure_dbars !== null && latestData.pressure_dbars !== undefined) {
              availableData.push(`Pressure: ${latestData.pressure_dbars.toFixed(1)} dbar`);
            }
            if (latestData.depth !== null && latestData.depth !== undefined) {
              availableData.push(`Depth: ${latestData.depth.toFixed(0)} ft`);
            }
            if (latestData.time) {
              const timeStr = new Date(latestData.time).toLocaleString();
              availableData.push(`Latest: ${timeStr}`);
            }
          } else {
            availableData.push(`Ocean Data (${nearbyRawData.length} measurements)`);
          }
        }
      }
      
      // Check currents vectors
      if (currentsGeoJSON && currentsGeoJSON.features && currentsGeoJSON.features.length > 0) {
        const nearbyCurrents = currentsGeoJSON.features.filter(feature => {
          if (feature.geometry.type === 'Point') {
            const [pointLon, pointLat] = feature.geometry.coordinates;
            const distance = Math.sqrt(
              Math.pow(longitude - pointLon, 2) + Math.pow(latitude - pointLat, 2)
            );
            return distance <= searchRadius;
          }
          return false;
        });
        
        if (nearbyCurrents.length > 0) {
          const currentFeature = nearbyCurrents[0];
          if (currentFeature.properties && currentFeature.properties.direction !== undefined) {
            availableData.push(`Vector Direction: ${currentFeature.properties.direction.toFixed(0)}°`);
          }
        }
      }
      
      // Check temperature heatmap data
      if (isSstHeatmapVisible && heatmapData.length > 0) {
        const nearbyTempData = heatmapData.filter(point => {
          const [pointLat, pointLon] = point; // Note: heatmap data is [lat, lon]
          const distance = Math.sqrt(
            Math.pow(longitude - pointLon, 2) + Math.pow(latitude - pointLat, 2)
          );
          return distance <= searchRadius;
        });
        
        if (nearbyTempData.length > 0) {
          const avgIntensity = nearbyTempData.reduce((sum, point) => sum + point[2], 0) / nearbyTempData.length;
          availableData.push(`Temperature Heatmap: ${(avgIntensity * 100).toFixed(0)}% intensity`);
        }
      }
      
      // Add time series info if available
      if (timeSeriesData && timeSeriesData.length > 0) {
        availableData.push(`Time Series: ${timeSeriesData.length} time steps`);
      }
      
      return availableData;
    };
  }, [finalStationData, rawData, currentsGeoJSON, heatmapData, timeSeriesData, isSstHeatmapVisible]);

  // Set Mapbox access token
  useEffect(() => {
    if (mapboxToken) {
      mapboxgl.accessToken = mapboxToken;
    } else {
      mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN || 
        'pk.eyJ1Ijoiam1wYXVsbWFwYm94IiwiYSI6ImNtZHh0ZmR6MjFoaHIyam9vZmJ4Z2x1MDYifQ.gR60szhfKWhTv8MyqynpVA';
    }
  }, [mapboxToken]);

  // Handle map resize when OutputModule expands/collapses
  useEffect(() => {
    if (mapRef.current) {
      // Wait for CSS transition to complete (300ms from App.js) plus small buffer
      const timeoutId = setTimeout(() => {
        mapRef.current.resize();
      }, 350);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isOutputCollapsed]);

  // Helper function to get the appropriate base style for ArcGIS ocean layer
  const getBaseStyleForOcean = () => {
    return 'mapbox://styles/mapbox/light-v10'; // Use light style as base for ocean layer
  };

  // Handle map style changes
  const handleMapStyleChange = (newStyle) => {
    if (!mapRef.current) return;
    
    setMapStyle(newStyle);
    currentMapStyleRef.current = newStyle; // Update ref immediately
    
    if (newStyle === 'arcgis-ocean') {
      // For ArcGIS ocean style, use light base and show ocean layer
      mapRef.current.setStyle(getBaseStyleForOcean());
    } else {
      // For other styles, set the style (ocean layer won't be added)
      mapRef.current.setStyle(newStyle);
    }
  };

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

  // Generate coordinate grid lines
  const generateGridData = useMemo(() => {
    if (!showGrid) return [];
    
    const gridLines = [];
    const bounds = finalStationData.length > 0 ? {
      minLon: Math.min(...finalStationData.map(s => s.coordinates[0])) - 5,
      maxLon: Math.max(...finalStationData.map(s => s.coordinates[0])) + 5,
      minLat: Math.min(...finalStationData.map(s => s.coordinates[1])) - 5,
      maxLat: Math.max(...finalStationData.map(s => s.coordinates[1])) + 5
    } : { minLon: -180, maxLon: 180, minLat: -85, maxLat: 85 };
    
    bounds.minLon = Math.max(-180, bounds.minLon);
    bounds.maxLon = Math.min(180, bounds.maxLon);
    bounds.minLat = Math.max(-85, bounds.minLat);
    bounds.maxLat = Math.min(85, bounds.maxLat);
    
    const lonStart = Math.floor(bounds.minLon / gridSpacing) * gridSpacing;
    const lonEnd = Math.ceil(bounds.maxLon / gridSpacing) * gridSpacing;
    
    for (let lon = lonStart; lon <= lonEnd; lon += gridSpacing) {
      if (lon >= bounds.minLon && lon <= bounds.maxLon) {
        gridLines.push({ type: 'longitude', value: lon, sourcePosition: [lon, bounds.minLat], targetPosition: [lon, bounds.maxLat], color: gridColor });
      }
    }
    
    const latStart = Math.floor(bounds.minLat / gridSpacing) * gridSpacing;
    const latEnd = Math.ceil(bounds.maxLat / gridSpacing) * gridSpacing;
    
    for (let lat = latStart; lat <= latEnd; lat += gridSpacing) {
      if (lat >= bounds.minLat && lat <= bounds.maxLat) {
        gridLines.push({ type: 'latitude', value: lat, sourcePosition: [bounds.minLon, lat], targetPosition: [bounds.maxLon, lat], color: gridColor });
      }
    }
    return gridLines;
  }, [showGrid, gridSpacing, gridColor, finalStationData]);

  // Generate synthetic wind data
  const generateWindData = useMemo(() => {
    if (!timeSeriesData.length) return [];
    
    const currentData = timeSeriesData[currentFrame % timeSeriesData.length];
    const windData = [];
    const bounds = finalStationData.length > 0 ? {
      minLon: Math.min(...finalStationData.map(s => s.coordinates[0])) - 1,
      maxLon: Math.max(...finalStationData.map(s => s.coordinates[0])) + 1,
      minLat: Math.min(...finalStationData.map(s => s.coordinates[1])) - 1,
      maxLat: Math.max(...finalStationData.map(s => s.coordinates[1])) + 1
    } : { minLon: -95, maxLon: -80, minLat: 25, maxLat: 35 };
    
    const gridSpacing = windGridDensity / 111;
    
    for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += gridSpacing) {
      for (let lon = bounds.minLon; lon <= bounds.maxLon; lon += gridSpacing) {
        const timeOffset = currentFrame * windAnimationSpeed;
        let windDirection = 270 + Math.sin((lat - 30) * 0.1) * 30;
        windDirection += Math.sin(timeOffset * 0.1 + lon * 0.02) * 15;
        windDirection += Math.cos(timeOffset * 0.08 + lat * 0.03) * 10;
        const coastalEffect = Math.sin(lon * 0.5) * Math.cos(lat * 0.3) * 20;
        windDirection += coastalEffect;
        
        let windSpeed = 10 + Math.sin(timeOffset * 0.05 + lat * 0.1) * 8;
        windSpeed += Math.cos(timeOffset * 0.03 + lon * 0.08) * 5;
        windSpeed = Math.max(2, windSpeed);
        
        const weatherSystemEffect = Math.sin(timeOffset * 0.02 + (lat + lon) * 0.1) * 5;
        windSpeed += weatherSystemEffect;
        
        const windDirectionRad = windDirection * Math.PI / 180;
        const vectorLength = (windSpeed / 30) * windVectorLength * 0.1;
        
        windData.push({
          position: [lon, lat], windSpeed: windSpeed, windDirection: windDirection,
          vectorEnd: [lon + Math.cos(windDirectionRad) * vectorLength, lat + Math.sin(windDirectionRad) * vectorLength],
          color: getWindSpeedColor(windSpeed), timestamp: timeOffset
        });
      }
    }
    return windData;
  }, [currentFrame, timeSeriesData, windVectorLength, windAnimationSpeed, windGridDensity, finalStationData]);

  useEffect(() => {
    if (mapRef.current && mapRef.current.getLayer('wind-particles-layer')) {
      mapRef.current.setLayoutProperty('wind-particles-layer', 'visibility', showWindParticles ? 'visible' : 'none');
      if (showWindParticles) {
        mapRef.current.setPaintProperty('wind-particles-layer', 'raster-particle-speed-factor', particleSpeed);
        mapRef.current.setPaintProperty('wind-particles-layer', 'raster-particle-fade-opacity-factor', particleFade);
        mapRef.current.setPaintProperty('wind-particles-layer', 'raster-particle-reset-rate-factor', particleReset);
        mapRef.current.setPaintProperty('wind-particles-layer', 'raster-particle-count', particleCount);
      }
    }
  }, [showWindParticles, particleSpeed, particleFade, particleReset, particleCount]);

  useEffect(() => {
    if (showWindParticles) {
      // Logic to handle potential conflicts can go here if needed
    }
  }, [showWindParticles]);

  const spinGlobe = () => {
    if (!mapRef.current) return;
    const zoom = mapRef.current.getZoom();
    const secondsPerRevolution = 240;
    const maxSpinZoom = 5;
    const slowSpinZoom = 3;
    
    if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
      let distancePerSecond = 360 / secondsPerRevolution;
      if (zoom > slowSpinZoom) {
        distancePerSecond *= (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
      }
      const center = mapRef.current.getCenter();
      center.lng -= distancePerSecond;
      mapRef.current.easeTo({ center, duration: 1000, easing: (n) => n });
    }
  };

  useEffect(() => {
    if (!mapContainerReady || !mapContainerRef.current || mapRef.current) return;
    const startingViewState = stationData.length > 0 || rawData.length > 0 ? viewState : {
      longitude: 0, latitude: 20, zoom: 1.5, pitch: 0, bearing: 0
    };
    
    // Set initial style based on mapStyle state
    const initialStyle = mapStyle === 'arcgis-ocean' ? getBaseStyleForOcean() : mapStyle;
    
    mapRef.current = new mapboxgl.Map({
      container: mapContainerRef.current, 
      style: initialStyle, 
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

      // Only add ocean layer if we're using the arcgis-ocean style
      if (currentMapStyleRef.current === 'arcgis-ocean') {
        const oceanSourceId = 'arcgis-ocean-source';
        const oceanLayerId = 'arcgis-ocean-layer';

        if (!mapRef.current.getSource(oceanSourceId)) {
          mapRef.current.addSource(oceanSourceId, {
            'type': 'raster',
            'tiles': [
              'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}'
            ],
            'tileSize': 256
          });
        }

        const layers = mapRef.current.getStyle().layers;
        let firstSymbolId;
        for (const layer of layers) {
          if (layer.type === 'symbol') {
            firstSymbolId = layer.id;
            break;
          }
        }

        if (!mapRef.current.getLayer(oceanLayerId)) {
          mapRef.current.addLayer({
            'id': oceanLayerId,
            'type': 'raster',
            'source': oceanSourceId,
            'paint': {
              'raster-opacity': 1.0
            },
            'layout': {
              'visibility': 'visible'
            }
          }, firstSymbolId);
        }
      }
      
      if (!mapRef.current.getSource('wind-particles-source')) {
        mapRef.current.addSource('wind-particles-source', {
          type: 'raster-array', url: 'mapbox://rasterarrayexamples.gfs-winds', tileSize: 512
        });
      }
      
      if (!mapRef.current.getLayer('wind-particles-layer')) {
        mapRef.current.addLayer({
          id: 'wind-particles-layer', type: 'raster-particle', source: 'wind-particles-source',
          'source-layer': '10winds', layout: { visibility: showWindParticles ? 'visible' : 'none' },
          paint: {
            'raster-particle-speed-factor': particleSpeed, 'raster-particle-fade-opacity-factor': particleFade,
            'raster-particle-reset-rate-factor': particleReset, 'raster-particle-count': particleCount,
            'raster-particle-max-speed': 40, 'raster-particle-color': [
              'interpolate', ['linear'], ['raster-particle-speed'],
              1.5, 'rgba(134,163,171,256)', 2.5, 'rgba(126,152,188,256)',
              4.12, 'rgba(110,143,208,256)', 6.17, 'rgba(15,147,167,256)',
              9.26, 'rgba(57,163,57,256)', 11.83, 'rgba(194,134,62,256)',
              14.92, 'rgba(200,66,13,256)', 18.0, 'rgba(210,0,50,256)',
              21.6, 'rgba(175,80,136,256)', 25.21, 'rgba(117,74,147,256)',
              29.32, 'rgba(68,105,141,256)', 33.44, 'rgba(194,251,119,256)',
              43.72, 'rgba(241,255,109,256)', 50.41, 'rgba(256,256,256,256)',
              59.16, 'rgba(0,256,256,256)', 69.44, 'rgba(256,37,256,256)'
            ]
          }
        });
      }
    });
    mapRef.current.on('error', (e) => console.error('Map error:', e));
    mapRef.current.on('mousedown', () => setUserInteracting(true));
    mapRef.current.on('dragstart', () => setUserInteracting(true));
    mapRef.current.on('moveend', () => {
      if (mapRef.current) {
        const { lng, lat } = mapRef.current.getCenter();
        setViewState({
          longitude: lng, latitude: lat, zoom: mapRef.current.getZoom(),
          pitch: mapRef.current.getPitch(), bearing: mapRef.current.getBearing()
        });
      }
      setTimeout(() => { setUserInteracting(false); spinGlobe(); }, 1000);
    });
    if (spinEnabled) spinGlobe();
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [mapContainerReady, spinEnabled]);

  const getDeckLayers = () => {
    const layers = [];

    if (mapLayerVisibility.temperature && isSstHeatmapVisible && heatmapData.length > 0) {
      layers.push(new HeatmapLayer({
        id: 'sst-heatmap-layer', data: heatmapData, getPosition: d => [d[1], d[0]], getWeight: d => d[2],
        radiusPixels: 70, intensity: 1.5, threshold: 0.05, aggregation: 'SUM'
      }));
    }

    if (showGrid && generateGridData.length > 0) {
      layers.push(new LineLayer({
        id: 'coordinate-grid', data: generateGridData, getSourcePosition: d => d.sourcePosition,
        getTargetPosition: d => d.targetPosition, getColor: d => d.color,
        getWidth: d => d.type === 'latitude' && Math.abs(d.value) < 0.001 ? 3 : 1,
        widthScale: 1, widthMinPixels: 0.5, widthMaxPixels: 2, opacity: gridOpacity,
        pickable: true, autoHighlight: false,
        onHover: ({object, x, y}) => {
          if (object && viewState.zoom > 4) {
            const label = object.type === 'latitude' ? `${Math.abs(object.value)}Â°${object.value >= 0 ? 'N' : 'S'}` : `${Math.abs(object.value)}Â°${object.value >= 0 ? 'E' : 'W'}`;
            setHoveredStation({ name: `Grid Line`, details: `${object.type === 'latitude' ? 'Latitude' : 'Longitude'}: ${label}`, x, y, isGrid: true });
          } else setHoveredStation(null);
        }
      }));
    }

    if (showWindLayer && generateWindData.length > 0) {
      layers.push(
        new LineLayer({
          id: 'wind-vectors', data: generateWindData, getSourcePosition: d => d.position, getTargetPosition: d => d.vectorEnd,
          getColor: d => d.color, getWidth: d => Math.max(1, d.windSpeed / 8),
          widthScale: 1, widthMinPixels: 1, widthMaxPixels: 4, opacity: windOpacity,
          pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 150],
          onHover: ({object, x, y}) => {
            if (object && viewState.zoom > 6) setHoveredStation({
              name: `Wind Data`, details: `Speed: ${object.windSpeed.toFixed(1)} knots\nDirection: ${object.windDirection.toFixed(0)}Â°`, x, y, isWind: true
            }); else setHoveredStation(null);
          }
        }),
        new ScatterplotLayer({
          id: 'wind-arrow-heads', data: generateWindData.filter((_, index) => index % 2 === 0),
          getPosition: d => d.vectorEnd, getFillColor: d => d.color, getRadius: d => Math.max(100, d.windSpeed * 20),
          radiusScale: 1, radiusMinPixels: 2, radiusMaxPixels: 6, opacity: windOpacity * 0.8, pickable: false
        })
      );
    }
    
    // Stations layer is no longer rendered
    /*
    if (mapLayerVisibility.stations && finalStationData.length > 0) {
      layers.push(new ScatterplotLayer({
        id: 'stations', data: finalStationData, getPosition: d => d.coordinates || [0, 0],
        getFillColor: d => {
          const alpha = d.validation?.dataQuality === 'good' ? 200 : 150;
          return [...(d.color || [255, 140, 0]), alpha];
        },
        getRadius: d => (d.dataPoints ? Math.log(d.dataPoints + 1) * 50 : 300),
        radiusScale: 1, radiusMinPixels: Math.max(2, viewState.zoom / 2), radiusMaxPixels: Math.max(8, viewState.zoom * 3),
        pickable: true, autoHighlight: false, highlightColor: [255, 255, 255, 100],
        onHover: viewState.zoom > 8 ? ({object, x, y}) => object ? setHoveredStation({ ...object, x, y, details: `${object.dataPoints} measurements` }) : setHoveredStation(null) : null,
        onClick: ({object}) => {
          if (object) {
            const [lng, lat] = object.coordinates;
            setSelectedStation(object);
            onStationSelect?.(object);
            if (mapRef.current) mapRef.current.jumpTo({ center: [lng, lat], zoom: Math.max(mapRef.current.getZoom(), 10) });
            if (onPOVChange) {
              const x = ((lng + 89.2) / 0.4) * 100, y = ((lat - 30.0) / 0.4) * 100;
              onPOVChange({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)), depth: selectedDepth });
            }
          }
        }
      }));
    }
    */
    
    layers.push(new ScatterplotLayer({
      id: 'pov-indicator', data: [{ coordinates: [-89.2 + (holoOceanPOV.x / 100) * 0.4, 30.0 + (holoOceanPOV.y / 100) * 0.4], color: [74, 222, 128], name: 'HoloOcean Viewpoint' }],
      getPosition: d => d.coordinates, getFillColor: d => d.color, getRadius: 1500,
      radiusMinPixels: 8, radiusMaxPixels: 15, pickable: true, autoHighlight: true, highlightColor: [255, 255, 255, 150],
      onHover: ({object, x, y}) => object ? setHoveredStation({ name: 'HoloOcean POV', details: `Pos: (${holoOceanPOV.x.toFixed(1)}, ${holoOceanPOV.y.toFixed(1)}) Depth: ${selectedDepth}ft`, x, y, isPOV: true }) : setHoveredStation(null)
    }));
    return layers;
  };

  // Handle coordinate hover to show data availability
  const handleCoordinateHover = (info) => {
    if (!info.coordinate) {
      setCoordinateHover(null);
      return;
    }

    // Only show coordinate tooltip if not hovering over specific objects
    if (info.object || info.layer?.id?.includes('wind') || info.layer?.id?.includes('grid') || info.layer?.id?.includes('pov')) {
      setCoordinateHover(null);
      return;
    }

    const [longitude, latitude] = info.coordinate;
    const availableData = checkDataAvailability(longitude, latitude);
    
    if (availableData.length > 0 && viewState.zoom > 6) {
      setCoordinateHover({
        name: `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`,
        details: `Available data:\n${availableData.join('\n')}`,
        x: info.x,
        y: info.y,
        isCoordinate: true,
        longitude,
        latitude
      });
    } else {
      setCoordinateHover(null);
    }
  };

  // Determine which tooltip to show
  const activeTooltip = hoveredStation || coordinateHover;

  return (
    <div className="relative w-full h-full">
      <div ref={el => { mapContainerRef.current = el; if (el && !mapContainerReady) setMapContainerReady(true); }} className="absolute inset-0 w-full h-full" />
      
      {/* CurrentsLayer Integration */}
      {mapRef.current && (
        <CurrentsLayer
          map={mapRef.current}
          data={rawData}
          isVisible={mapLayerVisibility.oceanCurrents}
          vectorScale={currentsVectorScale}
          colorBy={currentsColorBy}
          depthFilter={selectedDepth}
          displayParameter={selectedParameter}
          onError={(error) => console.error('Currents layer error:', error)}
        />
      )}
      
      {mapContainerReady && <DeckGL 
        viewState={viewState} 
        onViewStateChange={({viewState: vs}) => { 
          setViewState(vs); 
          if (mapRef.current) mapRef.current.jumpTo({ 
            center: [vs.longitude, vs.latitude], 
            zoom: vs.zoom, 
            pitch: vs.pitch, 
            bearing: vs.bearing 
          }); 
        }} 
        controller={true} 
        layers={getDeckLayers()} 
        onHover={handleCoordinateHover}
        onClick={(info) => { 
          if (!info.object && info.coordinate) onPOVChange?.({ 
            x: ((info.coordinate[0] + 89.2) / 0.4) * 100, 
            y: ((info.coordinate[1] - 30.0) / 0.4) * 100, 
            depth: selectedDepth 
          }); 
        }} 
        className="absolute inset-0 w-full h-full z-10" 
      />}

      <div className="absolute top-2 md:top-2 left-[160px] md:left-[160px] bg-slate-800/90 border border-slate-600/50 rounded-lg p-2 z-20 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-semibold text-slate-300">Global Controls</div>
          <button onClick={() => setShowMapControls(!showMapControls)} className="text-slate-400 hover:text-slate-200">{showMapControls ? 'âˆ':'+'}</button>
        </div>
        
        {showMapControls && (
          <>
            <div className="mb-3">
              <label className="text-xs text-slate-400 block mb-1">Map Style</label>
              <select value={mapStyle} onChange={(e) => handleMapStyleChange(e.target.value)} className="w-full text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-200">
                <option value="arcgis-ocean">ðŸŒŠ Ocean (ArcGIS)</option>
                <option value="mapbox://styles/mapbox/outdoors-v11">ðŸ—ºï¸ Outdoors</option>
                <option value="mapbox://styles/mapbox/satellite-v9">ðŸ›°ï¸ Satellite</option>
                <option value="mapbox://styles/mapbox/dark-v10">ðŸŒ™ Dark</option>
                <option value="mapbox://styles/mapbox/light-v10">â˜€ï¸ Light</option>
                <option value="mapbox://styles/mapbox/streets-v9">ðŸ™ï¸ Streets</option>
              </select>
            </div>
            <div className="mb-3 pb-2 border-b border-slate-600">
              <div className="text-xs font-semibold text-slate-300 mb-2">Globe Controls</div>
              <div className="flex items-center space-x-2 mb-2">
                <button onClick={() => { setSpinEnabled(!spinEnabled); if (!spinEnabled) spinGlobe(); }} className={`w-4 h-4 rounded border ${spinEnabled ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-slate-500'}`}>{spinEnabled && <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}</button>
                <span className="text-xs text-slate-400">Auto Rotate Globe</span>
              </div>
              <button onClick={() => mapRef.current?.easeTo({ center: [0, 20], zoom: 1.5, pitch: 0, bearing: 0, duration: 2000 })} className="w-full text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 px-2 py-1 rounded mb-2">ðŸŒ Global View</button>
            </div>
            <div className="mb-3 pb-2 border-b border-slate-600">
              <div className="text-xs font-semibold text-slate-300 mb-2">Coordinate Grid</div>
              <div className="flex items-center space-x-2 mb-2">
                <button onClick={() => setShowGrid(!showGrid)} className={`w-4 h-4 rounded border ${showGrid ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-slate-500'}`}>{showGrid && <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}</button>
                <span className="text-xs text-slate-400">ðŸŒ Lat/Lon Grid</span>
              </div>
              {showGrid && <div className="ml-4 space-y-2"><div><label className="text-xs text-slate-400 block mb-1">Opacity: {Math.round(gridOpacity * 100)}%</label><input type="range" min="0.1" max="1" step="0.1" value={gridOpacity} onChange={(e) => setGridOpacity(parseFloat(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"/></div><div><label className="text-xs text-slate-400 block mb-1">Grid Spacing: {gridSpacing}Â°</label><input type="range" min="1" max="30" step="1" value={gridSpacing} onChange={(e) => setGridSpacing(parseInt(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"/></div></div>}
            </div>
            <div className="mb-3 pb-2 border-b border-slate-600">
              <div className="text-xs font-semibold text-slate-300 mb-2">Wind Layers</div>
              <div className="flex items-center space-x-2 mb-2"><button onClick={() => setShowWindParticles(!showWindParticles)} className={`w-4 h-4 rounded border ${showWindParticles ? 'bg-emerald-500 border-emerald-500' : 'bg-transparent border-slate-500'}`}>{showWindParticles && <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}</button><span className="text-xs text-slate-400">ðŸŒªï¸ Wind Particles (Live)</span></div>
              {showWindParticles && <div className="ml-4 space-y-2 mb-3"><div><label className="text-xs text-slate-400 block mb-1">Particles: {particleCount}</label><input type="range" min="1000" max="8000" step="500" value={particleCount} onChange={(e) => setParticleCount(parseInt(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"/></div><div><label className="text-xs text-slate-400 block mb-1">Speed: {particleSpeed.toFixed(1)}x</label><input type="range" min="0.1" max="1.0" step="0.1" value={particleSpeed} onChange={(e) => setParticleSpeed(parseFloat(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"/></div></div>}
              <div className="flex items-center space-x-2 mb-2"><button onClick={() => setShowWindLayer(!showWindLayer)} className={`w-4 h-4 rounded border ${showWindLayer ? 'bg-cyan-500 border-cyan-500' : 'bg-transparent border-slate-500'}`}>{showWindLayer && <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}</button><span className="text-xs text-slate-400">ðŸŒ¬ï¸ Wind Vectors (Synthetic)</span></div>
              {showWindLayer && <div className="ml-4 space-y-2"><div><label className="text-xs text-slate-400 block mb-1">Opacity: {Math.round(windOpacity * 100)}%</label><input type="range" min="0" max="1" step="0.1" value={windOpacity} onChange={(e) => setWindOpacity(parseFloat(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"/></div><div><label className="text-xs text-slate-400 block mb-1">Vector Size: {windVectorLength.toFixed(1)}x</label><input type="range" min="0.5" max="3" step="0.1" value={windVectorLength} onChange={(e) => setWindVectorLength(parseFloat(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"/></div></div>}
            </div>
          </>
        )}
      </div>

      <div className="absolute top-2 md:top-4 right-9 md:right-11 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none z-20">
        <div className="text-xs md:text-sm font-mono">Frame: {currentFrame + 1}/{totalFrames > 0 ? totalFrames : 24}</div>
        <div className="text-xs text-slate-400">{selectedArea}</div>
        {currentDate && currentTime && <div className="text-xs text-green-300 mt-1">{currentDate} {currentTime}</div>}
      </div>
      
      <div className="absolute bottom-5 md:bottom-7 left-2 md:left-4 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none z-20">
        <div className="text-xs md:text-sm font-semibold text-slate-300">Interactive Ocean Current Map</div>
        <div className="text-xs text-slate-400">{selectedParameter} at {selectedDepth}ft depth</div>
        <div className="text-xs text-slate-400 mt-1">
          {mapLayerVisibility.oceanCurrents && <span className="text-blue-300">🌊 New Currents </span>}
          {mapLayerVisibility.temperature && isSstHeatmapVisible && <span className="text-red-300">🌡️ Heatmap </span>}
          {showWindParticles && <span className="text-emerald-300">🌪️ Live Wind </span>}
          {showWindLayer && <span className="text-cyan-300">🌬️ Wind Vectors </span>}
          {showGrid && <span className="text-blue-300">🌐 Grid </span>}
          {mapStyle === 'arcgis-ocean' && <span className="text-indigo-300">🌊 Ocean Base </span>}
        </div>
        {spinEnabled && <div className="text-xs text-cyan-300 mt-1">🌍 Globe Auto-Rotating</div>}
      </div>

      {(showWindLayer || showWindParticles) && (
        <div className="absolute bottom-5 right-2 bg-slate-800/90 border border-slate-600/50 rounded-lg p-2 z-20">
          {showWindParticles ? (<>
              <div className="text-xs font-semibold text-slate-300 mb-2">Live Wind Data (m/s)</div>
              <div className="space-y-1"><div className="flex items-center space-x-2"><div className="w-4 h-1" style={{backgroundColor: 'rgba(134,163,171,1)'}}></div><span className="text-xs text-slate-400">1.5: Light air</span></div><div className="flex items-center space-x-2"><div className="w-4 h-1" style={{backgroundColor: 'rgba(15,147,167,1)'}}></div><span className="text-xs text-slate-400">6.17: Light breeze</span></div><div className="flex items-center space-x-2"><div className="w-4 h-1" style={{backgroundColor: 'rgba(57,163,57,1)'}}></div><span className="text-xs text-slate-400">9.26: Gentle breeze</span></div></div>
            </>) : (<>
              <div className="text-xs font-semibold text-slate-300 mb-2">Wind Speed (knots)</div>
              <div className="space-y-1"><div className="flex items-center space-x-2"><div className="w-4 h-1 bg-sky-300"></div><span className="text-xs text-slate-400">0-7: Light</span></div><div className="flex items-center space-x-2"><div className="w-4 h-1 bg-blue-500"></div><span className="text-xs text-slate-400">7-16: Moderate</span></div><div className="flex items-center space-x-2"><div className="w-4 h-1 bg-yellow-400"></div><span className="text-xs text-slate-400">16-28: Fresh</span></div></div>
            </>)}
        </div>
      )}

      <StationTooltip station={activeTooltip} />
      
      <SelectedStationPanel station={selectedStation} data={rawData} onClose={() => { setSelectedStation(null); onStationSelect?.(null); }} />

      <div className="absolute top-2 md:top-2 left-2 md:left-4 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none z-20">
        <div className="text-xs text-slate-400">HoloOcean POV</div>
        <div className="text-xs md:text-sm font-mono text-cyan-300">({holoOceanPOV.x.toFixed(1)}, {holoOceanPOV.y.toFixed(1)})</div>
        <div className="text-xs text-slate-400">Depth: {selectedDepth}ft</div>
      </div>
    </div>
  );
};

export default MapContainer;