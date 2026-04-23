import { Location } from '@/types';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(from: Location, to: Location): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get user's current location using browser Geolocation API
 */
export function getUserLocation(): Promise<Location> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Calculate fuel cost based on distance
 * Uses R2.50 per km for round trip
 */
export function calculateFuelCost(distanceKm: number): number {
  const fuelCostPerKm = 2.5;
  return Math.round(distanceKm * fuelCostPerKm * 2 * 100) / 100;
}

/**
 * Open Google Maps navigation to coordinates
 */
export function openMapsNavigation(destination: Location, label?: string) {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // Try to open native Google Maps app
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lon}&travelmode=driving`;
    window.open(url, '_blank');
  } else {
    // Open Google Maps web
    const url = `https://www.google.com/maps/search/?api=1&query=${destination.lat},${destination.lon}`;
    window.open(url, '_blank');
  }
}
