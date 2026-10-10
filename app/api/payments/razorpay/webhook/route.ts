import { NextRequest, NextResponse } from 'next/server';
import {
  RazorpayConfigurationError,
  verifyRazorpayWebhookSignature,
} from '@/lib/razorpay';
import { getServiceSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface WebhookEntity {
  id?: string;
  order_id?: string;
}

interface RazorpayWebhookEvent {
  event?: string;
  payload?: {
    payment?: { entity?: WebhookEntity };
    order?: { entity?: WebhookEntity };
  };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';

  try {
    if (!signature || !verifyRazorpayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 401 });
    }

    const webhook = JSON.parse(rawBody) as RazorpayWebhookEvent;
    const supabase = getServiceSupabase();

    if (webhook.event === 'payment.captured') {
      const payment = webhook.payload?.payment?.entity;
      if (!payment?.order_id || !payment.id) {
        return NextResponse.json({ error: 'Webhook payment data is incomplete.' }, { status: 400 });
      }

      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          razorpay_payment_id: payment.id,
          status: 'Confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_order_id', payment.order_id);

      if (error) {
        throw new Error(`Unable to reconcile captured payment: ${error.message}`);
      }
    } else if (webhook.event === 'order.paid') {
      const order = webhook.payload?.order?.entity;
      if (!order?.id) {
        return NextResponse.json({ error: 'Webhook order data is incomplete.' }, { status: 400 });
      }

      const { error } = await supabase
        .from('orders')
        .update({
          payment_status: 'paid',
          status: 'Confirmed',
          updated_at: new Date().toISOString(),
        })
        .eq('razorpay_order_id', order.id);

      if (error) {
        throw new Error(`Unable to reconcile paid order: ${error.message}`);
      }
    } else if (webhook.event === 'payment.failed') {
      const payment = webhook.payload?.payment?.entity;
      if (!payment?.order_id) {
        return NextResponse.json({ error: 'Webhook payment data is incomplete.' }, { status: 400 });
      }

      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'failed', updated_at: new Date().toISOString() })
        .eq('razorpay_order_id', payment.order_id)
        .neq('payment_status', 'paid');

      if (error) {
        throw new Error(`Unable to record failed payment: ${error.message}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof RazorpayConfigurationError) {
      console.error('Razorpay webhook configuration error', { error: error.message });
      return NextResponse.json({ error: 'Webhook verification is not configured.' }, { status: 500 });
    }

    console.error('Razorpay webhook processing failed', { error });
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
