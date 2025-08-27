import React, { useState, useCallback } from 'react';

/**
 * Target position form for setting HoloOcean agent destination
 * Handles coordinate input, validation, and submission
 */
const TargetForm = ({ 
  onSetTarget, 
  isLoading = false, 
  validateCoordinates,
  formatCoordinates,
  className = '' 
}) => {
  // Form state
  const [formData, setFormData] = useState({
    lat: '',
    lon: '',
    depth: '',
    time: ''
  });

  // Validation state
  const [validationErrors, setValidationErrors] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  // Form interaction state
  const [showTimeInput, setShowTimeInput] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  // Coordinate presets for common locations
  const coordinatePresets = [
    {
      name: 'Mariana Trench',
      lat: 11.35,
      lon: 142.20,
      depth: 10900,
      description: 'Deepest point on Earth'
    },
    {
      name: 'Mid-Atlantic Ridge',
      lat: 0.0,
      lon: -25.0,
      depth: 3000,
      description: 'Mid-ocean ridge'
    },
    {
      name: 'Gulf of Mexico',
      lat: 25.0,
      lon: -90.0,
      depth: 1500,
      description: 'Gulf waters'
    },
    {
      name: 'Pacific Deep',
      lat: 30.0,
      lon: -140.0,
      depth: 4000,
      description: 'Deep Pacific Ocean'
    },
    {
      name: 'Surface Test',
      lat: 0.0,
      lon: 0.0,
      depth: 0,
      description: 'Surface position'
    }
  ];

  // Handle input changes
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field-specific errors when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }

    // Clear general validation errors
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  }, [fieldErrors, validationErrors]);

  // Validate form data
  const validateForm = useCallback(() => {
    const errors = [];
    const fieldErrs = {};

    // Parse numeric values
    const lat = parseFloat(formData.lat);
    const lon = parseFloat(formData.lon);
    const depth = parseFloat(formData.depth);

    // Check for missing required fields
    if (!formData.lat.trim()) {
      fieldErrs.lat = 'Latitude is required';
      errors.push('Latitude is required');
    } else if (isNaN(lat)) {
      fieldErrs.lat = 'Latitude must be a number';
      errors.push('Latitude must be a valid number');
    }

    if (!formData.lon.trim()) {
      fieldErrs.lon = 'Longitude is required';
      errors.push('Longitude is required');
    } else if (isNaN(lon)) {
      fieldErrs.lon = 'Longitude must be a number';
      errors.push('Longitude must be a valid number');
    }

    if (!formData.depth.trim()) {
      fieldErrs.depth = 'Depth is required';
      errors.push('Depth is required');
    } else if (isNaN(depth)) {
      fieldErrs.depth = 'Depth must be a number';
      errors.push('Depth must be a valid number');
    }

    // If we have valid numbers, validate coordinate ranges
    if (!isNaN(lat) && !isNaN(lon) && !isNaN(depth)) {
      const validation = validateCoordinates(lat, lon, depth);
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          if (error.includes('Latitude')) {
            fieldErrs.lat = error;
          } else if (error.includes('Longitude')) {
            fieldErrs.lon = error;
          } else if (error.includes('Depth')) {
            fieldErrs.depth = error;
          }
          errors.push(error);
        });
      }
    }

    // Validate time if provided
    if (formData.time.trim()) {
      try {
        const date = new Date(formData.time);
        if (isNaN(date.getTime())) {
          fieldErrs.time = 'Invalid time format';
          errors.push('Time must be in ISO-8601 format (e.g., 2025-08-14T12:00:00Z)');
        }
      } catch {
        fieldErrs.time = 'Invalid time format';
        errors.push('Time must be in ISO-8601 format');
      }
    }

    setValidationErrors(errors);
    setFieldErrors(fieldErrs);

    return errors.length === 0;
  }, [formData, validateCoordinates]);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const lat = parseFloat(formData.lat);
    const lon = parseFloat(formData.lon);
    const depth = parseFloat(formData.depth);
    const time = formData.time.trim() || null;

    try {
      await onSetTarget(lat, lon, depth, time);
      // Optionally clear form or show success message
      console.log('Target set successfully');
    } catch (error) {
      console.error('Failed to set target:', error);
      setValidationErrors([error.message]);
    }
  }, [formData, onSetTarget, validateForm]);

  // Handle preset selection
  const handlePresetSelect = useCallback((preset) => {
    setFormData({
      lat: preset.lat.toString(),
      lon: preset.lon.toString(),
      depth: preset.depth.toString(),
      time: formData.time // Preserve existing time
    });
    setShowPresets(false);
    setValidationErrors([]);
    setFieldErrors({});
  }, [formData.time]);

  // Set current time
  const setCurrentTime = useCallback(() => {
    const now = new Date().toISOString();
    setFormData(prev => ({
      ...prev,
      time: now
    }));
  }, []);

  // Clear time
  const clearTime = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      time: ''
    }));
  }, []);

  // Get current coordinates as formatted string for display
  const getFormattedPreview = useCallback(() => {
    const lat = parseFloat(formData.lat);
    const lon = parseFloat(formData.lon);
    const depth = parseFloat(formData.depth);

    if (isNaN(lat) || isNaN(lon) || isNaN(depth)) {
      return null;
    }

    const validation = validateCoordinates(lat, lon, depth);
    if (!validation.isValid) {
      return null;
    }

    return formatCoordinates(lat, lon, depth);
  }, [formData, validateCoordinates, formatCoordinates]);

  return (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">Set Target Position</h3>
        <button
          type="button"
          onClick={() => setShowPresets(!showPresets)}
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          {showPresets ? 'Hide Presets' : 'Show Presets'}
        </button>
      </div>

      {/* Coordinate Presets */}
      {showPresets && (
        <div className="mb-4 p-3 bg-gray-50 rounded border">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Presets</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {coordinatePresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => handlePresetSelect(preset)}
                className="text-left p-2 bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="font-medium text-sm text-gray-800">{preset.name}</div>
                <div className="text-xs text-gray-600">{preset.description}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {preset.lat}°, {preset.lon}°, {preset.depth}m
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Coordinate Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Latitude */}
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
              Latitude
            </label>
            <input
              id="latitude"
              type="number"
              step="any"
              min="-90"
              max="90"
              value={formData.lat}
              onChange={(e) => handleInputChange('lat', e.target.value)}
              placeholder="e.g., 11.35"
              className={`
                w-full px-3 py-2 border rounded-md text-sm transition-colors
                ${fieldErrors.lat 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
              disabled={isLoading}
            />
            {fieldErrors.lat && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.lat}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">-90 to 90 degrees</p>
          </div>

          {/* Longitude */}
          <div>
            <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
              Longitude
            </label>
            <input
              id="longitude"
              type="number"
              step="any"
              min="-180"
              max="180"
              value={formData.lon}
              onChange={(e) => handleInputChange('lon', e.target.value)}
              placeholder="e.g., 142.20"
              className={`
                w-full px-3 py-2 border rounded-md text-sm transition-colors
                ${fieldErrors.lon 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
              disabled={isLoading}
            />
            {fieldErrors.lon && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.lon}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">-180 to 180 degrees</p>
          </div>

          {/* Depth */}
          <div>
            <label htmlFor="depth" className="block text-sm font-medium text-gray-700 mb-1">
              Depth
            </label>
            <input
              id="depth"
              type="number"
              step="any"
              min="-11000"
              max="11000"
              value={formData.depth}
              onChange={(e) => handleInputChange('depth', e.target.value)}
              placeholder="e.g., 10900"
              className={`
                w-full px-3 py-2 border rounded-md text-sm transition-colors
                ${fieldErrors.depth 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }
              `}
              disabled={isLoading}
            />
            {fieldErrors.depth && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.depth}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">-11000 to 11000 meters (+ = deeper)</p>
          </div>
        </div>

        {/* Time Input (Optional) */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="time" className="block text-sm font-medium text-gray-700">
              Time (Optional)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowTimeInput(!showTimeInput)}
                className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
              >
                {showTimeInput ? 'Hide' : 'Show'} Time Input
              </button>
              {showTimeInput && (
                <>
                  <button
                    type="button"
                    onClick={setCurrentTime}
                    className="text-xs text-green-600 hover:text-green-800 transition-colors"
                  >
                    Use Current Time
                  </button>
                  <button
                    type="button"
                    onClick={clearTime}
                    className="text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>
          
          {showTimeInput && (
            <div>
              <input
                id="time"
                type="text"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                placeholder="2025-08-14T12:00:00Z"
                className={`
                  w-full px-3 py-2 border rounded-md text-sm transition-colors
                  ${fieldErrors.time 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  }
                `}
                disabled={isLoading}
              />
              {fieldErrors.time && (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.time}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                ISO-8601 format (YYYY-MM-DDTHH:mm:ssZ). Leave blank to use current time.
              </p>
            </div>
          )}
        </div>

        {/* Coordinate Preview */}
        {(() => {
          const preview = getFormattedPreview();
          return preview ? (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <h4 className="text-sm font-medium text-blue-800 mb-1">Target Preview</h4>
              <p className="text-sm text-blue-700">{preview}</p>
            </div>
          ) : null;
        })()}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <h4 className="text-sm font-medium text-red-800 mb-2">Validation Errors</h4>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{error}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isLoading || !formData.lat || !formData.lon || !formData.depth}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Setting Target...
              </span>
            ) : (
              'Set Target Position'
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setFormData({ lat: '', lon: '', depth: '', time: '' });
              setValidationErrors([]);
              setFieldErrors({});
            }}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Coordinates use decimal degrees (positive = North/East, negative = South/West)</p>
          <p>• Depth uses meters with positive values going deeper underwater</p>
          <p>• Time is optional and defaults to current time if not specified</p>
          <p>• The agent will navigate to this position when the target is set</p>
        </div>
      </form>
    </div>
  );
};

export default TargetForm;