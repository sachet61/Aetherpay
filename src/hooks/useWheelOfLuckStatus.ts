import { useCallback, useEffect, useRef, useState } from 'react';
import type { UserProfile, WheelStatusResponse } from '../types';
import { dataService } from '../services/dataService';
import {
  DEFAULT_WHEEL_OF_LUCK_CONFIG,
  computeServerAnchoredRemainingMs,
  deriveWheelUiState,
  isSpinAvailableForCustomer,
} from '../utils/wheelOfLuckUtils';

export function useWheelOfLuckStatus(currentUser: UserProfile | null) {
  const isCustomer = Boolean(currentUser && currentUser.role === 'customer');
  const userId = isCustomer ? currentUser!.id : '';

  const [wheelModalOpen, setWheelModalOpen] = useState(false);
  const wheelModalOpenRef = useRef(false);
  wheelModalOpenRef.current = wheelModalOpen;

  const [wheelStatus, setWheelStatus] = useState<WheelStatusResponse | null>(null);
  const [wheelFetchedAtMs, setWheelFetchedAtMs] = useState<number>(() => Date.now());
  const [isLoadingWheel, setIsLoadingWheel] = useState<boolean>(isCustomer);
  const [wheelStatusError, setWheelStatusError] = useState<string | null>(null);
  const [isRetryingWheel, setIsRetryingWheel] = useState(false);
  const [wheelClockMs, setWheelClockMs] = useState(() => Date.now());
  const autoExpiredRefreshRef = useRef<string | null>(null);
  const wheelStatusErrorRef = useRef<string | null>(null);
  wheelStatusErrorRef.current = wheelStatusError;

  const refreshWheelStatus = useCallback(async () => {
    if (!userId) return;
    const retryingFromError = Boolean(wheelStatusErrorRef.current);
    if (retryingFromError) setIsRetryingWheel(true);
    setIsLoadingWheel(true);
    setWheelStatusError(null);
    const res = await dataService.fetchWheelStatusFromServer(userId);
    const now = Date.now();
    setIsLoadingWheel(false);
    setIsRetryingWheel(false);
    if (res.success && res.status) {
      setWheelStatus(res.status);
      setWheelFetchedAtMs(now);
      setWheelClockMs(now);
    } else {
      setWheelStatusError(res.error || 'Unable to load Wheel of Luck status.');
    }
  }, [userId]);

  useEffect(() => {
    if (!isCustomer || !userId) {
      setWheelModalOpen(false);
      setWheelStatus(null);
      setWheelStatusError(null);
      setIsLoadingWheel(false);
      return;
    }
    void refreshWheelStatus();
  }, [isCustomer, userId, refreshWheelStatus]);

  useEffect(() => {
    if (!isCustomer) return;
    const elig = wheelStatus?.eligibility;
    if (!elig || elig.eligible || (elig.remainingMs <= 0 && !elig.nextEligibleAt)) return;
    const timer = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setWheelClockMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isCustomer, wheelStatus?.eligibility]);

  useEffect(() => {
    if (!isCustomer || !userId) return;
    const onStateChanged = (e: any) => {
      const key = e?.detail?.key;
      const tables: string[] = Array.isArray(e?.detail?.tables) ? e.detail.tables : [];
      if (key === 'wheel_spin_claimed' && wheelModalOpenRef.current) {
        return;
      }
      if (
        key === 'wheel_spin_claimed' ||
        key === 'aetherpay_config' ||
        key === 'wallet_updated' ||
        tables.includes('wheel_spins') ||
        tables.includes('app_config') ||
        tables.includes('wallets')
      ) {
        void refreshWheelStatus();
      }
    };
    window.addEventListener('aetherpay_state_changed', onStateChanged);
    return () => window.removeEventListener('aetherpay_state_changed', onStateChanged);
  }, [isCustomer, userId, refreshWheelStatus]);

  const activeWheelConfig =
    wheelStatus?.config || dataService.getAppConfig().wheelOfLuck || DEFAULT_WHEEL_OF_LUCK_CONFIG;

  const wheelCooldownRemainingMs = computeServerAnchoredRemainingMs({
    eligibility: wheelStatus?.eligibility,
    fetchedAtClientMs: wheelFetchedAtMs,
    nowMs: wheelClockMs,
  });

  const hasStatus = Boolean(wheelStatus) && !isRetryingWheel;

  const wheelUi = deriveWheelUiState({
    enabled: Boolean(activeWheelConfig.enabled),
    isLoading: isLoadingWheel,
    hasStatus,
    statusError: wheelStatusError,
    isSpinning: false,
    eligibility: wheelStatus?.eligibility,
    remainingMs: wheelCooldownRemainingMs,
  });

  useEffect(() => {
    if (!isCustomer) return;
    const nextAt = wheelStatus?.eligibility?.nextEligibleAt;
    if (
      wheelUi.uiState === 'unavailable' &&
      nextAt &&
      !isLoadingWheel &&
      autoExpiredRefreshRef.current !== nextAt
    ) {
      autoExpiredRefreshRef.current = nextAt;
      void refreshWheelStatus();
    }
  }, [isCustomer, wheelUi.uiState, wheelStatus?.eligibility?.nextEligibleAt, isLoadingWheel, refreshWheelStatus]);

  const openWheelModal = useCallback(() => {
    if (!isCustomer) return;
    setWheelModalOpen(true);
    if (!wheelStatus || wheelStatusErrorRef.current || Date.now() - wheelFetchedAtMs > 10_000) {
      void refreshWheelStatus();
    }
  }, [isCustomer, wheelStatus, wheelFetchedAtMs, refreshWheelStatus]);

  const closeWheelModal = useCallback(() => {
    setWheelModalOpen(false);
  }, []);

  const handleStatusUpdated = useCallback((next: WheelStatusResponse) => {
    const now = Date.now();
    setWheelStatus(next);
    setWheelFetchedAtMs(now);
    setWheelClockMs(now);
  }, []);

  const spinAvailable = isSpinAvailableForCustomer({
    isCustomer,
    enabled: Boolean(activeWheelConfig.enabled),
    isLoading: isLoadingWheel,
    hasStatus,
    statusError: wheelStatusError,
    uiState: wheelUi.uiState,
  });

  return {
    isCustomer,
    wheelModalOpen,
    openWheelModal,
    closeWheelModal,
    wheelStatus,
    wheelFetchedAtMs,
    isLoadingWheel,
    isRetryingWheel,
    wheelStatusError,
    refreshWheelStatus,
    handleStatusUpdated,
    wheelUi,
    spinAvailable,
  };
}
