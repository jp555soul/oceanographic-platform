import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const Profile = () => {
  const { user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return <div>Loading ...</div>;
  }

  return (
    isAuthenticated && (
      <div className="flex items-center">
        <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full mr-2" />
        <span className="text-white">{user.name}</span>
      </div>
    )
  );
};

export default Profile;
