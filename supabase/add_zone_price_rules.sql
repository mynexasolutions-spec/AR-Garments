-- Zone-Wise Price Markup Rules Table
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run

CREATE TABLE IF NOT EXISTS public.zone_price_rules (
  id                    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category_id           TEXT NOT NULL,
  category_name         TEXT NOT NULL DEFAULT '',
  subcategory_id        TEXT DEFAULT NULL,
  subcategory_name      TEXT DEFAULT NULL,

  -- Zone 1: Nearby (Nagar Nigam + Dehat - pincodes 211xxx / 212xxx)
  zone1_active          BOOLEAN NOT NULL DEFAULT true,
  zone1_type            TEXT NOT NULL DEFAULT 'none'
                        CHECK (zone1_type IN ('increase','decrease','discount','none')),
  zone1_value           NUMERIC(6,2) NOT NULL DEFAULT 0,

  -- Zone 2: Pan India (all other pincodes)
  zone2_active          BOOLEAN NOT NULL DEFAULT true,
  zone2_type            TEXT NOT NULL DEFAULT 'increase'
                        CHECK (zone2_type IN ('increase','decrease','discount','none')),
  zone2_value           NUMERIC(6,2) NOT NULL DEFAULT 0,
  zone2_discount_active BOOLEAN NOT NULL DEFAULT false,
  zone2_discount_value  NUMERIC(6,2) NOT NULL DEFAULT 0,

  created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint: one rule per category+subcategory combination
CREATE UNIQUE INDEX IF NOT EXISTS zone_price_rules_unique_idx
  ON public.zone_price_rules (category_id, COALESCE(subcategory_id, ''));

-- Row level security
ALTER TABLE public.zone_price_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read zone_price_rules" ON public.zone_price_rules;
CREATE POLICY "Public read zone_price_rules"
  ON public.zone_price_rules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access zone_price_rules" ON public.zone_price_rules;
CREATE POLICY "Service role full access zone_price_rules"
  ON public.zone_price_rules FOR ALL USING (true);
