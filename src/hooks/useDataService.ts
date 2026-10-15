import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../services/dataService';
import { UserProfile, UserWallet, AppConfig } from '../types';

export function useDataService() {
  const [tick, setTick] = useState(0);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(dataService.getCurrentUser());
  const [wallet, setWallet] = useState<UserWallet | null>(
    currentUser ? dataService.getWallet(currentUser.id) : null
  );
  const [config, setConfig] = useState<AppConfig>(dataService.getAppConfig());

  const refresh = useCallback(() => {
    setTick((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      const u = dataService.getCurrentUser();
      setCurrentUser(u);
      setWallet(u ? dataService.getWallet(u.id) : null);
      setConfig(dataService.getAppConfig());
      setTick((prev) => prev + 1);
    };

    window.addEventListener('aetherpay_state_changed', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      window.removeEventListener('aetherpay_state_changed', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Update whenever currentUser changes
  useEffect(() => {
    if (currentUser) {
      setWallet(dataService.getWallet(currentUser.id));
    } else {
      setWallet(null);
    }
  }, [currentUser?.id, tick]);

  const switchUser = (userId: string) => {
    dataService.setCurrentUserId(userId);
    const u = dataService.getUserById(userId) || null;
    setCurrentUser(u);
    setWallet(u ? dataService.getWallet(u.id) : null);
  };

  const logout = () => {
    dataService.logout();
    setCurrentUser(null);
    setWallet(null);
  };

  return {
    currentUser,
    wallet,
    config,
    switchUser,
    logout,
    refresh,
    tick,
  };
}
