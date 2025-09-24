import { useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

export default function AuthCallback() {
  const { handleRedirectCallback } = useAuth0();
  const navigate = useNavigate();

  useEffect(() => {
    const processCallback = async () => {
      try {
        await handleRedirectCallback();
        navigate('/');
      } catch (error) {
        console.error('Error handling redirect callback:', error);
        // Optionally, redirect to an error page
        navigate('/');
      }
    };
    processCallback();
  }, [handleRedirectCallback, navigate]);

  return <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">Logging in...</div>;
}