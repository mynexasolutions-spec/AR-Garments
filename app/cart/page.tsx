'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  Ticket,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  X,
  Lock,
  Heart,
  ChevronLeft,
  ChevronRight,
  Check,
  ShoppingCart,
  CreditCard,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useWishlist } from '@/context/WishlistContext';
import { Coupon, Product, defaultUnifiedProducts } from '@/lib/adminData';
import { useShippingSettings } from '@/context/ShippingSettingsContext';
import { calculateZoneDelivery, DEFAULT_ZONE_SETTINGS } from '@/lib/zoneShipping';

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalCount,
    subtotal,
    shipping,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    discountAmount,
    finalTotal,
    shippingSettings,
    shippingSettingsLoading,
    shippingSettingsError,
  } = useCart();

  const { isInWishlist, toggleWishlist } = useWishlist();

  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponError, setCouponError] = useState<string | null>(null);

  const { zoneSettings } = useShippingSettings();
  let cartUserPin = '';
  if (typeof window !== 'undefined') {
    try {
      const pinInfo = localStorage.getItem('ar_user_pincode_info');
      if (pinInfo) cartUserPin = JSON.parse(pinInfo).pincode || '';
    } catch {}
  }

  // Low-margin items get a fixed delivery charge; only standard items count towards free delivery threshold
  const lowMarginDeliveryTotal = items.reduce((sum, item) => {
    if (item.deliveryType === 'low_margin') {
      return sum + (item.deliveryChargeAmount ?? 0) * item.quantity;
    }
    return sum;
  }, 0);
  const standardSubtotal = items.reduce((sum, item) => {
    if (item.deliveryType !== 'low_margin') {
      const uPrice = item.effectivePrice ?? item.numericPrice;
      return sum + uPrice * item.quantity;
    }
    return sum;
  }, 0);
  const hasLowMarginItems = items.some((item) => item.deliveryType === 'low_margin');

  const cartActiveZone = calculateZoneDelivery(
    standardSubtotal, // use only standard items for threshold check
    cartUserPin,
    zoneSettings && zoneSettings.length > 0 ? zoneSettings : DEFAULT_ZONE_SETTINGS
  );
  const [couponLoading, setCouponLoading] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [showCouponsList, setShowCouponsList] = useState(false);

  // Recommendations / Catalog state
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogPage, setCatalogPage] = useState(1);
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('All');
  const [addedCatalogMap, setAddedCatalogMap] = useState<Record<string, boolean>>({});

  const pageSize = 4; // 4 items per page for clean desktop & mobile row layout

  // Fetch available coupons
  useEffect(() => {
    fetch('/api/coupons?active=true')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setAvailableCoupons(data);
        }
      })
      .catch(() => setAvailableCoupons([]));
  }, []);

  // Fetch catalog products
  useEffect(() => {
    setCatalogLoading(true);
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: Product[] = data.map((d: Record<string, unknown>) => ({
            id: (d.id as string) || `prod-${Math.random()}`,
            name: (d.name as string) || 'Ethnic Wear',
            price: (d.price as string) || '₹999',
            numericPrice:
              (d.numeric_price as number) ||
              parseInt(String(d.price || '').replace(/[^\d]/g, '') || '999', 10),
            category: (d.category as string) || 'Sarees',
            image: (d.image as string) || '/home-images/Embroidered Saree.jpg',
            active: d.active !== false,
            isNewArrival: Boolean(d.is_new_arrival),
            isBestSeller: Boolean(d.is_best_seller),
            order: (d.sort_order as number) || 0,
          }));
          const actives = mapped.filter((p) => p.active);
          setCatalogProducts(actives.length > 0 ? actives : defaultUnifiedProducts);
        } else {
          setCatalogProducts(defaultUnifiedProducts);
        }
      })
      .catch(() => {
        setCatalogProducts(defaultUnifiedProducts);
      })
      .finally(() => {
        setCatalogLoading(false);
      });
  }, []);

  // Filter catalog products by category
  const filteredCatalog = useMemo(() => {
    if (selectedCatalogCategory === 'All') {
      return catalogProducts;
    }
    return catalogProducts.filter(
      (p) => p.category?.toLowerCase() === selectedCatalogCategory.toLowerCase()
    );
  }, [catalogProducts, selectedCatalogCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / pageSize));

  // Current page slice
  const paginatedCatalog = useMemo(() => {
    const startIndex = (catalogPage - 1) * pageSize;
    return filteredCatalog.slice(startIndex, startIndex + pageSize);
  }, [filteredCatalog, catalogPage, pageSize]);

  // Extract unique categories for quick tabs
  const catalogCategories = useMemo(() => {
    const cats = new Set<string>();
    catalogProducts.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return ['All', ...Array.from(cats)];
  }, [catalogProducts]);

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCodeInput).trim().toUpperCase();
    if (!code) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    setCouponLoading(true);
    setCouponError(null);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          orderValue: subtotal,
          category: 'All',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.message || 'Invalid or expired coupon code.');
      } else {
        applyCoupon(data.coupon);
        setCouponCodeInput('');
        setCouponError(null);
        setShowCouponsList(false);
      }
    } catch {
      setCouponError('Failed to validate coupon. Please try again.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      router.push('/login?redirect=/checkout');
      return;
    }
    router.push('/checkout');
  };

  const handleAddCatalogItem = (product: Product) => {
    const numericPrice =
      product.numericPrice || parseInt(product.price.replace(/[^\d]/g, '') || '0', 10);
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        numericPrice,
        image: product.image,
        category: product.category,
      },
      1
    );

    setAddedCatalogMap((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedCatalogMap((prev) => ({ ...prev, [product.id]: false }));
    }, 1800);
  };

  const handleBuyNowCatalogItem = (product: Product) => {
    const numericPrice =
      product.numericPrice || parseInt(product.price.replace(/[^\d]/g, '') || '0', 10);
    addToCart(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        numericPrice,
        image: product.image,
        category: product.category,
      },
      1
    );
    // Smooth scroll to top / order summary or checkout
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3] flex flex-col justify-between">
      <Header />

      <main className="flex-1 container mx-auto px-3 sm:px-6 lg:px-12 py-6 sm:py-10">
        {/* Breadcrumb & Title */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-[#083028] transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Shopping Bag</span>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span>Shopping Bag</span>
              <span className="text-xs sm:text-sm font-semibold bg-[#083028] text-white px-2.5 py-0.5 rounded-full">
                {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </span>
            </h1>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-700 hover:underline font-semibold flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span>Clear Bag</span>
              </button>
            )}
          </div>
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-14 text-center max-w-lg mx-auto shadow-sm border border-gray-100 my-6">
            <div className="w-20 h-20 bg-[#F5F1E8] text-[#083028] rounded-full flex items-center justify-center mx-auto mb-5 shadow-xs">
              <ShoppingBag size={36} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Your Shopping Bag is Empty
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-6 leading-relaxed">
              Looks like you haven&apos;t added any beautiful ethnic wear to your bag yet. Browse
              our new catalog below and add your favorite items in one click!
            </p>
            <Link
              href="/category"
              className="inline-flex items-center gap-2 bg-[#083028] hover:bg-[#051e19] text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <span>Explore All Collections</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          /* Main 2-Column Responsive Layout */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
            {/* LEFT: Items List (8 cols on desktop) */}
            <div className="lg:col-span-8 space-y-3 sm:space-y-4">
              {/* Desktop Table Header */}
              <div className="hidden md:grid grid-cols-12 gap-4 bg-white px-5 py-3 rounded-xl text-xs font-bold text-gray-500 uppercase tracking-wider border border-gray-200/80 shadow-xs">
                <span className="col-span-6">Product Details</span>
                <span className="col-span-2 text-center">Price</span>
                <span className="col-span-2 text-center">Quantity</span>
                <span className="col-span-2 text-right">Subtotal</span>
              </div>

              {/* Items Card List */}
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-5 border border-gray-200/80 shadow-xs hover:shadow-sm transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    {/* Image & Title */}
                    <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      <Link
                        href={`/product/${item.id}`}
                        className="relative w-20 h-24 sm:w-24 sm:h-28 rounded-lg sm:rounded-xl overflow-hidden bg-gray-100 flex-shrink-0"
                      >
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover object-top hover:scale-105 transition-transform"
                        />
                      </Link>

                      <div className="flex-1 min-w-0">
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                          {item.category || 'Ethnic Wear'}
                        </span>
                        <Link
                          href={`/product/${item.id}`}
                          className="text-xs sm:text-base font-bold text-gray-900 hover:text-[#083028] transition-colors line-clamp-2 leading-snug"
                        >
                          {item.name}
                        </Link>
                        {/* Mobile Price & Zone markup */}
                        <div className="mt-1 sm:hidden">
                          {item.zonePrice?.hasRule && item.effectivePrice !== (item.originalNumericPrice || item.numericPrice) ? (
                            <div className="flex items-baseline gap-1 flex-wrap">
                              <span className="text-xs sm:text-sm font-black text-[#083028]">
                                ₹{(item.effectivePrice || item.numericPrice).toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] text-gray-400 line-through">
                                ₹{(item.originalNumericPrice || item.numericPrice).toLocaleString('en-IN')}
                              </span>
                              <span className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1 rounded ${
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
                            </div>
                          ) : (
                            <p className="text-xs sm:text-sm font-bold text-[#083028]">
                              {item.price}
                            </p>
                          )}
                        </div>
                        {/* Delivery type badge for low-margin items */}
                        {item.deliveryType === 'low_margin' && (
                          <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-bold text-orange-700 bg-orange-50 border border-orange-200/70 px-1.5 py-0.5 rounded">
                            📦 + ₹{item.deliveryChargeAmount ?? 0} Delivery
                          </span>
                        )}

                        {/* Mobile Stepper & Remove */}
                        <div className="flex items-center justify-between mt-3 sm:hidden pt-2 border-t border-gray-100">
                          {/* Stepper */}
                          <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-lg transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-8 text-center text-xs font-bold text-gray-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-lg transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          {/* Line total & remove */}
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-extrabold text-gray-900">
                              ₹{(((item.effectivePrice ?? item.numericPrice) * item.quantity)).toLocaleString('en-IN')}
                            </span>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                              aria-label="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tablet & Desktop View Columns */}
                    <div className="hidden sm:flex sm:items-center sm:justify-between gap-6 sm:w-1/2">
                      {/* Unit Price with Zone Markup */}
                      <div className="text-center w-28">
                        {item.zonePrice?.hasRule && item.effectivePrice !== (item.originalNumericPrice || item.numericPrice) ? (
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-[#083028]">
                              ₹{(item.effectivePrice || item.numericPrice).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] text-gray-400 line-through">
                              ₹{(item.originalNumericPrice || item.numericPrice).toLocaleString('en-IN')}
                            </span>
                            <span className={`inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded mt-0.5 ${
                              (item.zonePrice.discountPercent ?? 0) > 0
                                ? 'bg-blue-100 text-blue-700'
                                : item.zonePrice.markupDirection === 'increase'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {(item.zonePrice.discountPercent ?? 0) > 0
                                ? `${item.zonePrice.discountPercent}% OFF`
                                : item.zonePrice.markupDirection === 'increase'
                                ? `+${item.zonePrice.markupPercent}%`
                                : `-${item.zonePrice.markupPercent}%`}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm font-semibold text-gray-700">
                            {item.price}
                          </span>
                        )}
                      </div>

                      {/* Desktop Stepper */}
                      <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 shadow-2xs">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-l-lg transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-9 text-center text-sm font-bold text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded-r-lg transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      {/* Line Subtotal */}
                      <div className="text-right w-24">
                        <span className="text-base font-extrabold text-gray-900">
                          ₹{(((item.effectivePrice ?? item.numericPrice) * item.quantity)).toLocaleString('en-IN')}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="Remove from bag"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Continue Shopping Link */}
              <div className="pt-2">
                <Link
                  href="/category"
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#083028] hover:underline"
                >
                  <ArrowLeft size={14} />
                  <span>Continue Shopping</span>
                </Link>
              </div>
            </div>

            {/* RIGHT: Order Summary & Coupon (4 cols on desktop) */}
            <div className="lg:col-span-4 space-y-4 sm:space-y-5 lg:sticky lg:top-24">
              {/* Order Summary Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-sm">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 pb-3 border-b border-gray-100 flex items-center justify-between">
                  <span>Order Summary</span>
                  <ShieldCheck size={18} className="text-[#083028]" />
                </h2>

                {/* Subtotals breakdown */}
                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Bag Subtotal ({totalCount} items)</span>
                    <span className="font-semibold text-gray-900">₹{subtotal.toLocaleString()}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg font-medium">
                      <span className="flex items-center gap-1">
                        <Sparkles size={14} />
                        Coupon ({appliedCoupon?.code})
                      </span>
                      <span className="font-bold">-₹{discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <Truck size={14} />
                      Delivery charge
                    </span>
                    <span>
                      {shippingSettingsLoading ? (
                        <span className="text-xs font-semibold text-gray-400">Loading...</span>
                      ) : !shippingSettings ? (
                        <span className="text-xs font-semibold text-red-600">Unavailable</span>
                      ) : shipping === 0 ? (
                        <span className="text-emerald-700 font-bold uppercase text-[11px] bg-emerald-50 px-2 py-0.5 rounded">
                          FREE
                        </span>
                      ) : (
                        `₹${shipping}`
                      )}
                    </span>
                  </div>

                  {/* Low-margin delivery charges row */}
                  {lowMarginDeliveryTotal > 0 && (
                    <div className="flex justify-between text-orange-700 bg-orange-50/60 px-2.5 py-1.5 rounded-lg text-xs">
                      <span className="flex items-center gap-1">📦 Wholesale Item Delivery</span>
                      <span className="font-bold">₹{lowMarginDeliveryTotal.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Free Delivery Threshold Box - Destroyed / Hidden when Zone is OFF */}
                  {cartActiveZone.zone.isActive &&
                    cartActiveZone.amountNeededForFreeDelivery > 0 &&
                    shipping > 0 && (
                    <p className="text-[11px] bg-amber-50 text-amber-800 p-2 rounded-lg leading-tight">
                      Add ₹{cartActiveZone.amountNeededForFreeDelivery.toLocaleString('en-IN')} more to qualify for{' '}
                      <strong>FREE Delivery</strong>!
                      {hasLowMarginItems && (
                        <span className="block mt-0.5 text-orange-600">⚠️ Wholesale items are excluded from this threshold.</span>
                      )}
                    </p>
                  )}

                  {/* Divider */}
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-baseline">
                      <div>
                        <span className="text-sm sm:text-base font-extrabold text-gray-900">
                          Final payable amount
                        </span>
                        <p className="text-[10px] text-gray-400">Includes all applicable taxes</p>
                      </div>
                      <span className="text-lg sm:text-2xl font-black text-[#083028]">
                        ₹{finalTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Coupon Input Box */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  {appliedCoupon ? (
                    <div className="bg-[#FAF8F3] border border-[#083028]/20 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#083028] text-white flex items-center justify-center">
                          <Ticket size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">
                            {appliedCoupon.code} Applied!
                          </p>
                          <p className="text-[10px] text-emerald-700 font-medium">
                            {appliedCoupon.discountType === 'percentage'
                              ? `${appliedCoupon.discountValue}% OFF`
                              : `Flat ₹${appliedCoupon.discountValue} OFF`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={removeCoupon}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="Remove coupon"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Ticket size={13} className="text-[#083028]" />
                        Apply Coupon Code
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponCodeInput}
                          onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                          placeholder="e.g. WELCOME10"
                          className="flex-1 min-w-0 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-semibold uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:ring-1 focus:ring-[#083028]"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCoupon()}
                          disabled={couponLoading || !couponCodeInput}
                          className="px-3.5 py-2 bg-[#083028] hover:bg-[#051e19] text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          {couponLoading ? '...' : 'Apply'}
                        </button>
                      </div>

                      {couponError && (
                        <p className="text-[11px] text-red-600 mt-1.5 font-medium">
                          {couponError}
                        </p>
                      )}

                      {/* View Available Coupons Toggle */}
                      {availableCoupons.length > 0 && (
                        <div className="mt-2.5">
                          <button
                            type="button"
                            onClick={() => setShowCouponsList(!showCouponsList)}
                            className="text-[11px] text-[#083028] font-bold hover:underline flex items-center gap-1"
                          >
                            <span>🏷️ View available offers ({availableCoupons.length})</span>
                          </button>

                          {showCouponsList && (
                            <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                              {availableCoupons.map((coupon) => (
                                <div
                                  key={coupon.id}
                                  className="border border-dashed border-[#083028]/30 rounded-lg p-2 bg-[#FAF8F3] flex items-center justify-between text-xs"
                                >
                                  <div>
                                    <span className="font-mono font-bold text-[#083028] text-xs">
                                      {coupon.code}
                                    </span>
                                    <p className="text-[10px] text-gray-500 line-clamp-1">
                                      {coupon.title}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleApplyCoupon(coupon.code)}
                                    className="text-[10px] bg-[#083028] text-white font-bold px-2 py-1 rounded hover:bg-[#051e19]"
                                  >
                                    Apply
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Checkout CTA Button */}
                {shippingSettingsError && (
                  <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                    {shippingSettingsError}
                  </p>
                )}
                <button
                  onClick={handleCheckout}
                  disabled={shippingSettingsLoading || !shippingSettings}
                  className="w-full mt-5 bg-[#083028] hover:bg-[#051e19] text-white py-3.5 rounded-xl font-bold text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Lock size={15} />
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={16} />
                </button>

                {/* Trust Badges */}
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-2 text-center text-[10px] text-gray-500">
                  <div className="flex flex-col items-center">
                    <Truck size={14} className="text-[#083028] mb-0.5" />
                    <span>
                      {cartActiveZone.zone.isActive
                        ? `Free over ₹${cartActiveZone.zone.freeDeliveryThreshold.toLocaleString('en-IN')}`
                        : `Shipping ₹${cartActiveZone.zone.standardDeliveryFee.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <RotateCcw size={14} className="text-[#083028] mb-0.5" />
                    <span>7 Days Return</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <ShieldCheck size={14} className="text-[#083028] mb-0.5" />
                    <span>100% Secure</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────── */}
        {/* NEW CATALOG PRODUCTS RECOMMENDATION SECTION WITH PAGINATION   */}
        {/* User can discover items, buy again, and add directly to cart  */}
        {/* ───────────────────────────────────────────────────────────── */}
        <section className="mt-12 sm:mt-16 pt-8 border-t border-gray-200/90">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#083028] bg-[#083028]/10 px-2.5 py-1 rounded-full mb-1.5">
                <Sparkles size={12} />
                <span>New Catalog Recommendations</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black text-gray-900 tracking-tight">
                Add More To Your Shopping Bag
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Handpicked popular pieces to pair with your order. Click &apos;Add to Bag&apos; to instantly include in your cart.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {catalogCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCatalogCategory(cat);
                    setCatalogPage(1);
                  }}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${
                    selectedCatalogCategory === cat
                      ? 'bg-[#083028] text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          {catalogLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse space-y-3"
                >
                  <div className="aspect-[3/4] bg-gray-200 rounded-xl w-full" />
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-9 bg-gray-200 rounded-xl w-full" />
                </div>
              ))}
            </div>
          ) : paginatedCatalog.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-500 border border-gray-200">
              <p className="text-sm">No products found in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {paginatedCatalog.map((prod) => {
                const wishlisted = isInWishlist(prod.id);
                const isAdded = Boolean(addedCatalogMap[prod.id]);

                return (
                  <div
                    key={prod.id}
                    className="group bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                  >
                    {/* Image Area */}
                    <div className="relative aspect-[3/4] bg-[#EDE8DF] overflow-hidden">
                      <Link href={`/product/${prod.id}`} className="block w-full h-full">
                        <Image
                          src={prod.image}
                          alt={prod.name}
                          fill
                          className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                      </Link>

                      {/* Wishlist Heart Toggle */}
                      <button
                        onClick={() =>
                          toggleWishlist({
                            id: prod.id,
                            name: prod.name,
                            price: prod.price,
                            numericPrice: prod.numericPrice,
                            image: prod.image,
                            category: prod.category,
                          })
                        }
                        className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full shadow-sm flex items-center justify-center transition-colors ${
                          wishlisted
                            ? 'bg-rose-600 text-white'
                            : 'bg-white/90 hover:bg-white text-gray-600 hover:text-rose-600'
                        }`}
                        title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        aria-label="Wishlist toggle"
                      >
                        <Heart
                          size={15}
                          className={wishlisted ? 'fill-white text-white' : ''}
                        />
                      </button>

                      {/* Tag Badge */}
                      {prod.isNewArrival ? (
                        <span className="absolute top-2.5 left-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-[#083028] text-white px-2 py-0.5 rounded shadow-xs">
                          New
                        </span>
                      ) : prod.isBestSeller ? (
                        <span className="absolute top-2.5 left-2.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white px-2 py-0.5 rounded shadow-xs">
                          Best Seller
                        </span>
                      ) : null}

                      {/* Category Label */}
                      {prod.category && (
                        <span className="absolute bottom-2.5 left-2.5 text-[10px] font-semibold text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded">
                          {prod.category}
                        </span>
                      )}
                    </div>

                    {/* Card Content & Action Buttons */}
                    <div className="p-3 sm:p-4 flex flex-col justify-between flex-1">
                      <div>
                        <Link
                          href={`/product/${prod.id}`}
                          className="font-bold text-xs sm:text-sm text-gray-900 line-clamp-2 hover:text-[#083028] transition-colors leading-snug"
                        >
                          {prod.name}
                        </Link>
                        <div className="mt-1 flex items-baseline gap-2">
                          <span className="text-sm sm:text-base font-extrabold text-[#083028]">
                            {prod.price}
                          </span>
                        </div>
                      </div>

                      {/* Two Action Buttons: Add to Bag + Buy Now */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-1.5">
                        <button
                          onClick={() => handleAddCatalogItem(prod)}
                          className={`w-full py-2 px-2.5 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 ${
                            isAdded
                              ? 'bg-[#083028] text-white'
                              : 'bg-[#F5F1E8] hover:bg-[#083028] text-gray-800 hover:text-white border border-gray-200 hover:border-[#083028]'
                          }`}
                        >
                          {isAdded ? (
                            <>
                              <Check size={14} />
                              <span>Added to Bag!</span>
                            </>
                          ) : (
                            <>
                              <ShoppingCart size={13} strokeWidth={2} />
                              <span>Add to Bag</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleBuyNowCatalogItem(prod)}
                          className="w-full bg-[#083028] hover:bg-[#051e19] text-white py-1.5 sm:py-2 px-2.5 rounded-xl font-bold text-[11px] sm:text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <CreditCard size={13} />
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center">
              {/* Prev / Page numbers / Next */}
              <div className="flex items-center gap-1.5 bg-white p-2 sm:p-2.5 rounded-2xl border border-gray-200/80 shadow-xs">
                <button
                  onClick={() => setCatalogPage((prev) => Math.max(1, prev - 1))}
                  disabled={catalogPage === 1}
                  className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700"
                  aria-label="Previous Page"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                    <button
                      key={pg}
                      onClick={() => setCatalogPage(pg)}
                      className={`min-w-[34px] h-8 text-xs font-bold rounded-xl transition-colors ${
                        catalogPage === pg
                          ? 'bg-[#083028] text-white shadow-xs'
                          : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      {pg}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCatalogPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={catalogPage === totalPages}
                  className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-700"
                  aria-label="Next Page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
