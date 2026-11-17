import { useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { dataService } from '../services/dataService';
import { authSessionService } from '../services/authSessionService';
import {
  VERIFICATION_GRACE_DELAY_MS,
  VERIFICATION_MAX_CHECK_WAIT_MS,
  VerificationUiState,
  deriveVerificationUiState,
  readVerifiedCache,
  writeVerifiedCache,
} from '../services/verificationStateUtils';

interface CoordinatorState {
  userId: string | null;
  isChecking: boolean;
  graceElapsed: boolean;
}

let coordinator: CoordinatorState = {
  userId: null,
  isChecking: false,
  graceElapsed: false,
};

let graceTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;
let activeCheckUserId: string | null = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((cb) => cb());
}

function clearCoordinatorTimers() {
  if (graceTimer) {
    clearTimeout(graceTimer);
    graceTimer = null;
  }
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
}

function startResolutionForUser(user: UserProfile) {
  const isCached = readVerifiedCache(user.id, user.email);
  if (user.role !== 'customer' || user.emailVerified || isCached) {
    clearCoordinatorTimers();
    activeCheckUserId = null;
    coordinator = {
      userId: user.id,
      isChecking: false,
      graceElapsed: true,
    };
    if (user.emailVerified) {
      writeVerifiedCache(user.id, user.email, true);
    }
    notifyListeners();
    return;
  }

  // Already running coordination for this exact user
  if (coordinator.userId === user.id && (coordinator.isChecking || !coordinator.graceElapsed || activeCheckUserId === user.id)) {
    return;
  }

  clearCoordinatorTimers();
  activeCheckUserId = user.id;
  coordinator = {
    userId: user.id,
    isChecking: true,
    graceElapsed: false,
  };
  notifyListeners();

  graceTimer = setTimeout(() => {
    if (coordinator.userId === user.id && !coordinator.graceElapsed) {
      coordinator = { ...coordinator, graceElapsed: true };
      notifyListeners();
    }
  }, VERIFICATION_GRACE_DELAY_MS);

  safetyTimer = setTimeout(() => {
    if (coordinator.userId === user.id && coordinator.isChecking) {
      coordinator = { ...coordinator, isChecking: false, graceElapsed: true };
      activeCheckUserId = null;
      notifyListeners();
    }
  }, VERIFICATION_MAX_CHECK_WAIT_MS);

  dataService
    .reloadAndCheckEmailVerification()
    .then((res) => {
      if (coordinator.userId !== user.id) return;
      if (res.verified) {
        writeVerifiedCache(user.id, user.email, true);
        const updated = { ...user, emailVerified: true };
        dataService.registerUser(updated);
        authSessionService.updateUserProfile(updated);
      }
      coordinator = { ...coordinator, isChecking: false };
      activeCheckUserId = null;
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      notifyListeners();
    })
    .catch(() => {
      if (coordinator.userId !== user.id) return;
      coordinator = { ...coordinator, isChecking: false };
      activeCheckUserId = null;
      if (safetyTimer) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
      }
      notifyListeners();
    });
}

export function resetVerificationCoordinator(): void {
  clearCoordinatorTimers();
  activeCheckUserId = null;
  coordinator = {
    userId: null,
    isChecking: false,
    graceElapsed: false,
  };
  notifyListeners();
}

export function useVerificationResolution(currentUser: UserProfile | null): VerificationUiState {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      resetVerificationCoordinator();
      return;
    }

    if (currentUser.emailVerified) {
      writeVerifiedCache(currentUser.id, currentUser.email, true);
      if (coordinator.userId === currentUser.id && (coordinator.isChecking || !coordinator.graceElapsed)) {
        clearCoordinatorTimers();
        activeCheckUserId = null;
        coordinator = {
          userId: currentUser.id,
          isChecking: false,
          graceElapsed: true,
        };
        notifyListeners();
      }
      return;
    }

    startResolutionForUser(currentUser);
  }, [currentUser?.id, currentUser?.email, currentUser?.role, currentUser?.emailVerified]);

  const isCachedVerified = currentUser
    ? readVerifiedCache(currentUser.id, currentUser.email)
    : false;

  const matchesActiveUser = currentUser && coordinator.userId === currentUser.id;
  const isChecking = matchesActiveUser ? coordinator.isChecking : Boolean(currentUser && !currentUser.emailVerified && !isCachedVerified);
  const graceElapsed = matchesActiveUser ? coordinator.graceElapsed : false;

  return deriveVerificationUiState({
    role: currentUser?.role,
    emailVerified: currentUser?.emailVerified,
    isCachedVerified,
    isChecking,
    graceElapsed,
  });
}
