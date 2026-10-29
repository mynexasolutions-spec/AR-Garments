// ─── Zone-Wise Price Markup & Discount Calculation ──────────────────────────
// Zone 1 = Nearby  (Prayagraj Nagar Nigam + Dehat: 211xxx / 212xxx pincodes)
// Zone 2 = Pan India (all other locations across India, e.g. Pune, Mumbai, Delhi)

export interface ZonePriceRule {
  id: string;
  categoryId: string;
  categoryName: string;
  subcategoryId?: string | null;
  subcategoryName?: string | null;

  // Zone 1 — Nearby
  zone1Active: boolean;
  zone1Type: 'increase' | 'decrease' | 'discount' | 'none';
  zone1Value: number; // percent

  // Zone 2 — Pan India
  zone2Active: boolean;
  zone2Type: 'increase' | 'decrease' | 'discount' | 'none';
  zone2Value: number; // percent
  zone2DiscountActive: boolean;
  zone2DiscountValue: number; // percent
}

export interface ZonePriceResult {
  displayPrice: number;     // final price to show customer
  originalPrice: number;    // admin-set base price
  markedUpPrice: number;    // after markup (before discount) — same as originalPrice if no markup
  discountPercent: number;  // discount % to show as badge (0 if none)
  markupPercent: number;    // markup % applied (0 if none)
  markupDirection: 'increase' | 'decrease' | 'none';
  hasRule: boolean;
  ruleType: 'zone1' | 'zone2';
}

export interface LocationIdentifier {
  pincode?: string | null;
  city?: string | null;
}

export interface CategoryIdentifier {
  categoryId?: string | null;
  categoryName?: string | null;
  category?: string | null;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
}

/**
 * Determines if customer belongs to "nearby" (Zone 1) or "pan_india" (Zone 2).
 * Supports pincode (string or object) or city name (e.g. Pune, Prayagraj).
 */
export function resolveMarkupZone(
  pincodeOrLocation?: string | LocationIdentifier | null,
  cityFallback?: string | null
): 'nearby' | 'pan_india' {
  let pin = '';
  let city = '';

  if (typeof pincodeOrLocation === 'object' && pincodeOrLocation !== null) {
    pin = pincodeOrLocation.pincode || '';
    city = pincodeOrLocation.city || '';
  } else if (typeof pincodeOrLocation === 'string') {
    pin = pincodeOrLocation;
    city = cityFallback || '';
  }

  const cleanPin = pin.trim().replace(/\D/g, '');
  const cleanCity = city.trim().toLowerCase();

  // 1. Check 6-digit pincode
  if (cleanPin.length === 6) {
    // 211xxx = Prayagraj Nagar Nigam, 212xxx = Prayagraj Dehat
    if (cleanPin.startsWith('211') || cleanPin.startsWith('212')) {
      return 'nearby';
    }
    // Any other 6-digit pincode (e.g. Pune 411xxx, Mumbai 400xxx) is Pan India
    return 'pan_india';
  }

  // 2. Check city name if pincode wasn't 6 digits
  if (cleanCity) {
    if (
      cleanCity.includes('prayagraj') ||
      cleanCity.includes('allahabad') ||
      cleanCity.includes('naini') ||
      cleanCity.includes('jhunsi') ||
      cleanCity.includes('phaphamau')
    ) {
      return 'nearby';
    }
    // Any other city (e.g. Pune, Delhi, Kolkata, Mumbai) is Pan India
    return 'pan_india';
  }

  // Default: customers outside Prayagraj = Pan India
  return 'pan_india';
}

function cleanStr(s?: string | null): string {
  if (!s) return '';
  return s.toLowerCase().trim();
}

function normalizeKey(s?: string | null): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}

function matchesCategory(
  rule: ZonePriceRule,
  catId?: string | null,
  catName?: string | null
): boolean {
  const rId = cleanStr(rule.categoryId);
  const rName = cleanStr(rule.categoryName);
  const rNorm = normalizeKey(rule.categoryName);

  const pId = cleanStr(catId);
  const pName = cleanStr(catName);
  const pNorm = normalizeKey(catName);

  // Direct ID match
  if (rId && pId && rId === pId) return true;
  // Cross ID <-> Name match
  if (rName && pId && (rName === pId || rNorm === normalizeKey(catId))) return true;
  if (rId && pName && (rId === pName || normalizeKey(rule.categoryId) === pNorm)) return true;

  // Normalized Name match (handles "Kurtis & Sets" vs "Kurtis and Sets" vs "Kurtis")
  if (rName && pName) {
    if (rName === pName || rNorm === pNorm) return true;
    // Substring / partial match: e.g. "kurtis" matches "kurtis & sets"
    if (pNorm.includes(rNorm) || rNorm.includes(pNorm)) return true;
  }

  return false;
}

function matchesSubcategory(
  rule: ZonePriceRule,
  subId?: string | null,
  subName?: string | null
): boolean {
  if (!rule.subcategoryId && !rule.subcategoryName) return false;
  const rId = cleanStr(rule.subcategoryId);
  const rName = cleanStr(rule.subcategoryName);
  const rNorm = normalizeKey(rule.subcategoryName);

  const pId = cleanStr(subId);
  const pName = cleanStr(subName);
  const pNorm = normalizeKey(subName);

  if (rId && pId && rId === pId) return true;
  if (rName && pName && (rName === pName || rNorm === pNorm)) return true;
  if (rName && pId && (rName === pId || rNorm === normalizeKey(subId))) return true;
  if (rName && pName && (pNorm.includes(rNorm) || rNorm.includes(pNorm))) return true;

  return false;
}

/**
 * Finds the best matching rule for a product's category/subcategory.
 * Specificity: subcategory rule > category-only rule.
 * Accepts category string or CategoryIdentifier object.
 */
export function findMatchingRule(
  rules: ZonePriceRule[],
  categoryOrIdentifier: string | CategoryIdentifier | null | undefined,
  subcategoryIdOrName?: string | null
): ZonePriceRule | null {
  if (!rules || rules.length === 0) return null;
  if (!categoryOrIdentifier) return null;

  let catId: string | null = null;
  let catName: string | null = null;
  let subId: string | null = null;
  let subName: string | null = null;

  if (typeof categoryOrIdentifier === 'object' && categoryOrIdentifier !== null) {
    catId = categoryOrIdentifier.categoryId || null;
    catName = categoryOrIdentifier.categoryName || categoryOrIdentifier.category || null;
    subId = categoryOrIdentifier.subcategoryId || subcategoryIdOrName || null;
    subName = categoryOrIdentifier.subcategoryName || null;
  } else {
    // If it's a string, treat it as both ID and Name candidate
    catId = categoryOrIdentifier;
    catName = categoryOrIdentifier;
    subId = subcategoryIdOrName || null;
    subName = subcategoryIdOrName || null;
  }

  // 1. Most specific: same category + matching subcategory
  if (subId || subName) {
    const specific = rules.find(
      (r) => matchesCategory(r, catId, catName) && matchesSubcategory(r, subId, subName)
    );
    if (specific) return specific;
  }

  // 2. Category-level rule (where subcategory is not restricted)
  const categoryLevel = rules.find(
    (r) => matchesCategory(r, catId, catName) && !r.subcategoryId
  );
  return categoryLevel || null;
}

/**
 * Computes the effective display price for a customer based on their zone.
 */
export function computeZonePrice(
  basePrice: number,
  rule: ZonePriceRule | null,
  zone: 'nearby' | 'pan_india'
): ZonePriceResult {
  const noRule: ZonePriceResult = {
    displayPrice: basePrice,
    originalPrice: basePrice,
    markedUpPrice: basePrice,
    discountPercent: 0,
    markupPercent: 0,
    markupDirection: 'none',
    hasRule: false,
    ruleType: zone === 'nearby' ? 'zone1' : 'zone2',
  };

  if (!rule) return noRule;

  if (zone === 'nearby') {
    if (!rule.zone1Active || rule.zone1Type === 'none') return { ...noRule, hasRule: true };

    const v = Number(rule.zone1Value) || 0;

    if (rule.zone1Type === 'increase') {
      const marked = Math.round(basePrice * (1 + v / 100));
      return {
        displayPrice: marked,
        originalPrice: basePrice,
        markedUpPrice: marked,
        discountPercent: 0,
        markupPercent: v,
        markupDirection: 'increase',
        hasRule: true,
        ruleType: 'zone1',
      };
    }

    if (rule.zone1Type === 'decrease') {
      const marked = Math.round(basePrice * (1 - v / 100));
      return {
        displayPrice: marked,
        originalPrice: basePrice,
        markedUpPrice: marked,
        discountPercent: 0,
        markupPercent: v,
        markupDirection: 'decrease',
        hasRule: true,
        ruleType: 'zone1',
      };
    }

    if (rule.zone1Type === 'discount') {
      const final = Math.round(basePrice * (1 - v / 100));
      return {
        displayPrice: final,
        originalPrice: basePrice,
        markedUpPrice: basePrice,
        discountPercent: v,
        markupPercent: 0,
        markupDirection: 'none',
        hasRule: true,
        ruleType: 'zone1',
      };
    }
  }

  // Zone 2 — Pan India
  if (!rule.zone2Active || rule.zone2Type === 'none') return { ...noRule, hasRule: true };

  const v2 = Number(rule.zone2Value) || 0;
  let markedUp = basePrice;
  let markupDir: 'increase' | 'decrease' | 'none' = 'none';

  if (rule.zone2Type === 'increase') {
    markedUp = Math.round(basePrice * (1 + v2 / 100));
    markupDir = 'increase';
  } else if (rule.zone2Type === 'decrease') {
    markedUp = Math.round(basePrice * (1 - v2 / 100));
    markupDir = 'decrease';
  } else if (rule.zone2Type === 'discount') {
    markedUp = basePrice;
  }

  // Optional extra discount on top of markup
  let finalPrice = markedUp;
  let extraDiscount = 0;
  if (rule.zone2DiscountActive && rule.zone2DiscountValue > 0) {
    extraDiscount = Number(rule.zone2DiscountValue) || 0;
    finalPrice = Math.round(markedUp * (1 - extraDiscount / 100));
  } else if (rule.zone2Type === 'discount') {
    extraDiscount = v2;
    finalPrice = Math.round(basePrice * (1 - v2 / 100));
  }

  return {
    displayPrice: finalPrice,
    originalPrice: basePrice,
    markedUpPrice: markedUp,
    discountPercent: extraDiscount,
    markupPercent: rule.zone2Type !== 'discount' ? v2 : 0,
    markupDirection: markupDir,
    hasRule: true,
    ruleType: 'zone2',
  };
}

/** Maps raw DB row to ZonePriceRule */
export function mapDbRowToRule(row: Record<string, unknown>): ZonePriceRule {
  return {
    id: String(row.id || ''),
    categoryId: String(row.category_id || ''),
    categoryName: String(row.category_name || ''),
    subcategoryId: row.subcategory_id ? String(row.subcategory_id) : null,
    subcategoryName: row.subcategory_name ? String(row.subcategory_name) : null,
    zone1Active: Boolean(row.zone1_active ?? true),
    zone1Type: (row.zone1_type as ZonePriceRule['zone1Type']) || 'none',
    zone1Value: Number(row.zone1_value ?? 0),
    zone2Active: Boolean(row.zone2_active ?? true),
    zone2Type: (row.zone2_type as ZonePriceRule['zone2Type']) || 'increase',
    zone2Value: Number(row.zone2_value ?? 0),
    zone2DiscountActive: Boolean(row.zone2_discount_active ?? false),
    zone2DiscountValue: Number(row.zone2_discount_value ?? 0),
  };
}
