import React, { createContext, useContext } from 'react';

export interface WheelAvailabilityContextValue {
  spinAvailable: boolean;
  isLoading: boolean;
  openWheelModal: () => void;
}

const DEFAULT_WHEEL_AVAILABILITY: WheelAvailabilityContextValue = {
  spinAvailable: false,
  isLoading: false,
  openWheelModal: () => {},
};

const WheelAvailabilityContext = createContext<WheelAvailabilityContextValue>(DEFAULT_WHEEL_AVAILABILITY);

export const WheelAvailabilityProvider: React.FC<{
  value: WheelAvailabilityContextValue;
  children: React.ReactNode;
}> = ({ value, children }) =>
  React.createElement(WheelAvailabilityContext.Provider, { value }, children);

export function useWheelAvailability(): WheelAvailabilityContextValue {
  return useContext(WheelAvailabilityContext);
}
