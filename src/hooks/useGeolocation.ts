'use client';

import { useState, useEffect } from 'react';
import { Location } from '@/types';
import { getUserLocation } from '@/lib/geolocation';

interface UseGeolocationResult {
  location: Location | null;
  error: string | null;
  loading: boolean;
  requestLocation: () => void;
}

export function useGeolocation(autoRequest = false): UseGeolocationResult {
  const [location, setLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const loc = await getUserLocation();
      setLocation(loc);

      // Store in localStorage for future use
      if (typeof window !== 'undefined') {
        localStorage.setItem('userLocation', JSON.stringify(loc));
      }
    } catch (err: any) {
      let errorMsg = 'Unable to get your location';

      if (err.code === 1) {
        errorMsg = 'Location permission denied. Please enable location access.';
      } else if (err.code === 2) {
        errorMsg = 'Location unavailable. Please try again.';
      } else if (err.code === 3) {
        errorMsg = 'Location request timeout. Please try again.';
      }

      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Try to load cached location
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('userLocation');
      if (cached) {
        try {
          setLocation(JSON.parse(cached));
        } catch (e) {
          // Invalid cached data
        }
      }
    }

    if (autoRequest) {
      requestLocation();
    }
  }, [autoRequest]);

  return { location, error, loading, requestLocation };
}
