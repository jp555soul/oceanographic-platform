import { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const { error, isLoading, isAuthenticated } = useAuth0();
  const navigate = useNavigate();
  const [callbackError, setCallbackError] = useState(null);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    // If already authenticated, redirect to home
    if (isAuthenticated) {
      console.log('Auth0 callback successful - user authenticated');
      navigate('/', { replace: true });
      return;
    }

    // Prevent double processing
    if (hasProcessed || isLoading) {
      return;
    }

    const processCallback = async () => {
      try {
        console.log('Processing Auth0 callback for SPA...');
        setHasProcessed(true);
        
        // Check for error in URL first
        const urlParams = new URLSearchParams(window.location.search);
        const urlError = urlParams.get('error');
        const urlErrorDescription = urlParams.get('error_description');
        
        if (urlError) {
          throw new Error(`${urlError}: ${urlErrorDescription || 'Unknown error'}`);
        }

        // For SPA, the Auth0 SDK handles the callback automatically
        console.log('Auth0 SPA callback processing complete');
        
        // Navigate to home page after successful authentication
        navigate('/', { replace: true });
      } catch (error) {
        console.error('Error handling redirect callback:', error);
        setCallbackError(error);
        
        // If there's an error, redirect to home after a delay
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 3000);
      }
    };

    // Only process callback if we're on the callback URL
    if (window.location.pathname === '/auth/callback') {
      // Check if we have an authorization code or error in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const urlError = urlParams.get('error');
      
      if (urlError) {
        console.error('Auth0 callback URL error:', urlError);
        setCallbackError(new Error(urlError));
        setTimeout(() => navigate('/', { replace: true }), 3000);
      } else if (code) {
        processCallback();
      } else {
        console.warn('No authorization code found in callback URL');
        setTimeout(() => navigate('/', { replace: true }), 2000);
      }
    }
  }, [navigate, isLoading, isAuthenticated, hasProcessed]);

  if (callbackError || error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold mb-4 text-red-400">Authentication Error</h2>
          <p className="text-gray-300 mb-4">
            There was an issue completing your login. You will be redirected automatically.
          </p>
          <div className="text-sm text-gray-500 bg-slate-800 p-3 rounded">
            {callbackError?.message || error?.message || 'Unknown authentication error'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto mb-4"></div>
        <p className="text-lg">Completing login...</p>
        <p className="text-sm text-gray-400 mt-2">Processing authorization code...</p>
      </div>
    </div>
  );
}