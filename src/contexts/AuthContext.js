import React from 'react';
import { Auth0Provider } from '@auth0/auth0-react';

const Auth0ProviderWrapper = ({ children }) => {
  const domain = process.env.REACT_APP_AUTH0_DOMAIN;
  const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;

  if (!domain || !clientId || !audience) {
    return (
      <div style={{ padding: 20, textAlign: 'center', backgroundColor: 'red', color: 'white' }}>
        <h1>Auth0 Configuration Missing</h1>
        <p>Please make sure you have set up your .env file with REACT_APP_AUTH0_DOMAIN, REACT_APP_AUTH0_CLIENT_ID, and REACT_APP_AUTH0_AUDIENCE.</p>
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience,
      }}
    >
      {children}
    </Auth0Provider>
  );
};

export default Auth0ProviderWrapper;
