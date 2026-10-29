import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { calculateCheckoutPricing, CheckoutPricingError } from '@/lib/checkoutPricing';
import { isAdminRequest } from '@/lib/adminSession';
import { getAuthenticatedUser } from '@/lib/requestAuth';
import { resolveDispatchRouting } from '@/lib/deliveryPartners';
import {
  Order,
  OrderItem,
  ShippingAddress,
  OrderStatus,
  memoryOrders,
} from '@/lib/orders';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function generateOrderId(): string {
  return `ORD-${Date.now()}`;
}

function isValidUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

// ---------------------------------------------------------------------------
// GET /api/orders
//   ?all=true   → returns all orders (admin)
//   ?userId=xxx → returns orders for that user
// ---------------------------------------------------------------------------

function mapDbOrder(row: Record<string, unknown>): Order {
  const optionalString = (value: unknown): string | undefined =>
    value ? String(value) : undefined;

  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.user_name),
    userEmail: String(row.user_email),
    items: Array.isArray(row.items) ? (row.items as OrderItem[]) : [],
    shippingAddress: (row.shipping_address as ShippingAddress) || {
      fullName: '',
      phone: '',
      addressLine1: '',
      city: '',
      state: '',
      pincode: '',
    },
    paymentMethod: row.payment_method === 'online' ? 'online' : 'cod',
    paymentStatus:
      row.payment_status === 'paid' || row.payment_status === 'failed'
        ? row.payment_status
        : 'pending',
    ...(row.razorpay_order_id ? { razorpayOrderId: String(row.razorpay_order_id) } : {}),
    ...(row.razorpay_payment_id ? { razorpayPaymentId: String(row.razorpay_payment_id) } : {}),
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    shipping: Number(row.shipping) || 0,
    total: Number(row.total) || 0,
    couponCode: row.coupon_code ? String(row.coupon_code) : undefined,
    status: (row.status as OrderStatus) || 'Pending',
    confirmedAt: optionalString(row.confirmed_at),
    packedAt: optionalString(row.packed_at),
    shippedAt: optionalString(row.shipped_at),
    outForDeliveryAt: optionalString(row.out_for_delivery_at),
    deliveredAt: optionalString(row.delivered_at),
    cancelledAt: optionalString(row.cancelled_at),
    cancellationReason: optionalString(row.cancellation_reason),
    cancelledBy:
      row.cancelled_by === 'customer' || row.cancelled_by === 'admin'
        ? row.cancelled_by
        : undefined,
    refundStatus:
      row.refund_status === 'pending' ||
      row.refund_status === 'processed' ||
      row.refund_status === 'failed'
        ? row.refund_status
        : row.status === 'Cancelled' &&
            row.payment_method === 'online' &&
            row.payment_status === 'paid'
          ? 'pending'
          : 'not_required',
    refundId: optionalString(row.refund_id),
    refundedAt: optionalString(row.refunded_at),
    shiprocketOrderId: optionalString(row.shiprocket_order_id),
    shiprocketShipmentId: optionalString(row.shiprocket_shipment_id),
    courierName: optionalString(row.courier_name),
    awbNumber: optionalString(row.awb_number),
    trackingUrl: optionalString(row.tracking_url),
    trackingStatus: optionalString(row.tracking_status),
    currentLocation: optionalString(row.current_location),
    trackingUpdatedAt: optionalString(row.tracking_updated_at),
    deliveryPartnerId: optionalString(row.delivery_partner_id),
    deliveryPartnerName:
      optionalString(row.delivery_partner_name) || optionalString(row.courier_name),
    deliveryZoneId: optionalString(row.delivery_zone_id),
    deliveryZoneName: optionalString(row.delivery_zone_name),
    dispatchType: (row.dispatch_type as 'internal' | 'external') || 'internal',
    dispatchStatus: (row.dispatch_status as Order['dispatchStatus']) || 'pending',
    dispatchNotes: optionalString(row.dispatch_notes),
    createdAt: row.created_at
      ? new Date(String(row.created_at)).toISOString()
      : new Date().toISOString(),
    updatedAt: optionalString(row.updated_at),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all');
    const userId = searchParams.get('userId');

    if (all === 'true' && !isAdminRequest(request)) {
      return NextResponse.json(
        { success: false, error: 'Administrator access is required.' },
        { status: 403 }
      );
    }

    const authenticatedUser = all === 'true' ? null : getAuthenticatedUser(request);
    if (all !== 'true' && !authenticatedUser) {
      return NextResponse.json(
        { success: false, error: 'Please sign in to view your orders.' },
        { status: 401 }
      );
    }
    if (userId && authenticatedUser && userId !== authenticatedUser.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot view another customer\u2019s orders.' },
        { status: 403 }
      );
    }

    const resolvedUserId = authenticatedUser?.id;

    // 1. Try querying Supabase
    try {
      const supabase = getServiceSupabase();
      let query = supabase.from('orders').select('*');

      if (all === 'true') {
        query = query.order('created_at', { ascending: false });
      } else if (resolvedUserId) {
        query = query.eq('user_id', resolvedUserId).order('created_at', { ascending: false });
      } else {
        return NextResponse.json(
          { success: false, error: 'Provide ?userId=xxx or ?all=true' },
          { status: 400 }
        );
      }

      const { data, error } = await query;
      const dbOrders = !error && Array.isArray(data) ? data.map(mapDbOrder) : [];

      // Merge DB orders with in-memory orders (avoid duplicates)
      const combined = [...dbOrders];
      for (const mOrder of memoryOrders) {
        if (!combined.some((o) => o.id === mOrder.id)) {
          if (all === 'true' || (resolvedUserId && mOrder.userId === resolvedUserId)) {
            combined.push(mOrder);
          }
        }
      }
      combined.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return NextResponse.json(
        { success: true, orders: combined, total: combined.length },
        { status: 200 }
      );
    } catch {
      // Supabase table not created or error — fall back to memory
    }

    // 2. Fallback to in-memory store
    if (all === 'true') {
      const sorted = [...memoryOrders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return NextResponse.json(
        { success: true, orders: sorted, total: sorted.length },
        { status: 200 }
      );
    }

    if (resolvedUserId) {
      const userOrders = memoryOrders
        .filter((o) => o.userId === resolvedUserId)
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      return NextResponse.json(
        { success: true, orders: userOrders, total: userOrders.length },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Provide ?userId=xxx or ?all=true' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[GET /api/orders] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/orders  — place a new order (Stores in Supabase DB + memory)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authenticatedUser = getAuthenticatedUser(request);
  if (!authenticatedUser) {
    return NextResponse.json(
      { success: false, error: 'Please sign in before placing an order.' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();

    const { items, shippingAddress, paymentMethod, total, couponCode } = body;

    const address = shippingAddress || body.deliveryAddress || body.address;
    const resolvedUserName =
      authenticatedUser.name ||
      address?.fullName ||
      authenticatedUser.email.split('@')[0] ||
      'Customer';

    // --- Basic validation ---
    if (!items?.length || !address || !paymentMethod || total === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: items, address, paymentMethod, total',
        },
        { status: 400 }
      );
    }

    if (!['cod', 'online'].includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, error: "paymentMethod must be 'cod' or 'online'" },
        { status: 400 }
      );
    }

    if (paymentMethod === 'online') {
      return NextResponse.json(
        { success: false, error: 'Online orders must be created through Razorpay checkout.' },
        { status: 400 }
      );
    }

    const pricing = await calculateCheckoutPricing(
      items,
      couponCode,
      address?.pincode,
      address?.city
    );
    const expectedTotal = Number(total);
    const priceDiff = Math.abs(expectedTotal - pricing.total);

    if (!Number.isFinite(expectedTotal) || (priceDiff > 5.0 && priceDiff > pricing.total * 0.15)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your cart price changed. Refresh the cart and try again.',
          pricing,
        },
        { status: 409 }
      );
    }

    // Automatic Dispatch Routing based on shipping pincode
    const routing = resolveDispatchRouting(address.pincode || '');

    // --- Build order object ---
    const newOrder: Order = {
      id: generateOrderId(),
      userId: authenticatedUser.id,
      userName: resolvedUserName,
      userEmail: authenticatedUser.email,
      items: pricing.items,
      shippingAddress: address,
      paymentMethod,
      paymentStatus: 'pending',
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      shipping: pricing.shipping,
      total: pricing.total,
      ...(pricing.couponCode ? { couponCode: pricing.couponCode } : {}),
      status: 'Pending',
      deliveryPartnerId: routing.partnerId || undefined,
      deliveryPartnerName: routing.partnerName,
      deliveryZoneId: routing.zoneId || undefined,
      deliveryZoneName: routing.zoneName,
      dispatchType: routing.dispatchType,
      dispatchStatus: routing.dispatchStatus,
      dispatchNotes: routing.notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Insert into Supabase Orders table
    try {
      const supabase = getServiceSupabase();

      // Core payload — guaranteed to work on foundational orders table schema
      const standardPayload = {
        id: newOrder.id,
        user_id: newOrder.userId,
        user_name: newOrder.userName,
        user_email: newOrder.userEmail,
        items: newOrder.items,
        shipping_address: newOrder.shippingAddress,
        payment_method: newOrder.paymentMethod,
        payment_status: newOrder.paymentStatus,
        subtotal: newOrder.subtotal,
        discount: newOrder.discount,
        shipping: newOrder.shipping,
        total: newOrder.total,
        coupon_code: newOrder.couponCode || null,
        status: newOrder.status,
        courier_name: newOrder.deliveryPartnerName || null,
      };

      // Sanitize UUID fields so Postgres UUID columns never throw invalid syntax errors
      const validPartnerId = isValidUuid(newOrder.deliveryPartnerId) ? newOrder.deliveryPartnerId : null;
      const validZoneId = isValidUuid(newOrder.deliveryZoneId) ? newOrder.deliveryZoneId : null;

      // First try: insert with dispatch routing columns (requires SQL migration)
      const { error: insertError } = await supabase.from('orders').insert({
        ...standardPayload,
        delivery_partner_id: validPartnerId,
        delivery_zone_id: validZoneId,
        dispatch_type: newOrder.dispatchType,
        dispatch_status: newOrder.dispatchStatus,
        dispatch_notes: newOrder.dispatchNotes || null,
      });

      if (insertError) {
        // Fallback: insert without dispatch columns (if SQL migration not yet run or column mismatch)
        console.warn(
          '[POST /api/orders] Full insert failed (' + insertError.code + '): ' + insertError.message + '. Retrying standard payload...'
        );
        const { error: fallbackError } = await supabase
          .from('orders')
          .insert(standardPayload);

        if (fallbackError) {
          console.error('[POST /api/orders] Standard insert ALSO failed:', fallbackError.message, fallbackError.code);
          return NextResponse.json(
            {
              success: false,
              error: `Database save error: ${fallbackError.message}`,
              code: fallbackError.code,
            },
            { status: 500 }
          );
        } else {
          console.log('[POST /api/orders] Standard insert succeeded for order:', newOrder.id);
        }
      } else {
        console.log('[POST /api/orders] Full insert with dispatch routing succeeded for order:', newOrder.id);
      }

      // Also persist/update address into user_addresses table in Supabase
      if (address && address.fullName && address.addressLine1 && address.city) {
        const { data: existingAddr } = await supabase
          .from('user_addresses')
          .select('id')
          .eq('user_id', newOrder.userId)
          .maybeSingle();

        if (existingAddr?.id) {
          await supabase
            .from('user_addresses')
            .update({
              full_name: address.fullName,
              phone: address.phone || '',
              address_line1: address.addressLine1,
              address_line2: address.addressLine2 || '',
              city: address.city,
              state: address.state || '',
              pincode: address.pincode || '',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingAddr.id);
        } else {
          await supabase.from('user_addresses').insert({
            user_id: newOrder.userId,
            full_name: address.fullName,
            phone: address.phone || '',
            address_line1: address.addressLine1,
            address_line2: address.addressLine2 || '',
            city: address.city,
            state: address.state || '',
            pincode: address.pincode || '',
            is_default: true,
          });
        }
      }
    } catch (dbErr) {
      console.error('[POST /api/orders] Supabase unexpected exception:', dbErr);
    }

    // 2. Persist to in-memory store (always — ensures order is never lost)
    memoryOrders.unshift(newOrder);

    return NextResponse.json(
      { success: true, order: newOrder, orderId: newOrder.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('[POST /api/orders] Error:', error);
    if (error instanceof CheckoutPricingError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/orders — update order status (Admin)
// ---------------------------------------------------------------------------

export async function PATCH(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json(
      { success: false, error: 'Administrator access is required.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      orderId,
      status,
      deliveryPartnerId,
      deliveryPartnerName,
      dispatchStatus,
      dispatchNotes,
      awbNumber,
      trackingUrl,
    } = body;

    const allowedStatuses: OrderStatus[] = [
      'Pending',
      'Confirmed',
      'Processing',
      'Packed',
      'Shipped',
      'Out for Delivery',
      'Delivered',
      'Cancelled',
    ];

    if (!orderId || !status || !allowedStatuses.includes(status as OrderStatus)) {
      return NextResponse.json(
        { success: false, error: 'A valid orderId and status are required.' },
        { status: 400 }
      );
    }

    const normalizedStatus = status as OrderStatus;
    const now = new Date().toISOString();
    const statusTimestampColumns: Partial<Record<OrderStatus, string>> = {
      Confirmed: 'confirmed_at',
      Processing: 'confirmed_at',
      Packed: 'packed_at',
      Shipped: 'shipped_at',
      'Out for Delivery': 'out_for_delivery_at',
      Delivered: 'delivered_at',
      Cancelled: 'cancelled_at',
    };
    const timestampColumn = statusTimestampColumns[normalizedStatus];
    const databaseUpdate: Record<string, string | null> = {
      status: normalizedStatus,
      updated_at: now,
    };
    if (timestampColumn) databaseUpdate[timestampColumn] = now;
    if (deliveryPartnerId !== undefined) databaseUpdate.delivery_partner_id = deliveryPartnerId || null;
    if (dispatchStatus !== undefined) databaseUpdate.dispatch_status = dispatchStatus;
    if (dispatchNotes !== undefined) databaseUpdate.dispatch_notes = dispatchNotes || null;
    if (awbNumber !== undefined) databaseUpdate.awb_number = awbNumber || null;
    if (trackingUrl !== undefined) databaseUpdate.tracking_url = trackingUrl || null;

    // 1. Update in Supabase
    let databaseUpdated = false;
    let databaseError: string | null = null;
    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('orders')
        .update(databaseUpdate)
        .eq('id', orderId)
        .select('id')
        .maybeSingle();

      if (error) {
        databaseError = error.message;
      } else {
        databaseUpdated = Boolean(data?.id);
      }
    } catch (error) {
      databaseError = error instanceof Error ? error.message : 'Unknown database error';
    }

    // 2. Update in-memory store
    const idx = memoryOrders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      const order = memoryOrders[idx];
      order.status = normalizedStatus;
      order.updatedAt = now;
      if (deliveryPartnerId !== undefined) order.deliveryPartnerId = deliveryPartnerId;
      if (deliveryPartnerName !== undefined) order.deliveryPartnerName = deliveryPartnerName;
      if (dispatchStatus !== undefined) order.dispatchStatus = dispatchStatus;
      if (dispatchNotes !== undefined) order.dispatchNotes = dispatchNotes;
      if (awbNumber !== undefined) order.awbNumber = awbNumber;
      if (trackingUrl !== undefined) order.trackingUrl = trackingUrl;
      if (normalizedStatus === 'Confirmed' || normalizedStatus === 'Processing') {
        order.confirmedAt = now;
      } else if (normalizedStatus === 'Packed') {
        order.packedAt = now;
      } else if (normalizedStatus === 'Shipped') {
        order.shippedAt = now;
      } else if (normalizedStatus === 'Out for Delivery') {
        order.outForDeliveryAt = now;
      } else if (normalizedStatus === 'Delivered') {
        order.deliveredAt = now;
      } else if (normalizedStatus === 'Cancelled') {
        order.cancelledAt = now;
      }
    }

    if (!databaseUpdated && idx === -1) {
      return NextResponse.json(
        {
          success: false,
          error: databaseError
            ? `Unable to save the order status: ${databaseError}`
            : 'Order not found.',
        },
        { status: databaseError ? 500 : 404 }
      );
    }

    return NextResponse.json({ success: true, orderId, status: normalizedStatus });
  } catch (error) {
    console.error('[PATCH /api/orders] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
