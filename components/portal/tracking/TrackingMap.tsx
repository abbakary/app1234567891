'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';

// Fix Leaflet default icons issue in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons for different marker types
const restaurantIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const customerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LocationPoint {
  lat: number;
  lng: number;
  name: string;
  type: 'restaurant' | 'driver' | 'customer';
  extra?: {
    phone?: string;
    address?: string;
    vehicleType?: string;
  };
}

interface TrackingMapProps {
  restaurantLocation?: LocationPoint;
  driverLocation?: LocationPoint;
  customerLocation?: LocationPoint;
  routePoints?: [number, number][]; // Array of [lat, lng] for polyline
  zoom?: number;
  height?: string;
}

// Zoom control component to fit all markers
function ZoomToFit({ locations }: { locations: LocationPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;

    const bounds = L.latLngBounds(
      locations.map(loc => [loc.lat, loc.lng] as [number, number])
    );

    // Add some padding
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [locations, map]);

  return null;
}

export function TrackingMap({
  restaurantLocation,
  driverLocation,
  customerLocation,
  routePoints = [],
  zoom = 13,
  height = '400px',
}: TrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);

  // Default center (Dar es Salaam, Tanzania)
  const defaultCenter: [number, number] = [-6.8, 39.3];

  // Get center point from available locations
  const getCenterPoint = (): [number, number] => {
    const locations = [customerLocation, restaurantLocation, driverLocation].filter(
      Boolean
    ) as LocationPoint[];

    if (locations.length > 0) {
      const avgLat =
        locations.reduce((sum, loc) => sum + loc.lat, 0) / locations.length;
      const avgLng =
        locations.reduce((sum, loc) => sum + loc.lng, 0) / locations.length;
      return [avgLat, avgLng];
    }

    return defaultCenter;
  };

  const allLocations = [restaurantLocation, driverLocation, customerLocation].filter(
    Boolean
  ) as LocationPoint[];

  const getIcon = (type: 'restaurant' | 'driver' | 'customer') => {
    switch (type) {
      case 'restaurant':
        return restaurantIcon;
      case 'driver':
        return driverIcon;
      case 'customer':
        return customerIcon;
      default:
        return L.Icon.Default.prototype;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'restaurant':
        return '🏪 Restaurant';
      case 'driver':
        return '🚗 Driver';
      case 'customer':
        return '📍 Your Location';
      default:
        return 'Location';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[32px] overflow-hidden shadow-lg border border-gray-100 dark:border-gray-800"
      style={{ height }}
    >
      <MapContainer
        center={getCenterPoint()}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        className="rounded-[32px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Route Polyline */}
        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            color="#FF6B00"
            weight={3}
            opacity={0.7}
            dashArray="5, 5"
          />
        )}

        {/* Restaurant Marker */}
        {restaurantLocation && (
          <Marker position={[restaurantLocation.lat, restaurantLocation.lng]} icon={getIcon('restaurant')}>
            <Popup>
              <div className="text-sm font-semibold">
                <p className="font-bold text-primary">{restaurantLocation.name}</p>
                {restaurantLocation.extra?.address && (
                  <p className="text-xs text-gray-600 mt-1">{restaurantLocation.extra.address}</p>
                )}
                {restaurantLocation.extra?.phone && (
                  <p className="text-xs text-gray-600">📞 {restaurantLocation.extra.phone}</p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Driver Marker */}
        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={getIcon('driver')}>
            <Popup>
              <div className="text-sm font-semibold">
                <p className="font-bold text-red-600">{driverLocation.name}</p>
                {driverLocation.extra?.vehicleType && (
                  <p className="text-xs text-gray-600 mt-1">🚗 {driverLocation.extra.vehicleType}</p>
                )}
                {driverLocation.extra?.phone && (
                  <p className="text-xs text-gray-600">📞 {driverLocation.extra.phone}</p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Customer Marker */}
        {customerLocation && (
          <Marker position={[customerLocation.lat, customerLocation.lng]} icon={getIcon('customer')}>
            <Popup>
              <div className="text-sm font-semibold">
                <p className="font-bold text-blue-600">{customerLocation.name}</p>
                {customerLocation.extra?.address && (
                  <p className="text-xs text-gray-600 mt-1">{customerLocation.extra.address}</p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Auto-fit to all markers */}
        <ZoomToFit locations={allLocations} />
      </MapContainer>
    </motion.div>
  );
}
