import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/requestAuth';
import {
  getRazorpayPayment,
  RazorpayApiError,
  RazorpayConfigurationError,
  verifyRazorpayPaymentSignature,
} from '@/lib/razorpay';
import { getServiceSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface StoredOrder {
  id: string;
  total: number;
  payment_status: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
}

export async function POST(request: NextRequest) {
  const user = getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Please sign in to verify the payment.' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const applicationOrderId = String(body.applicationOrderId || '').trim();
    const razorpayOrderId = String(body.razorpayOrderId || '').trim();
    const razorpayPaymentId = String(body.razorpayPaymentId || '').trim();
    const razorpaySignature = String(body.razorpaySignature || '').trim();

    if (!applicationOrderId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'The payment response is incomplete.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error: findError } = await supabase
      .from('orders')
      .select('id, total, payment_status, razorpay_order_id, razorpay_payment_id')
      .eq('id', applicationOrderId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (findError) {
      throw new Error(`Unable to read the pending order: ${findError.message}`);
    }
    if (!data) {
      return NextResponse.json({ error: 'The pending order was not found.' }, { status: 404 });
    }

    const order = data as StoredOrder;
    if (order.razorpay_order_id !== razorpayOrderId) {
      return NextResponse.json({ error: 'The Razorpay order does not match.' }, { status: 400 });
    }

    if (
      order.payment_status === 'paid' &&
      order.razorpay_payment_id === razorpayPaymentId
    ) {
      return NextResponse.json({ success: true, orderId: order.id });
    }

    const signatureIsValid = verifyRazorpayPaymentSignature(
      order.razorpay_order_id,
      razorpayPaymentId,
      razorpaySignature
    );
    if (!signatureIsValid) {
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
    }

    const payment = await getRazorpayPayment(razorpayPaymentId);
    const expectedAmount = Math.round(Number(order.total) * 100);
    if (
      payment.order_id !== order.razorpay_order_id ||
      payment.amount !== expectedAmount ||
      payment.currency !== 'INR'
    ) {
      return NextResponse.json({ error: 'The captured payment details do not match the order.' }, { status: 400 });
    }
    if (payment.status !== 'captured') {
      return NextResponse.json(
        { error: `Payment is ${payment.status}, not captured. Enable automatic capture or capture it in Razorpay.` },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'paid',
        razorpay_payment_id: razorpayPaymentId,
        status: 'Confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationOrderId)
      .eq('razorpay_order_id', order.razorpay_order_id);

    if (updateError) {
      throw new Error(`Unable to confirm the paid order: ${updateError.message}`);
    }

    return NextResponse.json({ success: true, orderId: applicationOrderId });
  } catch (error) {
    if (error instanceof RazorpayConfigurationError) {
      console.error('Razorpay verification configuration error', { error: error.message });
      return NextResponse.json({ error: 'Razorpay is not configured on the server.' }, { status: 500 });
    }
    if (error instanceof RazorpayApiError) {
      console.error('Unable to fetch Razorpay payment', {
        status: error.status,
        error: error.message,
      });
      return NextResponse.json({ error: 'Unable to confirm the payment with Razorpay.' }, { status: 502 });
    }

    console.error('Unexpected Razorpay verification error', { error });
    return NextResponse.json({ error: 'Unable to verify the payment.' }, { status: 500 });
  }
}
