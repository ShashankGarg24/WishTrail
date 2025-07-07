import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useApiStore from '../store/apiStore';

const UserProfile = () => {
  const { userId } = useParams();
  const { user, isAuthenticated } = useApiStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          User Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          This page is under development. Please check back later!
        </p>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Requested user ID: {userId}
        </p>
      </div>
    </div>
  );
};

export default UserProfile; 