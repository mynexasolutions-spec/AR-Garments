import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/adminSession';
import {
  DeliveryPartner,
  DEFAULT_PARTNERS,
  sanitizePartnerForClient,
} from '@/lib/deliveryPartners';

// In-memory fallback if Supabase table is not yet migrated
let memoryPartners: DeliveryPartner[] = [...DEFAULT_PARTNERS];

function mapDbPartner(row: Record<string, unknown>): DeliveryPartner {
  const creds = (row.credentials as Record<string, string>) || {};
  return {
    id: String(row.id),
    name: String(row.name),
    code: String(row.code),
    integrationType: (row.integration_type as 'manual' | 'api') || 'manual',
    credentials: creds,
    trackingUrlTemplate: row.tracking_url_template ? String(row.tracking_url_template) : null,
    isActive: Boolean(row.is_active),
    description: row.description ? String(row.description) : null,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

// ─── GET /api/admin/delivery-partners ───────────────────────────────────────
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase
      .from('delivery_partners')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      // Return memory fallback
      return NextResponse.json({
        success: true,
        partners: memoryPartners.map(sanitizePartnerForClient),
      });
    }

    const partners = data.map(mapDbPartner).map(sanitizePartnerForClient);
    return NextResponse.json({ success: true, partners });
  } catch (err) {
    console.error('Error fetching delivery partners:', err);
    return NextResponse.json({
      success: true,
      partners: memoryPartners.map(sanitizePartnerForClient),
    });
  }
}

// ─── POST /api/admin/delivery-partners ──────────────────────────────────────
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, code, integrationType, credentials, trackingUrlTemplate, isActive, description } = body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ success: false, error: 'Partner name is required' }, { status: 400 });
    }

    const cleanCode = (code || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const newPartner: DeliveryPartner = {
      id: `partner-${Date.now()}`,
      name: name.trim(),
      code: cleanCode,
      integrationType: integrationType === 'api' ? 'api' : 'manual',
      credentials: typeof credentials === 'object' && credentials !== null ? credentials : {},
      trackingUrlTemplate: trackingUrlTemplate ? String(trackingUrlTemplate).trim() : null,
      isActive: isActive !== false,
      description: description ? String(description).trim() : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('delivery_partners')
        .insert({
          name: newPartner.name,
          code: newPartner.code,
          integration_type: newPartner.integrationType,
          credentials: newPartner.credentials,
          tracking_url_template: newPartner.trackingUrlTemplate,
          is_active: newPartner.isActive,
          description: newPartner.description,
        })
        .select('*')
        .single();

      if (!error && data) {
        newPartner.id = String(data.id);
      }
    } catch {
      // Memory fallback
    }

    memoryPartners.push(newPartner);

    return NextResponse.json({
      success: true,
      partner: sanitizePartnerForClient(newPartner),
      message: 'Delivery partner created successfully',
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to create partner' },
      { status: 500 }
    );
  }
}

// ─── PUT /api/admin/delivery-partners ───────────────────────────────────────
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, name, integrationType, credentials, trackingUrlTemplate, isActive, description } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Partner ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (name) updates.name = String(name).trim();
    if (integrationType) updates.integration_type = integrationType === 'api' ? 'api' : 'manual';
    if (trackingUrlTemplate !== undefined) updates.tracking_url_template = trackingUrlTemplate || null;
    if (isActive !== undefined) updates.is_active = Boolean(isActive);
    if (description !== undefined) updates.description = description ? String(description).trim() : null;
    if (credentials && typeof credentials === 'object' && Object.keys(credentials).length > 0) {
      updates.credentials = credentials;
    }

    try {
      const supabase = getServiceSupabase();
      await supabase.from('delivery_partners').update(updates).eq('id', id);
    } catch {
      // Fallback
    }

    // Update memory
    const idx = memoryPartners.findIndex((p) => p.id === id);
    if (idx !== -1) {
      memoryPartners[idx] = {
        ...memoryPartners[idx],
        ...(name ? { name: String(name).trim() } : {}),
        ...(integrationType ? { integrationType } : {}),
        ...(trackingUrlTemplate !== undefined ? { trackingUrlTemplate: trackingUrlTemplate || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        ...(description !== undefined ? { description: description ? String(description).trim() : null } : {}),
        ...(credentials && typeof credentials === 'object' && Object.keys(credentials).length > 0
          ? { credentials: { ...memoryPartners[idx].credentials, ...credentials } }
          : {}),
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({ success: true, message: 'Delivery partner updated successfully' });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update partner' },
      { status: 500 }
    );
  }
}
