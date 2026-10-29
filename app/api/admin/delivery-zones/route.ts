import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/adminSession';
import { DeliveryZone, DEFAULT_ZONES } from '@/lib/deliveryPartners';

let memoryZones: DeliveryZone[] = [...DEFAULT_ZONES];

// ─── GET /api/admin/delivery-zones ──────────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getServiceSupabase();
    
    // Fetch zones with partner relations
    const { data: zonesData, error: zonesError } = await supabase
      .from('delivery_zones')
      .select(`
        *,
        default_partner:default_partner_id (id, name, code, is_active),
        fallback_partner:fallback_partner_id (id, name, code, is_active)
      `)
      .order('priority', { ascending: false });

    if (zonesError || !zonesData || zonesData.length === 0) {
      return NextResponse.json({ success: true, zones: memoryZones });
    }

    // Fetch mapped pincodes for these zones
    const { data: pincodesData } = await supabase
      .from('delivery_zone_pincodes')
      .select('zone_id, pincode, pincode_prefix');

    const pincodesByZone = new Map<string, { pincodes: string[]; prefixes: string[] }>();
    if (pincodesData) {
      for (const row of pincodesData) {
        if (!pincodesByZone.has(row.zone_id)) {
          pincodesByZone.set(row.zone_id, { pincodes: [], prefixes: [] });
        }
        const entry = pincodesByZone.get(row.zone_id)!;
        if (row.pincode) entry.pincodes.push(String(row.pincode));
        if (row.pincode_prefix) entry.prefixes.push(String(row.pincode_prefix));
      }
    }

    const zones: DeliveryZone[] = zonesData.map((row) => {
      const pinEntry = pincodesByZone.get(row.id) || { pincodes: [], prefixes: [] };
      return {
        id: String(row.id),
        zoneKey: String(row.zone_key),
        name: String(row.name),
        description: row.description ? String(row.description) : null,
        defaultPartnerId: row.default_partner_id ? String(row.default_partner_id) : null,
        defaultPartnerName: row.default_partner ? (row.default_partner as { name: string }).name : undefined,
        fallbackPartnerId: row.fallback_partner_id ? String(row.fallback_partner_id) : null,
        fallbackPartnerName: row.fallback_partner ? (row.fallback_partner as { name: string }).name : undefined,
        isActive: Boolean(row.is_active),
        priority: Number(row.priority) || 1,
        pincodes: pinEntry.pincodes,
        pincodePrefixes: pinEntry.prefixes,
        createdAt: row.created_at ? String(row.created_at) : undefined,
        updatedAt: row.updated_at ? String(row.updated_at) : undefined,
      };
    });

    return NextResponse.json({ success: true, zones });
  } catch (err) {
    console.error('Error fetching delivery zones:', err);
    return NextResponse.json({ success: true, zones: memoryZones });
  }
}

// ─── PUT /api/admin/delivery-zones ──────────────────────────────────────────
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, description, defaultPartnerId, fallbackPartnerId, isActive, priority, pincodes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Zone ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name) updates.name = String(name).trim();
    if (description !== undefined) updates.description = description ? String(description).trim() : null;
    if (defaultPartnerId !== undefined) updates.default_partner_id = defaultPartnerId || null;
    if (fallbackPartnerId !== undefined) updates.fallback_partner_id = fallbackPartnerId || null;
    if (isActive !== undefined) updates.is_active = Boolean(isActive);
    if (priority !== undefined) updates.priority = Number(priority) || 1;

    try {
      const supabase = getServiceSupabase();
      await supabase.from('delivery_zones').update(updates).eq('id', id);

      // If pincodes array is provided, refresh pincode mappings for this zone
      if (Array.isArray(pincodes)) {
        await supabase.from('delivery_zone_pincodes').delete().eq('zone_id', id);
        const rowsToInsert = pincodes
          .map((p) => String(p).trim())
          .filter(Boolean)
          .map((pin) => ({
            zone_id: id,
            pincode: pin.length === 6 ? pin : null,
            pincode_prefix: pin.length < 6 ? pin : null,
          }));

        if (rowsToInsert.length > 0) {
          await supabase.from('delivery_zone_pincodes').insert(rowsToInsert);
        }
      }
    } catch {
      // Memory fallback
    }

    // Update memory
    const idx = memoryZones.findIndex((z) => z.id === id);
    if (idx !== -1) {
      memoryZones[idx] = {
        ...memoryZones[idx],
        ...(name ? { name: String(name).trim() } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(defaultPartnerId !== undefined ? { defaultPartnerId: defaultPartnerId || null } : {}),
        ...(fallbackPartnerId !== undefined ? { fallbackPartnerId: fallbackPartnerId || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(priority !== undefined ? { priority: Number(priority) || 1 } : {}),
        ...(Array.isArray(pincodes) ? { pincodes: pincodes.map(String) } : {}),
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({ success: true, message: 'Delivery zone updated successfully' });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update zone' },
      { status: 500 }
    );
  }
}
