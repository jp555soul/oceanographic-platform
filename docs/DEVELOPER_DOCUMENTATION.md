# Developer Documentation

## 1. Introduction

This document provides technical documentation for the CubeAI Oceanographic Platform, a comprehensive oceanographic data visualization and analysis platform. This application provides real-time coastal monitoring capabilities with interactive visualization, AI-powered analysis, and comprehensive data management.

The application is built with React and uses a modern technology stack to deliver a high-performance, interactive user experience.

## 2. Getting Started

### 2.1. Prerequisites

- Node.js (v16.0.0 or higher)
- npm or yarn package manager
- Mapbox access token

### 2.2. Installation

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd coastal-oceanographic-monitor
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory and add the following environment variables:
    ```env
    REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
    REACT_APP_API_TOKEN=your_api_token_here
    REACT_APP_BASE_URL=https://your-api-domain.com
    REACT_APP_HOLOOCEAN_ENDPOINT=wss://your-holoocean-domain.com
    ```

    **Note on Production Environments:**
    For production deployments, it is strongly recommended to use secure protocols for all endpoints:
    - `REACT_APP_BASE_URL` should use `https://`.
    - `REACT_APP_HOLOOCEAN_ENDPOINT` should use `wss://`.
    The application will log warnings to the console during production builds if insecure protocols are detected.

4.  **Start the development server**
    ```bash
    npm start
    ```

5.  **Open your browser**
    Navigate to `http://localhost:3000`

## 3. Project Structure

The project is organized into the following directories:

-   `src/`: Contains the main source code for the application.
    -   `assets/`: Contains static assets like images and videos.
    -   `components/`: Contains the React components, organized by feature.
        -   `admin/`: Components for administrative tasks, like password protection.
        -   `chatbot/`: The AI-powered chatbot component.
        -   `common/`: Common components used throughout the application (e.g., loading and error screens).
        -   `holoocean/`: Components related to the HoloOcean 3D integration.
        -   `layout/`: Layout components, such as the header and footer.
        -   `map/`: Components for the interactive map.
        -   `panels/`: Components for the control, data, and output panels.
        -   `tutorial/`: Components for the interactive tutorial.
    -   `contexts/`: Contains the React Context providers for managing global state.
    -   `hooks/`: Contains custom React hooks for managing application logic.
    -   `services/`: Contains services for interacting with external APIs and processing data.
-   `public/`: Contains the public assets for the application, including `index.html`.

## 4. State Management

The application uses React Context for global state management. The main context is `OceanDataContext`, which provides data and functions to all components in the application.

The `OceanDataContext` is located in `src/contexts/OceanDataContext.js`. It manages the following state:

-   Oceanographic data
-   Map settings
-   UI state (e.g., loading and error states)
-   User authentication

The `useOcean` hook is used to access the `OceanDataContext` from any component in the application.

## 5. Data Flow

The application loads data from two sources: CSV files and an API.

-   **CSV Files**: CSV files are loaded from the `src/data/` directory. The `dataService.js` service is responsible for parsing the CSV files and transforming them into a format that can be used by the application.
-   **API**: The application can also load data from an API. The `aiService.js` service is responsible for making requests to the API and handling the responses.

Once the data is loaded, it is stored in the `OceanDataContext` and made available to all components in the application. The components then use the data to render visualizations and perform analysis.

## 6. API Reference

The application interacts with an external API for fetching oceanographic data.

### 6.1. Get Oceanographic Data

-   **Endpoint**: `/api/oceanographic-data`
-   **Method**: `GET`
-   **Authentication**: Bearer token
-   **Response**:
    ```json
    {
      "data": [
        {
          "time": "2024-01-01T00:00:00Z",
          "latitude": 30.2,
          "longitude": -89.1,
          "temperature": 23.5,
          "currentspeed": 0.75
        }
      ]
    }
    ```

## 7. Contributing

### 7.1. Development Workflow

1.  Fork the repository.
2.  Create a feature branch.
3.  Make your changes.
4.  Test thoroughly.
5.  Submit a pull request.

### 7.2. Code Standards

-   Follow React best practices.
-   Use functional components with hooks.
-   Implement proper error handling.
-   Write comprehensive tests.
