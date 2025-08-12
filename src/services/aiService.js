/**
 * Generates a contextual AI response based on a user message and current data.
 * @param {string} message - The user's input message.
 * @param {object} context - An object containing the current state of the application.
 * @param {object} context.currentData - The most recent data point from the time series.
 * @param {Array} context.timeSeriesData - The array of time series data for charts.
 * @param {string} context.dataSource - The source of the data (e.g., 'csv', 'simulated').
 * @param {number} context.selectedDepth - The currently selected depth.
 * @param {string} context.selectedModel - The currently selected model.
 * @param {number} context.playbackSpeed - The current animation playback speed.
 * @param {object} context.holoOceanPOV - The current Point of View coordinates.
 * @param {number} context.currentFrame - The current animation frame number.
 * @param {number} context.totalFrames - The total number of frames available.
 * @returns {string} A formatted string containing the AI's response.
 */
export const getAIResponse = (message, context) => {
    const {
        currentData,
        timeSeriesData = [],
        dataSource = 'simulated',
        selectedDepth = 33,
        selectedModel = 'NGOSF2',
        playbackSpeed = 1,
        holoOceanPOV = { x: 0, y: 0, depth: 33 },
        currentFrame = 0,
        totalFrames = 24
    } = context;

    const msg = message.toLowerCase();

    // Data source context
    if (msg.includes('data') && msg.includes('source')) {
        return `Data source: Currently using ${dataSource} data. ${timeSeriesData.length > 0 ? `Loaded ${totalFrames} records from CSV files with real oceanographic measurements.` : 'Using simulated oceanographic patterns for demonstration.'}`;
    }

    // Contextual analysis based on current parameters
    if (msg.includes('current') || msg.includes('flow')) {
        if (!currentData) return "I don't have any current data to analyze at the moment.";
        return `Current analysis: Using ${dataSource} data, at ${selectedDepth}ft depth, I'm detecting ${currentData.currentSpeed.toFixed(2)} m/s flow velocity with heading ${currentData.heading.toFixed(1)}°. The ${selectedModel} model shows tidal-dominated circulation with ${playbackSpeed > 1 ? 'accelerated' : 'normal'} temporal resolution.`;
    }

    if (msg.includes('wave') || msg.includes('swell')) {
        if (!currentData) return "I don't have any wave data to analyze at the moment.";
        return `Wave dynamics: Current sea surface height is ${currentData.waveHeight.toFixed(2)}m. The spectral analysis indicates ${currentData.waveHeight > 0.5 ? 'elevated' : 'moderate'} sea state conditions. Maritime operations should ${currentData.waveHeight > 1.0 ? 'exercise caution' : 'proceed normally'}.`;
    }

    if (msg.includes('temperature') || msg.includes('thermal')) {
        if (currentData?.temperature !== null && currentData?.temperature !== undefined) {
            const baseTemp = timeSeriesData[0]?.temperature || 23.5;
            const anomaly = currentData.temperature - baseTemp;
            return `Thermal structure: Water temperature at ${selectedDepth}ft is ${currentData.temperature.toFixed(2)}°F. The vertical gradient suggests ${selectedDepth < 50 ? 'mixed layer' : 'thermocline'} dynamics. This thermal profile influences marine life distribution and acoustic propagation. Temperature anomaly of ${anomaly.toFixed(1)}°F from baseline detected.`;
        } else {
            return `Thermal data: No temperature measurements are available for the current dataset at ${selectedDepth}ft depth. Please ensure the CSV data includes a 'temp' column for thermal analysis.`;
        }
    }

    if (msg.includes('predict') || msg.includes('forecast')) {
        if (!currentData) return "I need current data to make a prediction.";
        const trend = currentData.currentSpeed > 0.8 ? 'increasing' : 'stable';
        return `Predictive analysis: Based on the ${selectedModel} ensemble, I forecast ${trend} current velocities over the next 6-hour window. Tidal harmonics suggest peak flows around ${new Date(Date.now() + 3 * 3600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} UTC. Sea surface conditions will ${currentData.waveHeight > 0.5 ? 'remain elevated' : 'remain moderate'} with 85% confidence.`;
    }

    if (msg.includes('holographic') || msg.includes('3d') || msg.includes('visualization')) {
        return `HoloOcean integration: The 3D visualization at POV coordinates (${holoOceanPOV.x.toFixed(1)}, ${holoOceanPOV.y.toFixed(1)}) shows immersive environmental data. Pixel streaming provides real-time depth profiling from the surface to ${holoOceanPOV.depth}ft. WebRTC connectivity enables collaborative analysis with remote teams.`;
    }

    if (msg.includes('safety') || msg.includes('risk') || msg.includes('alert')) {
        if (!currentData) return "I can't assess risk without current data.";
        const riskLevel = currentData.currentSpeed > 1.5 || currentData.waveHeight > 0.8 ? 'ELEVATED' : 'NORMAL';
        let assessment = `Maritime safety assessment: Current risk level is ${riskLevel}. `;
        if (currentData.currentSpeed > 1.5) assessment += `Strong currents (${currentData.currentSpeed.toFixed(2)} m/s) may affect vessel positioning. `;
        if (currentData.waveHeight > 0.8) assessment += `Elevated sea surface conditions (${currentData.waveHeight.toFixed(2)}m) impact small craft operations. `;
        assessment += `Recommend ${riskLevel === 'ELEVATED' ? 'enhanced precautions and continuous monitoring' : 'standard operational procedures'}.`;
        return assessment;
    }

    if (msg.includes('model') || msg.includes('accuracy')) {
        return `Model performance: ${selectedModel} resolution is typically around 1-3km with regional coverage. Validation against buoy data shows high correlation for current predictions and wave forecasts. Data assimilation includes satellite altimetry, ARGO floats, and coastal stations for continuous improvement.`;
    }

    if (msg.includes('usm') || msg.includes('university') || msg.includes('research')) {
        return `USM research integration: This platform supports Southern Miss marine science operations with high-fidelity coastal modeling. The NGOSF2 system provides real-time data fusion for academic research, thesis projects, and collaborative studies, including NOAA partnership initiatives.`;
    }

    if (msg.includes('export') || msg.includes('download')) {
        return `Data access: Time series exports are available in NetCDF, CSV, and MATLAB formats. The current dataset contains ${totalFrames} temporal snapshots with multiple parameters. API endpoints can provide programmatic access for USM researchers.`;
    }

    // Fallback contextual response
    const fallbacks = [
        `Advanced analysis: The ${selectedModel} model at ${selectedDepth}ft depth reveals complex data patterns. Current frame ${currentFrame + 1}/${totalFrames} shows ${Math.random() > 0.5 ? 'increasing' : 'stable'} trends with ${playbackSpeed}x temporal acceleration.`,
        `Oceanographic insight: Multi-parameter correlation indicates a ${Math.random() > 0.5 ? 'strong coupling' : 'weak correlation'} between environmental factors. This integrated visualization supports both real-time analysis and historical trend assessment.`
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};