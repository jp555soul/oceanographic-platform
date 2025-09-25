import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LoginButton = () => {
  const { loginWithRedirect, isLoading } = useAuth0();

  const handleLogin = async () => {
    try {
      await loginWithRedirect({
        authorizationParams: {
          redirect_uri: window.location.origin + '/auth/callback',
          scope: "openid profile email",
          response_type: "code"
        }
      });
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={isLoading}
      className="w-full py-2 px-4 bg-pink-600 hover:bg-pink-700 disabled:bg-pink-400 rounded-md font-semibold text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-pink-500 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Logging in...
        </span>
      ) : (
        'Log In'
      )}
    </button>
  );
};

export default LoginButton;