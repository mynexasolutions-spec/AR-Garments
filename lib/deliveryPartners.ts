// ─── DELIVERY PARTNERS & AUTOMATED DISPATCH ROUTING ENGINE ─────────────

import { DEFAULT_NAGAR_NIGAM_PINCODES, DEFAULT_DEHAT_PINCODES } from './zoneShipping';

export type IntegrationType = 'manual' | 'api';
export type DispatchType = 'internal' | 'external';
export type DispatchStatus = 'pending' | 'assigned' | 'booked' | 'dispatched' | 'manual_review';

export interface DeliveryPartner {
  id: string;
  name: string;
  code: string;
  integrationType: IntegrationType;
  credentials?: Record<string, string>;
  hasCredentials?: boolean;
  trackingUrlTemplate?: string | null;
  isActive: boolean;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeliveryZone {
  id: string;
  zoneKey: string;
  name: string;
  description?: string | null;
  defaultPartnerId?: string | null;
  defaultPartnerName?: string;
  fallbackPartnerId?: string | null;
  fallbackPartnerName?: string;
  isActive: boolean;
  priority: number;
  pincodes?: string[];
  pincodePrefixes?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface RoutingDecision {
  partnerId: string | null;
  partnerName: string;
  partnerCode: string;
  zoneId: string;
  zoneKey: string;
  zoneName: string;
  dispatchType: DispatchType;
  dispatchStatus: DispatchStatus;
  isFallback: boolean;
  notes: string;
  trackingUrl?: string | null;
}

// ─── Default In-Memory / Seed Data ──────────────────────────────────────────

export const DEFAULT_PARTNERS: DeliveryPartner[] = [
  {
    id: 'partner-self-rider',
    name: 'Self Delivery / Local Rider',
    code: 'self_delivery',
    integrationType: 'manual',
    isActive: true,
    description: 'In-house rider delivery for local Allahabad city and nearby orders.',
  },
  {
    id: 'partner-shiprocket',
    name: 'Shiprocket',
    code: 'shiprocket',
    integrationType: 'api',
    isActive: false, // Inactive until admin provides credentials
    trackingUrlTemplate: 'https://shiprocket.co/tracking/{awb}',
    description: 'Automated courier aggregator for Pan India shipping (FedEx, Delhivery, BlueDart, DTDC).',
  },
  {
    id: 'partner-delhivery',
    name: 'Delhivery Direct',
    code: 'delhivery',
    integrationType: 'api',
    isActive: false,
    trackingUrlTemplate: 'https://www.delhivery.com/track/package/{awb}',
    description: 'Direct courier API integration with Delhivery Logistics.',
  },
];

export const DEFAULT_ZONES: DeliveryZone[] = [
  {
    id: 'zone-city-1',
    zoneKey: 'zone_allahabad_city',
    name: 'Allahabad City',
    description: 'Prayagraj Nagar Nigam local pin codes (211001 - 211019). Served by in-house rider.',
    defaultPartnerId: 'partner-self-rider',
    defaultPartnerName: 'Self Delivery / Local Rider',
    fallbackPartnerId: null,
    isActive: true,
    priority: 10,
    pincodes: DEFAULT_NAGAR_NIGAM_PINCODES,
  },
  {
    id: 'zone-rural-2',
    zoneKey: 'zone_allahabad_dehat',
    name: 'Allahabad Rural / Dehat',
    description: 'Prayagraj Rural / Dehat areas (212xxx pin codes).',
    defaultPartnerId: 'partner-self-rider',
    defaultPartnerName: 'Self Delivery / Local Rider',
    fallbackPartnerId: 'partner-shiprocket',
    fallbackPartnerName: 'Shiprocket',
    isActive: true,
    priority: 5,
    pincodes: DEFAULT_DEHAT_PINCODES,
    pincodePrefixes: ['212'],
  },
  {
    id: 'zone-pan-india-3',
    zoneKey: 'zone_pan_india',
    name: 'Outside Allahabad / Pan India',
    description: 'All domestic destinations outside Allahabad district.',
    defaultPartnerId: 'partner-shiprocket',
    defaultPartnerName: 'Shiprocket',
    fallbackPartnerId: 'partner-self-rider',
    fallbackPartnerName: 'Self Delivery / Local Rider',
    isActive: true,
    priority: 1,
  },
];

// ─── Tracking Link Generator ────────────────────────────────────────────────

export function generateTrackingLink(template: string | null | undefined, awbNumber: string): string | null {
  if (!template || !awbNumber) return null;
  const cleanedAwb = encodeURIComponent(awbNumber.trim());
  if (template.includes('{awb}')) {
    return template.replace(/\{awb\}/g, cleanedAwb);
  }
  return `${template.replace(/\/+$/, '')}/${cleanedAwb}`;
}

// ─── Mask Sensitive Partner Credentials ─────────────────────────────────────

export function sanitizePartnerForClient(partner: DeliveryPartner): DeliveryPartner {
  const creds = partner.credentials;
  const hasCreds = Boolean(creds && Object.keys(creds).length > 0 && Object.values(creds).some((v) => Boolean(v)));
  
  // Return partner without raw secrets
  const sanitized = { ...partner, hasCredentials: hasCreds };
  delete sanitized.credentials;
  return sanitized;
}

// ─── Automated Dispatch Routing Engine ──────────────────────────────────────

export function resolveDispatchRouting(
  pincode: string,
  zones: DeliveryZone[] = DEFAULT_ZONES,
  partners: DeliveryPartner[] = DEFAULT_PARTNERS
): RoutingDecision {
  const cleanPin = (pincode || '').replace(/\D/g, '').trim();

  // 1. Identify Zone (sorted by priority descending)
  const activeZones = zones.filter((z) => z.isActive).sort((a, b) => b.priority - a.priority);
  let matchedZone: DeliveryZone | null = null;

  for (const zone of activeZones) {
    // Check explicit pincodes
    if (zone.pincodes && zone.pincodes.length > 0 && zone.pincodes.includes(cleanPin)) {
      matchedZone = zone;
      break;
    }
    // Check prefix match (e.g. '212')
    if (zone.pincodePrefixes && zone.pincodePrefixes.some((pfx) => cleanPin.startsWith(pfx))) {
      matchedZone = zone;
      break;
    }
    // Pan India is the lowest priority fallback zone
    if (zone.zoneKey === 'zone_pan_india') {
      matchedZone = zone;
    }
  }

  // Fallback if no zone matched
  if (!matchedZone) {
    return {
      partnerId: null,
      partnerName: 'Unassigned',
      partnerCode: 'none',
      zoneId: '',
      zoneKey: 'unknown',
      zoneName: 'Unknown Zone',
      dispatchType: 'internal',
      dispatchStatus: 'manual_review',
      isFallback: false,
      notes: `No active delivery zone matched pincode "${cleanPin}". Placed in Manual Review.`,
    };
  }

  const partnersMap = new Map<string, DeliveryPartner>(partners.map((p) => [p.id, p]));
  const defaultPartner = matchedZone.defaultPartnerId ? partnersMap.get(matchedZone.defaultPartnerId) : null;
  const fallbackPartner = matchedZone.fallbackPartnerId ? partnersMap.get(matchedZone.fallbackPartnerId) : null;

  // Helper to test if a partner is eligible to accept an order
  const isPartnerEligible = (p: DeliveryPartner | null | undefined): boolean => {
    if (!p || !p.isActive) return false;
    // For API partners, check if credentials exist
    if (p.integrationType === 'api') {
      const hasCreds = p.hasCredentials || (p.credentials && Object.keys(p.credentials).length > 0);
      return Boolean(hasCreds);
    }
    return true;
  };

  // 2. Evaluate Default Partner
  if (defaultPartner && isPartnerEligible(defaultPartner)) {
    const isManual = defaultPartner.integrationType === 'manual';
    return {
      partnerId: defaultPartner.id,
      partnerName: defaultPartner.name,
      partnerCode: defaultPartner.code,
      zoneId: matchedZone.id,
      zoneKey: matchedZone.zoneKey,
      zoneName: matchedZone.name,
      dispatchType: isManual ? 'internal' : 'external',
      dispatchStatus: 'assigned',
      isFallback: false,
      notes: `Routed to default partner ${defaultPartner.name} via ${matchedZone.name} rule.`,
    };
  }

  // 3. Evaluate Fallback Partner
  if (fallbackPartner && isPartnerEligible(fallbackPartner)) {
    const isManual = fallbackPartner.integrationType === 'manual';
    return {
      partnerId: fallbackPartner.id,
      partnerName: fallbackPartner.name,
      partnerCode: fallbackPartner.code,
      zoneId: matchedZone.id,
      zoneKey: matchedZone.zoneKey,
      zoneName: matchedZone.name,
      dispatchType: isManual ? 'internal' : 'external',
      dispatchStatus: 'assigned',
      isFallback: true,
      notes: `Default partner was unavailable/inactive. Assigned fallback partner ${fallbackPartner.name}.`,
    };
  }

  // 4. Default / Fallback partner not available -> Manual Review
  return {
    partnerId: defaultPartner?.id || null,
    partnerName: defaultPartner?.name || 'Manual Review Required',
    partnerCode: defaultPartner?.code || 'manual_review',
    zoneId: matchedZone.id,
    zoneKey: matchedZone.zoneKey,
    zoneName: matchedZone.name,
    dispatchType: 'internal',
    dispatchStatus: 'manual_review',
    isFallback: false,
    notes: `No active/configured partner available for ${matchedZone.name} (Pincode: ${cleanPin}). Needs admin review.`,
  };
}
