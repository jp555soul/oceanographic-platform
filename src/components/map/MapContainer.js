import React, { useRef, useEffect, useState, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, LineLayer, IconLayer, GeoJsonLayer } from '@deck.gl/layers';
import { HeatmapLayer, HexagonLayer } from '@deck.gl/aggregation-layers';
import { TileLayer } from '@deck.gl/geo-layers';
import { BitmapLayer } from '@deck.gl/layers';
import { Thermometer } from 'lucide-react';
import StationTooltip from './StationTooltip';
import SelectedStationPanel from './SelectedStationPanel';
import { isLikelyOnWater } from '../../services/dataService';
// Arrow icon will be created programmatically
import 'mapbox-gl/dist/mapbox-gl.css';

// Improved Wind Particle Layer with better visibility
import { CompositeLayer } from '@deck.gl/core';

// Cache arrow icon creation for performance - OPTIMIZED: Smaller and simpler
let cachedArrowIcon = {};
const createArrowIcon = (color = 'blue') => {
  if (cachedArrowIcon[color]) return cachedArrowIcon[color];
  
  const canvas = document.createElement('canvas');
  canvas.width = 192; 
  canvas.height = 192; 
  const ctx = canvas.getContext('2d');
  
  // Adjusted coordinates for double size again
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(160, 96);  // Arrow tip
  ctx.lineTo(32, 32);   // Upper back
  ctx.lineTo(64, 48);   // Center back  
  ctx.lineTo(32, 160);  // Lower back
  ctx.closePath();
  ctx.fill();
  
  cachedArrowIcon[color] = {
    url: canvas.toDataURL(),
    width: 192, 
    height: 192, 
    anchorX: 96, 
    anchorY: 96  
  };
  
  return cachedArrowIcon[color];
};

// A single, reusable particle layer for wind, ocean currents, etc. - OPTIMIZED
class ParticleLayer extends CompositeLayer {
  static layerName = 'ParticleLayer';
  static defaultProps = {
    data: [],
    bbox: { minLng: -180, maxLng: 180, minLat: -90, maxLat: 90 },
    particleCount: 1000, 
    maxAge: 10, 
    opacity: 1,
    time: 0,
    particleSpeedFactor: 1.0,
    vectorScale: 1.0,
    arrowColor: 'blue', // New prop for arrow color
    pauseAnimation: false, // NEW: Add pause control

    // Accessors that can be customized for different data sources
    getPosition: d => [d.lon, d.lat],
    getSpeed: d => d.nspeed || d.speed || 0,
    getDirection: d => d.direction || 0,
    
    // Function to get particle color based on a value (e.g., speed or direction)
    getColor: (value, alpha) => [255, 255, 255, alpha]
  };

  // OPTIMIZED: Spatial indexing for vector lookup
  getVector(lon, lat, data) {
    // Use cached spatial index if available
    if (!this._spatialIndex) {
      this._spatialIndex = new Map();
      const gridSize = 0.05; // Grid cell size in degrees
      
      for (const point of data) {
        if (point.lon == null || point.lat == null) continue;
        const gridX = Math.floor(point.lon / gridSize);
        const gridY = Math.floor(point.lat / gridSize);
        const key = `${gridX},${gridY}`;
        
        if (!this._spatialIndex.has(key)) {
          this._spatialIndex.set(key, []);
        }
        this._spatialIndex.get(key).push(point);
      }
    }

    const gridSize = 0.05;
    const gridX = Math.floor(lon / gridSize);
    const gridY = Math.floor(lat / gridSize);
    
    // Check nearby grid cells
    let nearestPoint = null;
    let minDistanceSq = Infinity;
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = `${gridX + dx},${gridY + dy}`;
        const points = this._spatialIndex.get(key);
        if (!points) continue;
        
        for (const point of points) {
          const dLon = lon - point.lon;
          const dLat = lat - point.lat;
          const distanceSq = dLon * dLon + dLat * dLat;
          
          if (distanceSq < minDistanceSq) {
            minDistanceSq = distanceSq;
            nearestPoint = point;
          }
        }
      }
    }

    if (!nearestPoint) return { u: 0, v: 0 };
    
    const speed = nearestPoint.nspeed || nearestPoint.speed || 0;
    const direction = nearestPoint.direction || 0;
    const angleRad = (90 - direction) * (Math.PI / 180);
    
    return { 
      u: speed * Math.cos(angleRad), 
      v: speed * Math.sin(angleRad) 
    };
  }

  initializeState() {
    this.setState({
      particles: this.generateParticles(),
      lastUpdateTime: 0,
      frameCounter: 0 // OPTIMIZED: Add frame counter
    });
  }

  updateState({ props, oldProps, changeFlags }) {
    // NEW: Respect pauseAnimation prop
    if (props.pauseAnimation) {
      // Don't update particles when paused, but still increment frame counter
      const { frameCounter } = this.state;
      this.setState({ frameCounter: frameCounter + 1 });
      return;
    }

    // OPTIMIZED: Update particles every 6 frames instead of 3 for better performance
    const { frameCounter } = this.state;
    const newFrameCounter = frameCounter + 1;
    
    if (newFrameCounter % 6 === 0 || changeFlags.propsChanged) {
      this.setState({ 
        particles: this.updateParticles(),
        lastUpdateTime: props.time,
        frameCounter: newFrameCounter
      });
    } else {
      this.setState({ frameCounter: newFrameCounter });
    }
  }

  generateParticles() {
    const { particleCount, data, getPosition } = this.props;
    if (!data || data.length === 0) return [];

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      const sourcePoint = data[Math.floor(Math.random() * data.length)];
      const position = [...getPosition(sourcePoint)];
      position[0] += (Math.random() - 0.5) * 0.01; // Reduced spread
      position[1] += (Math.random() - 0.5) * 0.01;

      particles.push({
        id: i,
        position,
        velocity: [(Math.random() - 0.5) * 0.003, (Math.random() - 0.5) * 0.003],
        age: Math.random() * 80,
        maxAge: 40 + Math.random() * 80, // Reduced max age
      });
    }
    return particles;
  }

  updateParticles() {
    const { bbox, particleSpeedFactor, data, getPosition } = this.props;
    const { particles } = this.state;
    const hasData = data && data.length > 0;

    return particles.map(particle => {
      const influence = this.getVector(particle.position[0], particle.position[1], data);
      
      const strength = 0.0008 * particleSpeedFactor; // Slightly reduced
      const newVelocity = [
        particle.velocity[0] * 0.96 + influence.u * strength,
        particle.velocity[1] * 0.96 + influence.v * strength
      ];

      const newPosition = [
        particle.position[0] + newVelocity[0], 
        particle.position[1] + newVelocity[1]
      ];
      const newAge = particle.age + 6; // Age based on update frequency

      if (newAge > particle.maxAge ||
          newPosition[0] < bbox.minLng || newPosition[0] > bbox.maxLng ||
          newPosition[1] < bbox.minLat || newPosition[1] > bbox.maxLat) {
        
        const sourcePoint = hasData
          ? data[Math.floor(Math.random() * data.length)]
          : { position: [
              bbox.minLng + (bbox.maxLng - bbox.minLng) * Math.random(),
              bbox.minLat + (bbox.maxLat - bbox.minLat) * Math.random()]
            };
        
        const position = [...getPosition(sourcePoint)];
        position[0] += (Math.random() - 0.5) * 0.01;
        position[1] += (Math.random() - 0.5) * 0.01;

        return {
          ...particle,
          position,
          velocity: [(Math.random() - 0.5) * 0.003, (Math.random() - 0.5) * 0.003],
          age: 0,
          maxAge: 40 + Math.random() * 80
        };
      }
      
      const speed = Math.sqrt(newVelocity[0] ** 2 + newVelocity[1] ** 2) * 6000; // Reduced multiplier
      return { 
        ...particle, 
        position: newPosition, 
        velocity: newVelocity, 
        age: newAge, 
        speed 
      };
    });
  }

  renderLayers() {
    const { particles, frameCounter } = this.state;
    const { opacity, getColor, vectorScale, arrowColor } = this.props;
    if (!particles || particles.length === 0) return [];

    // OPTIMIZED: Pre-calculate values to reduce per-frame computation
    const updateKey = Math.floor(frameCounter / 6);

    return [
      new IconLayer({
        id: `${this.props.id}-main-particles`,
        data: particles,
        getPosition: d => d.position,
        getIcon: () => createArrowIcon(arrowColor), // Pass the new prop here
        getAngle: d => Math.atan2(d.velocity[1], d.velocity[0]) * (180 / Math.PI),
        getSize: d => {
          const ageRatio = Math.min(d.age / d.maxAge, 1);
          return 20 * (1 - ageRatio * 0.3); // Reduced size and simplified calculation
        },
        getColor: d => {
          const ageRatio = Math.min(d.age / d.maxAge, 1);
          const alpha = Math.max(60, (1 - ageRatio) * 200 * opacity);
          return getColor(d.speed || 0, alpha);
        },
        sizeScale: 1,
        sizeMinPixels: 6, // Reduced minimum size
        sizeMaxPixels: 16, // Reduced maximum size
        pickable: false,
        updateTriggers: { 
          getColor: [updateKey],
          getAngle: [updateKey],
          getSize: [updateKey]
        }
      }),
      // OPTIMIZED: Simplified trails - only for fast particles and reduced frequency
      ...(particles.filter(p => p.speed > 0.5).length > 0 ? [new LineLayer({
        id: `${this.props.id}-trail-lines`,
        data: particles.filter(p => p.speed > 0.5 && p.age % 12 < 6), // Show trails intermittently
        getSourcePosition: d => [
          d.position[0] - d.velocity[0] * 4, 
          d.position[1] - d.velocity[1] * 4
        ],
        getTargetPosition: d => d.position,
        getColor: d => {
          const ageRatio = Math.min(d.age / d.maxAge, 1);
          const alpha = Math.max(30, (1 - ageRatio) * 80 * opacity);
          return getColor(d.speed || 0, alpha);
        },
        getWidth: 1, // Thinner lines
        widthScale: vectorScale * 0.8,
        widthMinPixels: 0.3,
        widthMaxPixels: 1.5,
        pickable: false,
        updateTriggers: { 
          getSourcePosition: [updateKey],
          getColor: [updateKey]
        }
      })] : [])
    ];
  }
}

// Generic heatmap data generator
const generateHeatmapData = (data, parameter, options = {}) => {
  if (!data || data.length === 0) return [];

  const { depthFilter = null, normalize = true } = options;
  let filteredData = data;

  if (depthFilter !== null && depthFilter !== undefined) {
    // Adjusted depth filtering logic for meters
    filteredData = data.filter(d => Math.abs(d.depth - depthFilter) < 0.3048);
  }

  const validData = filteredData.filter(d => d[parameter] != null && !isNaN(d[parameter]) && d.lat != null && d.lon != null);
  if (validData.length === 0) return [];

  let minVal = Infinity;
  let maxVal = -Infinity;
  if (normalize) {
    validData.forEach(d => {
      if (d[parameter] < minVal) minVal = d[parameter];
      if (d[parameter] > maxVal) maxVal = d[parameter];
    });
  }
  
  const range = maxVal - minVal;
  if (normalize && range === 0) {
    return validData.map(d => [d.lat, d.lon, 0.5]);
  }

  return validData.map(d => {
    const weight = normalize ? (d[parameter] - minVal) / range : d[parameter];
    return [d.lat, d.lon, weight];
  });
};

// Color ranges for various heatmap layers
const TEMPERATURE_COLOR_RANGE = [
  [2, 59, 150], [36, 178, 208], [149, 235, 151], [254, 218, 107], [252, 114, 61], [239, 48, 48]
];
const SALINITY_COLOR_RANGE = [
  [237, 248, 251], [179, 226, 225], [102, 194, 164], [44, 162, 95], [0, 109, 44]
];
const SSH_COLOR_RANGE = [
  [43, 131, 186], [171, 221, 164], [255, 255, 191], [253, 174, 97], [215, 25, 28]
];
const PRESSURE_COLOR_RANGE = [
  [255, 247, 236], [254, 227, 184], [253, 190, 133], [253, 141, 60], [217, 71, 1]
];

// Color mapping for speed-based visualizations
const getSpeedColor = (speed) => {
  if (speed < 0.2) return [100, 149, 237, 200]; // Cornflower blue
  if (speed < 0.5) return [65, 105, 225, 200]; // Royal blue  
  if (speed < 0.8) return [0, 191, 255, 200]; // Deep sky blue
  if (speed < 1.2) return [50, 205, 50, 200]; // Lime green
  if (speed < 1.8) return [255, 215, 0, 200]; // Gold
  if (speed < 2.5) return [255, 140, 0, 200]; // Dark orange
  return [255, 69, 0, 200]; // Red orange
};

// Color mapping for speed-based particles
const getSpeedParticleColor = (speed, alpha) => {
    if (speed < 0.5) return [100, 149, 237, alpha];
    if (speed < 1.0) return [65, 105, 225, alpha];
    if (speed < 1.5) return [0, 191, 255, alpha];
    if (speed < 2.0) return [50, 205, 50, alpha];
    if (speed < 2.5) return [255, 215, 0, alpha];
    if (speed < 3.0) return [255, 140, 0, alpha];
    return [255, 69, 0, alpha];
};

// Color mapping for direction-based visualizations (HSL color wheel)
const getDirectionColor = (direction) => {
  const hue = direction;
  const saturation = 70;
  const lightness = 50;
  // Convert HSL to RGB
  const c = (1 - Math.abs(2 * lightness / 100 - 1)) * saturation / 100;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness / 100 - c / 2;
  let r, g, b;
  
  if (hue < 60) { r = c; g = x; b = 0; }
  else if (hue < 120) { r = x; g = c; b = 0; }
  else if (hue < 180) { r = 0; g = c; b = x; }
  else if (hue < 240) { r = 0; g = x; b = c; }
  else if (hue < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255, 200];
};

// Color mapping for direction-based particles
const getDirectionParticleColor = (direction, alpha) => {
    return getDirectionColor(direction).map((c, i) => i === 3 ? alpha : c);
};

// Color mapping for ocean currents based on speed or direction
const getCurrentsColor = (feature, colorBy = 'speed') => {
  if (!feature.properties) return [100, 149, 237, 200]; // Default blue
  
  if (colorBy === 'speed') {
    const speed = feature.properties.speed || feature.properties.nspeed || 0;
    return getSpeedColor(speed);
  } else if (colorBy === 'direction') {
    const direction = feature.properties.direction || 0;
    return getDirectionColor(direction);
  }
  
  return [100, 149, 237, 200];
};

// Helper for display panel
const layerDisplayNames = {
  oceanCurrents: 'Ocean Currents',
  temperature: 'Temperature',
  ssh: 'Surface Elevation',
  salinity: 'Salinity',
  pressure: 'Pressure',
  windParticles: 'Wind Particles',
};

const MapContainer = ({
  stationData = [],
  timeSeriesData = [],
  rawData = [],
  totalFrames = 0,
  currentFrame = 0,
  selectedDepth = 0,
  selectedArea = '',
  holoOceanPOV = { x: 0, y: 0, depth: 0 },
  onPOVChange,
  onDepthChange,
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
    salinity: false,
    ssh: false,
    pressure: false,
    stations: false,
    windSpeed: false,
    windDirection: false,
    windVelocity: false,
  },
  currentsVectorScale = 0.009,
  currentsColorBy = 'speed',
  heatmapScale = 1,
  // Available depths for POV slider
  availableDepths = []
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

  // Grid layer controls
  const [showGrid, setShowGrid] = useState(true);
  const [gridOpacity, setGridOpacity] = useState(1.0);
  const [gridSpacing, setGridSpacing] = useState(1);
  const [gridColor, setGridColor] = useState([100, 149, 237, 128]); // Cornflower blue

  // Data availability tooltip state
  const [coordinateHover, setCoordinateHover] = useState(null);

  // NEW: Determine if particle animations should be paused
  const activeTooltip = hoveredStation || coordinateHover;
  const pauseParticleAnimations = Boolean(activeTooltip);

  // Station data processing - only use valid stations from props, no fallback
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
    
    return [];
  }, [stationData]);

  // Heatmap data generation for all relevant layers - temperature now shows automatically when layer is enabled
  const temperatureHeatmapData = useMemo(() => {
    if (!mapLayerVisibility.temperature || !rawData || rawData.length === 0) return [];
    return generateHeatmapData(rawData, 'temp', { depthFilter: selectedDepth });
  }, [rawData, mapLayerVisibility.temperature, selectedDepth]);

  const salinityHeatmapData = useMemo(() => {
    if (!mapLayerVisibility.salinity || !rawData || rawData.length === 0) return [];
    return generateHeatmapData(rawData, 'salinity', { depthFilter: selectedDepth });
  }, [rawData, mapLayerVisibility.salinity, selectedDepth]);
  
  const sshHexagonData = useMemo(() => {
    if (!mapLayerVisibility.ssh || !rawData || rawData.length === 0) return [];
    // Filter for valid data points for the HexagonLayer
    return rawData.filter(d => d.ssh != null && !isNaN(d.ssh) && d.lat != null && d.lon != null);
  }, [rawData, mapLayerVisibility.ssh]);

  const pressureHeatmapData = useMemo(() => {
    if (!mapLayerVisibility.pressure || !rawData || rawData.length === 0) return [];
    return generateHeatmapData(rawData, 'pressure_dbars', { depthFilter: selectedDepth });
  }, [rawData, mapLayerVisibility.pressure, selectedDepth]);

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
              availableData.push(`Wind Speed: ${latestData.nspeed.toFixed(2)} m/s`);
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
              availableData.push(`Depth: ${latestData.depth.toFixed(0)} m`);
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
      
      // Check temperature heatmap data
      if (mapLayerVisibility.temperature && temperatureHeatmapData.length > 0) {
        const nearbyTempData = temperatureHeatmapData.filter(point => {
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
  }, [finalStationData, rawData, temperatureHeatmapData, timeSeriesData, mapLayerVisibility.temperature]);

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

  // Handle SSH layer pitch changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    const targetPitch = mapLayerVisibility.ssh ? 30 : 0;
    
    // Only change pitch if it's different from current pitch
    if (Math.abs(mapRef.current.getPitch() - targetPitch) > 1) {
      mapRef.current.easeTo({
        pitch: targetPitch,
        duration: 1000,
        easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      });
      
      // Update viewState to reflect the pitch change
      setViewState(prev => ({ ...prev, pitch: targetPitch }));
    }
  }, [mapLayerVisibility.ssh]);

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
    
    // Use the provided initialViewState, no fallback to hardcoded values
    const startingViewState = initialViewState;
    
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

  // Memoize animation calculations to reduce per-frame computation
  const animationValues = useMemo(() => {
    const animationTime = Math.floor(currentFrame / 3) * 0.1; // Update every 3 frames
    return {
      pulseIntensity: 1 + Math.sin(animationTime * 2) * 0.2, // Reduced amplitude
      radiusAnimation: 1 + Math.sin(animationTime * 1.5) * 0.1 // Reduced amplitude
    };
  }, [Math.floor(currentFrame / 3)]); // Dependency on every 3rd frame

  const getDeckLayers = () => {
    const layers = [];
    const { pulseIntensity, radiusAnimation } = animationValues;

    // OPTIMIZED: Wind Showcase Particles Layer with reduced particle count
    if (mapLayerVisibility.windVelocity && rawData.length > 0) {
        const windSourceData = rawData.filter(d => 
            d.nspeed != null && 
            d.ndirection != null && 
            d.lat != null && 
            d.lon != null &&
            isLikelyOnWater(d.lat, d.lon)
        );
      
        if (windSourceData.length > 0) {
          const lons = windSourceData.map(d => d.lon);
          const lats = windSourceData.map(d => d.lat);
          const windBbox = {
            minLng: Math.min(...lons) - 1, maxLng: Math.max(...lons) + 1,
            minLat: Math.min(...lats) - 1, maxLat: Math.max(...lats) + 1,
          };

          layers.push(new ParticleLayer({
              id: 'wind-showcase-particles',
              data: windSourceData,
              bbox: windBbox,
              particleCount: 1000, 
              opacity: 1,
              //time: currentFrame * 5,
              particleSpeedFactor: 1.2,
              vectorScale: currentsVectorScale * 100,
              arrowColor: '#FF0000', // Red
              particleType: 'wind', // Explicitly tell the layer to use wind logic
              pauseAnimation: pauseParticleAnimations, // NEW: Pass pause state
              getColor: (speed, alpha) => {
                  if (speed < 1.0) return [147, 112, 219, alpha]; // Medium slate blue
                  if (speed < 1.5) return [138, 43, 226, alpha]; // Blue violet
                  if (speed < 2.0) return [148, 0, 211, alpha]; // Dark violet
                  return [128, 0, 128, alpha]; // Purple
              },
          }));
        }
    }

    // OPTIMIZED: Animated Ocean Currents Layer with reduced particle count
    if (mapLayerVisibility.oceanCurrents && rawData && rawData.length > 0) {
      const oceanCurrentData = rawData.filter(d => 
        d.lat != null && 
        d.lon != null && 
        !isNaN(d.lat) && 
        !isNaN(d.lon) &&
        (d.nspeed != null || d.speed != null) && d.direction != null
      );
      
      if (oceanCurrentData.length > 0) {
        const lons = oceanCurrentData.map(d => d.lon);
        const lats = oceanCurrentData.map(d => d.lat);
        const oceanBbox = {
          minLng: Math.min(...lons) - 1, maxLng: Math.max(...lons) + 1,
          minLat: Math.min(...lats) - 1, maxLat: Math.max(...lats) + 1,
        };

        layers.push(new ParticleLayer({
          id: 'ocean-currents-particles',
          data: oceanCurrentData,
          bbox: oceanBbox,
          particleCount: 1000,
          maxAge: 10,
          opacity: 1,
          //time: currentFrame * 5,
          particleSpeedFactor: 1.0,
          vectorScale: currentsVectorScale * 100,
          arrowColor: '#0000FF', // Blue
          pauseAnimation: pauseParticleAnimations, // NEW: Pass pause state
          // particleType defaults to 'currents', no need to set explicitly
          getColor: (speed, alpha) => {
              const brightness = Math.min(1.0, 0.6 + speed * 0.4);
              const blue = Math.min(255, 180 + speed * 75);
              return [80 * brightness, 150 * brightness, blue, alpha];
          },
        }));
      }
    }

    // Animated Temperature Layer - simplified animation
    if (mapLayerVisibility.temperature && temperatureHeatmapData.length > 0) {
      layers.push(new HeatmapLayer({
        id: 'temperature-heatmap-layer',
        data: temperatureHeatmapData,
        getPosition: d => [d[1], d[0]],
        getWeight: d => d[2] * pulseIntensity,
        radiusPixels: (35 + heatmapScale * 30) * radiusAnimation, // Reduced base size
        intensity: 1.2 * pulseIntensity * heatmapScale, // Reduced intensity
        threshold: 0.08, // Higher threshold for performance
        aggregation: 'SUM',
        colorRange: TEMPERATURE_COLOR_RANGE,
        updateTriggers: {
          getWeight: [Math.floor(currentFrame / 3)], // Update every 3 frames
          radiusPixels: [Math.floor(currentFrame / 3), heatmapScale],
          intensity: [Math.floor(currentFrame / 3), heatmapScale]
        }
      }));
    }

    // Animated Salinity Layer - simplified animation
    if (mapLayerVisibility.salinity && salinityHeatmapData.length > 0) {
        layers.push(new HeatmapLayer({
            id: 'salinity-heatmap-layer',
            data: salinityHeatmapData, 
            getPosition: d => [d[1], d[0]], 
            getWeight: d => d[2] * pulseIntensity,
            radiusPixels: (35 + heatmapScale * 30) * radiusAnimation, // Reduced base size
            intensity: 1.2 * pulseIntensity * heatmapScale, // Reduced intensity
            threshold: 0.08, // Higher threshold for performance
            aggregation: 'SUM',
            colorRange: SALINITY_COLOR_RANGE,
            updateTriggers: {
              getWeight: [Math.floor(currentFrame / 3)], // Update every 3 frames
              radiusPixels: [Math.floor(currentFrame / 3), heatmapScale],
              intensity: [Math.floor(currentFrame / 3), heatmapScale]
            }
        }));
    }

    // Animated SSH Layer with Enhanced Tooltip Data - simplified animation
    if (mapLayerVisibility.ssh && sshHexagonData.length > 0) {
        layers.push(new HexagonLayer({
            id: 'ssh-hexagon-layer',
            data: sshHexagonData,
            getPosition: d => [d.lon, d.lat],
            
            // Aggregation and 3D properties
            extruded: true,
            radius: 2500, // in meters
            elevationScale: 40 * pulseIntensity, // Reduced scale
            getElevationWeight: d => d.ssh, // Use ssh value for elevation
            aggregation: 'MEAN',
            upperPercentile: 99, // Clamp outliers for more stable elevation
            
            // Styling
            colorRange: SSH_COLOR_RANGE,
            material: {
              ambient: 0.6,
              diffuse: 0.6,
              shininess: 32,
              specularColor: [51, 51, 51]
            },

            // Performance
            gpuAggregation: true,

            // Interactivity with comprehensive data display
            pickable: true,
            autoHighlight: true,
            onHover: ({ object, x, y }) => {
              console.log('SSH Hover:', { object, hasPoints: object?.points?.length });
              
              if (object) {
                // Handle different object structures
                const points = object.points || [object];
                const sshValues = points.map(p => p.ssh || p.elevationValue).filter(v => v != null && !isNaN(v));
                
                if (sshValues.length === 0) {
                  // Fallback to basic elevation display
                  const elevationValue = object.elevationValue || object.ssh;
                  if (elevationValue != null) {
                    setHoveredStation({
                      type: 'ssh',
                      name: 'Surface Elevation',
                      details: `SSH: ${elevationValue.toFixed(3)} m`,
                      coordinates: object.centroid || [object.lon, object.lat],
                      x,
                      y,
                    });
                  } else {
                    setHoveredStation(null);
                  }
                  return;
                }
                
                // Calculate SSH statistics
                const minSSH = Math.min(...sshValues);
                const maxSSH = Math.max(...sshValues);
                const avgSSH = sshValues.reduce((sum, val) => sum + val, 0) / sshValues.length;
                
                // Time range analysis
                const times = points.map(p => p.time).filter(t => t != null);
                let timeRange = '';
                if (times.length > 0) {
                  const timeDates = times.map(t => new Date(t)).sort();
                  const earliest = timeDates[0];
                  const latest = timeDates[timeDates.length - 1];
                  if (earliest.getTime() !== latest.getTime()) {
                    timeRange = `${earliest.toLocaleDateString()} - ${latest.toLocaleDateString()}`;
                  } else {
                    timeRange = earliest.toLocaleDateString();
                  }
                }
                
                // Calculate statistics for other available parameters
                const availableParams = [];
                const paramStats = {};
                
                // Temperature analysis
                const tempValues = points.map(p => p.temp).filter(v => v != null && !isNaN(v));
                if (tempValues.length > 0) {
                  const minTemp = Math.min(...tempValues);
                  const maxTemp = Math.max(...tempValues);
                  const avgTemp = tempValues.reduce((sum, val) => sum + val, 0) / tempValues.length;
                  availableParams.push('Temperature');
                  paramStats.temperature = `${avgTemp.toFixed(2)}°C (${minTemp.toFixed(2)} - ${maxTemp.toFixed(2)})`;
                }
                
                // Salinity analysis
                const salinityValues = points.map(p => p.salinity).filter(v => v != null && !isNaN(v));
                if (salinityValues.length > 0) {
                  const minSal = Math.min(...salinityValues);
                  const maxSal = Math.max(...salinityValues);
                  const avgSal = salinityValues.reduce((sum, val) => sum + val, 0) / salinityValues.length;
                  availableParams.push('Salinity');
                  paramStats.salinity = `${avgSal.toFixed(2)} PSU (${minSal.toFixed(2)} - ${maxSal.toFixed(2)})`;
                }
                
                // Pressure analysis
                const pressureValues = points.map(p => p.pressure_dbars).filter(v => v != null && !isNaN(v));
                if (pressureValues.length > 0) {
                  const minPres = Math.min(...pressureValues);
                  const maxPres = Math.max(...pressureValues);
                  const avgPres = pressureValues.reduce((sum, val) => sum + val, 0) / pressureValues.length;
                  availableParams.push('Pressure');
                  paramStats.pressure = `${avgPres.toFixed(1)} dbar (${minPres.toFixed(1)} - ${maxPres.toFixed(1)})`;
                }
                
                // Current Speed analysis
                const speedValues = points.map(p => p.nspeed || p.speed).filter(v => v != null && !isNaN(v));
                if (speedValues.length > 0) {
                  const minSpeed = Math.min(...speedValues);
                  const maxSpeed = Math.max(...speedValues);
                  const avgSpeed = speedValues.reduce((sum, val) => sum + val, 0) / speedValues.length;
                  availableParams.push('Current Speed');
                  paramStats.currentSpeed = `${avgSpeed.toFixed(3)} m/s (${minSpeed.toFixed(3)} - ${maxSpeed.toFixed(3)})`;
                }
                
                // Current Direction analysis
                const directionValues = points.map(p => p.direction).filter(v => v != null && !isNaN(v));
                if (directionValues.length > 0) {
                  const avgDirection = directionValues.reduce((sum, val) => sum + val, 0) / directionValues.length;
                  availableParams.push('Current Direction');
                  paramStats.currentDirection = `${avgDirection.toFixed(1)}° (${directionValues.length} readings)`;
                }
                
                // Depth analysis
                const depthValues = points.map(p => p.depth).filter(v => v != null && !isNaN(v));
                if (depthValues.length > 0) {
                  const minDepth = Math.min(...depthValues);
                  const maxDepth = Math.max(...depthValues);
                  const avgDepth = depthValues.reduce((sum, val) => sum + val, 0) / depthValues.length;
                  availableParams.push('Depth');
                  paramStats.depth = `${avgDepth.toFixed(0)} m (${minDepth.toFixed(0)} - ${maxDepth.toFixed(0)})`;
                }
                
                // Build comprehensive details string
                let details = `SSH: ${avgSSH.toFixed(3)} m (avg)\n`;
                details += `Range: ${minSSH.toFixed(3)} - ${maxSSH.toFixed(3)} m\n`;
                details += `Data Points: ${points.length}\n`;
                if (timeRange) details += `Time Range: ${timeRange}\n`;
                
                // Add parameter statistics
                if (paramStats.temperature) details += `Temperature: ${paramStats.temperature}\n`;
                if (paramStats.salinity) details += `Salinity: ${paramStats.salinity}\n`;
                if (paramStats.pressure) details += `Pressure: ${paramStats.pressure}\n`;
                if (paramStats.currentSpeed) details += `Current Speed: ${paramStats.currentSpeed}\n`;
                if (paramStats.currentDirection) details += `Current Direction: ${paramStats.currentDirection}\n`;
                if (paramStats.depth) details += `Depth: ${paramStats.depth}\n`;
                
                if (availableParams.length > 0) {
                  details += `Available Parameters: ${availableParams.join(', ')}`;
                }
                
                setHoveredStation({
                  type: 'ssh',
                  name: 'Surface Elevation Hexagon',
                  details: details.trim(),
                  coordinates: object.centroid,
                  dataPoints: points.length,
                  availableParameters: availableParams,
                  x,
                  y,
                });
              } else {
                setHoveredStation(null);
              }
            },

            // Animation - update less frequently
            updateTriggers: {
                elevationScale: [Math.floor(currentFrame / 3)],
            },
        }));
    }
    
    // Animated Pressure Layer - simplified animation
    if (mapLayerVisibility.pressure && pressureHeatmapData.length > 0) {
        layers.push(new HeatmapLayer({
            id: 'pressure-heatmap-layer',
            data: pressureHeatmapData, 
            getPosition: d => [d[1], d[0]], 
            getWeight: d => d[2] * pulseIntensity,
            radiusPixels: (35 + heatmapScale * 30) * radiusAnimation, // Reduced base size
            intensity: 1.2 * pulseIntensity * heatmapScale, // Reduced intensity
            threshold: 0.08, // Higher threshold for performance
            aggregation: 'SUM',
            colorRange: PRESSURE_COLOR_RANGE,
            updateTriggers: {
              getWeight: [Math.floor(currentFrame / 3)], // Update every 3 frames
              radiusPixels: [Math.floor(currentFrame / 3), heatmapScale],
              intensity: [Math.floor(currentFrame / 3), heatmapScale]
            }
        }));
    }

    // Grids
    if (showGrid && generateGridData.length > 0) {
      layers.push(new LineLayer({
        id: 'coordinate-grid', data: generateGridData, getSourcePosition: d => d.sourcePosition,
        getTargetPosition: d => d.targetPosition, getColor: d => d.color,
        getWidth: d => d.type === 'latitude' && Math.abs(d.value) < 0.001 ? 3 : 1,
        widthScale: 1, widthMinPixels: 0.5, widthMaxPixels: 2, opacity: gridOpacity,
        pickable: true, autoHighlight: false,
        onHover: ({object, x, y}) => {
          if (object && viewState.zoom > 4) {
            const label = object.type === 'latitude' ? `${Math.abs(object.value)}°${object.value >= 0 ? 'N' : 'S'}` : `${Math.abs(object.value)}°${object.value >= 0 ? 'E' : 'W'}`;
            setHoveredStation({ name: `Grid Line`, details: `${object.type === 'latitude' ? 'Latitude' : 'Longitude'}: ${label}`, x, y, isGrid: true });
          } else setHoveredStation(null);
        }
      }));
    }
    
    // HoloOcean POV - show if holoOceanPOV exists
    if (holoOceanPOV) {
      layers.push(new ScatterplotLayer({
        id: 'pov-indicator', 
        data: [{ 
          coordinates: [-89.2 + (holoOceanPOV.x / 100) * 0.4, 30.0 + (holoOceanPOV.y / 100) * 0.4], 
          color: [74, 222, 128], 
          name: 'HoloOcean Viewpoint' 
        }],
        getPosition: d => d.coordinates, 
        getFillColor: d => d.color, 
        getRadius: 1500,
        radiusMinPixels: 8, 
        radiusMaxPixels: 15, 
        pickable: true, 
        autoHighlight: true, 
        highlightColor: [255, 255, 255, 150],
        onHover: ({object, x, y}) => object ? setHoveredStation({ 
          name: 'HoloOcean POV', 
          details: `Pos: (${holoOceanPOV.x.toFixed(1)}, ${holoOceanPOV.y.toFixed(1)}) Depth: ${holoOceanPOV.depth} m`, 
          x, y, 
          isPOV: true 
        }) : setHoveredStation(null)
      }));
    }
    
    return layers;
  };

  // Handle coordinate hover to show data availability
  const handleCoordinateHover = (info) => {
    if (!info.coordinate) {
      setCoordinateHover(null);
      return;
    }

    // Only show coordinate tooltip if not hovering over specific objects
    if (info.object || info.layer?.id?.includes('wind') || info.layer?.id?.includes('grid') || info.layer?.id?.includes('pov') || info.layer?.id?.includes('ssh')) {
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

  return (
    <div className="relative w-full h-full">
      <div ref={el => { mapContainerRef.current = el; if (el && !mapContainerReady) setMapContainerReady(true); }} className="absolute inset-0 w-full h-full" />
    
      
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
          console.log(info)
          if (!info.object && info.coordinate && holoOceanPOV) onPOVChange?.({ 
            x: ((info.coordinate[0] + 89.2) / 0.4) * 100, 
            y: ((info.coordinate[1] - 30.0) / 0.4) * 100, 
            depth: selectedDepth 
          }); 
        }} 
        className="absolute inset-0 w-full h-full z-10" 
      />}

      <div className="absolute top-2 md:top-2 left-[200px] md:left-[200px] bg-slate-800/90 border border-slate-600/50 rounded-lg p-2 z-20 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-2">
          <div className="text-xs font-semibold text-slate-300">Global Controls</div>
          <button onClick={() => setShowMapControls(!showMapControls)} className="text-slate-400 hover:text-slate-200">{showMapControls ? '∧':'+'}</button>
        </div>
        
        {showMapControls && (
          <>
            <div className="mb-3">
              <label className="text-xs text-slate-400 block mb-1">Map Style</label>
              <select value={mapStyle} onChange={(e) => handleMapStyleChange(e.target.value)} className="w-full text-xs bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-200">
                <option value="arcgis-ocean">🌊 Ocean (ArcGIS)</option>
                <option value="mapbox://styles/mapbox/outdoors-v11">🏞️ Outdoors</option>
                <option value="mapbox://styles/mapbox/satellite-v9">🛰️ Satellite</option>
                <option value="mapbox://styles/mapbox/dark-v10">🌑 Dark</option>
                <option value="mapbox://styles/mapbox/light-v10">💡 Light</option>
                <option value="mapbox://styles/mapbox/streets-v9">🛣️ Streets</option>
              </select>
            </div>
            <div className="mb-3 pb-2 border-b border-slate-600">
              <div className="text-xs font-semibold text-slate-300 mb-2">Globe Controls</div>
              <div className="flex items-center space-x-2 mb-2">
                <button onClick={() => { setSpinEnabled(!spinEnabled); if (!spinEnabled) spinGlobe(); }} className={`w-4 h-4 rounded border ${spinEnabled ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-slate-500'}`}>{spinEnabled && <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}</button>
                <span className="text-xs text-slate-400">Auto Rotate Globe</span>
              </div>
              <button onClick={() => mapRef.current?.easeTo({ center: [0, 20], zoom: 1.5, pitch: 0, bearing: 0, duration: 2000 })} className="w-full text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 px-2 py-1 rounded mb-2">🌍 Global View</button>
            </div>
            <div className="mb-3 pb-2 border-b border-slate-600">
              <div className="text-xs font-semibold text-slate-300 mb-2">Coordinate Grid</div>
              <div className="flex items-center space-x-2 mb-2">
                <button onClick={() => setShowGrid(!showGrid)} className={`w-4 h-4 rounded border ${showGrid ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-slate-500'}`}>{showGrid && <svg className="w-3 h-3 text-white ml-0.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}</button>
                <span className="text-xs text-slate-400">📋 Lat/Lon Grid</span>
              </div>
              {showGrid && <div className="ml-4 space-y-2"><div><label className="text-xs text-slate-400 block mb-1">Opacity: {Math.round(gridOpacity * 100)}%</label><input type="range" min="0.1" max="1" step="0.1" value={gridOpacity} onChange={(e) => setGridOpacity(parseFloat(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"/></div><div><label className="text-xs text-slate-400 block mb-1">Grid Spacing: {gridSpacing}°</label><input type="range" min="1" max="30" step="1" value={gridSpacing} onChange={(e) => setGridSpacing(parseInt(e.target.value))} className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"/></div></div>}
            </div>
          </>
        )}
      </div>

      <div className="absolute top-2 md:top-4 right-9 md:right-11 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none z-20">
        <div className="text-xs md:text-sm font-mono">Frame: {currentFrame + 1}/{totalFrames > 0 ? totalFrames : 24}</div>
        <div className="text-xs text-slate-400">{selectedArea}</div>
        {currentDate && currentTime && <div className="text-xs text-green-300 mt-1">{currentDate} {currentTime}</div>}
      </div>
      
      <div className="absolute bottom-5 md:bottom-7 left-2 md:left-4 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg pointer-events-none z-20 max-w-xs">
        <div className="text-xs md:text-sm font-semibold text-slate-300">Interactive Ocean Map</div>
        <div className="text-xs text-slate-400">Depth: {selectedDepth}m</div>
        <div className="text-xs text-slate-400 mt-1">
          {Object.entries(mapLayerVisibility)
            .filter(([key, value]) => value && layerDisplayNames[key])
            .map(([key]) => (
              <span key={key} className="mr-2 inline-block bg-slate-700/50 px-1 rounded">
                {layerDisplayNames[key]}
              </span>
            ))}
        </div>
        <div className="text-xs text-slate-400 mt-1">
          {mapLayerVisibility.oceanCurrents && <span className="text-blue-300">🌊 Currents </span>}
          {mapLayerVisibility.temperature && <span className="text-red-300">🌡️ Temperature </span>}
          {mapLayerVisibility.salinity && <span className="text-emerald-300">🧂 Salinity </span>}
          {mapLayerVisibility.ssh && <span className="text-indigo-300">🌊 SSH </span>}
          {mapLayerVisibility.pressure && <span className="text-orange-300">⚖️ Pressure </span>}
          {mapLayerVisibility.windVelocity && <span className="text-yellow-300">💨 Wind Velocity </span>}
          {showGrid && <span className="text-blue-300">📋 Grid </span>}
          {mapStyle === 'arcgis-ocean' && <span className="text-indigo-300">🌊 Ocean Base </span>}
        </div>
        {spinEnabled && <div className="text-xs text-cyan-300 mt-1">🌍 Globe Auto-Rotating</div>}
        {pauseParticleAnimations && <div className="text-xs text-red-300 mt-1">⏸️ Particles Paused</div>}
      </div>

      <StationTooltip station={activeTooltip} />
      
      <SelectedStationPanel station={selectedStation} data={rawData} onClose={() => { setSelectedStation(null); onStationSelect?.(null); }} />

      <div className="absolute top-2 md:top-2 left-2 md:left-4 bg-slate-800/80 px-2 md:px-3 py-1 md:py-2 rounded-lg z-20">
        <div className="text-xs text-slate-400">HoloOcean POV</div>
        <div className="text-xs md:text-sm font-mono text-cyan-300">({holoOceanPOV.x.toFixed(1)}, {holoOceanPOV.y.toFixed(1)})</div>
        <div className="mt-2">
          <label className="text-xs text-slate-400 block mb-1">
            Depth: {holoOceanPOV.depth}m
          </label>
          <input
            type="range"
            min={availableDepths.length > 0 ? Math.min(...availableDepths) : 0}
            max={availableDepths.length > 0 ? Math.max(...availableDepths) : 12}
            step={availableDepths.length > 1 ? (Math.max(...availableDepths) - Math.min(...availableDepths)) / (availableDepths.length - 1) : 1}
            value={holoOceanPOV.depth}
            onChange={(e) => {
              const newDepth = Number(e.target.value);
              onPOVChange?.({
                x: holoOceanPOV.x,
                y: holoOceanPOV.y,
                depth: newDepth
              });
              onDepthChange?.(newDepth);
            }}
            className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer"
            disabled={availableDepths.length === 0}
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>{availableDepths.length > 0 ? Math.min(...availableDepths) : 0}m</span>
            <span>{availableDepths.length > 0 ? Math.max(...availableDepths) : 12}m</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapContainer;