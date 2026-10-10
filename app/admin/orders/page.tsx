'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  CreditCard,
  Mail,
  MapPin,
  Package,
  Phone,
  Truck,
} from 'lucide-react';
import {
  OrderFulfillmentProgress,
  OrderShipmentTracking,
} from '@/components/account/CustomerOrderCard';
import { useToast } from '@/context/ToastContext';
import type { Order, OrderItem, OrderStatus } from '@/lib/orders';

const ALL_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Packed',
  'Shipped',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
];

const STATUS_STYLES: Record<OrderStatus, string> = {
  Pending: 'border-orange-200 bg-orange-100 text-orange-700',
  Confirmed: 'border-sky-200 bg-sky-100 text-sky-700',
  Processing: 'border-amber-200 bg-amber-100 text-amber-700',
  Packed: 'border-violet-200 bg-violet-100 text-violet-700',
  Shipped: 'border-blue-200 bg-blue-100 text-blue-700',
  'Out for Delivery': 'border-cyan-200 bg-cyan-100 text-cyan-700',
  Delivered: 'border-green-200 bg-green-100 text-green-700',
  Cancelled: 'border-red-200 bg-red-100 text-red-700',
};

const STATUS_DOT: Record<OrderStatus, string> = {
  Pending: 'bg-orange-500',
  Confirmed: 'bg-sky-500',
  Processing: 'bg-amber-500',
  Packed: 'bg-violet-500',
  Shipped: 'bg-blue-500',
  'Out for Delivery': 'bg-cyan-500',
  Delivered: 'bg-green-500',
  Cancelled: 'bg-red-500',
};

const PAYMENT_STATUS_STYLES: Record<Order['paymentStatus'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function itemUnitPrice(item: OrderItem): number | null {
  if (typeof item.numericPrice === 'number') return item.numericPrice;
  if (typeof item.price === 'number') return item.price;

  const parsed = Number(item.price.replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatItemPrice(item: OrderItem): string {
  const price = itemUnitPrice(item);
  if (price !== null) return formatCurrency(price);
  return String(item.price || 'Price unavailable');
}

function applyOptimisticStatus(order: Order, status: OrderStatus): Order {
  const now = new Date().toISOString();
  const updatedOrder: Order = { ...order, status, updatedAt: now };

  if (status === 'Confirmed' || status === 'Processing') updatedOrder.confirmedAt = now;
  if (status === 'Packed') updatedOrder.packedAt = now;
  if (status === 'Shipped') updatedOrder.shippedAt = now;
  if (status === 'Out for Delivery') updatedOrder.outForDeliveryAt = now;
  if (status === 'Delivered') updatedOrder.deliveredAt = now;
  if (status === 'Cancelled') updatedOrder.cancelledAt = now;

  return updatedOrder;
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const normalized = ALL_STATUSES.includes(status) ? status : 'Pending';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${STATUS_STYLES[normalized]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[normalized]}`} />
      {normalized}
    </span>
  );
}

function DetailCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4">
      <div className="flex items-center gap-2 text-[#8A6414]">
        {icon}
        <h3 className="text-[11px] font-black uppercase tracking-wider">{title}</h3>
      </div>
      <div className="mt-3 space-y-1 text-xs text-gray-600">{children}</div>
    </section>
  );
}

function OrderedProducts({ order }: { order: Order }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200">
      <div className="border-b border-gray-100 bg-gray-50/70 px-4 py-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#8A6414]">
          Ordered products
        </h3>
      </div>

      <div className="divide-y divide-gray-100 px-4">
        {order.items.length === 0 ? (
          <p className="py-5 text-sm text-gray-500">No product information is available.</p>
        ) : (
          order.items.map((item, index) => {
            const unitPrice = itemUnitPrice(item);
            const lineTotal = unitPrice === null ? null : unitPrice * item.quantity;

            return (
              <div
                key={`${item.id || item.name}-${index}`}
                className="flex items-center gap-3 py-4"
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-[#FAF8F3]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <Package className="absolute inset-0 m-auto text-[#C9972B]" size={25} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
                  {item.category && <p className="mt-0.5 text-xs text-gray-400">{item.category}</p>}
                  <p className="mt-1 text-xs text-gray-500">
                    Quantity {item.quantity} × {formatItemPrice(item)}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-black text-gray-900">
                  {lineTotal === null ? formatItemPrice(item) : formatCurrency(lineTotal)}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-2 border-t border-gray-200 bg-[#FAF8F3]/50 px-4 py-4 text-xs">
        <div className="flex justify-between gap-4 text-gray-600">
          <span>Subtotal</span>
          <span className="font-bold text-gray-800">{formatCurrency(order.subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between gap-4 text-emerald-700">
            <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
            <span className="font-bold">−{formatCurrency(order.discount)}</span>
          </div>
        )}
        <div className="flex justify-between gap-4 text-gray-600">
          <span>Shipping</span>
          <span className="font-bold text-gray-800">
            {order.shipping === 0 ? 'Free' : formatCurrency(order.shipping)}
          </span>
        </div>
        <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 text-sm font-black text-gray-900">
          <span>Total</span>
          <span>{formatCurrency(order.total)}</span>
        </div>
      </div>
    </section>
  );
}

function AdminOrderCard({
  order,
  expanded,
  updating,
  onToggle,
  onStatusChange,
}: {
  order: Order;
  expanded: boolean;
  updating: boolean;
  onToggle: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
}) {
  const address = order.shippingAddress;
  const paymentLabel = order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment (Razorpay)';

  return (
    <article className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition ${expanded ? 'border-[#C9972B]/60' : 'border-gray-200 hover:border-[#C9972B]/40'}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="group flex w-full items-start justify-between gap-4 px-4 py-4 text-left sm:items-center sm:px-6 sm:py-5"
      >
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-black text-[#9A6B0A]">{order.id}</p>
          <p className="mt-1 truncate text-base font-black text-gray-900 sm:text-lg">{order.userName}</p>
          <p className="mt-1 text-xs text-gray-500">{formatDateTime(order.createdAt)}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="hidden text-sm font-black text-[#083028] sm:inline">
              {formatCurrency(order.total)}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#8A6414]">
            {expanded ? 'Hide details' : 'View details'}
            <ChevronDown
              size={15}
              className={`transition-transform ${expanded ? 'rotate-180' : 'group-hover:translate-y-0.5'}`}
            />
          </span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-5 border-t border-gray-100 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <DetailCard icon={<Mail size={16} />} title="Customer">
              <p className="font-bold text-gray-900">{address.fullName || order.userName}</p>
              <p className="break-all">{order.userEmail}</p>
              <p className="flex items-center gap-1.5">
                <Phone size={12} /> {address.phone || 'Phone not provided'}
              </p>
            </DetailCard>

            <DetailCard icon={<CreditCard size={16} />} title="Payment">
              <p className="font-bold text-gray-900">{paymentLabel}</p>
              <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase ${PAYMENT_STATUS_STYLES[order.paymentStatus]}`}>
                {order.paymentStatus}
              </span>
              {order.paymentMethod === 'online' && (
                <>
                  <p className="break-all">Payment ID: {order.razorpayPaymentId || 'Not available'}</p>
                  <p className="break-all">Razorpay order: {order.razorpayOrderId || 'Not available'}</p>
                </>
              )}
            </DetailCard>

            <DetailCard icon={<Truck size={16} />} title="Delivery">
              <p className="font-bold text-gray-900">{order.courierName || 'Not assigned'}</p>
              <p>AWB: {order.awbNumber || 'Not assigned'}</p>
              <p>Status: {order.trackingStatus || 'Awaiting shipment creation'}</p>
            </DetailCard>

            <DetailCard icon={<MapPin size={16} />} title="Shipping address">
              <p className="font-bold text-gray-900">{address.addressLine1 || 'Address not available'}</p>
              {address.addressLine2 && <p>{address.addressLine2}</p>}
              <p>
                {[address.city, address.state].filter(Boolean).join(', ')}
                {address.pincode ? ` ${address.pincode}` : ''}
              </p>
            </DetailCard>
          </div>

          <OrderedProducts order={order} />

          <section className="space-y-4 rounded-2xl border border-gray-200 p-4 sm:p-5">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[#8A6414]">
                Order tracking
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Update fulfillment progress and review the live Shiprocket delivery information.
              </p>
            </div>

            <OrderFulfillmentProgress order={order} />

            <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <label htmlFor={`status-${order.id}`} className="text-xs font-bold text-gray-900">
                  Fulfillment status
                </label>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Customers see this update in their My Orders section.
                </p>
              </div>
              <select
                id={`status-${order.id}`}
                value={order.status}
                disabled={updating}
                onChange={(event) => void onStatusChange(order.id, event.target.value as OrderStatus)}
                className="min-w-48 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-bold text-gray-800 outline-none transition focus:border-[#C9972B] focus:ring-2 focus:ring-[#C9972B]/20 disabled:cursor-wait disabled:opacity-60"
              >
                {ALL_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <OrderShipmentTracking order={order} />
          </section>
        </div>
      )}
    </article>
  );
}

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await fetch('/api/orders?all=true', { cache: 'no-store' });
        if (!response.ok) throw new Error('The orders API request failed.');

        const data = await response.json();
        const orderList: Order[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.orders)
            ? data.orders
            : [];

        setOrders(orderList);
      } catch {
        setError('Failed to fetch orders from the database.');
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }

    void fetchOrders();
  }, []);

  async function handleStatusChange(orderId: string, newStatus: OrderStatus): Promise<void> {
    const previousOrder = orders.find((order) => order.id === orderId);
    if (!previousOrder || previousOrder.status === newStatus) return;

    setUpdatingOrderId(orderId);
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId ? applyOptimisticStatus(order, newStatus) : order
      )
    );

    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(result?.error || 'The order status could not be saved.');
      }

      toast.success(`Order ${orderId} is now ${newStatus}.`, { title: 'Order Status Updated' });
    } catch (statusError) {
      setOrders((currentOrders) =>
        currentOrders.map((order) => (order.id === orderId ? previousOrder : order))
      );
      toast.error(
        statusError instanceof Error ? statusError.message : 'The order status could not be saved.',
        { title: 'Status Update Failed' }
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#A77510]">
            Customer fulfillment
          </p>
          <h1 className="mt-1 flex items-center gap-2.5 text-2xl font-bold text-gray-900">
            <Package className="text-[#083028]" size={26} />
            Orders
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading
              ? 'Loading orders from the database...'
              : `${orders.length} order${orders.length === 1 ? '' : 's'} stored in the database`}
          </p>
        </div>

        <Link
          href="/admin"
          className="flex items-center gap-1.5 self-start rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 shadow-xs transition hover:bg-gray-50 sm:self-auto"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#083028] border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-12 text-center shadow-sm">
          <Package size={48} className="mx-auto mb-3 text-gray-300" />
          <h2 className="text-base font-bold text-gray-800">No Orders in Database</h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-gray-500">
            Customer orders will appear here after they are placed on the storefront.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <AdminOrderCard
              key={order.id}
              order={order}
              expanded={expandedOrderId === order.id}
              updating={updatingOrderId === order.id}
              onToggle={() =>
                setExpandedOrderId((currentId) => (currentId === order.id ? null : order.id))
              }
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
