'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  User,
  Mail,
  Phone,
  LogOut,
  ChevronRight,
  Settings,
  Bell,
  ShieldCheck,
  HelpCircle,
  Camera,
  Heart
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useCustomerProfile } from '@/hooks/use-restaurant-data';

export default function CustomerProfilePage() {
  const router = useRouter();
  const params = useParams();
  const portalUrl = params.portal_url as string;

  const { data: customer, isLoading, error } = useCustomerProfile();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem('customer_auth');
      localStorage.removeItem('customer_portal_url');
      localStorage.removeItem('customer_restaurant_id');
      toast.success('Logged out successfully');
      router.replace(`/${portalUrl}/auth`);
    }, 800);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-600 mb-4">Failed to load profile. Please try again.</p>
            <Button onClick={() => router.replace(`/${portalUrl}/auth`)} className="w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const menuItems = [
    { icon: Settings, label: 'Preferences', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', action: 'preferences' },
    { icon: Bell, label: 'Notifications', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', action: 'notifications' },
    { icon: ShieldCheck, label: 'Privacy & Security', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', action: 'privacy' },
    { icon: HelpCircle, label: 'Support Center', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', action: 'support' },
  ];

  const handleMenuItemClick = (action: string) => {
    const messages: Record<string, string> = {
      preferences: 'Preferences settings will be available soon',
      notifications: 'Notification settings will be available soon',
      privacy: 'Privacy & Security settings will be available soon',
      support: 'Support Center will be available soon',
    };
    toast.info(messages[action] || 'Feature coming soon');
  };

  return (
    <div className="space-y-8 pb-32 px-5">
      {/* Profile Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="premium-card overflow-hidden border-none shadow-xl shadow-gray-200/50 dark:shadow-none">
          <div className="h-28 bg-gradient-to-r from-primary via-orange-500 to-amber-400 relative">
             <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
          </div>
          <CardContent className="pt-0 pb-8 px-8 relative">
             <div className="flex flex-col items-center -mt-14">
                <div className="relative">
                   <div className="w-28 h-28 rounded-[36px] bg-white dark:bg-gray-900 p-1 shadow-2xl relative z-10">
                      <div className="w-full h-full rounded-[32px] bg-primary/10 flex items-center justify-center overflow-hidden">
                         <User className="w-12 h-12 text-primary" />
                      </div>
                   </div>
                   <button className="absolute bottom-1 -right-1 z-20 w-9 h-9 bg-white dark:bg-gray-800 rounded-full shadow-lg border-4 border-white dark:border-gray-900 flex items-center justify-center text-primary group active:scale-95 transition-all">
                      <Camera className="w-4 h-4 group-hover:scale-110 transition-transform" />
                   </button>
                </div>
                
                <div className="text-center mt-5">
                   <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-2">{customer.name}</h2>
                   <div className="flex items-center justify-center gap-1.5 px-3 py-1 bg-primary/5 rounded-full">
                      <Heart className="w-3 h-3 text-primary fill-primary" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-widest">Premium Foodie</span>
                   </div>
                </div>
             </div>

             <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Orders</span>
                   <span className="text-lg font-black text-gray-900 dark:text-white">{customer.total_orders}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 rounded-3xl bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800">
                   <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rewards</span>
                   <span className="text-lg font-black text-primary">{customer.rewards_points.toLocaleString()} PTS</span>
                </div>
             </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Account Info */}
      <div className="space-y-4">
         <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Personal Details</h3>
         <Card className="premium-card border-none shadow-sm dark:bg-gray-900">
            <CardContent className="p-2">
               <div className="p-4 flex items-center gap-4 border-b border-gray-50 dark:border-gray-800">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                     <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</span>
                     <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{customer.email || 'Not provided'}</span>
                  </div>
               </div>
               <div className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center">
                     <Phone className="w-5 h-5 text-orange-600" />
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone Number</span>
                     <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{customer.phone || 'Not provided'}</span>
                  </div>
               </div>
            </CardContent>
         </Card>
      </div>

      {/* Other Settings */}
      <div className="space-y-4">
         <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">App Settings</h3>
         <Card className="premium-card border-none shadow-sm dark:bg-gray-900">
            <CardContent className="p-2">
               {menuItems.map((item, idx) => (
                  <button
                    key={item.label}
                    onClick={() => handleMenuItemClick(item.action)}
                    className={`w-full p-4 flex items-center justify-between group active:scale-[0.98] transition-all ${
                       idx !== menuItems.length - 1 ? 'border-b border-gray-50 dark:border-gray-800' : ''
                    }`}
                  >
                     <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                           <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">{item.label}</span>
                     </div>
                     <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </button>
               ))}
            </CardContent>
         </Card>
      </div>

      {/* Logout */}
      <div className="pt-4">
         <Button
            onClick={handleLogout}
            disabled={isLoggingOut}
            variant="ghost"
            className="w-full h-16 rounded-[24px] bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
         >
            {isLoggingOut ? (
               <div className="w-5 h-5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
            ) : (
               <>
                  <LogOut className="w-5 h-5" />
                  Sign Out
               </>
            )}
         </Button>
         <p className="text-center text-[10px] text-gray-400 mt-6 font-bold uppercase tracking-widest italic">
            App Version 2.4.0 • Build Premium
         </p>
      </div>
    </div>
  );
}
