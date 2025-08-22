import {
    Waves,
    Settings,
    Map,
    BarChart3,
    Activity,
    MessageCircle,
    Eye,
    CheckCircle,
    Globe,
    Navigation,
    Thermometer,
    Wind,
    Layers,
    Database,
    Download
  } from 'lucide-react';
  
  // Tutorial step categories
  export const TUTORIAL_CATEGORIES = {
    GETTING_STARTED: 'getting_started',
    BASIC_FEATURES: 'basic_features',
    ADVANCED_FEATURES: 'advanced_features',
    DATA_ANALYSIS: 'data_analysis'
  };
  
  // Tutorial step definitions
  export const TUTORIAL_STEPS = [
    {
      id: 'welcome',
      category: TUTORIAL_CATEGORIES.GETTING_STARTED,
      title: 'Welcome to CubeAI',
      subtitle: 'Your comprehensive platform for ocean data analysis',
      description: 'Interactive ocean data visualization and analysis platform.',
      content: `Welcome to the CubeAI - a powerful platform for exploring and analyzing ocean data in real-time.
  
  **What you'll learn:**
  • Navigate ocean data visualizations and controls
  • Interact with monitoring stations and environmental data
  • Use AI-powered analysis for oceanographic insights
  • Export and analyze time-series data
  • Explore advanced mapping and 3D visualization features
  
  **This tutorial takes approximately 5-7 minutes.**
  
  The platform integrates real-time oceanographic data, advanced modeling, and AI analysis to support marine research, maritime operations, and coastal management.`,
      icon: Waves,
      target: null,
      position: 'center',
      actions: ['next'],
      duration: 30,
      category_color: 'blue'
    },
  
    {
      id: 'control-panel',
      category: TUTORIAL_CATEGORIES.BASIC_FEATURES,
      title: 'Master the Control Panel',
      subtitle: 'Your command center for ocean data exploration',
      description: 'Learn to navigate data controls, animation, and parameter selection.',
      content: `The Control Panel is your primary interface for controlling the oceanographic visualization:
  
  **🎯 Study Area Selection**
  Choose geographic regions: MSP (Mississippi Sound), USM (University of Southern Mississippi), MBL (Marine Biology Laboratory)
  
  **🌊 Ocean Model Selection**
  • NGOSF2: Northern Gulf of Mexico operational forecast
  • ROMS: Regional Ocean Modeling System
  • HYCOM: Hybrid Coordinate Ocean Model
  
  **📊 Parameter Controls**
  Monitor various oceanographic parameters:
  • Current Speed & Direction (m/s, degrees)
  • Surface Elevation & Direction (m, degrees)  
  • Temperature, Salinity, Pressure
  • Wind Speed & Direction
  
  **⏰ Temporal Navigation**
  • Date/Time selection for historical data
  • Animation playback controls (play/pause/speed)
  • Frame-by-frame navigation
  • Loop modes (repeat, once, bounce)
  
  **📏 Depth Selection**
  Choose measurement depths from surface (0ft) to deep water (200+ ft) to analyze vertical ocean structure.
  
  **Try changing the playback speed or selecting different parameters to see live updates.**`,
      icon: Settings,
      target: '[data-tutorial="control-panel"]',
      position: 'bottom',
      actions: ['prev', 'next'],
      highlight: true,
      duration: 45,
      tips: [
        'Use keyboard shortcuts: Space for play/pause, arrow keys for frame navigation',
        'Higher playback speeds help identify trends over longer time periods',
        'Different depths reveal stratified ocean structure'
      ]
    },
  
    {
      id: 'map-interaction',
      category: TUTORIAL_CATEGORIES.BASIC_FEATURES,
      title: 'Interactive Ocean Mapping',
      subtitle: 'Explore stations, currents, and environmental layers',
      description: 'Navigate the map, interact with monitoring stations, and customize layers.',
      content: `The interactive map provides comprehensive ocean visualization with multiple data layers and controls:
  
  **🗺️ Map Controls & Styles**
  • Satellite, Dark, Outdoors, Streets view modes
  • Globe projection with auto-rotation option
  • Zoom and pan controls with touch/mouse support
  • Global view and station zoom buttons
  
  **🎯 Monitoring Stations**
  • Colored markers represent data collection stations
  • Click stations to view detailed information
  • Station colors indicate data density/quality
  • Real ocean monitoring locations vs simulated data
  
  **🌬️ Wind Visualization**
  • **Live Wind Particles**: Real-time wind data visualization
  • **Wind Vectors**: Synthetic wind pattern display  
  • Adjustable particle count, speed, and fade settings
  • Color-coded wind speeds (light air to storm conditions)
  
  **🌊 Oceanographic Layers**
  • **Bathymetry**: Ocean depth visualization (-11,000m to surface)
  • **Sea Surface Temperature**: MODIS satellite data overlay
  • **Ocean Current Vectors**: Real-time flow direction and speed
  • **Ocean Base Layer**: ArcGIS oceanographic reference map
  
  **📍 HoloOcean Integration**
  • Green POV marker shows 3D simulation viewpoint
  • Click anywhere to update simulation perspective
  • Coordinate system for underwater environment
  
  **💡 Pro Tips:**
  • Enable globe auto-rotation for global exploration
  • Combine multiple layers for comprehensive analysis
  • Use wind particles for real-time atmospheric conditions`,
      icon: Map,
      target: '[data-tutorial="map-container"]',
      position: 'right',
      actions: ['prev', 'next'],
      highlight: true,
      duration: 60,
      tips: [
        'Right-click and drag to rotate the 3D globe view',
        'Station validation shows whether locations are on water vs land',
        'Wind particle density affects performance - adjust for your device'
      ]
    },
  
    {
      id: 'data-panels',
      category: TUTORIAL_CATEGORIES.DATA_ANALYSIS,
      title: 'Environmental Data Analysis',
      subtitle: 'Real-time monitoring and trend analysis',
      description: 'Understand environmental readings, time-series charts, and data quality.',
      content: `The Data Panels provide comprehensive environmental monitoring and analysis tools:
  
  **📊 Environmental Data Dashboard**
  Real-time sensor readings with quality indicators:
  • **Temperature**: Water temperature in °F with depth correlation
  • **Salinity**: Practical Salinity Units (PSU) for water density
  • **Pressure**: Depth pressure in decibars (dbar)
  • **Sensor Depth**: Current measurement depth in feet
  
  **📈 Time Series Analysis**
  Interactive charts showing temporal trends:
  • **Current Speed Trends**: Flow velocity over time (m/s)
  • **Sound Speed Variations**: Acoustic velocity changes (m/s)
  • **Surface Elevation (SSH) Patterns**: Sea surface elevation (m)
  • **Temperature Fluctuations**: Thermal structure changes (°F)
  
  **🎮 HoloOcean 3D Visualization**
  Immersive underwater environment simulation:
  • Interactive depth profiling from surface to selected depth
  • Real-time parameter visualization in 3D space
  • WebRTC streaming for collaborative analysis
  • POV coordinate system for spatial navigation
  
  **⚙️ Data Quality Assessment**
  • Real-time vs Historical data indicators
  • Connection status monitoring
  • Data freshness timestamps
  • Station validation and reliability metrics
  
  **🔧 Customization Options**
  • Adjustable time ranges: 12h/24h/48h views
  • Parameter selection for focused analysis
  • Refresh data capability
  • Mobile-responsive charts and controls
  
  **Advanced Features:**
  • API integration for historical analysis
  • Multi-parameter correlation detection
  • Export capabilities for external analysis`,
      icon: BarChart3,
      target: '[data-tutorial="data-panels"]',
      position: 'left',
      actions: ['prev', 'next'],
      highlight: true,
      duration: 50,
      tips: [
        'Longer time ranges reveal seasonal patterns',
        'Temperature gradients indicate thermocline depth',
        'Sound speed affects sonar and acoustic equipment'
      ]
    },
  
    {
      id: 'output-module',
      category: TUTORIAL_CATEGORIES.DATA_ANALYSIS,
      title: 'Analysis Output & History',
      subtitle: 'Track insights and export analysis results',
      description: 'Manage AI analysis responses, export data, and review insights.',
      content: `The Output Module serves as your analysis command center and historical record:
  
  **📝 Response Management**
  • Complete history of AI analysis responses
  • Automatic categorization (charts, tables, text analysis)
  • Expandable/collapsible interface for space optimization
  • Context preservation for each analysis
  
  **🔍 Filtering & Organization**
  Smart filtering options:
  • **All Responses**: Complete analysis history
  • **Charts & Trends**: Graphical analysis results
  • **Data & Tables**: Structured data presentations  
  • **Text Analysis**: Narrative insights and recommendations
  
  **📊 Interactive Content**
  Dynamic response enhancement:
  • Auto-generated charts based on analysis context
  • Environmental data tables with current conditions
  • Parameter-specific visualizations
  • Time-stamped analysis metadata
  
  **💾 Export & Sharing**
  Professional data export capabilities:
  • JSON format for technical analysis
  • Copy responses to clipboard
  • Downloadable analysis reports
  • Shareable insights for collaboration
  
  **🔄 Analysis Context Tracking**
  Each response includes complete context:
  • Current frame and temporal position
  • Selected parameters and depth settings
  • Environmental conditions at time of analysis
  • Data source and quality metrics
  
  **⚡ Real-time Integration**
  • Responses appear simultaneously in chat and output module
  • Live updates during parameter changes
  • Automatic context awareness for relevant insights
  
  **Pro Features:**
  • Search through analysis history
  • Bookmark important insights
  • Export multiple responses as compiled report`,
      icon: Activity,
      target: '[data-tutorial="output-module"]',
      position: 'left',
      actions: ['prev', 'next'],
      highlight: true,
      duration: 40,
      tips: [
        'Use filters to quickly find specific types of analysis',
        'Export responses for inclusion in research reports',
        'Context metadata helps reproduce analysis conditions'
      ]
    },
  
    {
      id: 'chatbot',
      category: TUTORIAL_CATEGORIES.BASIC_FEATURES,
      title: 'CubeAI Assistant',
      subtitle: 'Intelligent oceanographic analysis and insights',
      description: 'Master AI-powered analysis with natural language queries.',
      content: `CubeAI is your expert oceanographic analyst, providing intelligent insights about marine conditions:
  
  **🤖 Natural Language Interface**
  Ask questions in plain English about:
  • Current oceanographic conditions
  • Weather and sea state analysis  
  • Safety assessments for maritime operations
  • Predictive forecasting and trend analysis
  • Equipment recommendations and operational guidance
  
  **📊 Context-Aware Analysis**
  CubeAI automatically considers:
  • Your current parameter selections (depth, location, time)
  • Real-time environmental data
  • Historical trends and patterns
  • Model outputs and confidence levels
  • Data source quality and reliability
  
  **🔍 Specialized Capabilities**
  • **Marine Safety**: Risk assessments for vessel operations
  • **Environmental Analysis**: Temperature gradients, salinity fronts
  • **Operational Forecasting**: 6-12 hour condition predictions
  • **Research Support**: USM academic collaboration features
  • **Data Interpretation**: Complex oceanographic phenomenon explanation
  
  **💬 Quick Query Examples**
  Try these conversation starters:
  • *"What are the current conditions?"*
  • *"Analyze wave patterns for small boat safety"*
  • *"Predict conditions for the next 6 hours"*
  • *"How does temperature vary with depth?"*
  • *"Is it safe for diving operations?"*
  • *"Compare today's data to historical averages"*
  
  **🎯 Smart Suggestions**
  • Quick-access buttons for common queries
  • Context-sensitive question prompts
  • Follow-up question recommendations
  • Parameter adjustment suggestions
  
  **⚡ Integration Features**
  • Responses automatically saved to Output Module
  • Real-time data incorporation
  • Cross-platform compatibility
  • Mobile-optimized interface`,
      icon: MessageCircle,
      target: '[data-tutorial="chatbot"]',
      position: 'left',
      actions: ['prev', 'next'],
      highlight: true,
      duration: 45,
      tips: [
        'Be specific about location and conditions for best results',
        'Ask follow-up questions to dive deeper into analysis',
        'CubeAI learns from your current settings and selections'
      ]
    },
  
    {
      id: 'advanced-features',
      category: TUTORIAL_CATEGORIES.ADVANCED_FEATURES,
      title: 'Advanced Platform Features',
      subtitle: 'Power user capabilities and hidden features',
      description: 'Unlock advanced analysis tools and professional workflows.',
      content: `Discover powerful features for advanced oceanographic analysis and research:
  
  **🎯 Station Deep Analysis**
  Professional monitoring station analysis:
  • Click any station → "Analyze Station Data" for comprehensive reports
  • Multi-parameter correlation analysis
  • Data quality validation and reliability assessment
  • Historical trend analysis with statistical confidence
  • CSV export for external processing (research/reports)
  
  **🌍 Global Ocean Exploration**
  Advanced mapping and visualization:
  • **Globe Mode**: Worldwide ocean exploration with projection switching
  • **Auto-rotation**: Continuous global scanning mode
  • **Multi-scale Analysis**: Seamless zoom from global to local scales
  • **Custom Projections**: Mercator, orthographic, stereographic views
  
  **📊 Data Management & Quality Control**
  Professional data handling:
  • **Real-time Quality Monitoring**: Connection status and data freshness
  • **Data Validation**: Ocean vs land position verification
  • **Performance Optimization**: Adaptive loading for large datasets
  
  **🔧 Research & Collaboration Tools**
  Academic and professional features:
  • **USM Integration**: University of Southern Mississippi research support
  • **Export Capabilities**: NetCDF, MATLAB, CSV formats for analysis
  • **API Documentation**: Programmatic access for researchers
  • **Collaborative Analysis**: Shared sessions and viewpoints
  
  **📱 Mobile & Accessibility**
  Cross-platform optimization:
  • **Touch Controls**: Optimized for tablets and smartphones
  • **Responsive Design**: Adaptive layouts for any screen size
  • **Gesture Support**: Pinch-zoom, swipe navigation
  • **Offline Capability**: Cached data for field operations
  
  **⚙️ Customization & Automation**
  Power user configuration:
  • **Custom Layer Combinations**: Save preferred visualization setups
  • **Automated Monitoring**: Set alerts for condition changes
  • **Batch Processing**: Analyze multiple time periods simultaneously
  • **Integration APIs**: Connect with external monitoring systems`,
      icon: Eye,
      target: null,
      position: 'center',
      actions: ['prev', 'next'],
      duration: 60,
      tips: [
        'Station validation ensures data quality in research applications',
        'Export data in academic formats for peer-reviewed publications',
        'Mobile optimization allows field data collection and analysis'
      ]
    },
  
    {
      id: 'completion',
      category: TUTORIAL_CATEGORIES.GETTING_STARTED,
      title: 'Tutorial Complete! 🎉',
      subtitle: 'You\'re ready for professional ocean data analysis',
      description: 'Summary of learned features and next steps for exploration.',
      content: `Congratulations! You've mastered the CubeAI platform.
  
  **🎓 Skills Acquired:**
  ✅ **Control Panel Navigation** - Parameter selection, temporal controls, animation
  ✅ **Interactive Mapping** - Station analysis, layer management, global exploration
  ✅ **Data Analysis** - Environmental monitoring, time-series interpretation, quality assessment
  ✅ **AI-Powered Insights** - Natural language queries, predictive analysis, safety assessment
  ✅ **Advanced Features** - Export capabilities, research tools, mobile optimization
  
  **🚀 Next Steps for Exploration:**
  • **Explore Your Region**: Focus on local waters and monitoring stations
  • **Ask Complex Questions**: Use CubeAI for advanced oceanographic analysis
  • **Compare Time Periods**: Analyze seasonal patterns and long-term trends
  • **Export for Research**: Generate data for academic or operational use
  
  **🔧 Professional Applications:**
  • **Marine Operations**: Safety assessments and route planning
  • **Research Projects**: Data analysis for scientific publications
  • **Environmental Monitoring**: Coastal and offshore condition tracking
  • **Education**: Interactive learning for marine science students
  • **Emergency Response**: Real-time conditions for maritime incidents
  
  **📚 Additional Resources:**
  • Access this tutorial anytime via Settings → Tutorial
  • Check the Documentation section for API details
  • Contact USM Maritime Technology Solutions for research collaboration
  • Join the CubeAI community for updates and support
  
  **Ready to dive deep into ocean data analysis! 🌊**
  
  *The ocean holds countless secrets - this platform helps you discover them.*`,
      icon: CheckCircle,
      target: null,
      position: 'center',
      actions: ['prev', 'complete', 'restart'],
      duration: 45,
      category_color: 'green'
    }
  ];
  
  // Step management utilities
  export class TutorialStepManager {
    constructor(steps = TUTORIAL_STEPS) {
      this.steps = steps;
      this.currentStep = 0;
      this.completedSteps = new Set();
      this.startTime = null;
      this.stepTimes = {};
    }
  
    // Navigation methods
    goToStep(stepIndex) {
      if (stepIndex >= 0 && stepIndex < this.steps.length) {
        this.markStepCompleted(this.currentStep);
        this.currentStep = stepIndex;
        return this.getCurrentStep();
      }
      return null;
    }
  
    nextStep() {
      return this.goToStep(this.currentStep + 1);
    }
  
    prevStep() {
      return this.goToStep(this.currentStep - 1);
    }
  
    // Step state management
    getCurrentStep() {
      return this.steps[this.currentStep];
    }
  
    markStepCompleted(stepIndex) {
      this.completedSteps.add(stepIndex);
      this.stepTimes[stepIndex] = Date.now();
    }
  
    isStepCompleted(stepIndex) {
      return this.completedSteps.has(stepIndex);
    }
  
    getProgress() {
      return {
        current: this.currentStep + 1,
        total: this.steps.length,
        percentage: Math.round(((this.currentStep + 1) / this.steps.length) * 100),
        completed: this.completedSteps.size
      };
    }
  
    // Filtering and search
    getStepsByCategory(category) {
      return this.steps.filter(step => step.category === category);
    }
  
    findStepById(id) {
      return this.steps.find(step => step.id === id);
    }
  
    getStepsWithTargets() {
      return this.steps.filter(step => step.target);
    }
  
    // Analytics and timing
    startTutorial() {
      this.startTime = Date.now();
      this.currentStep = 0;
      this.completedSteps.clear();
      this.stepTimes = {};
    }
  
    getTutorialDuration() {
      if (!this.startTime) return 0;
      return Date.now() - this.startTime;
    }
  
    getStepDuration(stepIndex) {
      return this.stepTimes[stepIndex] || 0;
    }
  
    // Validation and requirements
    canAdvanceToStep(stepIndex) {
      // Add custom logic for step prerequisites
      return stepIndex >= 0 && stepIndex < this.steps.length;
    }
  
    getRequiredActions(stepIndex) {
      const step = this.steps[stepIndex];
      return step?.actions || [];
    }
  
    // Export and import
    exportProgress() {
      return {
        currentStep: this.currentStep,
        completedSteps: Array.from(this.completedSteps),
        stepTimes: this.stepTimes,
        startTime: this.startTime,
        totalDuration: this.getTutorialDuration()
      };
    }
  
    importProgress(progressData) {
      this.currentStep = progressData.currentStep || 0;
      this.completedSteps = new Set(progressData.completedSteps || []);
      this.stepTimes = progressData.stepTimes || {};
      this.startTime = progressData.startTime || null;
    }
  }
  
  // Utility functions
  export const getTutorialStepById = (id) => {
    return TUTORIAL_STEPS.find(step => step.id === id);
  };
  
  export const getTutorialCategories = () => {
    return Object.values(TUTORIAL_CATEGORIES);
  };
  
  export const getStepsByCategory = (category) => {
    return TUTORIAL_STEPS.filter(step => step.category === category);
  };
  
  export const getTotalEstimatedTime = () => {
    return TUTORIAL_STEPS.reduce((total, step) => total + (step.duration || 30), 0);
  };
  
  export const getStepTargets = () => {
    return TUTORIAL_STEPS
      .filter(step => step.target)
      .map(step => ({
        id: step.id,
        target: step.target,
        highlight: step.highlight
      }));
  };
  
  export default {
    TUTORIAL_STEPS,
    TUTORIAL_CATEGORIES,
    TutorialStepManager,
    getTutorialStepById,
    getTutorialCategories,
    getStepsByCategory,
    getTotalEstimatedTime,
    getStepTargets
  };