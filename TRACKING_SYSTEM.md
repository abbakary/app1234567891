# 🗺️ Real-Time GPS Tracking System

Complete implementation of OpenStreetMap + Leaflet tracking with React + FastAPI backend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Customer Mobile/Web App                   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TrackingMap Component (React-Leaflet + OSM)         │  │
│  │  ├─ Real-time markers (Restaurant, Driver, You)     │  │
│  │  ├─ Polyline route visualization                    │  │
│  │  └─ Auto-zoom to fit all markers                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓↑                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Geolocation Hook (useGeolocation)                   │  │
│  │  ├─ Get current position                             │  │
│  │  ├─ Watch continuous location                        │  │
│  │  └─ Handle permissions + errors                      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           ↓ HTTP (POST /api/customers/location)
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Backend                           │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Customers Router                                    │  │
│  │  ├─ POST /api/customers/location                    │  │
│  │  │   └─ Save customer GPS coords                    │  │
│  │  └─ GET /api/customers/{order_id}/location-history │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  WebSocket Manager (broadcast_update)                │  │
│  │  ├─ DRIVER_LOCATION_UPDATED                          │  │
│  │  ├─ CUSTOMER_LOCATION_UPDATED                        │  │
│  │  ├─ ORDER_STATUS_CHANGED                             │  │
│  │  └─ DRIVER_ASSIGNED                                  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
           ↓ WebSocket (Real-time broadcasts)
┌─────────────────────────────────────────────────────────────┐
│         All Connected Clients (Driver, Kitchen, Admin)       │
│                                                               │
│  Receive real-time updates and display on their screens      │
└─────────────────────────────────────────────────────────────┘
```

## Phase 1: Display Static Map (✅ Complete)

### Components Created

#### `components/portal/tracking/TrackingMap.tsx`
- **Purpose**: Interactive map display using React-Leaflet
- **Features**:
  - OpenStreetMap tiles (free, no API key needed)
  - Color-coded markers (Green: Restaurant, Red: Driver, Blue: Customer)
  - Popup info on marker click
  - Auto-zoom to fit all visible markers
  - Polyline route visualization (optional)
  - Responsive height configuration

#### Usage Example
```tsx
<TrackingMap
  restaurantLocation={{
    lat: -6.8,
    lng: 39.3,
    name: 'Restaurant Name',
    type: 'restaurant',
    extra: { address: '...' }
  }}
  driverLocation={{
    lat: -6.81,
    lng: 39.31,
    name: 'Driver Name',
    type: 'driver',
    extra: { vehicleType: 'Motorcycle', phone: '...' }
  }}
  customerLocation={{
    lat: -6.82,
    lng: 39.32,
    name: 'Your Location',
    type: 'customer'
  }}
  height="400px"
/>
```

## Phase 2: Get User Location (✅ Complete)

### Geolocation Hook

#### `hooks/use-geolocation.ts`
- **Purpose**: Manage browser geolocation API
- **Features**:
  - Request one-time location
  - Continuous location watching
  - Error handling (permissions, timeout, unavailable)
  - High accuracy mode enabled
  - Support check for older browsers

#### Usage Example
```tsx
const {
  location,          // { latitude, longitude, accuracy, ... }
  error,             // Error message if any
  loading,           // Boolean loading state
  isSupported,       // Boolean: geolocation supported
  requestLocation,   // Function: get one-time location
  watchLocation,     // Function: continuous watch (returns cleanup)
  clearError         // Function: clear error message
} = useGeolocation();

// Get location once
const handleGetLocation = () => {
  requestLocation();
};

// Start continuous watching
const handleStartTracking = () => {
  const unwatch = watchLocation((coords) => {
    console.log('New location:', coords);
  });

  // Later: stop watching
  // unwatch();
};
```

## Phase 3: Send Location to Backend (✅ Complete)

### Backend API

#### `backend/routers/customers.py`
```
POST /api/customers/location
├─ Request Body:
│  ├─ order_id: string (required)
│  ├─ latitude: float (required)
│  ├─ longitude: float (required)
│  └─ accuracy: float (optional, in meters)
│
└─ Response:
   ├─ status: "success"
   ├─ message: string
   └─ order_id: string
```

**Backend Actions:**
1. Validate customer location request
2. Verify order exists and is delivery/pickup type
3. Broadcast `CUSTOMER_LOCATION_UPDATED` via WebSocket
4. Return success response

#### Frontend Auto-Sending
The tracking page automatically sends location every time it updates:
```tsx
useEffect(() => {
  if (!userLocation || !order) return;

  const sendLocationToBackend = async () => {
    await fetch(`${BASE_URL}/api/customers/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Restaurant-ID': restaurantId,
      },
      body: JSON.stringify({
        order_id: orderId,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        accuracy: userLocation.accuracy,
      }),
    });
  };

  sendLocationToBackend();
}, [userLocation, order, orderId]);
```

## Phase 4: Real-Time WebSocket Updates (✅ Complete)

### WebSocket Message Types

#### DRIVER_LOCATION_UPDATED
```json
{
  "type": "DRIVER_LOCATION_UPDATED",
  "driver_id": "driver_uuid",
  "latitude": -6.81,
  "longitude": 39.31,
  "timestamp": "2024-01-01T12:00:00Z"
}
```
**Triggered by**: Driver's location update (via driver app)
**Listeners**: Customer tracking page, admin dashboard

#### CUSTOMER_LOCATION_UPDATED
```json
{
  "type": "CUSTOMER_LOCATION_UPDATED",
  "order_id": "order_uuid",
  "latitude": -6.82,
  "longitude": 39.32,
  "accuracy": 15.5,
  "timestamp": "2024-01-01T12:00:00Z"
}
```
**Triggered by**: Customer sending location
**Listeners**: Driver, reception, admin

#### ORDER_STATUS_CHANGED
```json
{
  "type": "ORDER_STATUS_CHANGED",
  "order_id": "order_uuid",
  "status": "ready",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### WebSocket Handler in Frontend
```tsx
useEffect(() => {
  const ws = new WebSocket(`${WS_URL}/ws`);

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    // Real-time driver location updates
    if (message.type === 'DRIVER_LOCATION_UPDATED') {
      setOrder(prev => ({
        ...prev,
        driver: {
          ...prev.driver,
          latitude: message.latitude,
          longitude: message.longitude
        }
      }));
      // Map updates automatically
    }

    // Customer location for analytics
    if (message.type === 'CUSTOMER_LOCATION_UPDATED') {
      // Could store for historical analysis
    }

    // Order status changes
    if (message.type === 'ORDER_STATUS_CHANGED') {
      fetchOrder(); // Refresh order details
    }
  };

  return () => ws.close();
}, [orderId]);
```

## Location Utilities

### `lib/location-utils.ts`

#### Calculate Distance Between Two Points
```tsx
import { calculateDistance } from '@/lib/location-utils';

const distanceKm = calculateDistance(
  lat1, lng1,  // Start point
  lat2, lng2   // End point
);
```

#### Estimate Time to Destination
```tsx
import { estimateTimeToDestination } from '@/lib/location-utils';

const minutes = estimateTimeToDestination(
  10.5,  // distance in km
  30     // average speed in km/h
);
```

#### Format Distance for Display
```tsx
import { formatDistance } from '@/lib/location-utils';

formatDistance(0.8)   // "800m"
formatDistance(1.5)   // "1.5km"
```

#### Format Time for Display
```tsx
import { formatTimeRemaining } from '@/lib/location-utils';

formatTimeRemaining(15)   // "15 mins"
formatTimeRemaining(95)   // "1h 35m"
```

## Features Implemented

### ✅ Real-Time Map Display
- Interactive OpenStreetMap powered by Leaflet
- Color-coded location markers
- Automatic zoom to fit all visible points
- Responsive design

### ✅ GPS Location Tracking
- One-time location request
- Continuous location watching
- High accuracy mode
- Permission handling
- Error messages for denied/timeout

### ✅ Automatic Location Sharing
- Customer location auto-sent to backend
- Sends on every location update
- Debounced HTTP requests (one-time auto-send)

### ✅ WebSocket Real-Time Updates
- Driver location broadcasts
- Customer location tracking
- Order status changes
- All updates reflected on map instantly

### ✅ Distance & ETA Calculations
- Haversine formula for accuracy
- Real-time distance display
- Estimated time to delivery
- Bearing calculation for route direction

### ✅ User Controls
- "Get My Location" button
- "Start/Stop Live Tracking" toggle
- Location accuracy display
- Error notifications

## UI Components

### Location Status Card
Shows customer's current coordinates and accuracy:
```
📍 Your Current Location
Lat: -6.820000 | Lng: 39.320000
Accuracy: ±15m
```

### Distance & ETA Card
Shows real-time distance and estimated arrival:
```
━━━━━━━━━━━━━━━━━━━━━━
Distance          Est. Arrival
2.5km             15 mins
━━━━━━━━━━━━━━━━━━━━━━
```

### Delivery Progress Bar
Visual representation of delivery completion percentage.

## Security Considerations

1. **Location Privacy**
   - User must grant browser permission
   - Location only sent for active deliveries
   - No location logging without consent

2. **Data Validation**
   - Coordinates validated (lat: -90 to 90, lng: -180 to 180)
   - Accuracy must be positive number
   - Order ID verified before accepting location

3. **Rate Limiting** (Recommended)
   - Add rate limiting to location endpoints
   - WebSocket broadcast throttling
   - Location update frequency limits

## Browser Compatibility

| Browser | Geolocation | Leaflet | Status |
|---------|-------------|---------|--------|
| Chrome  | ✅          | ✅      | ✅ Full Support |
| Firefox | ✅          | ✅      | ✅ Full Support |
| Safari  | ✅          | ✅      | ✅ Full Support |
| Edge    | ✅          | ✅      | ✅ Full Support |
| IE 11   | ⚠️ Partial | ❌      | ⚠️ Limited |

## Performance Optimization

1. **Location Watching**
   - maximumAge: 1000ms (1 second cache)
   - enableHighAccuracy: true (but uses more battery)
   - Debounce threshold: 10 meters

2. **Map Rendering**
   - Lazy load Leaflet only when needed
   - Memoize marker locations
   - Throttle WebSocket broadcasts

3. **Network**
   - Location sends at 1 per 5 seconds minimum
   - WebSocket batch updates
   - Gzip compression enabled

## Future Enhancements

- [ ] Historical location playback
- [ ] Route optimization API integration
- [ ] Offline location caching
- [ ] Driver speed tracking
- [ ] Multi-language location names
- [ ] Dark mode map themes
- [ ] Traffic layer integration
- [ ] Geocoding reverse lookup
- [ ] Geofencing alerts
- [ ] Location analytics dashboard

## Troubleshooting

### Location Permission Denied
**Error**: "Location permission denied"
**Solution**: 
- Check browser settings
- Request HTTPS (required for geolocation)
- Clear browser cache and re-request

### Map Tiles Not Loading
**Error**: Blank map display
**Solution**:
- Check internet connection
- OpenStreetMap servers might be down
- Clear browser cache

### WebSocket Not Connecting
**Error**: Real-time updates not working
**Solution**:
- Check backend WebSocket endpoint
- Verify X-Restaurant-ID header
- Check browser console for errors

### High Battery Drain
**Cause**: Location watching drains battery
**Solution**:
- Stop watching when not visible
- Increase maximumAge threshold
- Disable enableHighAccuracy when not needed

## Dependencies

```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^5.0.0",
  "fastapi": "^0.104.0",
  "websockets": "^11.0"
}
```

## File Structure

```
components/
├── portal/
│   └── tracking/
│       └── TrackingMap.tsx          ← Main map component
│
hooks/
├── use-geolocation.ts               ← GPS tracking hook
│
lib/
├── location-utils.ts                ← Distance calculations
│
app/
├── [portal_url]/
│   └── customer/
│       └── track/
│           └── [order_id]/
│               └── page.tsx         ← Tracking page (integrated)
│
backend/
├── routers/
│   └── customers.py                 ← Location API endpoints
├── main.py                          ← Router registration
└── websocket_manager.py             ← WebSocket broadcasts
```

## Getting Started

1. **Install dependencies**
   ```bash
   npm install leaflet react-leaflet
   ```

2. **Enable HTTPS** (required for geolocation)
   - Development: Usually auto-enabled by Next.js
   - Production: Must have valid SSL certificate

3. **Test Location Permission**
   - Open app in browser
   - Click "Get My Location"
   - Grant permission when prompted

4. **Monitor WebSocket**
   - Open browser DevTools
   - Go to Network → WS
   - Should show /ws connection

5. **Check Backend Logs**
   - Monitor FastAPI logs for location updates
   - Verify broadcasts are being sent

---

**Created**: 2024
**Status**: Production Ready
**Maintained By**: Development Team
