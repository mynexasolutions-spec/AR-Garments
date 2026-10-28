-- ==============================================================================
-- AR GARMENT: ZONE-WISE FREE DELIVERY & SHIPPING SETTINGS TABLE
-- 3 Zones: Prayagraj Nagar Nigam, Prayagraj Dehat, Pan India
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.zone_shipping_settings (
    id TEXT PRIMARY KEY,
    zone_name TEXT NOT NULL,
    zone_name_hi TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    free_delivery_threshold NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (free_delivery_threshold >= 0),
    standard_delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (standard_delivery_fee >= 0),
    custom_pincodes TEXT[] DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed Initial 3 Zones
INSERT INTO public.zone_shipping_settings (
    id, zone_name, zone_name_hi, is_active, free_delivery_threshold, standard_delivery_fee, custom_pincodes, sort_order
) VALUES
(
    'zone_nagar_nigam',
    'Zone 1: Prayagraj Nagar Nigam',
    'प्रयागराज नगर निगम',
    true,
    500.00,
    40.00,
    ARRAY['211001', '211002', '211003', '211004', '211005', '211006', '211007', '211008', '211009', '211011', '211012', '211013', '211014', '211016', '211018', '211019'],
    1
),
(
    'zone_dehat',
    'Zone 2: Prayagraj Dehat',
    'प्रयागराज देहात',
    true,
    1500.00,
    80.00,
    ARRAY['212101', '212104', '212105', '212106', '212107', '212108', '212109', '212111', '212201', '212202', '212203', '212204', '212205', '212206', '212207', '212208', '212209', '212214', '212216', '212217', '212218', '212301', '212302', '212303', '212305', '212306', '212307', '212401', '212402', '212404', '212405', '212411', '212412'],
    2
),
(
    'zone_pan_india',
    'Zone 3: Pan India',
    'पैन इंडिया',
    true,
    3000.00,
    120.00,
    ARRAY[]::TEXT[],
    3
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.zone_shipping_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read zone_shipping_settings" ON public.zone_shipping_settings;
DROP POLICY IF EXISTS "Service role manage zone_shipping_settings" ON public.zone_shipping_settings;

CREATE POLICY "Public read zone_shipping_settings"
    ON public.zone_shipping_settings FOR SELECT
    USING (true);

CREATE POLICY "Service role manage zone_shipping_settings"
    ON public.zone_shipping_settings FOR ALL
    USING (true);
