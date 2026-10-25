import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

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

type CategoryAssignment = {
  categoryId: string;
  categoryName: string;
  subcategoryId: string | null;
  hierarchyAvailable: boolean;
};

async function resolveCategoryAssignment(
  supabase: ReturnType<typeof getAdminClient>,
  categoryIdValue: unknown,
  categoryNameValue: unknown,
  subcategoryIdValue: unknown
): Promise<CategoryAssignment> {
  const categoryId = typeof categoryIdValue === 'string' ? categoryIdValue.trim() : '';
  const categoryName = typeof categoryNameValue === 'string' ? categoryNameValue.trim() : '';
  const subcategoryId = typeof subcategoryIdValue === 'string' && subcategoryIdValue.trim()
    ? subcategoryIdValue.trim()
    : null;

  try {
    const categoryQuery = supabase
      .from('categories')
      .select('id, name, parent_id');
    let { data: category, error: categoryError } = categoryId
      ? await categoryQuery.eq('id', categoryId).single()
      : await categoryQuery.ilike('name', categoryName).is('parent_id', null).single();

    if (categoryError || !category) {
      // Fallback
      return {
        categoryId: categoryId || 'cat-default',
        categoryName: categoryName || 'Ethnic Wear',
        subcategoryId: null,
        hierarchyAvailable: false,
      };
    }

    if (subcategoryId) {
      const { data: subcategory } = await supabase
        .from('categories')
        .select('id, parent_id')
        .eq('id', subcategoryId)
        .single();
      if (subcategory && subcategory.parent_id === category.id) {
        return {
          categoryId: String(category.id),
          categoryName: String(category.name),
          subcategoryId,
          hierarchyAvailable: true,
        };
      }
    }

    return {
      categoryId: String(category.id),
      categoryName: String(category.name),
      subcategoryId: null,
      hierarchyAvailable: true,
    };
  } catch {
    return {
      categoryId: categoryId || 'cat-default',
      categoryName: categoryName || 'Ethnic Wear',
      subcategoryId: null,
      hierarchyAvailable: false,
    };
  }
}

// GET /api/products — fetch all products (optionally filtered)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const isNewArrival = searchParams.get('is_new_arrival');
  const isBestSeller = searchParams.get('is_best_seller');
  const isPremium    = searchParams.get('is_premium');
  const isGold       = searchParams.get('is_gold');
  const category     = searchParams.get('category');
  const categoryId   = searchParams.get('category_id');
  const subcategoryId = searchParams.get('subcategory_id');
  const search       = searchParams.get('search');

  const supabase = getAdminClient();
  let query = supabase.from('products').select('*').order('sort_order');

  if (isNewArrival === 'true') query = query.eq('is_new_arrival', true);
  if (isBestSeller === 'true') query = query.eq('is_best_seller', true);
  if (isPremium === 'true')    query = query.eq('is_premium', true);
  if (isGold === 'true')       query = query.eq('is_gold', true);
  if (category && category !== 'All') query = query.eq('category', category);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (subcategoryId) query = query.eq('subcategory_id', subcategoryId);
  if (search && search.trim()) {
    const value = search.trim();
    query = query.or(`name.ilike.%${value}%,category.ilike.%${value}%,description.ilike.%${value}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Fetch products error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || [], {
    headers: NO_STORE_HEADERS,
  });
}

// POST /api/products — create a new product
export async function POST(request: Request) {
  const body = await request.json();
  const supabase = getAdminClient();

  let assignment: CategoryAssignment;
  try {
    assignment = await resolveCategoryAssignment(
      supabase,
      body.categoryId || body.category_id,
      body.category,
      body.subcategoryId || body.subcategory_id
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid category assignment.';
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const numericPrice = parseInt(String(body.price || body.pricePerPiece || '0').replace(/[^\d]/g, '') || '0', 10);
  const piecesPerSet = Number(body.piecesPerSet || body.pieces_per_set) || 1;
  const pricePerPiece = Number(body.pricePerPiece || body.price_per_piece) || (numericPrice > 0 ? numericPrice : 0);
  const totalSetPrice = Number(body.totalSetPrice || body.total_set_price) || (piecesPerSet * pricePerPiece);
  const purchasePrice = Number(body.purchasePrice || body.purchase_price) || 0;
  const totalStockPieces = Number(body.totalStockPieces || body.total_stock_pieces) || Number(body.stock || 10);

  const record: Record<string, unknown> = {
    id: body.id || `prod-${Date.now()}`,
    name: body.name || 'New Product',
    price: body.price || `₹${totalSetPrice || pricePerPiece || 0}`,
    numeric_price: numericPrice || pricePerPiece || totalSetPrice,
    category: assignment.categoryName,
    category_id: assignment.categoryId,
    subcategory_id: assignment.subcategoryId,
    brand: body.brand || '',
    image: body.image || (Array.isArray(body.images) && body.images[0]) || '',
    images: Array.isArray(body.images) ? body.images : (body.image ? [body.image] : []),
    description: body.description || '',
    specification: body.specification || '',
    shipping_care: body.shippingCare || body.shipping_care || '',
    stock: body.stock ?? 10,
    active: body.active ?? true,
    is_new_arrival: body.isNewArrival ?? false,
    is_best_seller: body.isBestSeller ?? false,
    is_premium: body.isPremium ?? false,
    is_gold: body.isGold ?? false,
    sort_order: body.order ?? 0,
    // Specifications
    fabric: body.fabric || '',
    colour: body.colour || '',
    work: body.work || '',
    length: body.length || '',
    occasion: body.occasion || '',
    fit_shape: body.fitShape || body.fit_shape || '',
    sleeve_length: body.sleeveLength || body.sleeve_length || '',
    custom_specifications: Array.isArray(body.customSpecifications)
      ? body.customSpecifications
      : (body.custom_specifications || []),
    // Main Product Info
    size: body.size || 'Free Size',
    pieces_per_set: piecesPerSet,
    price_per_piece: pricePerPiece,
    total_set_price: totalSetPrice,
    purchase_price: purchasePrice,
    total_stock_pieces: totalStockPieces,
    weight: body.weight || '',
    weight_unit: body.weightUnit || body.weight_unit || 'kg',
    gst_rate: body.gstRate || body.gst_rate || '5%',
    hsn_code: body.hsnCode || body.hsn_code || '',
    variants: Array.isArray(body.variants) ? body.variants : [],
    // Social Media Links
    youtube_url: body.youtubeUrl || body.youtube_url || '',
    facebook_url: body.facebookUrl || body.facebook_url || '',
    instagram_url: body.instagramUrl || body.instagram_url || '',
  };

  // Attempt insert
  let { data, error } = await supabase
    .from('products')
    .insert(record)
    .select('*')
    .single();

  // If new columns error out (before user ran the migration script in Supabase), fallback gracefully
  if (error && error.code === '42703') {
    const minimalRecord: Record<string, unknown> = {
      id: record.id,
      name: record.name,
      price: record.price,
      numeric_price: record.numeric_price,
      category: record.category,
      image: record.image,
      images: record.images,
      description: record.description,
      specification: record.specification,
      shipping_care: record.shipping_care,
      stock: record.stock,
      active: record.active,
      is_new_arrival: record.is_new_arrival,
      is_best_seller: record.is_best_seller,
      sort_order: record.sort_order,
      youtube_url: record.youtube_url,
      facebook_url: record.facebook_url,
      instagram_url: record.instagram_url,
    };
    ({ data, error } = await supabase
      .from('products')
      .insert(minimalRecord)
      .select('*')
      .single());
  }

  if (error) {
    console.error('Insert product error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath('/');
  revalidatePath('/category');
  if (data?.id) revalidatePath(`/product/${data.id}`);

  return NextResponse.json(data, { status: 201, headers: NO_STORE_HEADERS });
}

// PATCH /api/products — update a product by id in query string
export async function PATCH(request: Request) {
  const body = await request.json();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = getAdminClient();
  const patch: Record<string, unknown> = {};

  if (body.name !== undefined) patch.name = body.name;
  if (body.price !== undefined) patch.price = body.price;
  if (body.numericPrice !== undefined) patch.numeric_price = body.numericPrice;
  if (body.brand !== undefined) patch.brand = body.brand;
  if (body.image !== undefined) patch.image = body.image;
  if (body.images !== undefined) patch.images = body.images;
  if (body.description !== undefined) patch.description = body.description;
  if (body.specification !== undefined) patch.specification = body.specification;
  if (body.shippingCare !== undefined) patch.shipping_care = body.shippingCare;
  if (body.shipping_care !== undefined) patch.shipping_care = body.shipping_care;
  if (body.stock !== undefined) patch.stock = body.stock;
  if (body.active !== undefined) patch.active = body.active;
  if (body.isNewArrival !== undefined) patch.is_new_arrival = body.isNewArrival;
  if (body.isBestSeller !== undefined) patch.is_best_seller = body.isBestSeller;
  if (body.isPremium !== undefined) patch.is_premium = body.isPremium;
  if (body.isGold !== undefined) patch.is_gold = body.isGold;
  if (body.order !== undefined) patch.sort_order = body.order;

  // Specifications
  if (body.fabric !== undefined) patch.fabric = body.fabric;
  if (body.colour !== undefined) patch.colour = body.colour;
  if (body.work !== undefined) patch.work = body.work;
  if (body.length !== undefined) patch.length = body.length;
  if (body.occasion !== undefined) patch.occasion = body.occasion;
  if (body.fitShape !== undefined) patch.fit_shape = body.fitShape;
  if (body.fit_shape !== undefined) patch.fit_shape = body.fit_shape;
  if (body.sleeveLength !== undefined) patch.sleeve_length = body.sleeveLength;
  if (body.sleeve_length !== undefined) patch.sleeve_length = body.sleeve_length;
  if (body.customSpecifications !== undefined) patch.custom_specifications = body.customSpecifications;

  // Main Product Info
  if (body.size !== undefined) patch.size = body.size;
  if (body.piecesPerSet !== undefined) patch.pieces_per_set = body.piecesPerSet;
  if (body.pieces_per_set !== undefined) patch.pieces_per_set = body.pieces_per_set;
  if (body.pricePerPiece !== undefined) patch.price_per_piece = body.pricePerPiece;
  if (body.price_per_piece !== undefined) patch.price_per_piece = body.price_per_piece;
  if (body.totalSetPrice !== undefined) patch.total_set_price = body.totalSetPrice;
  if (body.total_set_price !== undefined) patch.total_set_price = body.total_set_price;
  if (body.purchasePrice !== undefined) patch.purchase_price = body.purchasePrice;
  if (body.purchase_price !== undefined) patch.purchase_price = body.purchase_price;
  if (body.totalStockPieces !== undefined) patch.total_stock_pieces = body.totalStockPieces;
  if (body.total_stock_pieces !== undefined) patch.total_stock_pieces = body.total_stock_pieces;
  if (body.weight !== undefined) patch.weight = body.weight;
  if (body.weightUnit !== undefined) patch.weight_unit = body.weightUnit;
  if (body.weight_unit !== undefined) patch.weight_unit = body.weight_unit;
  if (body.gstRate !== undefined) patch.gst_rate = body.gstRate;
  if (body.gst_rate !== undefined) patch.gst_rate = body.gst_rate;
  if (body.hsnCode !== undefined) patch.hsn_code = body.hsnCode;
  if (body.hsn_code !== undefined) patch.hsn_code = body.hsn_code;
  if (body.variants !== undefined) patch.variants = body.variants;

  // Social Links
  if (body.youtubeUrl !== undefined) patch.youtube_url = body.youtubeUrl;
  if (body.youtube_url !== undefined) patch.youtube_url = body.youtube_url;
  if (body.facebookUrl !== undefined) patch.facebook_url = body.facebookUrl;
  if (body.facebook_url !== undefined) patch.facebook_url = body.facebook_url;
  if (body.instagramUrl !== undefined) patch.instagram_url = body.instagramUrl;
  if (body.instagram_url !== undefined) patch.instagram_url = body.instagram_url;

  // Category
  if (body.categoryId !== undefined || body.category !== undefined) {
    try {
      const assignment = await resolveCategoryAssignment(
        supabase,
        body.categoryId || body.category_id,
        body.category,
        body.subcategoryId || body.subcategory_id
      );
      patch.category = assignment.categoryName;
      patch.category_id = assignment.categoryId;
      patch.subcategory_id = assignment.subcategoryId;
    } catch {
      // ignore
    }
  }

  const { data, error } = await supabase
    .from('products')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Update product error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  revalidatePath('/');
  revalidatePath('/category');
  revalidatePath(`/product/${id}`);

  return NextResponse.json(data, { headers: NO_STORE_HEADERS });
}

// DELETE /api/products — delete a product by id in query string
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const supabase = getAdminClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidatePath('/');
  revalidatePath('/category');
  revalidatePath(`/product/${id}`);

  return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS });
}
