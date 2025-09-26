import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const LogoutButton = () => {
  const { logout } = useAuth0();

  return (
    <button
      onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
      className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-gray-500"
    >
      Log Out
    </button>
  );
};

export default LogoutButton;
