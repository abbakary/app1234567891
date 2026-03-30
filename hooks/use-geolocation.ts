import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export interface GeolocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface UseGeolocationReturn {
  location: GeolocationCoordinates | null;
  error: string | null;
  loading: boolean;
  isSupported: boolean;
  requestLocation: () => void;
  watchLocation: (callback?: (coords: GeolocationCoordinates) => void) => () => void;
  clearError: () => void;
}

/**
 * Custom hook to get user's GPS location
 * Handles geolocation API with fallbacks and error handling
 */
export function useGeolocation(): UseGeolocationReturn {
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if geolocation is supported
  const isSupported =
    typeof navigator !== 'undefined' && 'geolocation' in navigator;

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const coords: GeolocationCoordinates = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
    };
    setLocation(coords);
    setError(null);
    setLoading(false);
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMessage = 'Unable to get your location';

    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage =
          'Location permission denied. Please enable location access in your browser settings.';
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage =
          'Location information is unavailable. Please try again.';
        break;
      case err.TIMEOUT:
        errorMessage = 'Location request timed out. Please try again.';
        break;
    }

    setError(errorMessage);
    setLocation(null);
    setLoading(false);
    console.error('Geolocation error:', err);
  }, []);

  const requestLocation = useCallback(() => {
    if (!isSupported) {
      const msg = 'Geolocation is not supported by your browser';
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError(null);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
  }, [isSupported, handleSuccess, handleError]);

  /**
   * Watch location changes and call callback on each update
   * Returns cleanup function to stop watching
   */
  const watchLocation = useCallback(
    (callback?: (coords: GeolocationCoordinates) => void) => {
      if (!isSupported) {
        const msg = 'Geolocation is not supported by your browser';
        setError(msg);
        toast.error(msg);
        return () => {};
      }

      setLoading(true);

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000, // Update every 1 second max
      };

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          handleSuccess(position);
          if (callback) {
            callback({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude,
              altitudeAccuracy: position.coords.altitudeAccuracy,
              heading: position.coords.heading,
              speed: position.coords.speed,
            });
          }
        },
        handleError,
        options
      );

      // Return cleanup function
      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    },
    [isSupported, handleSuccess, handleError]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    location,
    error,
    loading,
    isSupported,
    requestLocation,
    watchLocation,
    clearError,
  };
}
