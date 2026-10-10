import Image from 'next/image';
import { ExternalLink, MapPin, Package, Truck } from 'lucide-react';
import type { Order, OrderItem, OrderStatus } from '@/lib/orders';

type MilestoneTimestampKey =
  | 'createdAt'
  | 'confirmedAt'
  | 'packedAt'
  | 'shippedAt'
  | 'outForDeliveryAt'
  | 'deliveredAt';

interface FulfillmentStep {
  label: string;
  timestampKey: MilestoneTimestampKey;
}

const FULFILLMENT_STEPS: FulfillmentStep[] = [
  { label: 'Order placed', timestampKey: 'createdAt' },
  { label: 'Confirmed', timestampKey: 'confirmedAt' },
  { label: 'Packed', timestampKey: 'packedAt' },
  { label: 'Shipped', timestampKey: 'shippedAt' },
  { label: 'Out for delivery', timestampKey: 'outForDeliveryAt' },
  { label: 'Delivered', timestampKey: 'deliveredAt' },
];

const STATUS_STEP_INDEX: Record<OrderStatus, number> = {
  Pending: 0,
  Confirmed: 1,
  Processing: 1,
  Packed: 2,
  Shipped: 3,
  'Out for Delivery': 4,
  Delivered: 5,
  Cancelled: 0,
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  Pending: 'bg-amber-100 text-amber-800',
  Confirmed: 'bg-sky-100 text-sky-800',
  Processing: 'bg-sky-100 text-sky-800',
  Packed: 'bg-violet-100 text-violet-800',
  Shipped: 'bg-blue-100 text-blue-800',
  'Out for Delivery': 'bg-orange-100 text-orange-800',
  Delivered: 'bg-emerald-100 text-emerald-800',
  Cancelled: 'bg-red-100 text-red-800',
};

function displayStatus(status: OrderStatus): string {
  return status === 'Processing' ? 'Confirmed' : status;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatMilestoneDate(value: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatItemPrice(item: OrderItem): string | null {
  if (typeof item.numericPrice === 'number') return formatCurrency(item.numericPrice);
  if (typeof item.price === 'number') return formatCurrency(item.price);
  if (typeof item.price !== 'string' || !item.price.trim()) return null;
  return item.price.includes('₹') ? item.price : `₹${item.price}`;
}

function milestoneText(order: Order, step: FulfillmentStep, stepIndex: number): string {
  const timestamp = order[step.timestampKey];
  if (timestamp) return formatMilestoneDate(timestamp);

  const currentStepIndex = STATUS_STEP_INDEX[order.status];
  if (stepIndex < currentStepIndex) return 'Completed';
  if (stepIndex === currentStepIndex && order.updatedAt) {
    return formatMilestoneDate(order.updatedAt);
  }
  return 'Awaiting update';
}

function OrderItems({ items }: { items: OrderItem[] }) {
  return (
    <div className="divide-y divide-gray-100">
      {items.map((item, index) => {
        const price = formatItemPrice(item);
        return (
          <div key={`${item.id || item.name}-${index}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-[#FAF8F3]">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <Package className="absolute inset-0 m-auto text-[#C9972B]" size={24} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-gray-900">{item.name}</p>
              <p className="mt-0.5 text-xs text-gray-500">Quantity {item.quantity}</p>
            </div>
            {price && <span className="text-sm font-bold text-gray-900">{price}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function OrderFulfillmentProgress({ order }: { order: Order }) {
  if (order.status === 'Cancelled') {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
        <p className="text-xs font-black uppercase tracking-wider text-red-700">Order cancelled</p>
        <p className="mt-1 text-xs text-red-600">
          {order.cancelledAt ? formatMilestoneDate(order.cancelledAt) : 'Contact support if you need assistance.'}
        </p>
      </div>
    );
  }

  const currentStepIndex = STATUS_STEP_INDEX[order.status];
  return (
    <div className="rounded-2xl border border-[#E8DFC8] bg-[#FFFCF5] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wider text-[#8A6414]">
          Fulfillment progress
        </p>
        <span className="rounded-full bg-[#C9972B]/15 px-2.5 py-1 text-[10px] font-black uppercase text-[#76520A]">
          {displayStatus(order.status)}
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="grid min-w-[680px] grid-cols-6">
          {FULFILLMENT_STEPS.map((step, index) => {
            const reached = index <= currentStepIndex;
            const connectorReached = index < currentStepIndex;
            return (
              <div key={step.label} className="relative pr-2 last:pr-0">
                {index < FULFILLMENT_STEPS.length - 1 && (
                  <span
                    className={`absolute left-3 top-2 h-0.5 w-full ${
                      connectorReached ? 'bg-[#D7A83B]' : 'bg-gray-200'
                    }`}
                  />
                )}
                <span
                  className={`relative z-10 block h-4 w-4 rounded-full border-2 ${
                    reached
                      ? 'border-[#D7A83B] bg-[#F6CE6C]'
                      : 'border-gray-300 bg-white'
                  }`}
                />
                <p className={`mt-2 text-[11px] font-bold ${reached ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                <p className="mt-0.5 pr-2 text-[9px] leading-3 text-gray-500">
                  {milestoneText(order, step, index)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TrackingDetail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-1 break-words text-xs font-bold text-gray-800">
        {value || 'Pending assignment'}
      </p>
    </div>
  );
}

export function OrderShipmentTracking({ order }: { order: Order }) {
  const hasLiveTracking = Boolean(
    order.shiprocketShipmentId || order.awbNumber || order.trackingUrl
  );

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-[#8A6414]">
            Shipment tracking
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Truck size={18} className="text-[#083028]" />
            <p className="text-base font-black text-gray-900">Powered by Shiprocket</p>
          </div>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
            hasLiveTracking
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {hasLiveTracking ? 'Live' : 'Awaiting shipment'}
        </span>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-[#E8DFC8] bg-[#FFFCF5] px-3 py-3">
        <div className="flex items-start gap-2">
          <MapPin size={17} className="mt-0.5 shrink-0 text-[#C9972B]" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Current location</p>
            <p className="mt-0.5 text-xs font-bold text-gray-800">
              {order.currentLocation || 'Awaiting carrier scan'}
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[#C9972B]/15 px-2 py-1 text-[10px] font-black uppercase text-[#76520A]">
          {order.trackingStatus || 'New'}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <TrackingDetail label="Shiprocket Order ID" value={order.shiprocketOrderId} />
        <TrackingDetail label="Shipment ID" value={order.shiprocketShipmentId} />
        <TrackingDetail label="Courier" value={order.courierName} />
        <TrackingDetail label="AWB Number" value={order.awbNumber} />
      </div>

      {order.trackingUrl && (
        <a
          href={order.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[#083028] hover:underline"
        >
          Open live tracking <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}

export function CustomerOrderCard({ order }: { order: Order }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 bg-[#FAF8F3]/70 px-4 py-4 sm:px-5">
        <div>
          <p className="font-mono text-xs font-black text-[#8A6414]">{order.id}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-gray-900">{displayStatus(order.status)}</h3>
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${STATUS_STYLES[order.status]}`}>
              {displayStatus(order.status)}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">Placed {formatDate(order.createdAt)}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-[#083028]">{formatCurrency(order.total)}</p>
          <p className="mt-1 text-[10px] font-bold uppercase text-gray-400">
            {order.paymentMethod === 'cod' ? 'Cash on delivery' : 'Online payment'}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <OrderItems items={order.items} />
        <OrderFulfillmentProgress order={order} />
      </div>
    </article>
  );
}
