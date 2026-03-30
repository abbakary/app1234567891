/**
 * Calculate distance between two geographic points using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate bearing (direction) between two points
 * Returns bearing in degrees (0-360)
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);

  let bearing = Math.atan2(y, x);
  bearing = toDeg(bearing);
  bearing = (bearing + 360) % 360;
  return bearing;
}

/**
 * Convert radians to degrees
 */
function toDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Estimate time to reach destination based on speed
 * speed in km/h, returns time in minutes
 */
export function estimateTimeToDestination(
  distanceKm: number,
  speedKmh: number = 30
): number {
  if (speedKmh <= 0) return 0;
  return Math.round((distanceKm / speedKmh) * 60);
}

/**
 * Format distance for display
 * Shows km if > 1km, otherwise meters
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${km.toFixed(1)}km`;
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(minutes: number): string {
  if (minutes < 1) {
    return 'Less than 1 min';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min${minutes > 1 ? 's' : ''}`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);

  if (mins === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${mins}m`;
}

/**
 * Generate route points between two locations for visualization
 * This is a simple linear interpolation - for real routes, use a routing API
 */
export function generateRoutePoints(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  points: number = 10
): [number, number][] {
  const route: [number, number][] = [];

  for (let i = 0; i <= points; i++) {
    const fraction = i / points;
    const lat = startLat + (endLat - startLat) * fraction;
    const lng = startLng + (endLng - startLng) * fraction;
    route.push([lat, lng]);
  }

  return route;
}

/**
 * Check if location has moved significantly (for debouncing updates)
 * threshold in meters
 */
export function hasLocationChanged(
  oldLat: number,
  oldLng: number,
  newLat: number,
  newLng: number,
  thresholdMeters: number = 10
): boolean {
  const distanceKm = calculateDistance(oldLat, oldLng, newLat, newLng);
  const distanceMeters = distanceKm * 1000;
  return distanceMeters >= thresholdMeters;
}

/**
 * Validate geographic coordinates
 */
export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Get map bounds for a set of locations
 * Returns [minLat, minLng, maxLat, maxLng]
 */
export function getMapBounds(
  locations: Array<{ lat: number; lng: number }>
): [number, number, number, number] {
  if (locations.length === 0) {
    return [-90, -180, 90, 180];
  }

  let minLat = locations[0].lat;
  let maxLat = locations[0].lat;
  let minLng = locations[0].lng;
  let maxLng = locations[0].lng;

  for (const location of locations) {
    minLat = Math.min(minLat, location.lat);
    maxLat = Math.max(maxLat, location.lat);
    minLng = Math.min(minLng, location.lng);
    maxLng = Math.max(maxLng, location.lng);
  }

  return [minLat, minLng, maxLat, maxLng];
}
