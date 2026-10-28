import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequest } from '@/lib/adminSession';
import { getServiceSupabase } from '@/lib/supabase';
import {
  DEFAULT_ZONE_SETTINGS,
  ZoneShippingSetting,
} from '@/lib/zoneShipping';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
};

// GET /api/shipping-settings — Returns all 3 zone configurations
export async function GET(): Promise<NextResponse> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('zone_shipping_settings')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      try {
        const filePath = path.join(process.cwd(), 'data', 'zone_shipping_settings.json');
        if (fs.existsSync(filePath)) {
          const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (Array.isArray(fileData) && fileData.length > 0) {
            return NextResponse.json(fileData, { headers: NO_STORE_HEADERS });
          }
        }
      } catch {}
      // Fallback to default 3 zones if table not yet migrated or query fails
      return NextResponse.json(DEFAULT_ZONE_SETTINGS, { headers: NO_STORE_HEADERS });
    }

    const mapped: ZoneShippingSetting[] = data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      zoneName: String(row.zone_name || ''),
      zoneNameHi: String(row.zone_name_hi || ''),
      isActive: Boolean(row.is_active),
      freeDeliveryThreshold: Number(row.free_delivery_threshold) || 0,
      standardDeliveryFee: Number(row.standard_delivery_fee) || 0,
      customPincodes: Array.isArray(row.custom_pincodes) ? (row.custom_pincodes as string[]) : [],
      sortOrder: Number(row.sort_order) || 0,
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    }));

    return NextResponse.json(mapped, { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    console.error('Error fetching zone shipping settings:', error);
    // Graceful fallback to default zones
    return NextResponse.json(DEFAULT_ZONE_SETTINGS, { headers: NO_STORE_HEADERS });
  }
}

// PATCH /api/shipping-settings — Updates 3 zone configurations
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: 'Admin authentication is required.' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const zones = Array.isArray(body) ? body : body.zones;

    if (!Array.isArray(zones) || zones.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: zones array required.' },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const upsertRows = zones.map((z: Record<string, unknown>, index: number) => {
      const freeThreshold = Math.max(0, Number(z.freeDeliveryThreshold ?? z.free_delivery_threshold) || 0);
      const standardFee = Math.max(0, Number(z.standardDeliveryFee ?? z.standard_delivery_fee) || 0);

      return {
        id: String(z.id || `zone_${index + 1}`),
        zone_name: String(z.zoneName || z.zone_name || `Zone ${index + 1}`),
        zone_name_hi: String(z.zoneNameHi || z.zone_name_hi || ''),
        is_active: Boolean(z.isActive ?? z.is_active),
        free_delivery_threshold: freeThreshold,
        standard_delivery_fee: standardFee,
        custom_pincodes: Array.isArray(z.customPincodes)
          ? z.customPincodes
          : (Array.isArray(z.custom_pincodes) ? z.custom_pincodes : []),
        sort_order: Number(z.sortOrder ?? z.sort_order ?? index + 1),
        updated_at: now,
      };
    });

    // Always persist to local fallback file so settings are never lost
    const mappedFallback: ZoneShippingSetting[] = upsertRows.map((row) => ({
      id: String(row.id),
      zoneName: String(row.zone_name),
      zoneNameHi: String(row.zone_name_hi),
      isActive: Boolean(row.is_active),
      freeDeliveryThreshold: Number(row.free_delivery_threshold),
      standardDeliveryFee: Number(row.standard_delivery_fee),
      customPincodes: Array.isArray(row.custom_pincodes) ? (row.custom_pincodes as string[]) : [],
      sortOrder: Number(row.sort_order),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    }));

    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(dataDir, 'zone_shipping_settings.json'),
        JSON.stringify(mappedFallback, null, 2),
        'utf8'
      );
    } catch (fsErr) {
      console.warn('Failed to write local zone settings backup:', fsErr);
    }

    // Also sync storewide shipping_settings table if present
    try {
      const anyActive = upsertRows.some((r) => r.is_active);
      await supabase
        .from('shipping_settings')
        .update({ free_shipping_enabled: anyActive })
        .eq('id', 1);
    } catch {}

    const { data, error } = await supabase
      .from('zone_shipping_settings')
      .upsert(upsertRows, { onConflict: 'id' })
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn('Supabase zone settings upsert error (using local fallback):', error.message);
      return NextResponse.json(mappedFallback, { headers: NO_STORE_HEADERS });
    }

    const mapped: ZoneShippingSetting[] = (data || []).map((row: Record<string, unknown>) => ({
      id: String(row.id),
      zoneName: String(row.zone_name),
      zoneNameHi: String(row.zone_name_hi),
      isActive: Boolean(row.is_active),
      freeDeliveryThreshold: Number(row.free_delivery_threshold),
      standardDeliveryFee: Number(row.standard_delivery_fee),
      customPincodes: Array.isArray(row.custom_pincodes) ? (row.custom_pincodes as string[]) : [],
      sortOrder: Number(row.sort_order),
      updatedAt: row.updated_at ? String(row.updated_at) : null,
    }));

    return NextResponse.json(mapped, { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unable to update zone shipping settings.';
    return NextResponse.json({ error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
