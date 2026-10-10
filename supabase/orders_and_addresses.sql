-- ==============================================================================
-- AR GARMENT E-COMMERCE: USERS, USER ADDRESSES & ORDERS SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ==============================================================================

-- ─── 1. USER ADDRESSES TABLE ──────────────────────────────────────────────────
-- Allows users to save default / delivery addresses
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        TEXT NOT NULL,
    full_name      TEXT NOT NULL,
    phone          TEXT NOT NULL,
    address_line1  TEXT NOT NULL,
    address_line2  TEXT DEFAULT '',
    city           TEXT NOT NULL,
    state          TEXT NOT NULL,
    pincode        TEXT NOT NULL,
    is_default     BOOLEAN DEFAULT true,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast user address lookups
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);

-- Enable RLS
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any to allow safe re-run
DROP POLICY IF EXISTS "Public select user_addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Public insert user_addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Public update user_addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Service role full access user_addresses" ON public.user_addresses;

-- RLS Policies
CREATE POLICY "Public select user_addresses" ON public.user_addresses FOR SELECT USING (true);
CREATE POLICY "Public insert user_addresses" ON public.user_addresses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update user_addresses" ON public.user_addresses FOR UPDATE USING (true);
CREATE POLICY "Service role full access user_addresses" ON public.user_addresses FOR ALL USING (true);


-- ─── 2. ORDERS TABLE ──────────────────────────────────────────────────────────
-- Stores complete customer orders with shipping address & purchased items
CREATE TABLE IF NOT EXISTS public.orders (
    id               TEXT PRIMARY KEY, -- e.g. ORD-1727000001000 or ARG...
    user_id          TEXT NOT NULL,
    user_name        TEXT NOT NULL,
    user_email       TEXT NOT NULL,
    items            JSONB NOT NULL DEFAULT '[]'::jsonb,
    shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    payment_method   TEXT NOT NULL DEFAULT 'cod',
    payment_status   TEXT NOT NULL DEFAULT 'pending',
    razorpay_order_id TEXT UNIQUE DEFAULT NULL,
    razorpay_payment_id TEXT UNIQUE DEFAULT NULL,
    subtotal         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    discount         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    shipping         NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total            NUMERIC(10, 2) NOT NULL DEFAULT 0,
    coupon_code      TEXT DEFAULT NULL,
    status           TEXT NOT NULL DEFAULT 'Pending', -- Pending, Processing, Shipped, Delivered, Cancelled
    confirmed_at     TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    packed_at        TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    shipped_at       TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    out_for_delivery_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    delivered_at     TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    cancelled_at     TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    shiprocket_order_id TEXT DEFAULT NULL,
    shiprocket_shipment_id TEXT DEFAULT NULL,
    courier_name     TEXT DEFAULT NULL,
    awb_number       TEXT DEFAULT NULL,
    tracking_url     TEXT DEFAULT NULL,
    tracking_status  TEXT DEFAULT NULL,
    current_location TEXT DEFAULT NULL,
    tracking_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS out_for_delivery_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shiprocket_order_id TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shiprocket_shipment_id TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS awb_number TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_url TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS current_location TEXT DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON public.orders(razorpay_order_id) WHERE razorpay_order_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_razorpay_payment_id ON public.orders(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_awb_number ON public.orders(awb_number) WHERE awb_number IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Drop old policies if any
DROP POLICY IF EXISTS "Public select orders" ON public.orders;
DROP POLICY IF EXISTS "Public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public update orders" ON public.orders;
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;

-- RLS Policies
CREATE POLICY "Public select orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update orders" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Service role full access orders" ON public.orders FOR ALL USING (true);


-- ─── 3. SEED INITIAL ORDERS (Realistic sample data) ───────────────────────────
INSERT INTO public.orders
  (id, user_id, user_name, user_email, items, shipping_address, payment_method, subtotal, discount, shipping, total, coupon_code, status, created_at)
VALUES
  (
    'ORD-1001',
    'usr-demo-1',
    'Priya Sharma',
    'priya.sharma@example.com',
    '[{"id": "prod-1", "name": "Embroidered Saree", "price": "₹1,299", "numericPrice": 1299, "quantity": 1, "image": "/home-images/Embroidered Saree.jpg"}]'::jsonb,
    '{"fullName": "Priya Sharma", "phone": "9876543210", "addressLine1": "12, Rose Garden Apartments", "addressLine2": "MG Road", "city": "Bengaluru", "state": "Karnataka", "pincode": "560001"}'::jsonb,
    'online',
    1299,
    100,
    0,
    1199,
    'WELCOME10',
    'Delivered',
    NOW() - INTERVAL '5 days'
  ),
  (
    'ORD-1002',
    'usr-demo-2',
    'Rohan Verma',
    'rohan.verma@example.com',
    '[{"id": "prod-4", "name": "Anarkali Suit", "price": "₹999", "numericPrice": 999, "quantity": 2, "image": "/home-images/Anarkali Suit.jpg"}]'::jsonb,
    '{"fullName": "Rohan Verma", "phone": "9876512345", "addressLine1": "Flat 402, Sunshine Heights", "addressLine2": "Bandra West", "city": "Mumbai", "state": "Maharashtra", "pincode": "400050"}'::jsonb,
    'cod',
    1998,
    0,
    0,
    1998,
    NULL,
    'Shipped',
    NOW() - INTERVAL '2 days'
  ),
  (
    'ORD-1003',
    'usr-demo-3',
    'Meena Patel',
    'meena.patel@example.com',
    '[{"id": "prod-2", "name": "Cotton Suit Set", "price": "₹899", "numericPrice": 899, "quantity": 1, "image": "/home-images/Cotton Suit Set.jpg"}]'::jsonb,
    '{"fullName": "Meena Patel", "phone": "9876598765", "addressLine1": "8, Navrangpura", "city": "Ahmedabad", "state": "Gujarat", "pincode": "380009"}'::jsonb,
    'cod',
    899,
    0,
    70,
    969,
    NULL,
    'Pending',
    NOW() - INTERVAL '4 hours'
  )
ON CONFLICT (id) DO NOTHING;

UPDATE public.orders
SET payment_status = 'paid'
WHERE payment_method = 'online'
  AND payment_status = 'pending'
  AND razorpay_order_id IS NULL;
