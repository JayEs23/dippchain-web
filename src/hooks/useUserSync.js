// Hook to sync wallet connection with database user
import { useEffect, useState, useCallback } from 'react';
import { useAppKitAccount } from '@reown/appkit/react';

export function useUserSync() {
  const { address, isConnected } = useAppKitAccount();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const syncUser = useCallback(async (walletAddress) => {
    if (!walletAddress) return null;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to sync user');
      }

      setUser(data.user);
      
      // Store in localStorage for quick access
      localStorage.setItem('dippchain_user', JSON.stringify(data.user));
      
      return data.user;
    } catch (err) {
      console.error('User sync error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Sync user when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      syncUser(address);
    } else {
      setUser(null);
      localStorage.removeItem('dippchain_user');
    }
  }, [isConnected, address, syncUser]);

  // Load cached user on mount
  useEffect(() => {
    const cached = localStorage.getItem('dippchain_user');
    if (cached) {
      try {
        setUser(JSON.parse(cached));
      } catch {
        localStorage.removeItem('dippchain_user');
      }
    }
  }, []);

  return {
    user,
    loading,
    error,
    syncUser,
    isConnected,
    walletAddress: address,
  };
}

export default useUserSync;

