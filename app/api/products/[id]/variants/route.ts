import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// GET /api/products/[id]/variants — fetch all variants for a product
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch variants error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Error in GET /api/products/[id]/variants:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/products/[id]/variants — add or sync variants for a product
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const body = await req.json();
    const supabase = getAdminClient();

    // Support single variant or array of variants
    const rawList = Array.isArray(body) ? body : [body];

    const records = rawList.map((v) => ({
      product_id: id,
      variant_type: v.variant_type || v.variantType || 'set_size',
      size: v.size || 'Free Size',
      pieces_per_set: Number(v.pieces_per_set ?? v.piecesPerSet) || 1,
      price_per_piece: Number(v.price_per_piece ?? v.pricePerPiece) || 0,
      total_set_price: Number(v.total_set_price ?? v.totalSetPrice) || 0,
      available_sets: Number(v.available_sets ?? v.availableSets) || 0,
      total_stock_pieces: Number(v.total_stock_pieces ?? v.totalStockPieces) || 0,
      available_pieces: Number(v.available_pieces ?? v.availablePieces) || 0,
      weight: String(v.weight || ''),
      weight_unit: String(v.weight_unit || v.weightUnit || 'kg'),
      gst_rate: String(v.gst_rate || v.gstRate || '5%'),
      sku_id: String(v.sku_id || v.skuId || ''),
      purchase_price: Number(v.purchase_price ?? v.purchasePrice) || 0,
      hsn_code: String(v.hsn_code || v.hsnCode || ''),
      colour: String(v.colour || ''),
      fabric: String(v.fabric || ''),
      work: String(v.work || ''),
      fit_shape: String(v.fit_shape || v.fitShape || ''),
      sleeve_length: String(v.sleeve_length || v.sleeveLength || ''),
      length: String(v.length || ''),
      custom_specifications: Array.isArray(v.custom_specifications)
        ? v.custom_specifications
        : (v.customSpecifications || []),
    }));

    const { data, error } = await supabase
      .from('product_variants')
      .insert(records)
      .select('*');

    if (error) {
      console.error('Insert variants error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || [], { status: 201 });
  } catch (err) {
    console.error('Error in POST /api/products/[id]/variants:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/products/[id]/variants — delete all variants or a specific one
// ?variant_id=xxx  → delete single variant
// (no query param)  → delete ALL variants for this product (used before re-saving)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    if (!id) return NextResponse.json({ error: 'Product ID required' }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const variantId = searchParams.get('variant_id');

    const supabase = getAdminClient();

    if (variantId) {
      // Delete specific variant
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('id', variantId)
        .eq('product_id', id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      // Delete ALL variants for this product (called before re-saving full list)
      const { error } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', id);

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in DELETE /api/products/[id]/variants:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
