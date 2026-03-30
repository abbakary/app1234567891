'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Home, LogOut, LayoutDashboard, UtensilsCrossed, Grid3X3, Users, BarChart3, Volume2, VolumeX, Bell, CreditCard, Settings, Bike, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadNotifications, useMarkAllNotificationsRead } from '@/hooks/use-restaurant-data';
import { playNotificationSound } from '@/lib/notification-sounds';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/tables', label: 'Tables', icon: Grid3X3 },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/messaging', label: 'Messaging', icon: MessageSquare },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/drivers', label: 'Drivers', icon: Bike },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout, hasRole } = useAuth();
  const { data: unreadNotifications = [] } = useUnreadNotifications();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastPlayedNotifications, setLastPlayedNotifications] = useState<string[]>([]);
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!isLoading && !hasRole('admin')) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, hasRole, router]);

  // Play sound for important notifications
  useEffect(() => {
    if (!soundEnabled) return;

    const newNotifications = unreadNotifications.filter(
      n => !lastPlayedNotifications.includes(n.id)
    );

    newNotifications.forEach(notification => {
      if (notification.type === 'new_order' || notification.type === 'order_ready') {
        playNotificationSound('order_received');
      } else if (notification.type === 'payment_received') {
        playNotificationSound('payment');
      }
    });

    if (newNotifications.length > 0) {
      setLastPlayedNotifications(prev => [
        ...prev,
        ...newNotifications.map(n => n.id)
      ]);
    }
  }, [unreadNotifications, soundEnabled, lastPlayedNotifications]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const allNotificationsCount = unreadNotifications.length;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-slate-50 border-r border-slate-700 flex flex-col fixed h-full overflow-y-auto overflow-x-hidden z-40">
        {/* Header Section */}
        <div className="p-5 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-blue-500/20 hover:bg-blue-500/30 text-blue-400"
              onClick={() => router.push('/')}
            >
              <Home className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg text-white">Admin Panel</h1>
              <p className="text-xs text-slate-400">Management</p>
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-xs uppercase font-semibold text-slate-400 px-4 py-2 tracking-wider">Menu</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mx-1',
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions Section */}
        <div className="px-4 py-4 space-y-3 border-t border-slate-700 bg-gradient-to-b from-slate-800/50 to-slate-900/50">
          <div className="text-xs uppercase font-semibold text-slate-400 px-2 tracking-wider">Actions</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full rounded-lg justify-start text-slate-200 border-slate-600 hover:bg-slate-700/50 hover:border-slate-500 bg-slate-800/50"
                size="sm"
              >
                <Bell className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="flex-1 text-left truncate">Notifications</span>
                {allNotificationsCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-0.5 flex-shrink-0">
                    {allNotificationsCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-xl bg-slate-900 border-slate-700">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
                <span className="font-bold text-slate-50">Notifications</span>
                {unreadNotifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markAllRead.mutate()}
                    className="text-xs rounded-lg text-blue-400 hover:text-blue-300"
                  >
                    Mark all read
                  </Button>
                )}
              </div>
              {unreadNotifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-400">
                  No new notifications
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {unreadNotifications.slice(0, 10).map((notification) => (
                    <DropdownMenuItem
                      key={notification.id}
                      className="flex flex-col items-start py-3 px-4 rounded-lg mx-1 my-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 focus:bg-slate-700"
                    >
                      <span className="text-sm font-semibold text-slate-50">
                        {notification.message}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-full rounded-lg justify-start text-slate-200 border-slate-600 bg-slate-800/50',
              soundEnabled ? 'hover:bg-green-700/30 hover:border-green-600' : 'hover:bg-yellow-700/30 hover:border-yellow-600'
            )}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 mr-2 flex-shrink-0 text-green-400" />
            ) : (
              <VolumeX className="h-4 w-4 mr-2 flex-shrink-0 text-yellow-400" />
            )}
            <span className="flex-1 text-left">{soundEnabled ? 'Alerts On' : 'Alerts Off'}</span>
          </Button>
        </div>

        {/* User Profile Section */}
        <div className="px-4 py-4 border-t border-slate-700 bg-gradient-to-b from-slate-900 via-purple-900/20 to-slate-900 space-y-3">
          <div className="text-xs uppercase font-semibold text-slate-400 px-2 tracking-wider">Account</div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
              <span className="text-white font-bold text-sm">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-50 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-900/30 font-medium"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="flex-1 text-left">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 min-h-screen">
        {children}
      </main>
    </div>
  );
}
