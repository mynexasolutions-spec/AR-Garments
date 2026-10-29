import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { mapDbRowToRule } from '@/lib/zonePriceMarkup';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ─── GET /api/zone-price-rules ─────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('category_id');

    const supabase = getAdminClient();
    let query = supabase
      .from('zone_price_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) {
      // Table may not exist yet in fresh environment
      if (error.code === '42P01') {
        return NextResponse.json([], { status: 200, headers: NO_STORE_HEADERS });
      }
      return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
    }

    const rules = (data || []).map(mapDbRowToRule);
    return NextResponse.json(rules, { status: 200, headers: NO_STORE_HEADERS });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

// ─── POST /api/zone-price-rules ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const record = {
      category_id:           body.categoryId || body.category_id,
      category_name:         body.categoryName || body.category_name || '',
      subcategory_id:        body.subcategoryId || body.subcategory_id || null,
      subcategory_name:      body.subcategoryName || body.subcategory_name || null,
      zone1_active:          body.zone1Active ?? body.zone1_active ?? true,
      zone1_type:            body.zone1Type   || body.zone1_type   || 'none',
      zone1_value:           Number(body.zone1Value  ?? body.zone1_value  ?? 0),
      zone2_active:          body.zone2Active ?? body.zone2_active ?? true,
      zone2_type:            body.zone2Type   || body.zone2_type   || 'increase',
      zone2_value:           Number(body.zone2Value  ?? body.zone2_value  ?? 0),
      zone2_discount_active: body.zone2DiscountActive ?? body.zone2_discount_active ?? false,
      zone2_discount_value:  Number(body.zone2DiscountValue ?? body.zone2_discount_value ?? 0),
      updated_at:            new Date().toISOString(),
    };

    if (!record.category_id) {
      return NextResponse.json({ error: 'category_id is required' }, { status: 400, headers: NO_STORE_HEADERS });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('zone_price_rules')
      .insert(record)
      .select()
      .single();

    if (error) {
      // Conflict: rule already exists for this category+subcategory
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A rule for this category/subcategory combination already exists. Please edit the existing rule.' },
          { status: 409, headers: NO_STORE_HEADERS }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });
    }

    revalidatePath('/');
    revalidatePath('/category');
    return NextResponse.json(mapDbRowToRule(data as Record<string, unknown>), { status: 201, headers: NO_STORE_HEADERS });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

// ─── PATCH /api/zone-price-rules?id=xxx ───────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400, headers: NO_STORE_HEADERS });

    const body = await req.json();

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.categoryId     !== undefined) patch.category_id           = body.categoryId;
    if (body.category_id    !== undefined) patch.category_id           = body.category_id;
    if (body.categoryName   !== undefined) patch.category_name         = body.categoryName;
    if (body.category_name  !== undefined) patch.category_name         = body.category_name;
    if (body.subcategoryId  !== undefined) patch.subcategory_id        = body.subcategoryId || null;
    if (body.subcategory_id !== undefined) patch.subcategory_id        = body.subcategory_id || null;
    if (body.subcategoryName  !== undefined) patch.subcategory_name    = body.subcategoryName || null;
    if (body.zone1Active    !== undefined) patch.zone1_active          = body.zone1Active;
    if (body.zone1_active   !== undefined) patch.zone1_active          = body.zone1_active;
    if (body.zone1Type      !== undefined) patch.zone1_type            = body.zone1Type;
    if (body.zone1_type     !== undefined) patch.zone1_type            = body.zone1_type;
    if (body.zone1Value     !== undefined) patch.zone1_value           = Number(body.zone1Value);
    if (body.zone1_value    !== undefined) patch.zone1_value           = Number(body.zone1_value);
    if (body.zone2Active    !== undefined) patch.zone2_active          = body.zone2Active;
    if (body.zone2_active   !== undefined) patch.zone2_active          = body.zone2_active;
    if (body.zone2Type      !== undefined) patch.zone2_type            = body.zone2Type;
    if (body.zone2_type     !== undefined) patch.zone2_type            = body.zone2_type;
    if (body.zone2Value     !== undefined) patch.zone2_value           = Number(body.zone2Value);
    if (body.zone2_value    !== undefined) patch.zone2_value           = Number(body.zone2_value);
    if (body.zone2DiscountActive  !== undefined) patch.zone2_discount_active = body.zone2DiscountActive;
    if (body.zone2_discount_active !== undefined) patch.zone2_discount_active = body.zone2_discount_active;
    if (body.zone2DiscountValue   !== undefined) patch.zone2_discount_value  = Number(body.zone2DiscountValue);
    if (body.zone2_discount_value  !== undefined) patch.zone2_discount_value  = Number(body.zone2_discount_value);

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('zone_price_rules')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });

    revalidatePath('/');
    revalidatePath('/category');
    return NextResponse.json(mapDbRowToRule(data as Record<string, unknown>), { status: 200, headers: NO_STORE_HEADERS });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500, headers: NO_STORE_HEADERS });
  }
}

// ─── DELETE /api/zone-price-rules?id=xxx ──────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400, headers: NO_STORE_HEADERS });

    const supabase = getAdminClient();
    const { error } = await supabase.from('zone_price_rules').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500, headers: NO_STORE_HEADERS });

    revalidatePath('/');
    revalidatePath('/category');
    return NextResponse.json({ success: true }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
