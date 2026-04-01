'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, uploadImage } from '@/lib/api';
import type {
  Table,
  MenuItem,
  Order,
  OrderItem,
  Payment,
  Notification,
  User,
  PaymentMethod,
  StatsResponse,
  AnalyticsInsights,
} from '@/lib/types';

// Query keys
export const queryKeys = {
  tables: ['tables'] as const,
  menuItems: ['menuItems'] as const,
  orders: ['orders'] as const,
  activeOrders: ['orders', 'active'] as const,
  notifications: ['notifications'] as const,
  users: ['users'] as const,
  stats: ['stats'] as const,
  restaurant: ['restaurant'] as const,
  drivers: ['drivers'] as const,
  analyticsInsights: ['analytics', 'insights'] as const,
};

const POLL_INTERVAL = 3000;

// ==================== TABLES ====================
export function useTables() {
  return useQuery({
    queryKey: queryKeys.tables,
    queryFn: () => api.get<Table[]>('/api/tables'),
    refetchInterval: POLL_INTERVAL,
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Table> }) =>
      api.patch<Table>(`/api/tables/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
    },
  });
}

// ==================== MENU ====================
export function useMenuItems() {
  return useQuery({
    queryKey: queryKeys.menuItems,
    queryFn: () => api.get<MenuItem[]>('/api/menu'),
    refetchInterval: POLL_INTERVAL * 5,
  });
}

// ==================== ORDERS ====================
export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: () => api.get<Order[]>('/api/orders'),
    refetchInterval: POLL_INTERVAL,
  });
}

export function useActiveOrders() {
  return useQuery({
    queryKey: queryKeys.activeOrders,
    queryFn: () => api.get<Order[]>('/api/orders/active'),
    refetchInterval: POLL_INTERVAL,
  });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: [...queryKeys.orders, id ?? ''],
    queryFn: () => {
      if (!id) return null;
      return api.get<Order>(`/api/orders/${id}`);
    },
    enabled: !!id,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (order: {
      tableId: string;
      tableName: string;
      items: OrderItem[];
      customerCount: number;
    }) => {
      const subtotal = order.items.reduce(
        (sum, item) => sum + item.menuItem.price * item.quantity,
        0
      );
      const tax = subtotal * 0.1;
      const total = subtotal + tax;
      return api.post<Order>('/api/orders', {
        table_id: order.tableId,
        table_name: order.tableName,
        customer_count: order.customerCount,
        status: 'pending',
        subtotal,
        tax,
        total,
        items: order.items.map(i => ({
          menu_item_id: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes ?? null,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Order> }) =>
      api.patch<Order>(`/api/orders/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

export function useUpdateOrderItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items: OrderItem[] }) =>
      api.patch<Order>(`/api/orders/${id}/items`, {
        items: items.map(i => ({
          menu_item_id: i.menuItemId,
          quantity: i.quantity,
          notes: i.notes ?? null,
        })),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

// ==================== PAYMENTS ====================
export function usePayments() {
  return useQuery({
    queryKey: ['payments'] as const,
    queryFn: () => api.get<Payment[]>('/api/payments'),
    refetchInterval: POLL_INTERVAL,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payment: {
      orderId: string;
      amount: number;
      method: PaymentMethod;
    }) =>
      api.post<Payment>('/api/payments', {
        order_id: payment.orderId,
        amount: payment.amount,
        method: payment.method,
        status: 'completed',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

export function useCompleteMockPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: string) =>
      api.post<Payment>(`/api/payments/complete-mock/${paymentId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.tables });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    },
  });
}

// ==================== NOTIFICATIONS ====================
export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: () => api.get<Notification[]>('/api/notifications'),
    refetchInterval: POLL_INTERVAL,
  });
}

export function useUnreadNotifications() {
  return useQuery({
    queryKey: [...queryKeys.notifications, 'unread'],
    queryFn: async () => {
      const notifs = await api.get<Notification[]>('/api/notifications');
      return notifs.filter(n => !n.read);
    },
    refetchInterval: POLL_INTERVAL,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<Notification>(`/api/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
}

// ==================== RESTAURANT ====================
export interface RestaurantData {
  id: string;
  name: string;
  address?: string;
  portalUrl?: string;
  customerPortalUrl?: string;
  logoUrl?: string;
  createdAt: string;
}

export function useRestaurant(restaurantId?: string) {
  return useQuery({
    queryKey: [...queryKeys.restaurant, restaurantId ?? ''],
    queryFn: async () => {
      if (!restaurantId) {
        // Fallback: try to get from sessionStorage if restaurantId not provided
        const rid = typeof window !== 'undefined' ? sessionStorage.getItem('restaurant_id') : null;
        if (!rid) throw new Error('No restaurant ID available');
        return api.get<RestaurantData>(`/api/restaurants/${rid}`);
      }
      return api.get<RestaurantData>(`/api/restaurants/${restaurantId}`);
    },
    enabled: !!restaurantId || (typeof window !== 'undefined' && !!sessionStorage.getItem('restaurant_id')),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ==================== STATS ====================
export function useStats() {
  return useQuery({
    queryKey: queryKeys.stats,
    queryFn: () => api.get<StatsResponse>('/api/stats'),
    refetchInterval: POLL_INTERVAL * 2,
  });
}

export function useAnalyticsInsights() {
  return useQuery({
    queryKey: queryKeys.analyticsInsights,
    queryFn: () => api.get<AnalyticsInsights>('/api/analytics/insights'),
    staleTime: 60 * 1000,
    refetchInterval: POLL_INTERVAL * 10,
  });
}

export interface CustomerAnalyticsDetail {
  user: User;
  orders: Array<{
    id: string;
    status: string;
    total: number;
    orderType?: string;
    deliveryAddress?: string;
    customerPhone?: string;
    createdAt: string;
    paidAt?: string;
    items: Array<{ name: string; quantity: number; lineTotal: number }>;
  }>;
}

export function useCustomerAnalyticsDetail(userId: string | undefined) {
  return useQuery({
    queryKey: ['analytics', 'customer', userId ?? ''] as const,
    queryFn: () => api.get<CustomerAnalyticsDetail>(`/api/analytics/customers/${userId}`),
    enabled: !!userId,
  });
}

// ==================== USERS (admin only) ====================
export function useUsers() {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => api.get<User[]>('/api/users').catch(() => [] as User[]),
  });
}

export function useCustomers() {
  return useQuery({
    queryKey: [...queryKeys.users, 'customers'],
    queryFn: async () => {
      const users = await api.get<User[]>('/api/users?role=customer');
      return users;
    },
  });
}

// ==================== DRIVERS ====================
export function useDrivers() {
  return useQuery({
    queryKey: queryKeys.drivers,
    queryFn: () => api.get<import('@/lib/types').Driver[]>('/api/drivers'),
    refetchInterval: POLL_INTERVAL * 2,
  });
}

export function useAvailableDrivers() {
  return useQuery({
    queryKey: [...queryKeys.drivers, 'available'],
    queryFn: () => api.get<import('@/lib/types').Driver[]>('/api/drivers/available'),
    refetchInterval: POLL_INTERVAL,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (driver: Omit<import('@/lib/types').Driver, 'id' | 'rating' | 'latitude' | 'longitude'>) =>
      api.post<import('@/lib/types').Driver>('/api/drivers', driver),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.drivers }),
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<import('@/lib/types').Driver> }) =>
      api.patch<import('@/lib/types').Driver>(`/api/drivers/${id}`, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.drivers }),
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ detail: string }>(`/api/drivers/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.drivers }),
  });
}

export function useAssignDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, driverId }: { orderId: string; driverId: string }) =>
      api.post<Order>(`/api/drivers/${orderId}/assign-driver`, { driver_id: driverId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders });
      queryClient.invalidateQueries({ queryKey: queryKeys.activeOrders });
    },
  });
}

// ==================== TABLE CRUD ====================
export function useCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (table: Omit<Table, 'id'>) =>
      api.post<Table>('/api/tables', table),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tables }),
  });
}

export function useDeleteTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/tables/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.tables }),
  });
}

// ==================== MENU ITEM CRUD ====================
export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<MenuItem, 'id' | 'restaurantId'> & { image?: File }) => {
      let imageUrl: string | undefined;
      if (item.image) {
        imageUrl = await uploadImage(item.image);
      }
      const { image, ...rest } = item;
      return api.post<MenuItem>('/api/menu', { ...rest, image_url: imageUrl });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menuItems }),
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MenuItem> & { image?: File } }) => {
      let imageUrl: string | undefined;
      if (updates.image) {
        imageUrl = await uploadImage(updates.image);
      }
      const { image, ...rest } = updates;
      return api.patch<MenuItem>(`/api/menu/${id}`, { ...rest, ...(imageUrl ? { image_url: imageUrl } : {}) });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menuItems }),
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/menu/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.menuItems }),
  });
}

// ==================== USER CRUD ====================
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user: Omit<User, 'id' | 'createdAt' | 'restaurantId'>) =>
      api.post<User>('/api/users', { ...user, password: user.pin || 'password' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<User> }) =>
      api.patch<User>(`/api/users/${id}`, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ ok: boolean }>(`/api/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.users }),
  });
}

// ==================== NOTIFICATIONS BULK ====================
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const notifs = await api.get<Notification[]>('/api/notifications');
      await Promise.all(
        notifs.filter(n => !n.read).map(n => api.patch(`/api/notifications/${n.id}/read`, {}))
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

// ==================== CUSTOMER PROFILE ====================
export interface CustomerProfile {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  total_orders: number;
  completed_orders: number;
  total_spent: number;
  rewards_points: number;
}

export function useCustomerProfile() {
  return useQuery({
    queryKey: ['customer', 'profile'] as const,
    queryFn: () => api.get<CustomerProfile>('/api/customers/profile'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ==================== MESSAGING ====================
export interface Message {
  id: string;
  restaurant_id: string;
  customer_id?: string;
  template_id?: string;
  message_type: string;
  content: string;
  target: string;
  phone_number: string;
  status: string;
  created_at: string;
  sent_at?: string;
  error_message?: string;
}

export interface MessageTemplate {
  id: string;
  restaurant_id: string;
  template_name: string;
  message_type: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface MessageResponse {
  success: boolean;
  message: string;
  messages_sent: number;
  messages_failed: number;
}

export function useMessageTemplates() {
  return useQuery({
    queryKey: ['messageTemplates'] as const,
    queryFn: () => api.get<MessageTemplate[]>('/api/messaging/templates'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      template_name: string;
      message_type: 'sms' | 'whatsapp';
      content: string;
      is_default: boolean;
    }) =>
      api.post<MessageTemplate>('/api/messaging/templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
    },
  });
}

export function useUpdateMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: { template_name: string; message_type: 'sms' | 'whatsapp'; content: string; is_default: boolean } }) =>
      api.patch<MessageTemplate>(`/api/messaging/templates/${templateId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
    },
  });
}

export function useDeleteMessageTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      api.delete(`/api/messaging/templates/${templateId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messageTemplates'] });
    },
  });
}

export function useSendBulkMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      message_type: 'sms' | 'whatsapp';
      content: string;
      target: 'all' | 'new';
    }) =>
      api.post<MessageResponse>('/api/messaging/send-bulk', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

export function useMessages() {
  return useQuery({
    queryKey: ['messages'] as const,
    queryFn: () => api.get<Message[]>('/api/messaging/messages'),
    staleTime: 5 * 60 * 1000,
  });
}

// ==================== DEV UTILITY ====================
export function useResetData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => true,
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
