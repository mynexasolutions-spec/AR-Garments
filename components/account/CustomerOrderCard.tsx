'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Ban, ExternalLink, Loader2, MapPin, Package, Truck, X } from 'lucide-react';
import {
  canCustomerCancelOrder,
  type Order,
  type OrderItem,
  type OrderStatus,
  type RefundStatus,
} from '@/lib/orders';

interface CancellationUpdate {
  status: 'Cancelled';
  cancelledAt: string;
  cancellationReason: string;
  refundStatus: RefundStatus;
  refundId?: string;
  refundedAt?: string;
}

interface CustomerOrderCardProps {
  order: Order;
  onCancelled: (orderId: string, update: CancellationUpdate) => void;
}

const CANCELLATION_REASONS = [
  'Ordered by mistake',
  'Need to change the delivery address',
  'Found another product',
  'Delivery is taking too long',
  'Payment or pricing issue',
  'Other',
] as const;

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

function OrderTotals({ order }: { order: Order }) {
  return (
    <div className="space-y-2 rounded-2xl border border-gray-200 bg-gray-50/70 px-4 py-3 text-xs">
      <div className="flex justify-between gap-4 text-gray-600">
        <span>Subtotal</span>
        <span className="font-bold text-gray-900">{formatCurrency(order.subtotal)}</span>
      </div>
      {order.discount > 0 && (
        <div className="flex justify-between gap-4 text-emerald-700">
          <span>Discount{order.couponCode ? ` (${order.couponCode})` : ''}</span>
          <span className="font-bold">−{formatCurrency(order.discount)}</span>
        </div>
      )}
      <div className="flex justify-between gap-4 text-gray-600">
        <span>Delivery charge</span>
        <span className={`font-bold ${order.shipping === 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
          {order.shipping === 0 ? 'FREE' : formatCurrency(order.shipping)}
        </span>
      </div>
      <div className="flex justify-between gap-4 border-t border-gray-200 pt-2 text-sm font-black text-gray-900">
        <span>Final payable</span>
        <span className="text-[#083028]">{formatCurrency(order.total)}</span>
      </div>
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
        {order.cancellationReason && (
          <p className="mt-1 text-xs text-red-600">Reason: {order.cancellationReason}</p>
        )}
        {order.refundStatus === 'processed' && (
          <p className="mt-2 text-xs font-bold text-emerald-700">Refund processed successfully.</p>
        )}
        {order.refundStatus === 'pending' && (
          <p className="mt-2 text-xs font-bold text-amber-700">Your refund is being processed.</p>
        )}
        {order.refundStatus === 'failed' && (
          <p className="mt-2 text-xs font-bold text-red-700">
            Automatic refund needs support review. Please contact us with this order ID.
          </p>
        )}
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
            <p className="text-base font-black text-gray-900">
              {order.deliveryPartnerName || order.courierName || (order.dispatchType === 'internal' ? 'In-House Rider Delivery' : 'Courier Dispatch')}
            </p>
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

export function CustomerOrderCard({ order, onCancelled }: CustomerOrderCardProps) {
  const [showCancellation, setShowCancellation] = useState(false);
  const [reason, setReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cancellationError, setCancellationError] = useState<string | null>(null);
  const cancellable = canCustomerCancelOrder(order.status);

  const submitCancellation = async () => {
    const selectedReason = reason === 'Other' ? customReason.trim() : reason;
    if (selectedReason.length < 3) {
      setCancellationError('Please enter a short reason for cancelling.');
      return;
    }

    setSubmitting(true);
    setCancellationError(null);
    try {
      const token = localStorage.getItem('ar_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`/api/orders/${encodeURIComponent(order.id)}/cancel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason: selectedReason }),
      });
      const data = (await response.json()) as Record<string, unknown>;
      if (!response.ok || data.success !== true) {
        throw new Error(
          typeof data.error === 'string' ? data.error : 'Unable to cancel this order.'
        );
      }

      onCancelled(order.id, {
        status: 'Cancelled',
        cancelledAt:
          typeof data.cancelledAt === 'string' ? data.cancelledAt : new Date().toISOString(),
        cancellationReason: selectedReason,
        refundStatus:
          data.refundStatus === 'pending' ||
          data.refundStatus === 'processed' ||
          data.refundStatus === 'failed'
            ? data.refundStatus
            : 'not_required',
        refundId: typeof data.refundId === 'string' ? data.refundId : undefined,
        refundedAt: typeof data.refundedAt === 'string' ? data.refundedAt : undefined,
      });
      setShowCancellation(false);
    } catch (error) {
      setCancellationError(
        error instanceof Error ? error.message : 'Unable to cancel this order.'
      );
    } finally {
      setSubmitting(false);
    }
  };

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
        <OrderTotals order={order} />
        <OrderFulfillmentProgress order={order} />

        {cancellable && !showCancellation && (
          <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-gray-500">Need to stop this order before it is packed?</p>
            <button
              type="button"
              onClick={() => {
                setCancellationError(null);
                setShowCancellation(true);
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              <Ban size={15} />
              Cancel order
            </button>
          </div>
        )}

        {cancellable && showCancellation && (
          <section className="rounded-2xl border border-red-200 bg-red-50/60 p-4" aria-label="Cancel order">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-black text-gray-900">Cancel this order?</h4>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  This cannot be undone.
                  {order.paymentMethod === 'online' && order.paymentStatus === 'paid'
                    ? ' A full refund will be submitted to your original payment method.'
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCancellation(false)}
                disabled={submitting}
                aria-label="Close cancellation form"
                className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-white hover:text-gray-900 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            <label htmlFor={`cancel-reason-${order.id}`} className="mt-4 block text-xs font-bold text-gray-800">
              Reason for cancellation
            </label>
            <select
              id={`cancel-reason-${order.id}`}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setCancellationError(null);
              }}
              disabled={submitting}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-hidden focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:opacity-60"
            >
              {CANCELLATION_REASONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>

            {reason === 'Other' && (
              <textarea
                value={customReason}
                onChange={(event) => {
                  setCustomReason(event.target.value.slice(0, 250));
                  setCancellationError(null);
                }}
                disabled={submitting}
                rows={2}
                maxLength={250}
                placeholder="Tell us why you are cancelling"
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-hidden placeholder:text-gray-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 disabled:opacity-60"
              />
            )}

            {cancellationError && (
              <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{cancellationError}</p>
            )}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowCancellation(false)}
                disabled={submitting}
                className="min-h-10 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
              >
                Keep order
              </button>
              <button
                type="button"
                onClick={submitCancellation}
                disabled={submitting}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                {submitting ? 'Cancelling…' : 'Confirm cancellation'}
              </button>
            </div>
          </section>
        )}
      </div>
    </article>
  );
}
