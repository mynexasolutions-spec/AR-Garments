-- ============================================================
-- AR GARMENT: Add Delivery Type to Products
-- Run once in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- Add delivery_type column: 'standard' = Free Delivery (Green Tag)
--                           'low_margin' = + Delivery (Orange Tag)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'standard'
  CHECK (delivery_type IN ('standard', 'low_margin'));

-- Add delivery_charge_amount column: Fixed delivery charge in ₹ for low_margin products
-- (e.g., 120 means ₹120 delivery charge shown on product card/cart/checkout)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS delivery_charge_amount INTEGER NOT NULL DEFAULT 0;

-- All existing products default to 'standard' with ₹0 delivery charge
-- Admin can now edit individual products to set 'low_margin' + specific charge amount
