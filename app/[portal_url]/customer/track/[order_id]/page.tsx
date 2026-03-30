'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, MapPin, Phone, MessageSquare, Navigation2, Bike, Clock, Navigation, Loader2, MapIcon } from 'lucide-react';
import { TrackingStepper } from '@/components/portal/TrackingStepper';
import { TrackingMap } from '@/components/portal/tracking/TrackingMap';
import { useGeolocation } from '@/hooks/use-geolocation';
import { calculateDistance, formatDistance, estimateTimeToDestination, formatTimeRemaining } from '@/lib/location-utils';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'sonner';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

interface LocationMarker {
  lat: number;
  lng: number;
  label?: string;
  type: 'restaurant' | 'customer' | 'delivery';
}

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.order_id as string;
  const portalUrl = params.portal_url as string;

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [estimatedTime, setEstimatedTime] = useState('15-25');
  const [deliveryProgress, setDeliveryProgress] = useState(0);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Geolocation
  const { location: userLocation, loading: locationLoading, requestLocation, watchLocation, error: geoError } = useGeolocation();
  const [isWatchingLocation, setIsWatchingLocation] = useState(false);

  useEffect(() => {
    fetchOrder();

    // Connect to WebSocket for real-time updates
    const ws = new WebSocket(`${WS_URL}/ws`);

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message);

        // Handle driver location updates (Real-time)
        if (message.type === 'DRIVER_LOCATION_UPDATED' && order?.driver?.id === message.driver_id) {
          console.log('Driver location updated:', message);
          setOrder(prev => ({
            ...prev,
            driver: {
              ...prev.driver,
              latitude: message.latitude,
              longitude: message.longitude
            }
          }));
          // Update driver location for map
          if (message.latitude && message.longitude) {
            setDriverLocation({
              lat: message.latitude,
              lng: message.longitude
            });
          }
        }
        // Handle customer location updates (for analytics/history)
        else if (message.type === 'CUSTOMER_LOCATION_UPDATED' && message.order_id === orderId) {
          console.log('Customer location received:', message);
          // Could be used to update delivery progress or show customer on map
        }
        // Handle driver assignment
        else if (message.type === 'DRIVER_ASSIGNED' && message.order_id === orderId) {
          console.log('Driver assigned, fetching order');
          fetchOrder();
        }
        // Handle order status changes
        else if ((message.type === 'ORDER_STATUS_CHANGED' || message.type === 'order_update') && message.order_id === orderId) {
          console.log('Order status changed, fetching order');
          fetchOrder();
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [orderId]);

  // Simulate delivery progress (if order is in delivery)
  useEffect(() => {
    if (!order || (order.order_type !== 'delivery' && order.orderType !== 'delivery')) return;

    const interval = setInterval(() => {
      setDeliveryProgress(prev => {
        if (prev >= 100) return 100;
        return prev + Math.random() * 15;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [order]);

  // Auto-send customer location to backend
  useEffect(() => {
    if (!userLocation || !order) return;

    const sendLocationToBackend = async () => {
      try {
        const restaurantId = localStorage.getItem('customer_restaurant_id');
        await fetch(`${BASE_URL}/api/customers/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Restaurant-ID': restaurantId || '',
          },
          body: JSON.stringify({
            order_id: orderId,
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            accuracy: userLocation.accuracy,
          }),
        });
      } catch (err) {
        console.error('Failed to send location:', err);
      }
    };

    sendLocationToBackend();
  }, [userLocation, order, orderId]);

  // Start watching location when delivery starts
  useEffect(() => {
    if (!order || !isWatchingLocation) return;
    if (order.order_type !== 'delivery' && order.orderType !== 'delivery') {
      setIsWatchingLocation(false);
      return;
    }

    const unwatch = watchLocation((coords) => {
      console.log('Location update:', coords);
    });

    return () => unwatch();
  }, [isWatchingLocation, order, watchLocation]);

  const fetchOrder = async () => {
    try {
      // Use localStorage with the correct key for customer portal
      const restaurantId = localStorage.getItem('customer_restaurant_id');
      const headers: Record<string, string> = {};
      if (restaurantId) {
        headers['X-Restaurant-ID'] = restaurantId;
      }
      const res = await fetch(`${BASE_URL}/api/orders/${orderId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        console.error('Failed to fetch order, status:', res.status);
      }
    } catch (err) {
      console.error('Failed to fetch order:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium">Locating your order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-24 px-5">
        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-[32px] flex items-center justify-center mx-auto mb-6">
          <ArrowLeft className="w-8 h-8 text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Order Not Found</h2>
        <p className="text-gray-500 mb-8">We couldn't find the order you're looking for.</p>
        <Button 
          onClick={() => router.push(`/${portalUrl}/customer/orders`)}
          className="bg-primary text-white rounded-2xl h-14 px-8 font-bold shadow-lg shadow-primary/20"
        >
          View My Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-32 px-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.push(`/${portalUrl}/customer/orders`)}
          className="rounded-2xl bg-white dark:bg-gray-900 shadow-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</p>
          <p className="font-bold text-gray-900 dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</p>
          {order.couponCode && (
            <div className="mt-1">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest">Coupon Code</p>
              <p className="text-xl font-black text-primary tracking-tighter">{order.couponCode}</p>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map View */}
      {order.order_type === 'delivery' || order.orderType === 'delivery' ? (
        <div className="space-y-4">
          {/* Real Map with OpenStreetMap */}
          <TrackingMap
            restaurantLocation={
              order && {
                lat: -6.8,
                lng: 39.3,
                name: 'Restaurant',
                type: 'restaurant' as const,
                extra: {
                  address: order.delivery_address || 'Restaurant Location',
                },
              }
            }
            driverLocation={
              order?.driver && {
                lat: order.driver.latitude || -6.8,
                lng: order.driver.longitude || 39.3,
                name: order.driver.name || 'Driver',
                type: 'driver' as const,
                extra: {
                  vehicleType: order.driver.vehicle_type,
                  phone: order.driver.phone,
                },
              }
            }
            customerLocation={
              userLocation && {
                lat: userLocation.latitude,
                lng: userLocation.longitude,
                name: 'Your Location',
                type: 'customer' as const,
              }
            }
            height="400px"
          />

          {/* Location Controls */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => {
                requestLocation();
                toast.success('Getting your location...');
              }}
              disabled={locationLoading}
              className="bg-white dark:bg-gray-900 text-primary border border-primary/20 hover:bg-primary/5 rounded-xl h-12 font-bold flex items-center justify-center gap-2"
            >
              {locationLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Locating...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  Get My Location
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                setIsWatchingLocation(!isWatchingLocation);
                if (!isWatchingLocation) {
                  toast.success('Live tracking started');
                } else {
                  toast.info('Live tracking stopped');
                }
              }}
              className={`rounded-xl h-12 font-bold flex items-center justify-center gap-2 ${
                isWatchingLocation
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-primary hover:bg-primary/90 text-white'
              }`}
            >
              {isWatchingLocation ? (
                <>
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Stop Tracking
                </>
              ) : (
                <>
                  <Loader2 className="w-4 h-4" />
                  Start Tracking
                </>
              )}
            </Button>
          </div>

          {/* Accuracy & Error Info */}
          {geoError && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
              <p className="text-sm text-red-600 dark:text-red-400">⚠️ {geoError}</p>
            </div>
          )}

          {userLocation && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4">
              <div className="flex items-center justify-between text-sm">
                <div>
                  <p className="text-blue-600 dark:text-blue-400 font-semibold">📍 Your Current Location</p>
                  <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">
                    Lat: {userLocation.latitude.toFixed(6)} | Lng: {userLocation.longitude.toFixed(6)}
                  </p>
                  <p className="text-xs text-blue-500 dark:text-blue-300">
                    Accuracy: ±{userLocation.accuracy?.toFixed(0)}m
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Distance & ETA Card */}
          {order?.driver && userLocation && order.driver.latitude && order.driver.longitude && (
            <div className="bg-gradient-to-r from-primary/10 to-orange-500/10 dark:from-primary/5 dark:to-orange-500/5 rounded-[24px] border border-primary/20 dark:border-primary/10 shadow-sm px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Distance</span>
                  <div className="flex items-center gap-2">
                    <MapIcon className="w-4 h-4 text-primary" />
                    <span className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
                      {formatDistance(calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        order.driver.latitude,
                        order.driver.longitude
                      ))}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Est. Arrival</span>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-[18px] font-black text-gray-900 dark:text-white tracking-tight">
                      {formatTimeRemaining(estimateTimeToDestination(
                        calculateDistance(
                          userLocation.latitude,
                          userLocation.longitude,
                          order.driver.latitude,
                          order.driver.longitude
                        ),
                        30 // Average delivery speed: 30 km/h
                      ))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Card */}
          <div className="bg-white dark:bg-gray-900 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Delivery Progress</span>
              <div className="flex-1 mx-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-orange-500"
                  initial={{ width: '0%' }}
                  animate={{ width: `${Math.min(deliveryProgress, 100)}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-[11px] font-black text-primary">{Math.round(Math.min(deliveryProgress, 100))}%</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Status Stepper */}
      <div className="bg-white dark:bg-gray-900 rounded-[32px] p-8 shadow-sm border border-gray-50 dark:border-gray-800">
        <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-4">Track Delivery</h3>
        <TrackingStepper status={order.status || 'pending'} />
      </div>

      {/* Delivery Person Info - Show for delivery orders */}
      {order && (order.order_type === 'delivery' || order.orderType === 'delivery') && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {order.driver ? (
            <Card className="premium-card border-none bg-gradient-to-br from-primary to-orange-600 text-white p-6 shadow-xl shadow-primary/30">
              <div className="space-y-4">
                {/* Driver Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/30 flex-shrink-0 bg-white/10 flex items-center justify-center">
                      <Bike className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-[18px] tracking-tight">{order.driver.name}</h4>
                        <span className="px-2 py-1 bg-white/20 rounded-lg text-[10px] font-bold">★ {order.driver.rating}</span>
                      </div>
                      <p className="text-white/70 text-[12px] font-bold mt-1">{order.driver.vehicle_type}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <a href={`tel:${order.driver.phone}`} className="flex-1">
                    <Button className="w-full h-12 bg-white text-primary hover:bg-white/90 font-black rounded-xl flex items-center justify-center gap-2">
                      <Phone className="w-4 h-4" />
                      Call
                    </Button>
                  </a>
                  <Button className="flex-1 h-12 bg-white/20 hover:bg-white/30 text-white font-black rounded-xl flex items-center justify-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="premium-card border-none bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                  <Navigation2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-black text-amber-900 dark:text-amber-200">Driver Not Yet Assigned</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">Your order is being prepared. A driver will be assigned soon!</p>
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {/* Order Summary Recap */}
      <div className="bg-white/50 dark:bg-gray-900/50 rounded-[32px] p-6 border border-dashed border-gray-200 dark:border-gray-800">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Delivery To</p>
        <div className="flex gap-3 items-start">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center flex-shrink-0">
             <MapPin className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <p className="font-bold text-[14px] text-gray-900 dark:text-white leading-snug">
              {order.delivery_address || 'No address provided'}
            </p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
              Contact: {order.customer_phone || 'Customer'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
