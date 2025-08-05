# Coastal Oceanographic Monitor

A comprehensive oceanographic data visualization and analysis platform developed for USM (University of Southern Mississippi) Maritime Technology Solutions. This application provides real-time coastal monitoring capabilities with interactive visualization, AI-powered analysis, and comprehensive data management.

## 🌊 Features

### 📊 **Interactive Data Visualization**
- **Dynamic Map Interface**: Interactive ocean current maps powered by Mapbox GL JS and DeckGL
- **Station Markers**: Real-time monitoring stations with data point indicators
- **Current Vectors**: Animated flow visualization showing current speed and direction
- **Time Series Charts**: Temperature, wave height, and current speed analysis

### 🤖 **AI-Powered Analysis**
- **BlueAI Chatbot**: Intelligent oceanographic data interpreter
- **Contextual Responses**: Analysis based on current conditions, forecasts, and safety assessments
- **Real-time Insights**: Temperature gradients, wave patterns, and current analysis

### 📈 **Comprehensive Data Management**
- **Multi-Source Data Loading**: Supports CSV files, API endpoints, and simulated data
- **NGOSF2 Model Integration**: Advanced oceanographic modeling capabilities
- **Parameter Selection**: Current speed, wave height, temperature, salinity, pressure
- **Temporal Controls**: Animation playback with variable speed and loop modes

### 🎛️ **Advanced Controls**
- **Model Control Panel**: Area selection, depth configuration, parameter adjustment
- **HoloOcean 3D Integration**: Immersive depth profiling and visualization
- **Environmental Data Display**: Real-time temperature, salinity, pressure monitoring
- **Interactive POV Selection**: Click-to-explore ocean positions

## 🚀 Getting Started

### Prerequisites

- Node.js (v16.0.0 or higher)
- npm or yarn package manager
- Mapbox access token

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd coastal-oceanographic-monitor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
   REACT_APP_API_TOKEN=your_api_token_here
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📁 Data Sources

### CSV Data Loading
Place your oceanographic CSV files in the `src/data/` directory. The application supports:

- **Automatic Discovery**: Files are automatically detected and loaded
- **Expected Columns**: `time`, `latitude`, `longitude`, `temperature`, `currentspeed`, `currentdirection`, `significantwaveheight`, `salinity`, `pressure_dbars`
- **Multiple Files**: Supports loading multiple CSV files simultaneously
- **Metadata Tracking**: Automatic source file tracking and data quality metrics

### API Integration
Configure API endpoints for real-time data:
- Endpoint: `/api/oceanographic-data`
- Authentication: Bearer token support
- Format: JSON with oceanographic measurements

### Data Format Example
```csv
time,latitude,longitude,temperature,currentspeed,currentdirection,significantwaveheight,salinity,pressure_dbars
2024-01-01T00:00:00Z,30.2,-89.1,23.5,0.75,180,1.2,35.2,105.7
```

## 🛠️ Technology Stack

### Core Technologies
- **React 18**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development (if applicable)
- **Tailwind CSS**: Utility-first styling framework

### Visualization Libraries
- **Mapbox GL JS**: Interactive map rendering
- **DeckGL**: WebGL-powered data visualization
- **Recharts**: Time series and data charting
- **Framer Motion**: Smooth animations and transitions

### Data Processing
- **PapaCSV**: CSV parsing and processing
- **Lodash**: Utility functions for data manipulation

### UI Components
- **Lucide React**: Modern icon library
- **Custom Components**: Specialized oceanographic interfaces

## 🎯 Usage Guide

### 1. **Model Control Panel**
- Select monitoring area (MSP, USM, MBL)
- Choose model type (NGOSF2)
- Set date/time for historical data
- Adjust depth parameters (0-1000ft)
- Select visualization parameters

### 2. **Interactive Map**
- **Click stations** to view detailed information
- **Click map areas** to set HoloOcean POV
- **Hover stations** for quick data preview
- **Zoom and pan** for detailed exploration

### 3. **AI Analysis**
- Use the floating chat button to open BlueAI
- Ask questions about current conditions
- Request forecasts and safety assessments
- Analyze specific stations or parameters

### 4. **Animation Controls**
- **Play/Pause**: Control temporal animation
- **Speed Adjustment**: 0.5x to 4x playback speed
- **Loop Modes**: Repeat or play once
- **Frame Navigation**: Manual frame selection

## 📊 Data Processing Pipeline

1. **Data Ingestion**: CSV files loaded via webpack context or manifest
2. **Validation**: Coordinate and data type validation
3. **Station Generation**: Automatic grouping by lat/lng coordinates
4. **Time Series Processing**: Temporal data organization and filtering
5. **Visualization Rendering**: Real-time map and chart updates

## 🔧 Configuration

### Model Parameters
- **NGOSF2**: Primary oceanographic model
- **Depth Range**: 0-1000 feet
- **Parameters**: Current Speed, Heading, Wave Height, Temperature, Salinity, Pressure
- **Temporal Resolution**: Variable based on data availability

### Map Configuration
- **Default View**: Gulf Coast (30.2°N, 89.0°W)
- **Zoom Range**: 1-20
- **Projection**: Web Mercator
- **Style**: Dark theme optimized for oceanographic data

## 🚦 API Reference

### Data Endpoints
```javascript
// Load oceanographic data
GET /api/oceanographic-data
Authorization: Bearer <token>

// Response format
{
  "data": [
    {
      "time": "2024-01-01T00:00:00Z",
      "latitude": 30.2,
      "longitude": -89.1,
      "temperature": 23.5,
      "currentspeed": 0.75,
      // ... additional parameters
    }
  ]
}
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Code Standards
- Follow React best practices
- Use functional components with hooks
- Implement proper error handling
- Include TypeScript types (if applicable)
- Write comprehensive tests

## 📝 License

This project is developed for USM Maritime Technology Solutions. All rights reserved.

## 🙏 Acknowledgments

- **Roger F. Wicker Center for Ocean Enterprise**: Primary sponsor and research partner
- **Bluemvmt**: Platform development and AI integration
- **NOAA**: Oceanographic data standards and methodologies
- **USM Marine Science**: Research collaboration and validation

## 📞 Support

For technical support or research collaboration:
- **USM Maritime Technology Solutions**
- **Documentation**: Check the `/docs` folder for detailed technical documentation
- **Issues**: Report bugs and feature requests via GitHub issues

---

**Powered by Bluemvmt** | **Roger F. Wicker Center for Ocean Enterprise**