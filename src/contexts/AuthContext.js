import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';

const Auth0ProviderWrapper = ({ children }) => {
  const domain = process.env.REACT_APP_AUTH0_DOMAIN;
  const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
  const clientSecret = process.env.REACT_APP_AUTH0_CLIENT_SECRET;
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;
  const callbackUrl = process.env.REACT_APP_AUTH0_CALLBACK_URL || `${window.location.origin}/auth/callback`;

  // Enhanced validation
  const missingVars = [];
  if (!domain) missingVars.push('REACT_APP_AUTH0_DOMAIN');
  if (!clientId) missingVars.push('REACT_APP_AUTH0_CLIENT_ID');

  if (missingVars.length > 0) {
    return (
      <div style={{ 
        padding: 20, 
        textAlign: 'center', 
        backgroundColor: '#1e293b', 
        color: 'white',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column'
      }}>
        <div style={{ 
          maxWidth: '600px',
          padding: '2rem',
          backgroundColor: '#ef4444',
          borderRadius: '8px',
          color: 'white'
        }}>
          <h1 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>Auth0 Configuration Missing</h1>
          <p style={{ margin: '0 0 1rem 0' }}>
            Please make sure you have set up your .env file with the following required Auth0 variables:
          </p>
          <ul style={{ 
            textAlign: 'left', 
            margin: '1rem 0',
            padding: '0 0 0 2rem'
          }}>
            {missingVars.map(varName => (
              <li key={varName} style={{ margin: '0.5rem 0' }}>
                <code style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  padding: '2px 4px', 
                  borderRadius: '3px' 
                }}>
                  {varName}
                </code>
              </li>
            ))}
          </ul>
          <p style={{ margin: '1rem 0 0 0', fontSize: '0.875rem', opacity: 0.9 }}>
            Check your .env file in the project root and restart the development server after making changes.
          </p>
        </div>
      </div>
    );
  }

  console.log('Auth0 Configuration (SPA):', {
    domain,
    clientId,
    hasClientSecret: !!clientSecret,
    audience: audience || 'none (using default scopes)',
    callbackUrl
  });

  // For Single Page Applications, we use a simplified configuration
  const authorizationParams = {
    redirect_uri: callbackUrl,
    scope: "openid profile email"
  };

  // Only add audience if it exists and is not localhost
  if (audience && !audience.includes('localhost')) {
    authorizationParams.audience = audience;
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={authorizationParams}
      useRefreshTokens={true}
      cacheLocation="localstorage"
      skipRedirectCallback={false}
    >
      {children}
    </Auth0Provider>
  );
};

export default Auth0ProviderWrapper;