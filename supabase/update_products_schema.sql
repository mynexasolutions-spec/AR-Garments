-- ==============================================================================
-- AR GARMENT: UPDATE PRODUCTS TABLE SCHEMA
-- Adds all new fields from the Add Product Form to the existing products table.
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Brand & Category IDs
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id TEXT NULL;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS subcategory_id TEXT NULL;

-- 2. Product Specifications (Fabric, Colour, Work, Length, Occasion, Fit/Shape, Sleeve Length)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fabric TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colour TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS work TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS length TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS occasion TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fit_shape TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sleeve_length TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS custom_specifications JSONB DEFAULT '[]'::jsonb;

-- 3. Main Product Info (Set details, Wholesale calculations, Inventory, Tax)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'Free Size';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pieces_per_set INTEGER DEFAULT 1;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS price_per_piece NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS total_set_price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purchase_price NUMERIC DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS total_stock_pieces INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS weight_unit TEXT DEFAULT 'kg';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gst_rate TEXT DEFAULT '5%';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS hsn_code TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

-- 4. Shipping & Social Media Links
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS shipping_care TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS youtube_url TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT '';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT '';

-- 5. Homepage Badges (New Arrivals, Premium, Gold, Best Sellers, Active)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_gold BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
