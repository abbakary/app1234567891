from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Restaurant(Base):
    __tablename__ = "restaurants"
    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, nullable=True)  # Restaurant contact email
    phone = Column(String, nullable=True)  # Restaurant contact phone
    address = Column(String, nullable=True)
    airpay_account_id = Column(String, nullable=True)  # Airpay sub-account ID
    payment_status = Column(String, default="pending")  # 'pending', 'active', 'failed'
    customer_portal_url = Column(String, nullable=True, unique=True, index=True)  # e.g., 'restaurant-name-unique'
    logo_url = Column(String, nullable=True)  # URL to restaurant logo
    created_at = Column(DateTime, default=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, index=True)
    restaurant_id = Column(String, ForeignKey("restaurants.id"), nullable=True) # Nullable for SysAdmins
    name = Column(String, nullable=True)
    username = Column(String, unique=True, index=True, nullable=True)
    email = Column(String, unique=True, index=True, nullable=True)
    role = Column(String) # 'sysadmin', 'admin', 'reception', 'kitchen', 'customer'
    pin = Column(String, nullable=True)
    hashed_password = Column(String)
    phone = Column(String, nullable=True) # For customers
    created_at = Column(DateTime, default=datetime.utcnow)

class RestaurantTable(Base):
    __tablename__ = "tables"
    id = Column(String, primary_key=True, index=True)
    restaurant_id = Column(String, ForeignKey("restaurants.id"))
    name = Column(String)
    capacity = Column(Integer)
    status = Column(String)
    current_order_id = Column(String, nullable=True)
    position_row = Column(Integer)
    position_col = Column(Integer)
    seats = Column(Integer, default=4)

class MenuItem(Base):
    __tablename__ = "menu_items"
    id = Column(String, primary_key=True, index=True)
    restaurant_id = Column(String, ForeignKey("restaurants.id"))
    name = Column(String)
    price = Column(Float)
    category = Column(String)
    description = Column(String, nullable=True)
    available = Column(Boolean, default=True)
    image_url = Column(String, nullable=True)
    tags = Column(JSON, nullable=True)

class Driver(Base):
    __tablename__ = "drivers"
    id = Column(String, primary_key=True, index=True)
    restaurant_id = Column(String, ForeignKey("restaurants.id"))
    name = Column(String)
    phone = Column(String)
    email = Column(String, nullable=True)
    vehicle_type = Column(String)  # 'motorcycle', 'car', 'bicycle', etc.
    vehicle_plate = Column(String, nullable=True)
    rating = Column(Float, default=5.0)
    is_available = Column(Boolean, default=True)
    latitude = Column(Float, nullable=True)  # Current location
    longitude = Column(Float, nullable=True)  # Current location
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    orders = relationship("Order", back_populates="driver")

class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True, index=True)
    restaurant_id = Column(String, ForeignKey("restaurants.id"))
    customer_id = Column(String, ForeignKey("users.id"), nullable=True)  # For customer portal orders
    driver_id = Column(String, ForeignKey("drivers.id"), nullable=True)  # Driver assigned to delivery order
    table_id = Column(String, nullable=True)  # Nullable for delivery/pickup
    table_name = Column(String, nullable=True)  # Nullable for delivery/pickup
    customer_count = Column(Integer, nullable=True)
    order_type = Column(String, default="dine-in")  # 'dine-in', 'delivery', 'pickup'
    delivery_address = Column(String, nullable=True)  # For delivery orders
    customer_phone = Column(String, nullable=True)  # For delivery/pickup orders
    approval_status = Column(String, default="pending")  # 'pending', 'approved', 'rejected'
    approval_notes = Column(String, nullable=True)  # Reception notes on approval/rejection
    status = Column(String) # 'pending', 'preparing', 'ready', 'paid', 'cancelled'
    subtotal = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    coupon_code = Column(String, nullable=True)  # Unique identity for customer pickup/delivery
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    prepared_at = Column(DateTime, nullable=True)
    paid_at = Column(DateTime, nullable=True)
    items_modified_at = Column(DateTime, nullable=True)
    approved_at = Column(DateTime, nullable=True)  # When reception approved the order
    rejected_at = Column(DateTime, nullable=True)  # When reception rejected the order
    assigned_at = Column(DateTime, nullable=True)  # When driver was assigned

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    driver = relationship("Driver", back_populates="orders")

class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String, ForeignKey("orders.id"))
    menu_item_id = Column(String, ForeignKey("menu_items.id"))
    quantity = Column(Integer)
    notes = Column(String, nullable=True)
    
    order = relationship("Order", back_populates="items")
    menu_item = relationship("MenuItem")

class Payment(Base):
    __tablename__ = "payments"
    id = Column(String, primary_key=True, index=True)
    restaurant_id = Column(String, ForeignKey("restaurants.id"))
    order_id = Column(String)
    amount = Column(Float)
    platform_fee = Column(Float, default=0.0)  # Platform commission (e.g., 10%)
    restaurant_amount = Column(Float, default=0.0)  # Amount for restaurant
    method = Column(String)
    status = Column(String)  # 'PENDING', 'SUCCESS', 'FAILED'
    transaction_id = Column(String, nullable=True)  # Airpay transaction ID
    airpay_transaction_id = Column(String, nullable=True)  # Airpay reference
    webhook_processed = Column(String, nullable=True)  # Idempotency key
    created_at = Column(DateTime, default=datetime.utcnow)

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, index=True)
    restaurant_id = Column(String, ForeignKey("restaurants.id"))
    title = Column(String)
    message = Column(String)
    type = Column(String)  # 'order', 'payment', 'system'
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, index=True)
    restaurant_id = Column(String, ForeignKey("restaurants.id"))
    customer_id = Column(String, ForeignKey("users.id"), nullable=True)  # Nullable for 'all' message
    message_type = Column(String)  # 'sms', 'whatsapp'
    content = Column(String)
    target = Column(String)  # 'all', 'new' (customers who haven't received a message yet)
    phone_number = Column(String)
    status = Column(String, default="pending")  # 'pending', 'sent', 'failed'
    created_at = Column(DateTime, default=datetime.utcnow)
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(String, nullable=True)
