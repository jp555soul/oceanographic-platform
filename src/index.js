import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import Auth0ProviderWrapper from './contexts/AuthContext';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <Auth0ProviderWrapper>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Auth0ProviderWrapper>
  </React.StrictMode>
);

reportWebVitals();