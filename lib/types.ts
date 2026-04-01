// Core types for Restaurant Management System

export type UserRole = 'sysadmin' | 'admin' | 'reception' | 'kitchen' | 'customer';


// === NEW: Multi-Tenant type ===
export interface Restaurant {
  id: string;
  name: string;
  address?: string;
  created_at: string;
}

export interface User {
  id: string;
  restaurantId?: string;   // null for sysadmin
  name: string;
  email?: string;
  username?: string;
  phone?: string;
  role: UserRole;
  pin?: string;
  createdAt: string;
}


export type TableStatus = 'available' | 'occupied' | 'ready';

export interface Table {
  id: string;
  restaurantId: string;
  name: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
  position: { row: number; col: number };
}

/** Raw category strings from DB / smart classifier (see lib/menu-categories.ts). */
export type MenuCategory = string;

export interface MenuItem {
  id: string;
  restaurantId?: string;
  name: string;
  price: number;
  category: MenuCategory;
  description?: string;
  available: boolean;
  image_url?: string;
  tags?: string[];
}

export interface OrderItem {
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export type OrderStatus = 'pending' | 'in-progress' | 'preparing' | 'ready' | 'served' | 'paid' | 'cancelled';

export interface Driver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicle_type: string;
  vehicle_plate?: string;
  rating: number;
  is_available: boolean;
  latitude?: number;
  longitude?: number;
}

export interface Order {
  id: string;
  restaurantId?: string;
  tableId: string;
  tableName: string;
  items: OrderItem[];
  customerCount: number;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  orderType?: 'dine-in' | 'delivery' | 'pickup';
  deliveryAddress?: string;
  customerPhone?: string;
  couponCode?: string;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  preparedAt?: string;
  paidAt?: string;
  itemsModifiedAt?: string;
  assignedAt?: string;
  driverId?: string;
  driver?: Driver;
}

export type PaymentMethod = 'cash' | 'card' | 'mobile' | 'qr';
export type PaymentStatus = 'pending' | 'completed' | 'failed';

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  createdAt: string;
}

export interface Receipt {
  id: string;
  orderId: string;
  paymentId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  createdAt: string;
  tableName: string;
  customerCount: number;
}

// Notification types for real-time updates
export type NotificationType = 'order_ready' | 'new_order' | 'payment_received' | 'order_modified' | 'order_started';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  orderId?: string;
  tableId?: string;
  read: boolean;
  createdAt: string;
}

// Auth session
export interface AuthSession {
  user: User;
  expiresAt: string;
}

// Auth token returned from backend login
export interface AuthToken {
  access_token: string;
  token_type: string;
  user_id: string;
  role: UserRole;
  restaurant_id?: string;
}

// Stats response from the backend
export interface StatsResponse {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  completedToday: number;
  todaySales: number;
  pendingApprovalOrders: number;
  totalRevenue?: number;
  totalTables?: number;
  availableTables?: number;
  occupiedTables?: number;
}

export interface MenuPopularityRow {
  menuItemId: string;
  name: string;
  category: string;
  categoryNormalized: string;
  quantitySold: number;
  revenue: number;
  orderCount: number;
}

export interface CategoryRevenueRow {
  category: string;
  quantity: number;
  revenue: number;
}

export interface CustomerAnalyticsRow {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  username?: string;
  registeredAt?: string;
  orderCount: number;
  visitCount: number;
  totalSpent: number;
  lastOrderAt?: string;
  favoriteMenuItems: string[];
  locations: string[];
  orderTypeBreakdown: Record<string, number>;
}

export interface AnalyticsInsights {
  generatedAt: string;
  menuTop: MenuPopularityRow[];
  categoryRevenue: CategoryRevenueRow[];
  customers: CustomerAnalyticsRow[];
  recommendations: string[];
  aiSummary?: string | null;
  aiModel?: string | null;
}
