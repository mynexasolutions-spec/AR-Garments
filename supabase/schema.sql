-- ==============================================================================
-- AR GARMENT E-COMMERCE: DATABASE SCHEMA & SEED DATA
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Tables: 1. admins  2. products  3. hero_slides
-- ==============================================================================

-- ─── DROP EXISTING POLICIES (safe re-run) ─────────────────────────────────────
DROP POLICY IF EXISTS "Public read products"   ON public.products;
DROP POLICY IF EXISTS "Public read hero_slides" ON public.hero_slides;

-- ─── 1. ADMINS TABLE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    name       TEXT NOT NULL DEFAULT 'Admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── 2. PRODUCTS TABLE ────────────────────────────────────────────────────────
-- is_new_arrival → shows on "New Arrivals" section on homepage
-- is_best_seller → shows on "Best Sellers" section on homepage
CREATE TABLE IF NOT EXISTS public.products (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    price          TEXT NOT NULL,
    numeric_price  INTEGER NOT NULL DEFAULT 0,
    category       TEXT NOT NULL,
    image          TEXT NOT NULL,
    images         TEXT[] DEFAULT '{}',
    description    TEXT DEFAULT '',
    specification  TEXT DEFAULT '',
    shipping_care  TEXT DEFAULT '',
    stock          INTEGER NOT NULL DEFAULT 10,
    active         BOOLEAN NOT NULL DEFAULT true,
    is_new_arrival BOOLEAN NOT NULL DEFAULT false,
    is_best_seller BOOLEAN NOT NULL DEFAULT false,
    sort_order     INTEGER NOT NULL DEFAULT 0,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migration for existing installations (Run this in Supabase SQL Editor)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS specification TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_care TEXT DEFAULT '';


-- ─── 3. HERO SLIDES TABLE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hero_slides (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    subtitle    TEXT NOT NULL,
    button_text TEXT NOT NULL DEFAULT 'Shop Now',
    button_link TEXT NOT NULL DEFAULT '/category',
    image       TEXT NOT NULL,
    label       TEXT NOT NULL DEFAULT 'Timeless Ethnic Wear',
    active      BOOLEAN NOT NULL DEFAULT true,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
ALTER TABLE public.admins     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

-- Public can read products & hero slides (storefront display)
CREATE POLICY "Public read products"    ON public.products   FOR SELECT USING (true);
CREATE POLICY "Public read hero_slides" ON public.hero_slides FOR SELECT USING (true);
-- NOTE: INSERT / UPDATE / DELETE use the Service Role Key (bypasses RLS) from API routes

-- ─── SEED DATA ────────────────────────────────────────────────────────────────

-- Admin account
INSERT INTO public.admins (email, password, name)
VALUES ('admin@argarment.com', 'admin@123', 'Super Admin')
ON CONFLICT (email) DO NOTHING;

-- Hero Slides (7 slides)
INSERT INTO public.hero_slides
  (id, title, subtitle, button_text, button_link, image, label, active, sort_order)
VALUES
  ('slide-1', E'Tradition In\nEvery Thread',    'Elegant Styles • Premium Fabrics • For Every You',               'Shop Now Collection', '/category', '/home-images/hero-image1.jpg', 'Timeless Ethnic Wear', true, 1),
  ('slide-2', E'Discover Your\nPerfect Style',  'Handcrafted with Love • Worn with Pride',                        'Explore Collection',  '/category', '/home-images/hero-image2.jpg', 'Timeless Ethnic Wear', true, 2),
  ('slide-3', E'Celebrate\nEvery Moment',       'Festive Collection • Wedding Special • Everyday Elegance',       'View Collection',     '/category', '/home-images/hero-image3.jpg', 'Timeless Ethnic Wear', true, 3),
  ('slide-4', E'Timeless\nElegance',            'Classic Designs • Modern Touch • Unmatched Quality',             'Shop Collection',     '/category', '/home-images/hero-image4.jpg', 'Timeless Ethnic Wear', true, 4),
  ('slide-5', E'Festive\nSplendor',             'Celebrate in Style • Traditional Craftsmanship • Premium Quality','Explore Now',        '/category', '/home-images/hero-image5.jpg', 'Timeless Ethnic Wear', true, 5),
  ('slide-6', E'Wedding\nSpecial',              'Bridal Collection • Exquisite Designs • Perfect Fit',            'View Collection',     '/category', '/home-images/hero-image6.jpg', 'Timeless Ethnic Wear', true, 6),
  ('slide-7', E'Everyday\nGrace',               'Comfort Meets Style • Daily Wear • Affordable Luxury',           'Shop Now',            '/category', '/home-images/hero-image7.jpg', 'Timeless Ethnic Wear', true, 7)
ON CONFLICT (id) DO UPDATE SET
  title      = EXCLUDED.title,
  subtitle   = EXCLUDED.subtitle,
  image      = EXCLUDED.image,
  sort_order = EXCLUDED.sort_order;

-- Products (10 products with new arrival & best seller flags)
INSERT INTO public.products
  (id, name, price, numeric_price, category, image, stock, active, is_new_arrival, is_best_seller, sort_order)
VALUES
  ('prod-1',  'Embroidered Saree',             '₹1,299', 1299, 'Sarees',                  '/home-images/Embroidered Saree.jpg',       25, true,  true,  false, 1),
  ('prod-2',  'Cotton Suit Set',               '₹899',    899, 'Suits & Dress Material',  '/home-images/Cotton Suit Set.jpg',         40, true,  true,  false, 2),
  ('prod-3',  'Designer Dupatta Set',          '₹1,499', 1499, 'Dupatta Sets',            '/home-images/Designer Dupatta Set.jpg',    18, true,  true,  true,  3),
  ('prod-4',  'Anarkali Suit',                 '₹999',    999, 'Suits & Dress Material',  '/home-images/Anarkali Suit.jpg',           32, true,  true,  false, 4),
  ('prod-5',  'Party Wear Saree',              '₹1,799', 1799, 'Sarees',                  '/home-images/Party Wear Saree.jpg',        15, true,  true,  false, 5),
  ('prod-6',  'Silk Blend Saree',              '₹1,499', 1499, 'Sarees',                  '/home-images/Silk Blend Saree.jpg',        28, true,  false, true,  6),
  ('prod-7',  'Rayon Kurti Set',               '₹799',    799, 'Suits & Dress Material',  '/home-images/Rayon Kurti Set.jpg',         35, true,  false, true,  7),
  ('prod-8',  'Designer Dupatta Set (Royal)',  '₹1,299', 1299, 'Dupatta Sets',            '/home-images/Designer Dupatta Set2.jpg',   20, true,  false, true,  8),
  ('prod-9',  'Men''s Kurta Set',              '₹1,009', 1009, 'Men Fashion',             '/home-images/Men Fashion.jpg',             22, true,  false, true,  9),
  ('prod-10', 'Kids Ethnic Wear',              '₹993',    993, 'Kids Fashion',            '/home-images/kids Ethnic Wear.jpg',        30, true,  false, true,  10)
ON CONFLICT (id) DO UPDATE SET
  name           = EXCLUDED.name,
  price          = EXCLUDED.price,
  numeric_price  = EXCLUDED.numeric_price,
  category       = EXCLUDED.category,
  image          = EXCLUDED.image,
  stock          = EXCLUDED.stock,
  is_new_arrival = EXCLUDED.is_new_arrival,
  is_best_seller = EXCLUDED.is_best_seller,
  sort_order     = EXCLUDED.sort_order;

-- ─── 4. COUPONS TABLE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
    id                  TEXT PRIMARY KEY,
    code                TEXT UNIQUE NOT NULL,
    title               TEXT NOT NULL,
    description         TEXT DEFAULT '',
    discount_type       TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' | 'flat' | 'free_shipping'
    discount_value      NUMERIC NOT NULL DEFAULT 0,
    applicable_category TEXT NOT NULL DEFAULT 'All',        -- 'All' or specific category
    min_order_value     NUMERIC NOT NULL DEFAULT 0,
    max_discount_amount NUMERIC DEFAULT NULL,
    usage_limit         INTEGER DEFAULT NULL,
    used_count          INTEGER NOT NULL DEFAULT 0,
    valid_from          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until         TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    active              BOOLEAN NOT NULL DEFAULT true,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read coupons" ON public.coupons;
CREATE POLICY "Public read coupons" ON public.coupons FOR SELECT USING (true);

INSERT INTO public.coupons 
    (id, code, title, description, discount_type, discount_value, applicable_category, min_order_value, max_discount_amount, usage_limit, used_count, active)
VALUES
    ('coupon-1', 'WELCOME10', 'Welcome Offer', 'Get 10% off on your first order across all collections', 'percentage', 10, 'All', 499, 300, 500, 18, true),
    ('coupon-2', 'SAREE20', 'Saree Festive Special', 'Exclusive 20% discount on all designer and embroidered Sarees', 'percentage', 20, 'Sarees', 999, 500, 200, 34, true),
    ('coupon-3', 'SUIT15', 'Suits & Dress Material Discount', 'Save 15% on any Suits & Dress Material outfit', 'percentage', 15, 'Suits & Dress Material', 799, 400, 150, 12, true),
    ('coupon-4', 'DUPATTA100', 'Dupatta Flat ₹100 Off', 'Flat ₹100 instant discount on Dupatta Sets', 'flat', 100, 'Dupatta Sets', 699, NULL, 100, 7, true),
    ('coupon-5', 'FLAT300', 'Grand Shopping Discount', 'Flat ₹300 off on any order above ₹1,999 across all categories', 'flat', 300, 'All', 1999, NULL, 100, 23, true),
    ('coupon-6', 'FREESHIP', 'Free Express Shipping', 'Complimentary shipping on all orders above ₹500', 'free_shipping', 0, 'All', 500, NULL, NULL, 52, true)
ON CONFLICT (code) DO UPDATE SET
    title               = EXCLUDED.title,
    description         = EXCLUDED.description,
    discount_type       = EXCLUDED.discount_type,
    discount_value      = EXCLUDED.discount_value,
    applicable_category = EXCLUDED.applicable_category,
    min_order_value     = EXCLUDED.min_order_value,
    max_discount_amount = EXCLUDED.max_discount_amount,
    active              = EXCLUDED.active;

-- ─── 5. USERS TABLE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    phone      TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert users" ON public.users;
DROP POLICY IF EXISTS "Public select users" ON public.users;
DROP POLICY IF EXISTS "Service role full access users" ON public.users;

CREATE POLICY "Public insert users" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Service role full access users" ON public.users FOR ALL USING (true);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ─── 5B. EMAIL AUTHENTICATION CODES TABLE ─────────────────────────────────────
-- Stores only HMAC hashes of short-lived, single-use login and registration codes.
CREATE TABLE IF NOT EXISTS public.email_login_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL,
    purpose     TEXT NOT NULL DEFAULT 'login' CHECK (purpose IN ('login', 'registration')),
    code_hash   TEXT NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_login_codes
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'login';

CREATE INDEX IF NOT EXISTS idx_email_login_codes_email_created
  ON public.email_login_codes(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_login_codes_email_purpose_created
  ON public.email_login_codes(email, purpose, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_login_codes_expiry
  ON public.email_login_codes(expires_at);
ALTER TABLE public.email_login_codes ENABLE ROW LEVEL SECURITY;
-- No public policies: only the server-side service role may access OTP hashes.

-- ─── 6. USER ADDRESSES TABLE ──────────────────────────────────────────────────
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

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select user_addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Public insert user_addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Public update user_addresses" ON public.user_addresses;
DROP POLICY IF EXISTS "Service role full access user_addresses" ON public.user_addresses;
CREATE POLICY "Public select user_addresses" ON public.user_addresses FOR SELECT USING (true);
CREATE POLICY "Public insert user_addresses" ON public.user_addresses FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update user_addresses" ON public.user_addresses FOR UPDATE USING (true);
CREATE POLICY "Service role full access user_addresses" ON public.user_addresses FOR ALL USING (true);

-- ─── 7. ORDERS TABLE ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
    id               TEXT PRIMARY KEY,
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
    status           TEXT NOT NULL DEFAULT 'Pending',
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

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select orders" ON public.orders;
DROP POLICY IF EXISTS "Public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public update orders" ON public.orders;
DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;
CREATE POLICY "Public select orders" ON public.orders FOR SELECT USING (true);
CREATE POLICY "Public insert orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update orders" ON public.orders FOR UPDATE USING (true);
CREATE POLICY "Service role full access orders" ON public.orders FOR ALL USING (true);

-- ─── 8. CATEGORIES TABLE ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
    id          TEXT PRIMARY KEY,
    name        TEXT UNIQUE NOT NULL,
    slug        TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    image       TEXT DEFAULT '',
    sort_order  INTEGER NOT NULL DEFAULT 0,
    active      BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order ASC);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select categories" ON public.categories;
DROP POLICY IF EXISTS "Service role full access categories" ON public.categories;
CREATE POLICY "Public select categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Service role full access categories" ON public.categories FOR ALL USING (true);

-- Seed initial categories so existing products map directly
INSERT INTO public.categories (id, name, slug, description, image, sort_order, active)
VALUES
    ('cat-1', 'Sarees', 'sarees', 'Exclusive designer & bridal sarees with intricate zari and silk drapes', '/home-images/Sarees.jpg', 1, true),
    ('cat-2', 'Suits & Dress Material', 'suits-dress-material', 'Premium unstitched and ready-to-wear salwar suit sets', '/home-images/Suits & Dress Materia.jpg', 2, true),
    ('cat-3', 'Dupatta Sets', 'dupatta-sets', 'Complete matching dupatta and traditional wear combinations', '/home-images/Dupatta Sets.jpg', 3, true),
    ('cat-4', 'Men Fashion', 'men-fashion', 'Royal sherwanis, kurtas, and traditional ethnic men fashion', '/home-images/Men Fashion.jpg', 4, true),
    ('cat-5', 'Kids Fashion', 'kids-fashion', 'Festive outfits and adorable traditional wear for children', '/home-images/Kids Fashion.jpg', 5, true)
ON CONFLICT (name) DO UPDATE SET
    slug        = EXCLUDED.slug,
    description = EXCLUDED.description,
    image       = EXCLUDED.image,
    sort_order  = EXCLUDED.sort_order,
    active      = EXCLUDED.active;


-- ─── 9. PRODUCT REVIEWS TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id          TEXT PRIMARY KEY,
    product_id  TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    user_name   TEXT NOT NULL,
    user_email  TEXT NOT NULL,
    rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title       TEXT DEFAULT '',
    comment     TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'approved',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON public.product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON public.product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON public.product_reviews(created_at DESC);

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select approved reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Public insert reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Service role full access reviews" ON public.product_reviews;
CREATE POLICY "Public select approved reviews" ON public.product_reviews FOR SELECT USING (true);
CREATE POLICY "Public insert reviews" ON public.product_reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access reviews" ON public.product_reviews FOR ALL USING (true);


-- ─── 10. NEWSLETTER SUBSCRIBERS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    status      TEXT NOT NULL DEFAULT 'active',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_email ON public.newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_newsletter_created_at ON public.newsletter_subscribers(created_at DESC);

ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert newsletter_subscribers" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Service role full access newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Public insert newsletter_subscribers" ON public.newsletter_subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role full access newsletter_subscribers" ON public.newsletter_subscribers FOR ALL USING (true);




