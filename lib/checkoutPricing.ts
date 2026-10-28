import { getServiceSupabase } from '@/lib/supabase';
import { OrderItem } from '@/lib/orders';
import { calculateShippingCharge } from '@/lib/shipping';
import { getShippingSettings } from '@/lib/shippingSettings.server';

interface CheckoutItemInput {
  id: string;
  quantity: number;
}

interface ProductRow {
  id: string;
  name: string;
  price: string;
  numeric_price: number;
  image: string;
  category: string;
  stock: number;
  active: boolean;
}

interface CouponRow {
  code: string;
  discount_type: 'percentage' | 'flat' | 'free_shipping';
  discount_value: number;
  applicable_category: string;
  min_order_value: number;
  max_discount_amount: number | null;
  usage_limit: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
}

export interface CheckoutPricing {
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode?: string;
}

export class CheckoutPricingError extends Error {}

function normalizeItems(rawItems: unknown): CheckoutItemInput[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > 50) {
    throw new CheckoutPricingError('The cart must contain between 1 and 50 products.');
  }

  const quantities = new Map<string, number>();
  for (const rawItem of rawItems) {
    if (!rawItem || typeof rawItem !== 'object') {
      throw new CheckoutPricingError('The cart contains an invalid item.');
    }

    const item = rawItem as Record<string, unknown>;
    const id = String(item.id || '').trim();
    const quantity = Number(item.quantity);
    if (!id || !Number.isInteger(quantity) || quantity <= 0) {
      throw new CheckoutPricingError('Every cart item requires a valid product ID and quantity.');
    }

    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }

  return Array.from(quantities, ([id, quantity]) => ({ id, quantity }));
}

async function getProducts(items: CheckoutItemInput[]): Promise<Map<string, ProductRow>> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, numeric_price, image, category, stock, active')
    .in('id', items.map((item) => item.id));

  if (error) {
    throw new CheckoutPricingError(`Unable to validate catalogue prices: ${error.message}`);
  }

  const rows = (data || []) as ProductRow[];
  return new Map(rows.map((row) => [String(row.id), row]));
}

async function getCoupon(code: string): Promise<CouponRow> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('coupons')
    .select(
      'code, discount_type, discount_value, applicable_category, min_order_value, max_discount_amount, usage_limit, used_count, valid_from, valid_until, active'
    )
    .ilike('code', code)
    .maybeSingle();

  if (error) {
    throw new CheckoutPricingError(`Unable to validate the coupon: ${error.message}`);
  }
  if (!data) {
    throw new CheckoutPricingError('The applied coupon no longer exists.');
  }

  return data as CouponRow;
}

function calculateCouponDiscount(
  coupon: CouponRow,
  products: ProductRow[],
  subtotal: number
): { discount: number; freeShipping: boolean } {
  const now = Date.now();
  if (!coupon.active) {
    throw new CheckoutPricingError('The applied coupon is inactive.');
  }
  if (coupon.valid_from && new Date(coupon.valid_from).getTime() > now) {
    throw new CheckoutPricingError('The applied coupon is not active yet.');
  }
  if (coupon.valid_until && new Date(coupon.valid_until).getTime() < now) {
    throw new CheckoutPricingError('The applied coupon has expired.');
  }
  if (coupon.usage_limit !== null && coupon.used_count >= coupon.usage_limit) {
    throw new CheckoutPricingError('The applied coupon has reached its usage limit.');
  }
  if (subtotal < Number(coupon.min_order_value || 0)) {
    throw new CheckoutPricingError('The cart no longer meets the coupon minimum order value.');
  }

  const category = coupon.applicable_category || 'All';
  if (
    category !== 'All' &&
    products.some((product) => product.category.toLowerCase() !== category.toLowerCase())
  ) {
    throw new CheckoutPricingError(`The applied coupon is only valid for ${category} products.`);
  }

  if (coupon.discount_type === 'free_shipping') {
    return { discount: 0, freeShipping: true };
  }

  const discountValue = Number(coupon.discount_value || 0);
  let discount =
    coupon.discount_type === 'percentage'
      ? Math.round((subtotal * discountValue) / 100)
      : Math.min(discountValue, subtotal);

  if (coupon.max_discount_amount !== null) {
    discount = Math.min(discount, Number(coupon.max_discount_amount));
  }

  return { discount, freeShipping: false };
}

export async function calculateCheckoutPricing(rawItems: unknown, rawCouponCode: unknown, rawPincode?: string): Promise<CheckoutPricing> {



  const items = normalizeItems(rawItems);
  const productMap = await getProducts(items);
  const products = items.map((item) => {
    const product = productMap.get(item.id);
    if (!product || !product.active) {
      throw new CheckoutPricingError(`Product ${item.id} is unavailable.`);
    }
    if (item.quantity > Number(product.stock)) {
      throw new CheckoutPricingError(`Only ${product.stock} unit(s) of ${product.name} are available.`);
    }
    if (!Number.isFinite(Number(product.numeric_price)) || Number(product.numeric_price) <= 0) {
      throw new CheckoutPricingError(`Product ${product.name} has an invalid price.`);
    }
    return product;
  });

  const canonicalItems: OrderItem[] = items.map((item) => {
    const product = productMap.get(item.id)!;
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      numericPrice: Number(product.numeric_price),
      image: product.image,
      category: product.category,
      quantity: item.quantity,
    };
  });
  const subtotal = canonicalItems.reduce(
    (sum, item) => sum + Number(item.numericPrice) * item.quantity,
    0
  );

  const couponCode = typeof rawCouponCode === 'string' ? rawCouponCode.trim().toUpperCase() : '';
  const couponResult = couponCode
    ? calculateCouponDiscount(await getCoupon(couponCode), products, subtotal)
    : { discount: 0, freeShipping: false };
  const shippingSettings = await getShippingSettings();
  const shipping = calculateShippingCharge(
    subtotal,
    shippingSettings,
    couponResult.freeShipping
  );
  const total = Math.max(0, subtotal - couponResult.discount + shipping);

  if (total < 1) {
    throw new CheckoutPricingError('The payable amount must be at least ₹1 for online payment.');
  }

  return {
    items: canonicalItems,
    subtotal,
    discount: couponResult.discount,
    shipping,
    total,
    ...(couponCode ? { couponCode } : {}),
  };
}
