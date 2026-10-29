'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  MapPin,
  Phone,
  User,
  CreditCard,
  Truck,
  CheckCircle2,
  ShoppingBag,
  ChevronRight,
  Loader2,
  Package,
  Tag,
  BadgeCheck,
  Home,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { calculateZoneDelivery, DEFAULT_ZONE_SETTINGS, DetectedZoneResult } from '@/lib/zoneShipping';
import { useShippingSettings } from '@/context/ShippingSettingsContext';
import { ZonePriceResult } from '@/lib/zonePriceMarkup';

// ─── Constants ────────────────────────────────────────────────────────────────

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu & Kashmir','Ladakh',
];

interface DeliveryForm {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
}

interface OrderResult {
  orderId: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
}

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: { color: string };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayCheckoutInstance {
  open: () => void;
  on: (
    event: 'payment.failed',
    callback: (response: { error?: { description?: string } }) => void
  ) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

class PaymentCancelledError extends Error {}

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Unable to load Razorpay Checkout.')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout.'));
    document.body.appendChild(script);
  });
}

function getJsonHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('ar_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputField({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  maxLength,
  error,
  icon: Icon,
}: {
  label: string;
  id: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  error?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-[#083028]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#083028]/40 pointer-events-none"
          />
        )}
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-all bg-white
            ${Icon ? 'pl-9' : ''}
            ${error
              ? 'border-red-400 focus:ring-2 focus:ring-red-200'
              : 'border-[#083028]/20 focus:border-[#083028] focus:ring-2 focus:ring-[#083028]/10'
            }`}
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function SelectField({
  label,
  id,
  value,
  onChange,
  options,
  required,
  error,
  icon: Icon,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  required?: boolean;
  error?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-[#083028]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#083028]/40 pointer-events-none"
          />
        )}
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full border rounded-xl px-3 py-2.5 text-sm outline-none transition-all bg-white appearance-none
            ${Icon ? 'pl-9' : ''}
            ${error
              ? 'border-red-400 focus:ring-2 focus:ring-red-200'
              : 'border-[#083028]/20 focus:border-[#083028] focus:ring-2 focus:ring-[#083028]/10'
            }`}
        >
          <option value="">Select State</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <ChevronRight
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-[#083028]/40 pointer-events-none"
        />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ─── Order Summary ─────────────────────────────────────────────────────────────

function OrderSummary({
  items,
  subtotal,
  discount,
  shipping,
  shippingReady,
  total,
  zoneResult,
  lowMarginDeliveryTotal,
}: {
  zoneResult?: DetectedZoneResult;
  items: {
    id: string;
    name: string;
    image?: string;
    quantity: number;
    price: number;
    originalBasePrice?: number;
    hasZoneMarkup?: boolean;
    zonePrice?: ZonePriceResult;
    deliveryType?: string;
    deliveryChargeAmount?: number;
  }[];
  subtotal: number;
  discount: number;
  shipping: number;
  shippingReady: boolean;
  total: number;
  lowMarginDeliveryTotal?: number;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#083028]/10 shadow-sm overflow-hidden">
      <div className="bg-[#083028] px-5 py-3.5 flex items-center gap-2">
        <ShoppingBag size={18} className="text-[#B8860B]" />
        <h2 className="font-semibold text-white text-sm tracking-wide uppercase">
          Order Summary
        </h2>
      </div>

      {/* Items */}
      <div className="divide-y divide-[#083028]/5 max-h-72 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-5 py-3">
            <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#083028]/10 shrink-0 bg-[#F5F1E8]">
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={20} className="text-[#083028]/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#083028] truncate">{item.name}</p>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <p className="text-xs text-[#083028]/60">Qty: {item.quantity}</p>
                {item.hasZoneMarkup && item.zonePrice && (
                  <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.2 rounded ${
                    (item.zonePrice.discountPercent ?? 0) > 0
                      ? 'bg-blue-100 text-blue-700'
                      : item.zonePrice.markupDirection === 'increase'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {(item.zonePrice.discountPercent ?? 0) > 0
                      ? `${item.zonePrice.discountPercent}% OFF`
                      : item.zonePrice.markupDirection === 'increase'
                      ? `+${item.zonePrice.markupPercent}% Zone Markup`
                      : `-${item.zonePrice.markupPercent}%`}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-[#083028]">
                ₹{(item.price * item.quantity).toLocaleString('en-IN')}
              </p>
              {item.hasZoneMarkup && item.originalBasePrice && (
                <p className="text-[10px] text-gray-400 line-through">
                  ₹{(item.originalBasePrice * item.quantity).toLocaleString('en-IN')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t border-[#083028]/10 px-5 py-4 space-y-2.5 bg-[#FAF8F3]">
        <div className="flex justify-between text-sm text-[#083028]/70">
          <span>Subtotal</span>
          <span>₹{subtotal.toLocaleString('en-IN')}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span className="flex items-center gap-1">
              <Tag size={13} /> Discount
            </span>
            <span>-₹{discount.toLocaleString('en-IN')}</span>
          </div>
        )}
        {/* Low-margin delivery charges */}
        {lowMarginDeliveryTotal != null && lowMarginDeliveryTotal > 0 && (
          <div className="flex justify-between text-sm text-orange-700 bg-orange-50/60 px-2 py-1 rounded-lg">
            <span className="flex items-center gap-1">📦 Wholesale Delivery</span>
            <span className="font-semibold">₹{lowMarginDeliveryTotal.toLocaleString('en-IN')}</span>
          </div>
        )}
        <div className="flex justify-between text-sm text-[#083028]/70">
          <div><span>Delivery charge</span>{zoneResult && <p className="text-[10px] text-amber-800 font-semibold">{zoneResult.zoneLabel}</p>}</div>
          <span className={shippingReady && shipping === 0 ? 'text-green-600 font-medium' : ''}>
            {!shippingReady ? 'Calculating…' : shipping === 0 ? 'FREE' : `₹${shipping}`}
          </span>
        </div>
        {shippingReady && shipping === 0 && subtotal > 0 && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <BadgeCheck size={12} /> Free shipping applied!
          </p>
        )}
        <div className="border-t border-[#083028]/10 pt-2.5 flex justify-between font-bold text-[#083028]">
          <span>Final payable</span>
          <span className="text-lg text-[#B8860B]">₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Confirmation Screen ───────────────────────────────────────────────────────

function OrderConfirmation({
  orderId,
  subtotal,
  discount,
  shipping,
  total,
  zoneResult,
  onContinueShopping,
  onViewOrders,
}: {
  zoneResult?: DetectedZoneResult;
  orderId: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  onContinueShopping: () => void;
  onViewOrders: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl border border-[#083028]/10 shadow-xl max-w-md w-full p-8 flex flex-col items-center text-center gap-5">
        {/* Animated checkmark */}
        <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center">
          <CheckCircle2 size={52} className="text-green-500" strokeWidth={1.5} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-[#083028]">Order Placed! 🎉</h2>
          <p className="text-[#083028]/60 mt-2 text-sm leading-relaxed">
            Your order has been placed successfully.<br />
            We'll notify you once it's shipped.
          </p>
        </div>

        {/* Order ID badge */}
        <div className="bg-[#FAF8F3] border border-[#B8860B]/30 rounded-xl px-6 py-3 w-full">
          <p className="text-xs text-[#083028]/50 uppercase tracking-wider mb-1">Order ID</p>
          <p className="text-[#083028] font-bold font-mono text-base">{orderId}</p>
        </div>

        <div className="w-full space-y-2 rounded-xl border border-[#083028]/10 bg-white px-4 py-3 text-sm">
          <div className="flex justify-between text-[#083028]/65">
            <span>Subtotal</span>
            <span>₹{subtotal.toLocaleString('en-IN')}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount</span>
              <span>−₹{discount.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between text-[#083028]/65">
            <div><span>Delivery charge</span>{zoneResult && <p className="text-[10px] text-amber-800 font-semibold">{zoneResult.zoneLabel}</p>}</div>
            <span className={shipping === 0 ? 'font-bold text-emerald-700' : ''}>
              {shipping === 0 ? 'FREE' : `₹${shipping.toLocaleString('en-IN')}`}
            </span>
          </div>
          <div className="flex justify-between border-t border-[#083028]/10 pt-2 font-bold text-[#083028]">
            <span>Final payable</span>
            <span className="text-[#B8860B]">₹{total.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Estimated delivery */}
        <div className="flex items-center gap-2 text-sm text-[#083028]/70 bg-[#083028]/5 rounded-xl px-4 py-2.5 w-full">
          <Truck size={18} className="text-[#083028] shrink-0" />
          <span>
            Estimated delivery: <strong className="text-[#083028]">5–7 business days</strong>
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full mt-1">
          <button
            onClick={onContinueShopping}
            className="flex-1 border-2 border-[#083028] text-[#083028] rounded-xl py-2.5 text-sm font-semibold hover:bg-[#083028]/5 transition-colors"
          >
            Continue Shopping
          </button>
          <button
            onClick={onViewOrders}
            className="flex-1 bg-[#083028] text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[#083028]/90 transition-colors"
          >
            View Orders
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Checkout Page ────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const router = useRouter();
  const {
    items,
    clearCart,
    subtotal: cartSubtotal,
    shipping: cartShipping,
    discountAmount: cartDiscount,
    finalTotal: cartFinalTotal,
    appliedCoupon,
    shippingSettings,
    shippingSettingsLoading,
    shippingSettingsError,
    getItemZonePrice,
  } = useCart();
  const { zoneSettings } = useShippingSettings();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState<DeliveryForm>({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Calculate zone-aware prices for checkout based on delivery location
  const checkoutLocation = useMemo(() => {
    if (form.pincode || form.city) {
      return { pincode: form.pincode, city: form.city };
    }
    return undefined; // fallback to saved location in localStorage
  }, [form.pincode, form.city]);

  const checkoutItems = useMemo(() => {
    return items.map((item) => {
      const zPrice = getItemZonePrice(item, checkoutLocation);
      const effectivePrice = zPrice.hasRule ? zPrice.displayPrice : item.numericPrice;
      const basePrice = item.originalNumericPrice || item.numericPrice;
      const hasZoneMarkup = zPrice.hasRule && effectivePrice !== basePrice;
      return {
        ...item,
        price: effectivePrice,
        originalBasePrice: basePrice,
        hasZoneMarkup,
        zonePrice: zPrice,
      };
    });
  }, [items, getItemZonePrice, checkoutLocation]);

  const checkoutSubtotal = useMemo(() => {
    return checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [checkoutItems]);

  const standardSubtotal = useMemo(() => {
    return checkoutItems.reduce((sum, item) => {
      return item.deliveryType !== 'low_margin' ? sum + item.price * item.quantity : sum;
    }, 0);
  }, [checkoutItems]);

  const lowMarginDeliveryTotal = useMemo(() => {
    return checkoutItems.reduce((sum, item) => {
      return item.deliveryType === 'low_margin'
        ? sum + (item.deliveryChargeAmount ?? 0) * item.quantity
        : sum;
    }, 0);
  }, [checkoutItems]);

  const checkoutZoneResult = calculateZoneDelivery(
    standardSubtotal, // only standard items for free-delivery threshold
    form.pincode,
    zoneSettings && zoneSettings.length > 0 ? zoneSettings : DEFAULT_ZONE_SETTINGS
  );

  const checkoutDiscount = useMemo(() => {
    if (!appliedCoupon || checkoutSubtotal < (appliedCoupon.minOrderValue || 0)) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      const d = Math.round((checkoutSubtotal * appliedCoupon.discountValue) / 100);
      return appliedCoupon.maxDiscountAmount && d > appliedCoupon.maxDiscountAmount
        ? appliedCoupon.maxDiscountAmount
        : d;
    }
    if (appliedCoupon.discountType === 'flat') {
      return appliedCoupon.discountValue;
    }
    return 0;
  }, [appliedCoupon, checkoutSubtotal]);

  const checkoutShipping = checkoutZoneResult.deliveryFee;
  const checkoutTotal = Math.max(0, checkoutSubtotal - checkoutDiscount + checkoutShipping + lowMarginDeliveryTotal);

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'online'>('cod');
  const [errors, setErrors] = useState<Partial<DeliveryForm>>({});
  const [loading, setLoading] = useState(false);
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null);

  // ── Redirects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/checkout');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user && items.length === 0 && !orderResult) {
      router.replace('/cart');
    }
  }, [items, user, authLoading, orderResult, router]);

  // ── Pre-fill from DB & localStorage ──────────────────────────────────────────

  useEffect(() => {
    let isMounted = true;

    async function loadSavedAddress() {
      // 1. Try DB first if user is logged in
      if (user?.id) {
        try {
          const res = await fetch(`/api/user/address?userId=${encodeURIComponent(user.id)}`);
          if (res.ok) {
            const data = await res.json();
            if (data?.address && isMounted) {
              setForm((prev) => ({
                ...prev,
                fullName: data.address.fullName || user.name || prev.fullName,
                phone: data.address.phone || prev.phone,
                addressLine1: data.address.addressLine1 || prev.addressLine1,
                addressLine2: data.address.addressLine2 || prev.addressLine2,
                city: data.address.city || prev.city,
                state: data.address.state || prev.state,
                pincode: data.address.pincode || prev.pincode,
              }));
              return;
            }
          }
        } catch {
          // ignore, fall through to localStorage
        }
      }

      // 2. Fallback to localStorage
      try {
        const saved = localStorage.getItem('ar_user_address');
        if (saved && isMounted) {
          const parsed = JSON.parse(saved) as Partial<DeliveryForm>;
          setForm((prev) => ({ ...prev, ...parsed }));
        } else if (user?.name && isMounted) {
          setForm((prev) => ({ ...prev, fullName: prev.fullName || user.name }));
        }
      } catch {
        // ignore
      }
    }

    loadSavedAddress();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // ── Pricing ───────────────────────────────────────────────────────────────────

  const discount = checkoutDiscount;
  const total = checkoutTotal;
  const subtotal = checkoutSubtotal;
  const shipping = checkoutShipping;

  const cartSummaryItems = checkoutItems.map((item) => ({
    id: item.id,
    name: item.name,
    image: item.image,
    quantity: item.quantity,
    price: item.price,
    deliveryType: item.deliveryType,
    deliveryChargeAmount: item.deliveryChargeAmount,
  }));

  // ── Validation ────────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Partial<DeliveryForm> = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required.';
    if (!/^\d{10}$/.test(form.phone)) newErrors.phone = 'Enter a valid 10-digit phone number.';
    if (!form.addressLine1.trim()) newErrors.addressLine1 = 'Address is required.';
    if (!form.city.trim()) newErrors.city = 'City is required.';
    if (!form.state) newErrors.state = 'Please select a state.';
    if (!/^\d{6}$/.test(form.pincode)) newErrors.pincode = 'Enter a valid 6-digit pincode.';
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    if (!isValid) {
      toast.warning('Please fill all required delivery details correctly.', { title: 'Incomplete Form' });
    }
    return isValid;
  }

  // ── Form update helper ────────────────────────────────────────────────────────

  function updateField(field: keyof DeliveryForm) {
    return (value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handlePlaceOrder() {
    if (shippingSettingsLoading) {
      toast.info('Shipping settings are still loading. Please wait a moment.', {
        title: 'Please Wait',
      });
      return;
    }
    if (!shippingSettings || shippingSettingsError) {
      toast.error(shippingSettingsError || 'Shipping settings are unavailable.', {
        title: 'Checkout Unavailable',
      });
      return;
    }
    if (!validate()) return;

    setLoading(true);

    const orderPayload = {
      userId: user?.id ?? 'guest-user',
      userName: user?.name || form.fullName,
      userEmail: user?.email ?? '',
      deliveryAddress: form,
      paymentMethod,
      items: cartSummaryItems,
      subtotal,
      discount,
      shipping,
      total,
      couponCode: appliedCoupon?.code,
      placedAt: new Date().toISOString(),
    };

    try {
      let orderId: string;

      if (paymentMethod === 'online') {
        await loadRazorpayCheckout();

        const createResponse = await fetch('/api/payments/razorpay/order', {
          method: 'POST',
          headers: getJsonHeaders(),
          body: JSON.stringify({
            items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
            couponCode: appliedCoupon?.code,
            shippingAddress: form,
            expectedTotal: total,
          }),
        });
        const createData = await readJson(createResponse);
        if (!createResponse.ok) {
          throw new Error(String(createData.error || 'Unable to start Razorpay payment.'));
        }

        const keyId = String(createData.keyId || '');
        const applicationOrderId = String(createData.applicationOrderId || '');
        const razorpayOrderId = String(createData.razorpayOrderId || '');
        const amount = Number(createData.amount);
        const currency = String(createData.currency || 'INR');
        if (!window.Razorpay || !keyId || !applicationOrderId || !razorpayOrderId || !amount) {
          throw new Error('Razorpay returned an incomplete order response.');
        }

        const payment = await new Promise<RazorpayCheckoutResponse>((resolve, reject) => {
          const checkout = new window.Razorpay!({
            key: keyId,
            amount,
            currency,
            name: 'AR Garment',
            description: `Payment for ${applicationOrderId}`,
            order_id: razorpayOrderId,
            prefill: {
              name: form.fullName,
              email: user?.email || '',
              contact: form.phone,
            },
            theme: { color: '#083028' },
            handler: resolve,
            modal: {
              ondismiss: () => reject(new PaymentCancelledError('Payment was cancelled.')),
            },
          });
          checkout.on('payment.failed', (response) => {
            reject(new Error(response.error?.description || 'Razorpay payment failed.'));
          });
          checkout.open();
        });

        const verifyResponse = await fetch('/api/payments/razorpay/verify', {
          method: 'POST',
          headers: getJsonHeaders(),
          body: JSON.stringify({
            applicationOrderId,
            razorpayOrderId: payment.razorpay_order_id,
            razorpayPaymentId: payment.razorpay_payment_id,
            razorpaySignature: payment.razorpay_signature,
          }),
        });
        const verifyData = await readJson(verifyResponse);
        if (!verifyResponse.ok || !verifyData.success) {
          throw new Error(String(verifyData.error || 'Payment verification failed.'));
        }
        orderId = String(verifyData.orderId || applicationOrderId);
      } else {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: getJsonHeaders(),
          body: JSON.stringify(orderPayload),
        });
        const data = await readJson(res);
        if (!res.ok || !data.orderId) {
          throw new Error(String(data.error || 'Unable to place the order.'));
        }
        orderId = String(data.orderId);
      }

      // Save address to localStorage
      try {
        localStorage.setItem('ar_user_address', JSON.stringify(form));
      } catch {
        // ignore
      }

      setOrderResult({ orderId, subtotal, discount, shipping, total });
      clearCart();
      toast.success(`Order ${orderId} placed successfully! 🎉`, { title: 'Order Placed' });
    } catch (error) {
      if (error instanceof PaymentCancelledError) {
        toast.info('No payment was taken. You can try again when ready.', {
          title: 'Payment Cancelled',
        });
      } else {
        const message = error instanceof Error ? error.message : 'Unable to place the order.';
        toast.error(message, { title: 'Checkout Failed' });
      }
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#083028] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-500 font-medium">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (orderResult) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-[#FAF8F3] py-12">
          <OrderConfirmation
            orderId={orderResult.orderId}
            subtotal={orderResult.subtotal}
            discount={orderResult.discount}
            shipping={orderResult.shipping}
            total={orderResult.total}
            onContinueShopping={() => router.push('/')}
            onViewOrders={() => router.push('/account?tab=orders')}
          />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#FAF8F3] py-8 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Page heading */}
          <div className="mb-7">
            <div className="flex items-center gap-2 text-xs text-[#083028]/50 mb-2">
              <Home size={12} />
              <span>/</span>
              <span>Cart</span>
              <span>/</span>
              <span className="text-[#083028] font-medium">Checkout</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#083028]">Checkout</h1>
          </div>

          {/* Layout */}
          <div className="flex flex-col-reverse lg:flex-row gap-6 items-start">

            {/* ── Left: Form ─────────────────────────────────────────────── */}
            <div className="w-full lg:flex-1 space-y-5">

              {/* Delivery Details Card */}
              <div className="bg-white rounded-2xl border border-[#083028]/10 shadow-sm overflow-hidden">
                <div className="bg-[#083028]/5 border-b border-[#083028]/10 px-5 py-4 flex items-center gap-2">
                  <MapPin size={18} className="text-[#B8860B]" />
                  <h2 className="font-semibold text-[#083028] text-base">Delivery Details</h2>
                </div>

                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Full Name"
                    id="fullName"
                    value={form.fullName}
                    onChange={updateField('fullName')}
                    placeholder="Priya Sharma"
                    required
                    error={errors.fullName}
                    icon={User}
                  />
                  <InputField
                    label="Phone Number"
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={updateField('phone')}
                    placeholder="9876543210"
                    required
                    maxLength={10}
                    error={errors.phone}
                    icon={Phone}
                  />
                  <div className="sm:col-span-2">
                    <InputField
                      label="Address Line 1"
                      id="addressLine1"
                      value={form.addressLine1}
                      onChange={updateField('addressLine1')}
                      placeholder="House / Flat / Block No., Street Name"
                      required
                      error={errors.addressLine1}
                      icon={MapPin}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <InputField
                      label="Address Line 2"
                      id="addressLine2"
                      value={form.addressLine2}
                      onChange={updateField('addressLine2')}
                      placeholder="Landmark, Area (optional)"
                    />
                  </div>
                  <InputField
                    label="City"
                    id="city"
                    value={form.city}
                    onChange={updateField('city')}
                    placeholder="Mumbai"
                    required
                    error={errors.city}
                  />
                  <SelectField
                    label="State"
                    id="state"
                    value={form.state}
                    onChange={updateField('state')}
                    options={INDIAN_STATES}
                    required
                    error={errors.state}
                  />
                  <InputField
                    label="Pincode"
                    id="pincode"
                    type="tel"
                    value={form.pincode}
                    onChange={updateField('pincode')}
                    placeholder="400001"
                    required
                    maxLength={6}
                    error={errors.pincode}
                  />
                </div>
              </div>

              {/* Payment Method Card */}
              <div className="bg-white rounded-2xl border border-[#083028]/10 shadow-sm overflow-hidden">
                <div className="bg-[#083028]/5 border-b border-[#083028]/10 px-5 py-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-[#B8860B]" />
                  <h2 className="font-semibold text-[#083028] text-base">Payment Method</h2>
                </div>

                <div className="p-5 space-y-3">
                  {/* COD */}
                  <label
                    className={`flex items-center gap-4 border-2 rounded-xl px-4 py-3.5 cursor-pointer transition-all select-none
                      ${paymentMethod === 'cod'
                        ? 'border-[#083028] bg-[#083028]/5'
                        : 'border-[#083028]/15 hover:border-[#083028]/40'
                      }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="accent-[#083028] w-4 h-4"
                    />
                    <Truck size={22} className="text-[#083028] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#083028]">Cash on Delivery</p>
                      <p className="text-xs text-[#083028]/55">Pay when your order arrives</p>
                    </div>
                    {paymentMethod === 'cod' && (
                      <CheckCircle2 size={18} className="text-[#083028] ml-auto" />
                    )}
                  </label>

                  {/* Online Payment */}
                  <label
                    className={`flex items-center gap-4 border-2 rounded-xl px-4 py-3.5 cursor-pointer transition-all select-none
                      ${paymentMethod === 'online'
                        ? 'border-[#083028] bg-[#083028]/5'
                        : 'border-[#083028]/15 hover:border-[#083028]/40'
                      }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="online"
                      checked={paymentMethod === 'online'}
                      onChange={() => setPaymentMethod('online')}
                      className="accent-[#083028] w-4 h-4"
                    />
                    <CreditCard size={22} className="text-[#083028] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#083028]">Online Payment (UPI / Card)</p>
                      <p className="text-xs text-[#083028]/55">Secure digital payment</p>
                    </div>
                    {paymentMethod === 'online' && (
                      <CheckCircle2 size={18} className="text-[#083028] ml-auto" />
                    )}
                  </label>
                </div>
              </div>

              {/* Mobile-only order summary */}
              <div className="lg:hidden">
                <OrderSummary
                  items={checkoutItems}
                  subtotal={subtotal}
                  discount={discount}
                  shipping={shipping}
                  shippingReady={Boolean(shippingSettings)}
                  total={total}
                  lowMarginDeliveryTotal={lowMarginDeliveryTotal}
                />
              </div>

              {/* Place Order button */}
              {shippingSettingsError && (
                <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
                  {shippingSettingsError}
                </p>
              )}
              <button
                onClick={handlePlaceOrder}
                disabled={loading || shippingSettingsLoading || !shippingSettings}
                className="w-full bg-[#083028] text-white rounded-2xl py-4 font-bold text-base
                  hover:bg-[#083028]/90 active:scale-[0.99] transition-all
                  disabled:opacity-70 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 shadow-lg shadow-[#083028]/20"
              >
                {loading || shippingSettingsLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    {shippingSettingsLoading
                      ? 'Loading Shipping…'
                      : paymentMethod === 'online'
                        ? 'Starting Payment…'
                        : 'Placing Order…'}
                  </>
                ) : (
                  <>
                    {paymentMethod === 'online' ? <CreditCard size={20} /> : <ShoppingBag size={20} />}
                    {paymentMethod === 'online' ? 'Pay Now' : 'Place Order'} · ₹{total.toLocaleString('en-IN')}
                  </>
                )}
              </button>

              {/* Trust badges */}
              <div className="flex flex-wrap justify-center gap-4 text-xs text-[#083028]/50 pb-2">
                <span className="flex items-center gap-1"><BadgeCheck size={13} className="text-green-500" /> Secure Checkout</span>
                <span className="flex items-center gap-1"><Truck size={13} /> Fast Delivery</span>
                <span className="flex items-center gap-1"><CheckCircle2 size={13} /> Easy Returns</span>
              </div>
            </div>

            {/* ── Right: Order Summary (desktop) ─────────────────────────── */}
            <div className="hidden lg:block w-full lg:w-[360px] lg:sticky lg:top-24">
              <OrderSummary
                items={checkoutItems}
                subtotal={subtotal}
                discount={discount}
                shipping={shipping}
                shippingReady={Boolean(shippingSettings)}
                total={total}
                zoneResult={checkoutZoneResult}
                lowMarginDeliveryTotal={lowMarginDeliveryTotal}
              />

              {/* Free shipping notice - Completely Hidden / Destroyed when Zone is OFF */}
              {shipping > 0 && checkoutZoneResult.zone.isActive && checkoutZoneResult.amountNeededForFreeDelivery > 0 && (
                <div className="mt-3 bg-[#B8860B]/10 border border-[#B8860B]/30 rounded-xl px-4 py-3 text-xs text-[#083028]/70 flex items-start gap-2">
                  <Truck size={15} className="text-[#B8860B] mt-0.5 shrink-0" />
                  <span>
                    Add{' '}
                    <strong className="text-[#083028]">
                      ₹{checkoutZoneResult.amountNeededForFreeDelivery.toLocaleString('en-IN')}
                    </strong>{' '}
                    more to get <strong className="text-[#083028]">FREE shipping!</strong>
                  </span>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
