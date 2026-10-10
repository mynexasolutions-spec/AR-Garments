// ---------------------------------------------------------------------------
// AR GARMENT: Orders Types & In-Memory Store
// ---------------------------------------------------------------------------

export interface OrderItem {
  id: string;
  name: string;
  price: string | number;
  numericPrice?: number;
  image?: string;
  quantity: number;
  category?: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Packed'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered'
  | 'Cancelled';

export interface Order {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: 'cod' | 'online';
  paymentStatus: 'pending' | 'paid' | 'failed';
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode?: string;
  status: OrderStatus;
  confirmedAt?: string;
  packedAt?: string;
  shippedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  shiprocketOrderId?: string;
  shiprocketShipmentId?: string;
  courierName?: string;
  awbNumber?: string;
  trackingUrl?: string;
  trackingStatus?: string;
  currentLocation?: string;
  trackingUpdatedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

// In-memory store (empty by default - only live DB/runtime data is stored)
export const memoryOrders: Order[] = [];
