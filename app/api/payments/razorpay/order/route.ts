import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { calculateCheckoutPricing, CheckoutPricingError } from '@/lib/checkoutPricing';
import { getAuthenticatedUser } from '@/lib/requestAuth';
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  RazorpayApiError,
  RazorpayConfigurationError,
} from '@/lib/razorpay';
import { getServiceSupabase } from '@/lib/supabase';
import { ShippingAddress } from '@/lib/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function createApplicationOrderId(): string {
  return `ORD-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
}

function parseShippingAddress(value: unknown): ShippingAddress {
  if (!value || typeof value !== 'object') {
    throw new CheckoutPricingError('A delivery address is required.');
  }

  const address = value as Record<string, unknown>;
  const parsed: ShippingAddress = {
    fullName: String(address.fullName || '').trim(),
    phone: String(address.phone || '').trim(),
    addressLine1: String(address.addressLine1 || '').trim(),
    addressLine2: String(address.addressLine2 || '').trim(),
    city: String(address.city || '').trim(),
    state: String(address.state || '').trim(),
    pincode: String(address.pincode || '').trim(),
  };

  if (
    !parsed.fullName ||
    !/^\d{10}$/.test(parsed.phone) ||
    !parsed.addressLine1 ||
    !parsed.city ||
    !parsed.state ||
    !/^\d{6}$/.test(parsed.pincode)
  ) {
    throw new CheckoutPricingError('The delivery address is incomplete or invalid.');
  }

  return parsed;
}

export async function POST(request: NextRequest) {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Please sign in before making a payment.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const shippingAddress = parseShippingAddress(body.shippingAddress);
    const pricing = await calculateCheckoutPricing(body.items, body.couponCode, shippingAddress.pincode, shippingAddress.city);
    const expectedTotal = Number(body.expectedTotal);

    const priceDiff = Math.abs(expectedTotal - pricing.total);
    if (!Number.isFinite(expectedTotal) || (priceDiff > 5.0 && priceDiff > pricing.total * 0.15)) {
      return NextResponse.json(
        {
          error: 'Your cart price changed. Refresh the cart and try again.',
          pricing,
        },
        { status: 409 }
      );
    }

    const applicationOrderId = createApplicationOrderId();
    const razorpayOrder = await createRazorpayOrder({
      amount: Math.round(pricing.total * 100),
      receipt: applicationOrderId,
      notes: {
        application_order_id: applicationOrderId,
        user_id: user.id,
      },
    });

    const supabase = getServiceSupabase();
    const { error: orderError } = await supabase.from('orders').insert({
      id: applicationOrderId,
      user_id: user.id,
      user_name: user.name || shippingAddress.fullName,
      user_email: user.email,
      items: pricing.items,
      shipping_address: shippingAddress,
      payment_method: 'online',
      payment_status: 'pending',
      razorpay_order_id: razorpayOrder.id,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      shipping: pricing.shipping,
      total: pricing.total,
      coupon_code: pricing.couponCode || null,
      status: 'Pending',
    });

    if (orderError) {
      console.error('Failed to persist pending Razorpay order', {
        applicationOrderId,
        razorpayOrderId: razorpayOrder.id,
        databaseError: orderError.message,
      });
      return NextResponse.json(
        { error: 'Payment could not be started because the order was not saved.' },
        { status: 500 }
      );
    }

    const { data: existingAddress, error: addressLookupError } = await supabase
      .from('user_addresses')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (addressLookupError) {
      console.warn('Unable to look up the saved delivery address', {
        applicationOrderId,
        databaseError: addressLookupError.message,
      });
    } else {
      const addressRecord = {
        full_name: shippingAddress.fullName,
        phone: shippingAddress.phone,
        address_line1: shippingAddress.addressLine1,
        address_line2: shippingAddress.addressLine2 || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        updated_at: new Date().toISOString(),
      };
      const addressResult = existingAddress?.id
        ? await supabase.from('user_addresses').update(addressRecord).eq('id', existingAddress.id)
        : await supabase.from('user_addresses').insert({
            user_id: user.id,
            ...addressRecord,
            is_default: true,
          });

      if (addressResult.error) {
        console.warn('Unable to save the delivery address', {
          applicationOrderId,
          databaseError: addressResult.error.message,
        });
      }
    }

    return NextResponse.json(
      {
        keyId: getRazorpayKeyId(),
        applicationOrderId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof CheckoutPricingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RazorpayConfigurationError) {
      console.error('Razorpay configuration error', { error: error.message });
      return NextResponse.json({ error: 'Razorpay is not configured on the server.' }, { status: 500 });
    }
    if (error instanceof RazorpayApiError) {
      console.error('Razorpay order creation failed', {
        status: error.status,
        error: error.message,
      });
      return NextResponse.json(
        { error: 'Razorpay could not create the payment order. Please try again.' },
        { status: 502 }
      );
    }

    console.error('Unexpected Razorpay order error', { error });
    return NextResponse.json({ error: 'Unable to start the payment.' }, { status: 500 });
  }
}
