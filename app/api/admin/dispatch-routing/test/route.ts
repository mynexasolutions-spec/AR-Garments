import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/adminSession';
import {
  resolveDispatchRouting,
  DEFAULT_ZONES,
  DEFAULT_PARTNERS,
  DeliveryZone,
  DeliveryPartner,
} from '@/lib/deliveryPartners';

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { pincode } = body;

    if (!pincode || typeof pincode !== 'string') {
      return NextResponse.json({ success: false, error: 'Pincode is required' }, { status: 400 });
    }

    let zones: DeliveryZone[] = DEFAULT_ZONES;
    let partners: DeliveryPartner[] = DEFAULT_PARTNERS;

    try {
      const supabase = getServiceSupabase();
      const { data: dbPartners } = await supabase.from('delivery_partners').select('*');
      if (dbPartners && dbPartners.length > 0) {
        partners = dbPartners.map((r) => ({
          id: String(r.id),
          name: String(r.name),
          code: String(r.code),
          integrationType: r.integration_type,
          credentials: r.credentials || {},
          trackingUrlTemplate: r.tracking_url_template,
          isActive: Boolean(r.is_active),
          description: r.description,
        }));
      }

      const { data: dbZones } = await supabase
        .from('delivery_zones')
        .select('*')
        .order('priority', { ascending: false });

      if (dbZones && dbZones.length > 0) {
        const { data: dbPins } = await supabase
          .from('delivery_zone_pincodes')
          .select('zone_id, pincode, pincode_prefix');

        const pinsMap = new Map<string, { pincodes: string[]; prefixes: string[] }>();
        if (dbPins) {
          for (const row of dbPins) {
            if (!pinsMap.has(row.zone_id)) {
              pinsMap.set(row.zone_id, { pincodes: [], prefixes: [] });
            }
            const item = pinsMap.get(row.zone_id)!;
            if (row.pincode) item.pincodes.push(String(row.pincode));
            if (row.pincode_prefix) item.prefixes.push(String(row.pincode_prefix));
          }
        }

        zones = dbZones.map((z) => {
          const pinEntry = pinsMap.get(z.id) || { pincodes: [], prefixes: [] };
          return {
            id: String(z.id),
            zoneKey: String(z.zone_key),
            name: String(z.name),
            description: z.description,
            defaultPartnerId: z.default_partner_id,
            fallbackPartnerId: z.fallback_partner_id,
            isActive: Boolean(z.is_active),
            priority: Number(z.priority) || 1,
            pincodes: pinEntry.pincodes,
            pincodePrefixes: pinEntry.prefixes,
          };
        });
      }
    } catch {
      // Use defaults
    }

    const decision = resolveDispatchRouting(pincode, zones, partners);

    return NextResponse.json({
      success: true,
      pincode,
      decision,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Error testing dispatch routing' },
      { status: 500 }
    );
  }
}
