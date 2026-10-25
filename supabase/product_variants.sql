-- ==============================================================================
-- AR GARMENT: PRODUCT VARIANTS TABLE
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.product_variants (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id            TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_type          TEXT NOT NULL DEFAULT 'set_size' CHECK (variant_type IN ('set_size', 'individual')),
    size                  TEXT DEFAULT 'Free Size',
    pieces_per_set        INTEGER DEFAULT 1,
    price_per_piece       NUMERIC DEFAULT 0,
    total_set_price       NUMERIC DEFAULT 0,
    available_sets        INTEGER DEFAULT 0,
    total_stock_pieces    INTEGER DEFAULT 0,
    available_pieces      INTEGER DEFAULT 0,
    weight                TEXT DEFAULT '',
    weight_unit           TEXT DEFAULT 'kg',
    gst_rate              TEXT DEFAULT '5%',
    sku_id                TEXT DEFAULT '',
    purchase_price        NUMERIC DEFAULT 0,
    hsn_code              TEXT DEFAULT '',
    colour                TEXT DEFAULT '',
    fabric                TEXT DEFAULT '',
    work                  TEXT DEFAULT '',
    fit_shape             TEXT DEFAULT '',
    sleeve_length         TEXT DEFAULT '',
    length                TEXT DEFAULT '',
    custom_specifications JSONB DEFAULT '[]',
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product_variants" ON public.product_variants;
DROP POLICY IF EXISTS "Service role full access product_variants" ON public.product_variants;

CREATE POLICY "Public read product_variants"
    ON public.product_variants
    FOR SELECT
    USING (true);

CREATE POLICY "Service role full access product_variants"
    ON public.product_variants
    FOR ALL
    USING (true);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
    ON public.product_variants (product_id);
