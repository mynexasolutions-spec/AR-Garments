-- ==============================================================================
-- DELIVERY PARTNER MANAGEMENT & AUTOMATED DISPATCH ROUTING MODULE
-- Run this migration in Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Delivery Partners Table
CREATE TABLE IF NOT EXISTS public.delivery_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    integration_type TEXT NOT NULL CHECK (integration_type IN ('manual', 'api')),
    credentials JSONB DEFAULT '{}'::jsonb,
    tracking_url_template TEXT DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Delivery Zones Table
CREATE TABLE IF NOT EXISTS public.delivery_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT NULL,
    default_partner_id UUID REFERENCES public.delivery_partners(id) ON DELETE SET NULL,
    fallback_partner_id UUID REFERENCES public.delivery_partners(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Delivery Zone Pincodes Mapping
CREATE TABLE IF NOT EXISTS public.delivery_zone_pincodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES public.delivery_zones(id) ON DELETE CASCADE,
    pincode TEXT DEFAULT NULL,
    pincode_prefix TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Extend orders table with dispatch routing fields
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_partner_id UUID REFERENCES public.delivery_partners(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_zone_id UUID REFERENCES public.delivery_zones(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_type TEXT DEFAULT 'internal' CHECK (dispatch_type IS NULL OR dispatch_type IN ('internal', 'external'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_status TEXT DEFAULT 'pending' CHECK (dispatch_status IS NULL OR dispatch_status IN ('pending', 'assigned', 'booked', 'dispatched', 'manual_review'));
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS dispatch_notes TEXT DEFAULT NULL;

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.delivery_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zone_pincodes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Public read active partners" ON public.delivery_partners;
DROP POLICY IF EXISTS "Service role full access partners" ON public.delivery_partners;
DROP POLICY IF EXISTS "Public read active zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Service role full access zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Public read zone pincodes" ON public.delivery_zone_pincodes;
DROP POLICY IF EXISTS "Service role full access zone pincodes" ON public.delivery_zone_pincodes;

-- Read policies for public/client
CREATE POLICY "Public read active partners" ON public.delivery_partners
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public read active zones" ON public.delivery_zones
    FOR SELECT USING (is_active = true);

CREATE POLICY "Public read zone pincodes" ON public.delivery_zone_pincodes
    FOR SELECT USING (true);

-- Full control for service role (Admin backend)
CREATE POLICY "Service role full access partners" ON public.delivery_partners
    FOR ALL USING (true);

CREATE POLICY "Service role full access zones" ON public.delivery_zones
    FOR ALL USING (true);

CREATE POLICY "Service role full access zone pincodes" ON public.delivery_zone_pincodes
    FOR ALL USING (true);

-- 6. Seed Default Delivery Partners
INSERT INTO public.delivery_partners (name, code, integration_type, is_active, description)
VALUES 
  ('Self Delivery / Local Rider', 'self_delivery', 'manual', true, 'In-house rider delivery for local Allahabad city orders'),
  ('Shiprocket', 'shiprocket', 'api', false, 'Automated courier aggregator for Pan India shipping (FedEx, Delhivery, BlueDart, DTDC)'),
  ('Delhivery Direct', 'delhivery', 'api', false, 'Direct courier integration via Delhivery B2C API')
ON CONFLICT (code) DO NOTHING;

-- 7. Seed Default Delivery Zones & Map to Default Partners
DO $$
DECLARE
  v_self_rider_id UUID;
  v_shiprocket_id UUID;
  v_city_zone_id UUID;
  v_rural_zone_id UUID;
  v_pan_zone_id UUID;
BEGIN
  SELECT id INTO v_self_rider_id FROM public.delivery_partners WHERE code = 'self_delivery';
  SELECT id INTO v_shiprocket_id FROM public.delivery_partners WHERE code = 'shiprocket';

  -- Zone 1: Allahabad City
  INSERT INTO public.delivery_zones (zone_key, name, description, default_partner_id, fallback_partner_id, is_active, priority)
  VALUES (
    'zone_allahabad_city',
    'Allahabad City',
    'Prayagraj Nagar Nigam local pin codes (211001 - 211019). Served by in-house rider.',
    v_self_rider_id,
    NULL,
    true,
    10
  )
  ON CONFLICT (zone_key) DO UPDATE SET
    default_partner_id = EXCLUDED.default_partner_id
  RETURNING id INTO v_city_zone_id;

  -- Zone 2: Allahabad Rural / Dehat
  INSERT INTO public.delivery_zones (zone_key, name, description, default_partner_id, fallback_partner_id, is_active, priority)
  VALUES (
    'zone_allahabad_dehat',
    'Allahabad Rural / Dehat',
    'Prayagraj Rural / Dehat areas (212xxx pin codes).',
    v_self_rider_id,
    v_shiprocket_id,
    true,
    5
  )
  ON CONFLICT (zone_key) DO UPDATE SET
    default_partner_id = EXCLUDED.default_partner_id,
    fallback_partner_id = EXCLUDED.fallback_partner_id
  RETURNING id INTO v_rural_zone_id;

  -- Zone 3: Pan India
  INSERT INTO public.delivery_zones (zone_key, name, description, default_partner_id, fallback_partner_id, is_active, priority)
  VALUES (
    'zone_pan_india',
    'Outside Allahabad / Pan India',
    'All domestic destinations outside Allahabad district.',
    v_shiprocket_id,
    v_self_rider_id,
    true,
    1
  )
  ON CONFLICT (zone_key) DO UPDATE SET
    default_partner_id = EXCLUDED.default_partner_id,
    fallback_partner_id = EXCLUDED.fallback_partner_id
  RETURNING id INTO v_pan_zone_id;

  -- Seed City pincodes: 211001 through 211019
  IF v_city_zone_id IS NOT NULL THEN
    FOR i IN 1..19 LOOP
      INSERT INTO public.delivery_zone_pincodes (zone_id, pincode)
      VALUES (v_city_zone_id, '2110' || LPAD(i::text, 2, '0'))
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Seed Rural pincode prefix: 212
  IF v_rural_zone_id IS NOT NULL THEN
    INSERT INTO public.delivery_zone_pincodes (zone_id, pincode_prefix)
    VALUES (v_rural_zone_id, '212')
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

NOTIFY pgrst, 'reload schema';
