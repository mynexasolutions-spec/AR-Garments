-- ==============================================================================
-- AR GARMENT: BUSINESS REGISTRATIONS SCHEMA
-- Drop old users table and use business_registrations as the single account table.
-- Run this in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. Drop old users table completely
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. Create business_registrations table (stores business details + login credentials)
CREATE TABLE IF NOT EXISTS public.business_registrations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       TEXT NOT NULL,
    mobile          TEXT NOT NULL,
    applicant_email TEXT NOT NULL,
    password        TEXT NOT NULL DEFAULT '',
    shop_address    TEXT NOT NULL,
    landmark        TEXT NOT NULL DEFAULT '',
    city            TEXT NOT NULL,
    state           TEXT NOT NULL,
    pincode         TEXT NOT NULL,
    business_type   TEXT NOT NULL CHECK (business_type IN ('retail_store', 'hawker')),
    has_gstin       BOOLEAN NOT NULL DEFAULT FALSE,
    gstin           TEXT NOT NULL DEFAULT '',
    document_url    TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note      TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at     TIMESTAMPTZ
);

-- If the table already existed without password, add password column
ALTER TABLE public.business_registrations
    ADD COLUMN IF NOT EXISTS password TEXT NOT NULL DEFAULT '';

-- Remove user_id column if it previously existed
ALTER TABLE public.business_registrations
    DROP COLUMN IF EXISTS user_id;

-- 3. Row Level Security
ALTER TABLE public.business_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public insert business_registrations" ON public.business_registrations;
DROP POLICY IF EXISTS "Public select business_registrations" ON public.business_registrations;
DROP POLICY IF EXISTS "Service role full access business_registrations" ON public.business_registrations;

-- Allow public registration
CREATE POLICY "Public insert business_registrations"
    ON public.business_registrations
    FOR INSERT
    WITH CHECK (true);

-- Allow public login authentication lookup
CREATE POLICY "Public select business_registrations"
    ON public.business_registrations
    FOR SELECT
    USING (true);

-- Full access for service role backend
CREATE POLICY "Service role full access business_registrations"
    ON public.business_registrations
    FOR ALL
    USING (true);

-- 4. Indexes for fast search
CREATE INDEX IF NOT EXISTS idx_business_reg_email
    ON public.business_registrations (applicant_email);

CREATE INDEX IF NOT EXISTS idx_business_reg_status
    ON public.business_registrations (status);
