// ─── 3-Zone Free Delivery & Shipping Calculation Logic ─────────────────────────

export interface ZoneShippingSetting {
  id: 'zone_nagar_nigam' | 'zone_dehat' | 'zone_pan_india' | string;
  zoneName: string;
  zoneNameHi: string;
  isActive: boolean;
  freeDeliveryThreshold: number;
  standardDeliveryFee: number;
  customPincodes?: string[];
  sortOrder: number;
  updatedAt?: string | null;
}

export const DEFAULT_NAGAR_NIGAM_PINCODES: string[] = [
  '211001', '211002', '211003', '211004', '211005', '211006',
  '211007', '211008', '211009', '211011', '211012', '211013',
  '211014', '211016', '211018', '211019'
];

export const DEFAULT_DEHAT_PINCODES: string[] = [
  '212101', '212104', '212105', '212106', '212107', '212108', '212109', '212111',
  '212201', '212202', '212203', '212204', '212205', '212206', '212207', '212208',
  '212209', '212214', '212216', '212217', '212218',
  '212301', '212302', '212303', '212305', '212306', '212307',
  '212401', '212402', '212404', '212405', '212411', '212412'
];

export const DEFAULT_ZONE_SETTINGS: ZoneShippingSetting[] = [
  {
    id: 'zone_nagar_nigam',
    zoneName: 'Zone 1: Prayagraj Nagar Nigam',
    zoneNameHi: 'प्रयागराज नगर निगम',
    isActive: true,
    freeDeliveryThreshold: 500,
    standardDeliveryFee: 40,
    customPincodes: DEFAULT_NAGAR_NIGAM_PINCODES,
    sortOrder: 1,
  },
  {
    id: 'zone_dehat',
    zoneName: 'Zone 2: Prayagraj Dehat',
    zoneNameHi: 'प्रयागराज देहात',
    isActive: true,
    freeDeliveryThreshold: 1500,
    standardDeliveryFee: 80,
    customPincodes: DEFAULT_DEHAT_PINCODES,
    sortOrder: 2,
  },
  {
    id: 'zone_pan_india',
    zoneName: 'Zone 3: Pan India',
    zoneNameHi: 'पैन इंडिया',
    isActive: true,
    freeDeliveryThreshold: 3000,
    standardDeliveryFee: 120,
    customPincodes: [],
    sortOrder: 3,
  },
];

export interface DetectedZoneResult {
  zone: ZoneShippingSetting;
  zoneType: 'nagar_nigam' | 'dehat' | 'pan_india';
  zoneLabel: string;
  zoneLabelHi: string;
  isFreeDelivery: boolean;
  deliveryFee: number;
  amountNeededForFreeDelivery: number;
}

/**
 * Resolves which zone a given pincode belongs to.
 */
export function resolveZoneByPincode(
  pincode: string,
  settings: ZoneShippingSetting[] = DEFAULT_ZONE_SETTINGS
): ZoneShippingSetting {
  const cleaned = pincode.trim().replace(/\D/g, '');
  const zoneNagarNigam = settings.find((z) => z.id === 'zone_nagar_nigam') || DEFAULT_ZONE_SETTINGS[0];
  const zoneDehat = settings.find((z) => z.id === 'zone_dehat') || DEFAULT_ZONE_SETTINGS[1];
  const zonePanIndia = settings.find((z) => z.id === 'zone_pan_india') || DEFAULT_ZONE_SETTINGS[2];

  if (!cleaned || cleaned.length !== 6) {
    return zonePanIndia;
  }

  // Check Nagar Nigam
  const nagarPincodes = (zoneNagarNigam.customPincodes && zoneNagarNigam.customPincodes.length > 0)
    ? zoneNagarNigam.customPincodes
    : DEFAULT_NAGAR_NIGAM_PINCODES;

  if (nagarPincodes.includes(cleaned) || cleaned.startsWith('211')) {
    return zoneNagarNigam;
  }

  // Check Dehat
  const dehatPincodes = (zoneDehat.customPincodes && zoneDehat.customPincodes.length > 0)
    ? zoneDehat.customPincodes
    : DEFAULT_DEHAT_PINCODES;

  if (dehatPincodes.includes(cleaned) || cleaned.startsWith('212')) {
    return zoneDehat;
  }

  // Default to Pan India
  return zonePanIndia;
}

/**
 * Calculates delivery fee according to the 3-Zone Free Delivery rules:
 * - If subtotal <= 0 or coupon gives free shipping => 0
 * - If zone is ON (isActive = true):
 *     - If subtotal >= freeDeliveryThreshold => FREE (0)
 *     - Else => standardDeliveryFee
 * - If zone is OFF (isActive = false):
 *     - Free delivery is disabled. standardDeliveryFee always applies regardless of order amount!
 */
export function calculateZoneDelivery(
  subtotal: number,
  pincode: string,
  settings: ZoneShippingSetting[] = DEFAULT_ZONE_SETTINGS,
  hasFreeShippingCoupon = false
): DetectedZoneResult {
  if (subtotal <= 0 || hasFreeShippingCoupon) {
    const zone = resolveZoneByPincode(pincode, settings);
    return {
      zone,
      zoneType: zone.id === 'zone_nagar_nigam' ? 'nagar_nigam' : zone.id === 'zone_dehat' ? 'dehat' : 'pan_india',
      zoneLabel: zone.zoneName,
      zoneLabelHi: zone.zoneNameHi,
      isFreeDelivery: true,
      deliveryFee: 0,
      amountNeededForFreeDelivery: 0,
    };
  }

  const zone = resolveZoneByPincode(pincode, settings);
  const zoneType = zone.id === 'zone_nagar_nigam' ? 'nagar_nigam' : zone.id === 'zone_dehat' ? 'dehat' : 'pan_india';

  // Rule: If OFF, standard fee always applies regardless of order value
  if (!zone.isActive) {
    return {
      zone,
      zoneType,
      zoneLabel: zone.zoneName,
      zoneLabelHi: zone.zoneNameHi,
      isFreeDelivery: false,
      deliveryFee: zone.standardDeliveryFee,
      amountNeededForFreeDelivery: 0,
    };
  }

  // Zone is ON: Check threshold
  if (subtotal >= zone.freeDeliveryThreshold) {
    return {
      zone,
      zoneType,
      zoneLabel: zone.zoneName,
      zoneLabelHi: zone.zoneNameHi,
      isFreeDelivery: true,
      deliveryFee: 0,
      amountNeededForFreeDelivery: 0,
    };
  }

  // Below threshold
  return {
    zone,
    zoneType,
    zoneLabel: zone.zoneName,
    zoneLabelHi: zone.zoneNameHi,
    isFreeDelivery: false,
    deliveryFee: zone.standardDeliveryFee,
    amountNeededForFreeDelivery: Math.max(0, zone.freeDeliveryThreshold - subtotal),
  };
}

/**
 * Global Kill Switch helper:
 * Returns true if ANY zone has Free Delivery turned ON.
 * If admin turns OFF all zones, this returns false.
 */
export function isFreeDeliveryGloballyActive(
  settings: ZoneShippingSetting[] = DEFAULT_ZONE_SETTINGS
): boolean {
  if (!Array.isArray(settings) || settings.length === 0) return false;
  return settings.some((z) => Boolean(z.isActive));
}

/**
 * Returns the lowest active threshold among all active zones.
 */
export function getLowestActiveFreeDeliveryThreshold(
  settings: ZoneShippingSetting[] = DEFAULT_ZONE_SETTINGS
): number | null {
  const active = settings.filter((z) => Boolean(z.isActive));
  if (active.length === 0) return null;
  return Math.min(...active.map((z) => z.freeDeliveryThreshold));
}
