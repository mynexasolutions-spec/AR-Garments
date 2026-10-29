'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShoppingCart, Share2, ShieldCheck, Truck, RotateCcw,
  CheckCircle2, ChevronRight, ArrowLeft, Loader2, Sparkles,
  Minus, Plus, CreditCard, Tag, Ticket, Check, AlertCircle, Percent, RefreshCw, Star, User, Heart,
  PackageCheck, BadgeCheck, Package, Info
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useWishlist } from '@/context/WishlistContext';
import { useShippingSettings } from '@/context/ShippingSettingsContext';
import { useZonePriceRules } from '@/context/ZonePriceRulesContext';
import { calculateZoneDelivery, DEFAULT_ZONE_SETTINGS, DetectedZoneResult } from '@/lib/zoneShipping';
import { MapPin, Navigation, TrendingUp, TrendingDown } from 'lucide-react';

interface ProductData {
  id: string;
  name: string;
  price: string;
  numericPrice?: number;
  category: string;
  categoryId?: string;
  subcategoryId?: string;
  subcategoryName?: string;
  image: string;
  images?: string[];
  description?: string;
  specification?: string;
  shippingCare?: string;
  stock?: number;
  active: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  youtubeUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  deliveryType?: 'standard' | 'low_margin';
  deliveryChargeAmount?: number;
}

interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  title?: string;
  comment: string;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;
  const { addToCart } = useCart();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { settings: shippingSettings, zoneSettings } = useShippingSettings();
  const { getZonePrice } = useZonePriceRules();
  const [deliveryPincode, setDeliveryPincode] = useState<string>('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [detectedLocationName, setDetectedLocationName] = useState('');

  const [product, setProduct] = useState<ProductData | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductData[]>([]);
  const [productRefreshVersion, setProductRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isZoomActive, setIsZoomActive] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const touchStartPosition = useRef<{ x: number; y: number } | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'shipping' | 'reviews'>('description');
  const [copiedShare, setCopiedShare] = useState(false);

  // Automatically initialize pincode with top priority on live location so refresh does not overwrite
  useEffect(() => {
    try {
      const pinInfo = localStorage.getItem('ar_user_pincode_info');
      if (pinInfo) {
        const parsed = JSON.parse(pinInfo);
        if (parsed.pincode || parsed.city) {
          setDeliveryPincode(parsed.pincode || '');
          setDetectedLocationName(parsed.city || ('Pin ' + parsed.pincode));
          return;
        }
      }
    } catch {}

    if (user?.pincode) {
      setDeliveryPincode(user.pincode);
      setDetectedLocationName(user.city || 'Your Account');
      return;
    }

    try {
      const saved = localStorage.getItem('ar_user_address');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.pincode) {
          setDeliveryPincode(parsed.pincode);
          setDetectedLocationName(parsed.city || 'Saved Address');
        }
      }
    } catch {}
  }, [user]);

  // Listen for live location updates from Header navigation or Pincode modal
  useEffect(() => {
    const handleLocationChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ pincode?: string; city?: string }>;
      if (customEvent.detail?.pincode) {
        setDeliveryPincode(customEvent.detail.pincode);
      }
      if (customEvent.detail?.city) {
        setDetectedLocationName(customEvent.detail.city);
      }
    };
    window.addEventListener('ar_location_changed', handleLocationChange);
    return () => window.removeEventListener('ar_location_changed', handleLocationChange);
  }, []);

  const handleDetectLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.warning('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + pos.coords.latitude + '&lon=' + pos.coords.longitude);
          const data = await res.json();
          const pin = data?.address?.postcode;
          const city = data?.address?.city || data?.address?.state_district || data?.address?.state || '';
          if (pin) {
            const cleanPin = String(pin).replace(/\D/g, '').slice(0, 6);
            setDeliveryPincode(cleanPin);
            setDetectedLocationName(city || 'Live Location');
            toast.success('Location detected: ' + (city || cleanPin));
          } else {
            toast.info('Could not pinpoint pincode. Please enter your 6-digit pincode.');
          }
        } catch {
          toast.info('Could not resolve location. Please enter pincode manually.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        setIsDetectingLocation(false);
        toast.info('Location access denied. Please enter pincode manually.');
      }
    );
  };

  const effectivePrice = (product?.numericPrice || 0) * (quantity || 1);
  const currentZoneResult = calculateZoneDelivery(
    effectivePrice,
    deliveryPincode,
    zoneSettings && zoneSettings.length > 0 ? zoneSettings : DEFAULT_ZONE_SETTINGS
  );

  // Reviews states
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsSummary, setReviewsSummary] = useState<{
    average: number;
    total: number;
    breakdown: Record<number, number>;
  }>({
    average: 0,
    total: 0,
    breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewTitleInput, setReviewTitleInput] = useState('');
  const [reviewCommentInput, setReviewCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [reviewError, setReviewError] = useState('');

  // Coupon & Discount states
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    applicableCategory: string;
    discountAmount: number;
    isFreeShipping?: boolean;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [availableOffers, setAvailableOffers] = useState<any[]>([]);

  useEffect(() => {
    if (!productId) return;
    if (productRefreshVersion === 0) setLoading(true);
    setError('');

    // Fetch product details strictly from DB — no-store to always get latest after admin updates
    fetch(`/api/products/${encodeURIComponent(productId)}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Product not found in database');
        return res.json();
      })
      .then((data: Record<string, unknown>) => {
        const databaseImages = Array.isArray(data.images)
          ? (data.images as string[]).filter(Boolean)
          : [];
        const primaryImage = (data.image as string) || databaseImages[0] || '';
        const orderedImages = [
          primaryImage,
          ...databaseImages.filter((image) => image !== primaryImage),
        ].filter(Boolean);

        const mapped: ProductData = {
          id: data.id as string,
          name: data.name as string,
          price: data.price as string,
          numericPrice: data.numeric_price as number,
          category: (data.category as string) || 'Ethnic Wear',
          categoryId: (data.category_id as string) || undefined,
          subcategoryId: (data.subcategory_id as string) || undefined,
          image: primaryImage,
          images: orderedImages,
          description: (data.description as string) || '',
          specification: (data.specification as string) || '',
          shippingCare: (data.shipping_care as string) || (data.shippingCare as string) || '',
          stock: typeof data.stock === 'number' ? (data.stock as number) : 0,
          active: (data.active as boolean) ?? true,
          isNewArrival: (data.is_new_arrival as boolean) ?? false,
          isBestSeller: (data.is_best_seller as boolean) ?? false,
          youtubeUrl: (data.youtube_url as string) || (data.youtubeUrl as string) || '',
          facebookUrl: (data.facebook_url as string) || (data.facebookUrl as string) || '',
          instagramUrl: (data.instagram_url as string) || (data.instagramUrl as string) || '',
          deliveryType: (data.delivery_type === 'low_margin' ? 'low_margin' : 'standard') as 'standard' | 'low_margin',
          deliveryChargeAmount: Number(data.delivery_charge_amount ?? 0),
        };

        setProduct(mapped);
        setSelectedImage(mapped.image || mapped.images?.[0] || '');

        if (mapped.subcategoryId) {
          fetch('/api/categories?active=true', { cache: 'no-store' })
            .then((response) => (response.ok ? response.json() : []))
            .then((categories: { id: string; name: string }[]) => {
              const subcategory = categories.find((category) => category.id === mapped.subcategoryId);
              if (subcategory) {
                setProduct((current) => current ? { ...current, subcategoryName: subcategory.name } : current);
              }
            })
            .catch(() => {});
        }

        // Fetch coupons applicable to this product category & storewide
        fetch('/api/coupons?active=true', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : []))
          .then((list) => {
            if (Array.isArray(list)) {
              const cat = mapped.category.toLowerCase();
              const applicable = list.filter((c: Record<string, unknown>) => {
                const cCat = String(c.applicableCategory || '').toLowerCase();
                return cCat === 'all' || cCat === cat;
              });
              // Sort category-specific to the top
              applicable.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
                if (a.applicableCategory !== 'All' && b.applicableCategory === 'All') return -1;
                if (b.applicableCategory !== 'All' && a.applicableCategory === 'All') return 1;
                return 0;
              });
              setAvailableOffers(applicable);
            }
          })
          .catch(() => {});

        // Fetch related products from DB from same category — no-store
        fetch('/api/products', { cache: 'no-store' })
          .then((r) => (r.ok ? r.json() : []))
          .then((all: Record<string, unknown>[]) => {
            const related = all
              .filter((p) => (
                p.id !== mapped.id
                && p.active !== false
                && (mapped.subcategoryId
                  ? p.subcategory_id === mapped.subcategoryId
                  : p.category === mapped.category)
              ))
              .slice(0, 4)
              .map((p) => ({
                id: p.id as string,
                name: p.name as string,
                price: p.price as string,
                numericPrice: p.numeric_price as number,
                category: p.category as string,
                image: p.image as string,
                active: p.active as boolean,
              }));
            setRelatedProducts(related);
          })
          .catch(() => {});
      })
      .catch((err) => {
        setError(err.message || 'Product could not be loaded from database.');
      })
      .finally(() => setLoading(false));
  }, [productId, productRefreshVersion]);

  useEffect(() => {
    setLoading(true);
  }, [productId]);

  useEffect(() => {
    const refreshProduct = () => {
      if (document.visibilityState === 'visible') {
        setProductRefreshVersion((version) => version + 1);
      }
    };

    window.addEventListener('focus', refreshProduct);
    window.addEventListener('pageshow', refreshProduct);
    document.addEventListener('visibilitychange', refreshProduct);

    return () => {
      window.removeEventListener('focus', refreshProduct);
      window.removeEventListener('pageshow', refreshProduct);
      document.removeEventListener('visibilitychange', refreshProduct);
    };
  }, []);

  // ─── Fetch Product Reviews ────────────────────────────────────────────────
  const fetchReviews = () => {
    if (!productId) return;
    setReviewsLoading(true);
    fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.reviews)) {
          setReviews(data.reviews);
          if (data.summary) setReviewsSummary(data.summary);
        }
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!reviewCommentInput.trim()) {
      setReviewError('Please write your review feedback.');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');
    setReviewSuccess('');

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          rating: ratingInput,
          title: reviewTitleInput.trim(),
          comment: reviewCommentInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit review');
      }

      setReviewSuccess('Thank you! Your review has been submitted.');
      setReviewTitleInput('');
      setReviewCommentInput('');
      setRatingInput(5);
      fetchReviews();
      toast.success('Thank you! Your review has been submitted.', { title: 'Product Review' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting review';
      setReviewError(msg);
      toast.error(msg, { title: 'Review Error' });
    } finally {
      setSubmittingReview(false);
    }
  };

  // ── Zone Price Markup & Pricing Calculations ──────────────────────────────
  const rawUnitPrice = product
    ? (product.numericPrice || parseInt(product.price.replace(/[^\d]/g, '') || '0', 10))
    : 0;
  const zonePrice = getZonePrice(
    rawUnitPrice,
    {
      categoryId: product?.categoryId,
      categoryName: product?.category,
      category: product?.category,
      subcategoryId: product?.subcategoryId,
      subcategoryName: product?.subcategoryName,
    },
    product?.subcategoryId || null,
    { pincode: deliveryPincode, city: detectedLocationName }
  );
  const hasZoneMarkup = Boolean(product) && zonePrice.hasRule && zonePrice.displayPrice !== rawUnitPrice;
  const effectiveUnitPrice = hasZoneMarkup ? zonePrice.displayPrice : rawUnitPrice;
  const quantityTotal = effectiveUnitPrice * quantity;
  const discountedTotal = appliedCoupon
    ? Math.max(0, quantityTotal - appliedCoupon.discountAmount)
    : quantityTotal;

  // Handle Apply Coupon with category validation
  const handleApplyCoupon = async (codeToUse?: string) => {
    if (!product) return;
    const targetCode = (codeToUse || couponInput).trim();
    if (!targetCode) {
      setCouponError('Please enter a coupon code.');
      toast.error('Please enter a coupon code.', { title: 'Coupon' });
      return;
    }

    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');

    const orderTotal = quantityTotal;

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: targetCode,
          category: product.category,
          orderAmount: orderTotal,
        }),
      });

      const result = await res.json();

      if (result.valid) {
        setAppliedCoupon({
          code: result.coupon.code,
          discountType: result.coupon.discountType,
          discountValue: result.coupon.discountValue,
          applicableCategory: result.coupon.applicableCategory,
          discountAmount: result.discountAmount,
          isFreeShipping: result.isFreeShipping,
        });
        setCouponSuccess(result.message);
        setCouponInput(result.coupon.code);
        setCouponError('');
        toast.success(result.message || `Coupon "${result.coupon.code}" applied!`, { title: 'Coupon Applied' });
      } else {
        const msg = result.message || 'Coupon could not be applied.';
        setCouponError(msg);
        setCouponSuccess('');
        toast.error(msg, { title: 'Invalid Coupon' });
      }
    } catch {
      setCouponError('Failed to validate coupon. Please try again.');
      toast.error('Failed to validate coupon. Please try again.', { title: 'Coupon Error' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponSuccess('');
    setCouponError('');
    setCouponInput('');
    toast.info('Coupon has been removed', { title: 'Coupon' });
  };

  const handleRefreshCoupons = async () => {
    if (!product) return;
    try {
      const res = await fetch('/api/coupons?active=true', { cache: 'no-store' });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          const cat = product.category.toLowerCase();
          const applicable = list.filter((c: Record<string, unknown>) => {
            const cCat = String(c.applicableCategory || '').toLowerCase();
            return cCat === 'all' || cCat === cat;
          });
          applicable.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
            if (a.applicableCategory !== 'All' && b.applicableCategory === 'All') return -1;
            if (b.applicableCategory !== 'All' && a.applicableCategory === 'All') return 1;
            return 0;
          });
          setAvailableOffers(applicable);
        }
      }
    } catch {}
  };

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: hasZoneMarkup ? `₹${effectiveUnitPrice.toLocaleString('en-IN')}` : product.price,
      numericPrice: effectiveUnitPrice,
      originalNumericPrice: rawUnitPrice,
      image: product.image,
      category: product.category,
      categoryId: product.categoryId,
      subcategoryId: product.subcategoryId,
      subcategoryName: product.subcategoryName,
      deliveryType: product.deliveryType,
      deliveryChargeAmount: product.deliveryChargeAmount,
    }, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 size={40} className="animate-spin text-[#083028]" />
          <p className="text-gray-600 font-medium text-sm">Loading product details from database...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex flex-col">
        <Header />
        <div className="flex-1 max-w-xl mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
            !
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
          <p className="text-gray-600 text-sm mb-6">
            The requested product (ID: <span className="font-mono">{productId}</span>) was not found in the database.
          </p>
          <Link
            href="/category"
            className="inline-flex items-center gap-2 bg-[#083028] text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-[#051e19] transition-colors"
          >
            <ArrowLeft size={16} /> Browse All Collections
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const galleryImages = [
    product.image,
    ...(product.images || []).filter((image) => image !== product.image),
  ].filter(Boolean);
  const selectedImageIndex = Math.max(0, galleryImages.indexOf(selectedImage));

  const selectGalleryImage = (index: number) => {
    const image = galleryImages[index];
    if (!image) return;
    setIsZoomActive(false);
    setSelectedImage(image);
  };

  const handleGalleryPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setZoomPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  const handleGalleryPointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || window.innerWidth < 1024) return;
    handleGalleryPointerMove(event);
    setIsZoomActive(true);
  };

  const handleGalleryTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartPosition.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleGalleryTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartPosition.current;
    const touch = event.changedTouches[0];
    touchStartPosition.current = null;
    if (!start || !touch || galleryImages.length < 2) return;

    const horizontalDistance = touch.clientX - start.x;
    const verticalDistance = touch.clientY - start.y;
    const isHorizontalSwipe = Math.abs(horizontalDistance) > 45
      && Math.abs(horizontalDistance) > Math.abs(verticalDistance);
    if (!isHorizontalSwipe) return;

    const nextIndex = horizontalDistance < 0
      ? Math.min(galleryImages.length - 1, selectedImageIndex + 1)
      : Math.max(0, selectedImageIndex - 1);
    selectGalleryImage(nextIndex);
  };

  return (
    <div className="min-h-screen bg-[#FAF8F3]">
      <Header />

      {/* Breadcrumb Navigation */}
      <div className="border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="container mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            <Link href="/" className="hover:text-[#083028] transition-colors">Home</Link>
            <ChevronRight size={13} className="text-gray-400" />
            <Link href="/category" className="hover:text-[#083028] transition-colors">Collections</Link>
            <ChevronRight size={13} className="text-gray-400" />
            <Link href={`/category?category=${encodeURIComponent(product.category)}`} className="hover:text-[#083028] transition-colors">
              {product.category}
            </Link>
            {product.subcategoryName && (
              <>
                <ChevronRight size={13} className="text-gray-400" />
                <Link
                  href={`/category?category=${encodeURIComponent(product.category)}&subcategory=${encodeURIComponent(product.subcategoryName)}`}
                  className="hover:text-[#083028] transition-colors"
                >
                  {product.subcategoryName}
                </Link>
              </>
            )}
            <ChevronRight size={13} className="text-gray-400" />
            <span className="w-full truncate font-semibold text-gray-900 sm:w-auto sm:max-w-xs">{product.name}</span>
          </div>
        </div>
      </div>

      {/* Main Product Section */}
      <main className="container mx-auto max-w-7xl px-2.5 py-4 sm:px-4 sm:py-8 lg:py-10">
        <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(400px,0.95fr)] lg:gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(420px,0.92fr)] xl:gap-6">

          {/* LEFT SIDE: Image Gallery from DB */}
          <div className="flex min-w-0 flex-col gap-2.5 sm:gap-3 lg:sticky lg:top-24">
            <div className="flex min-w-0 gap-3">
              {/* Desktop vertical thumbnail rail */}
              {galleryImages.length > 1 && (
                <div className="hidden h-[620px] w-[82px] shrink-0 flex-col gap-2 overflow-y-auto pr-1 scrollbar-thin lg:flex xl:h-[680px]">
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => selectGalleryImage(index)}
                      aria-label={`Show product image ${index + 1}`}
                      aria-pressed={selectedImageIndex === index}
                      className={`relative h-24 w-full shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-all ${
                        selectedImageIndex === index
                          ? 'border-[#083028] shadow-md ring-2 ring-[#083028]/15'
                          : 'border-gray-200 opacity-75 hover:border-[#083028]/50 hover:opacity-100'
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        fill
                        className="object-cover object-top"
                        sizes="82px"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Main image: cursor zoom on desktop, touch swipe on mobile */}
              <div
                className={`relative h-[clamp(360px,118vw,520px)] min-w-0 flex-1 touch-pan-y select-none overflow-hidden rounded-[1.5rem] border border-[#E8E1D4] bg-[#EDE8DF] shadow-sm sm:h-[clamp(500px,75vw,650px)] sm:rounded-[1.75rem] lg:h-[620px] xl:h-[680px] ${
                  isZoomActive ? 'lg:cursor-zoom-out' : 'lg:cursor-zoom-in'
                }`}
                onPointerEnter={handleGalleryPointerEnter}
                onPointerMove={handleGalleryPointerMove}
                onPointerLeave={() => setIsZoomActive(false)}
                onTouchStart={handleGalleryTouchStart}
                onTouchEnd={handleGalleryTouchEnd}
                onTouchCancel={() => { touchStartPosition.current = null; }}
              >
                {selectedImage ? (
                  <Image
                    src={selectedImage}
                    alt={product.name}
                    fill
                    priority
                    draggable={false}
                    className="pointer-events-none object-cover object-top will-change-transform"
                    sizes="(max-width: 1023px) 100vw, (max-width: 1279px) 55vw, 620px"
                    style={{
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                      transform: isZoomActive ? 'scale(2)' : 'scale(1)',
                      transition: isZoomActive ? 'transform 160ms ease-out' : 'transform 260ms ease-out',
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
                    No image available in database
                  </div>
                )}

                {/* Badges Overlay */}
                <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-col gap-2">
                  {product.isNewArrival && (
                    <span className="flex items-center gap-1 rounded-full bg-[#083028] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                      <Sparkles size={12} /> New Arrival
                    </span>
                  )}
                  {product.isBestSeller && (
                    <span className="rounded-full bg-amber-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-sm">
                      ★ Best Seller
                    </span>
                  )}
                </div>

                {galleryImages.length > 0 && (
                  <span className="pointer-events-none absolute bottom-4 right-4 z-10 rounded-full bg-gray-900/65 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm">
                    {selectedImageIndex + 1}/{galleryImages.length}
                  </span>
                )}
              </div>
            </div>

            {/* Mobile swipe position indicator; no previous/next buttons */}
            {galleryImages.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-0.5 lg:hidden" aria-hidden="true">
                {galleryImages.map((image, index) => (
                  <span
                    key={`${image}-indicator-${index}`}
                    className={`h-1.5 rounded-full transition-all ${
                      selectedImageIndex === index ? 'w-5 bg-[#083028]' : 'w-1.5 bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Social Media Channels Bar (YouTube, Facebook, Instagram) */}
            <div className="grid grid-cols-3 divide-x divide-[#E9E2D6] overflow-hidden rounded-2xl border border-[#E9E2D6] bg-white p-1.5 shadow-sm min-[380px]:p-2 sm:p-3.5">
              {/* YouTube */}
              <a
                href={product.youtubeUrl && product.youtubeUrl.trim() ? product.youtubeUrl : 'https://www.youtube.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-0 flex-col items-center gap-1 px-0.5 text-center transition-opacity hover:opacity-85 min-[380px]:flex-row min-[380px]:gap-1.5 min-[380px]:text-left sm:gap-2.5 sm:px-3"
                title="Watch on YouTube"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#FF0000] shadow-2xs transition-transform group-hover:scale-105 min-[380px]:h-8 min-[380px]:w-8">
                  <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                    <path d="M10 8.5L15.5 12L10 15.5V8.5Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="break-words text-[10px] font-bold leading-tight text-gray-900 min-[380px]:text-[11px] sm:text-xs">
                    YouTube
                  </p>
                  <p className="break-words text-[8px] leading-tight text-gray-500 min-[380px]:text-[8.5px] sm:text-[10px]">
                    Subscribe
                  </p>
                </div>
                <ChevronRight size={12} className="ml-auto hidden shrink-0 text-gray-400 min-[420px]:block" />
              </a>

              {/* Facebook */}
              <a
                href={product.facebookUrl && product.facebookUrl.trim() ? product.facebookUrl : 'https://www.facebook.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-0 flex-col items-center gap-1 px-0.5 text-center transition-opacity hover:opacity-85 min-[380px]:flex-row min-[380px]:gap-1.5 min-[380px]:text-left sm:gap-2.5 sm:px-3"
                title="Follow on Facebook"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#1877F2] shadow-2xs transition-transform group-hover:scale-105 min-[380px]:h-8 min-[380px]:w-8">
                  <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24">
                    <path d="M13.5 12.5H15.5L16 9.5H13.5V8C13.5 7.2 13.8 6.5 15 6.5H16.2V4.1C15.6 4 14.8 4 14 4C11.5 4 10 5.5 10 8.3V9.5H7.5V12.5H10V20H13.5V12.5Z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="break-words text-[10px] font-bold leading-tight text-gray-900 min-[380px]:text-[11px] sm:text-xs">
                    Facebook
                  </p>
                  <p className="break-words text-[8px] leading-tight text-gray-500 min-[380px]:text-[8.5px] sm:text-[10px]">
                    Follow Us
                  </p>
                </div>
                <ChevronRight size={12} className="ml-auto hidden shrink-0 text-gray-400 min-[420px]:block" />
              </a>

              {/* Instagram */}
              <a
                href={product.instagramUrl && product.instagramUrl.trim() ? product.instagramUrl : 'https://www.instagram.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-0 flex-col items-center gap-1 px-0.5 text-center transition-opacity hover:opacity-85 min-[380px]:flex-row min-[380px]:gap-1.5 min-[380px]:text-left sm:gap-2.5 sm:px-3"
                title="Join on Instagram"
              >
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] shadow-2xs transition-transform group-hover:scale-105 min-[380px]:h-8 min-[380px]:w-8 sm:rounded-xl">
                  <svg
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-current"
                    viewBox="0 0 24 24"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="break-words text-[10px] font-bold leading-tight text-gray-900 min-[380px]:text-[11px] sm:text-xs">
                    Instagram
                  </p>
                  <p className="break-words text-[8px] leading-tight text-gray-500 min-[380px]:text-[8.5px] sm:text-[10px]">
                    Join Our Community
                  </p>
                </div>
                <ChevronRight size={12} className="ml-auto hidden shrink-0 text-gray-400 min-[420px]:block" />
              </a>
            </div>

            {/* Phone product summary */}
            <section className="overflow-hidden rounded-[1.5rem] border border-[#E5E2DA] bg-white p-3.5 shadow-[0_12px_30px_rgba(20,45,38,0.08)] sm:hidden">
              <div className="flex items-start gap-2">
                <span className="inline-flex min-w-0 flex-1 items-start gap-1 border-b-2 border-[#C9972B] pb-1 text-[11px] font-black uppercase leading-tight tracking-wide text-[#0B5B47] min-[380px]:text-xs">
                  <Tag size={14} className="shrink-0" />
                  <span className="break-words">{product.category}</span>
                </span>
                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                  <span className="inline-flex max-w-[132px] items-center gap-1 rounded-full border border-[#DCE9E3] bg-[#F4FBF7] px-1.5 py-1 font-mono text-[9px] font-bold leading-tight text-[#0B5B47] min-[380px]:max-w-[158px] min-[380px]:px-2 min-[380px]:text-[11px]">
                    <Tag size={10} className="shrink-0" />
                    <span className="break-all text-center">Product ID: {product.id}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleWishlist({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      numericPrice: product.numericPrice,
                      image: product.image,
                      category: product.category,
                    })}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all min-[380px]:h-10 min-[380px]:w-10 ${
                      isInWishlist(product.id)
                        ? 'border-rose-600 bg-rose-600 text-white'
                        : 'border-[#DCE9E3] bg-white text-[#0B5B47]'
                    }`}
                    aria-label={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                  >
                    <Heart size={21} className={isInWishlist(product.id) ? 'fill-current' : ''} />
                  </button>
                </div>
              </div>

              <h1 className="mt-2 text-[1.55rem] font-black leading-[1.08] tracking-tight text-gray-950">
                {product.name}
              </h1>

              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-black text-emerald-800">
                  <Star size={13} className="fill-current" />
                  {reviewsSummary.total > 0 ? reviewsSummary.average.toFixed(1) : 'New'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className="font-semibold text-gray-500"
                >
                  {reviewsSummary.total > 0
                    ? `(${reviewsSummary.total} Review${reviewsSummary.total === 1 ? '' : 's'})`
                    : '(No Reviews)'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
                <div className="flex min-w-0 items-center rounded-2xl bg-gradient-to-br from-[#F0FBF5] to-[#E5F7ED] px-3 py-2.5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="break-words text-[1.7rem] font-black leading-none tracking-tight text-[#083028]">
                        {appliedCoupon
                          ? `₹${discountedTotal.toLocaleString('en-IN')}`
                          : `₹${effectiveUnitPrice.toLocaleString('en-IN')}`}
                      </p>
                      {/* Strikethrough original price if zone markup applied */}
                      {!appliedCoupon && hasZoneMarkup && (
                        <span className="text-xs font-semibold text-gray-400 line-through">
                          {product.price}
                        </span>
                      )}
                      {appliedCoupon && (
                        <span className="text-xs font-semibold text-gray-400 line-through">
                          ₹{quantityTotal.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                    {/* Zone markup badge */}
                    {!appliedCoupon && hasZoneMarkup && (
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                        zonePrice.discountPercent > 0
                          ? 'bg-blue-100 text-blue-700'
                          : zonePrice.markupDirection === 'increase'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {zonePrice.discountPercent > 0 ? (
                          <>{zonePrice.discountPercent}% OFF</>
                        ) : zonePrice.markupDirection === 'increase' ? (
                          <><TrendingUp size={10} />+{zonePrice.markupPercent}% Zone Markup</>
                        ) : (
                          <><TrendingDown size={10} />-{zonePrice.markupPercent}% Zone Discount</>
                        )}
                      </span>
                    )}
                    {appliedCoupon ? (
                      <span className="mt-1 inline-flex rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-bold text-white">
                        Saved ₹{appliedCoupon.discountAmount}
                      </span>
                    ) : !hasZoneMarkup ? (
                      <span className="mt-1 block text-[9px] font-medium text-gray-500">Inclusive of all taxes</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex min-w-[116px] flex-col justify-center rounded-2xl bg-[#ECF9F1] px-3 py-2.5 text-emerald-800">
                  <span className="flex items-center gap-1.5 text-sm font-black">
                    <CheckCircle2 size={19} className="fill-emerald-600 text-white" /> In Stock
                  </span>
                  <span className="mt-0.5 pl-6 text-[10px] font-semibold text-emerald-700">
                    {product.stock && product.stock > 0 ? `(${product.stock} available)` : 'Available'}
                  </span>
                </div>
              </div>

              <div className="mt-3 inline-grid w-[174px] grid-cols-[40px_1fr_40px] items-center rounded-full border border-emerald-100 bg-[#F1FBF6] p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => {
                    const nextQuantity = Math.max(1, quantity - 1);
                    setQuantity(nextQuantity);
                    if (appliedCoupon) handleApplyCoupon(appliedCoupon.code);
                  }}
                  disabled={quantity <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B5B47] text-white disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Decrease quantity"
                >
                  <Minus size={15} />
                </button>
                <span className="text-center text-sm font-black text-[#0B5B47]">{quantity}</span>
                <button
                  type="button"
                  onClick={() => {
                    const nextQuantity = Math.min(product.stock || 10, quantity + 1);
                    setQuantity(nextQuantity);
                    if (appliedCoupon) handleApplyCoupon(appliedCoupon.code);
                  }}
                  disabled={quantity >= (product.stock || 10)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B5B47] text-white disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Increase quantity"
                >
                  <Plus size={15} />
                </button>
              </div>

              <div className="mt-3 space-y-2.5">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`premium-button flex w-full items-center justify-center gap-3 rounded-full px-5 py-3 text-base font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                    addedToCart
                      ? 'bg-emerald-700 text-white'
                      : 'bg-gradient-to-r from-[#07523F] to-[#0B7A55] text-white'
                  }`}
                >
                  <ShoppingCart size={25} />
                  <span>{addedToCart ? 'Added to Cart ✓' : 'Add to Cart'}</span>
                  <ChevronRight size={18} className="button-arrow" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAddToCart();
                    router.push('/cart');
                  }}
                  className="premium-button flex w-full items-center justify-center gap-3 rounded-full border border-[#E7D6B7] bg-gradient-to-r from-[#F5EAD5] to-[#FFF9EE] px-5 py-3 text-base font-black text-[#07523F] transition-all hover:-translate-y-0.5 hover:border-[#C9972B]/50 hover:shadow-md"
                >
                  <CreditCard size={22} />
                  <span>Buy Now</span>
                  <ChevronRight size={18} className="button-arrow" />
                </button>
              </div>

              {/* Delivery info box - Hidden for low_margin or if zone is OFF */}
              {product?.deliveryType === 'low_margin' ? (
                /* Orange box for low-margin products */
                <div className="mt-3 flex min-h-[54px] items-center gap-2.5 rounded-2xl bg-orange-50 border border-orange-200/70 px-3 py-2 text-orange-700">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 shadow-sm">
                    <Package size={22} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black leading-tight min-[380px]:text-sm">
                      + ₹{product.deliveryChargeAmount ?? 0} Delivery Charges
                    </p>
                    <p className="mt-0.5 text-[9px] font-medium leading-none text-orange-500 min-[380px]:text-[10px]">
                      Low margin product — does not qualify for free delivery
                    </p>
                  </div>
                  <div className="relative group/dtip cursor-pointer">
                    <Info size={18} className="text-orange-400" />
                    <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-60 z-50 rounded-xl bg-gray-900 text-white text-[10px] leading-relaxed p-2.5 shadow-xl opacity-0 group-hover/dtip:opacity-100 transition-opacity duration-200">
                      <span className="font-bold block mb-0.5">Why No Free Delivery? / फ्री डिलीवरी क्यों नहीं?</span>
                      Sold at razor-thin wholesale margins, this product does not count towards the Free Delivery threshold.
                      <span className="block mt-0.5 text-gray-300">इस प्रोडक्ट की कीमत बहुत कम मार्जिन पर तय की गई है। इसलिए यह फ्री डिलीवरी छूट के अंतर्गत नहीं आता है।</span>
                    </span>
                  </div>
                </div>
              ) : currentZoneResult.zone.isActive && (
                /* Green box for standard products (zone-based) */
                <div className="mt-3 flex min-h-[54px] items-center gap-2.5 rounded-2xl bg-[#EAF8F1] px-3 py-2 text-[#07523F]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#D8F2E4] shadow-sm">
                    <Truck size={24} strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black leading-tight min-[380px]:text-sm">
                      {currentZoneResult.isFreeDelivery
                        ? 'FREE Delivery'
                        : 'Delivery Charges: ₹' + currentZoneResult.deliveryFee}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[9px] font-medium leading-none text-gray-500 min-[380px]:text-[10px]">
                      <CheckCircle2 size={11} className="fill-emerald-600 text-white shrink-0" />
                      <span>
                        {currentZoneResult.zone.zoneName}
                        {currentZoneResult.isFreeDelivery
                          ? ' • Free delivery applied'
                          : currentZoneResult.zone.freeDeliveryThreshold > 0
                          ? ' • Free above ₹' + currentZoneResult.zone.freeDeliveryThreshold.toLocaleString('en-IN')
                          : ''}
                      </span>
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0" />
                </div>
              )}

              <div className="mt-2.5 grid min-h-[58px] grid-cols-3 items-center divide-x divide-gray-200">
                <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-1 pr-1.5 text-left min-[380px]:grid-cols-[40px_minmax(0,1fr)] min-[380px]:gap-2 min-[380px]:pr-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-white text-[#07523F] shadow-sm min-[380px]:h-10 min-[380px]:w-10">
                    <ShieldCheck size={20} strokeWidth={2.1} className="min-[380px]:h-[23px] min-[380px]:w-[23px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[9px] font-black leading-tight text-gray-900 min-[380px]:text-[10px]">Secure Payments</span>
                    <span className="mt-0.5 block text-[8px] leading-tight text-gray-500 min-[380px]:text-[9px]">100% Safe</span>
                  </span>
                </div>
                <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-1 px-1.5 text-left min-[380px]:grid-cols-[40px_minmax(0,1fr)] min-[380px]:gap-2 min-[380px]:px-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-white text-[#07523F] shadow-sm min-[380px]:h-10 min-[380px]:w-10">
                    <PackageCheck size={19} strokeWidth={2.1} className="min-[380px]:h-[22px] min-[380px]:w-[22px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[9px] font-black leading-tight text-gray-900 min-[380px]:text-[10px]">Easy Returns</span>
                    <span className="mt-0.5 block text-[8px] leading-tight text-gray-500 min-[380px]:text-[9px]">7 Days Policy</span>
                  </span>
                </div>
                <div className="grid min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-1 pl-1.5 text-left min-[380px]:grid-cols-[40px_minmax(0,1fr)] min-[380px]:gap-2 min-[380px]:pl-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-white text-[#07523F] shadow-sm min-[380px]:h-10 min-[380px]:w-10">
                    <BadgeCheck size={19} strokeWidth={2.1} className="min-[380px]:h-[22px] min-[380px]:w-[22px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[9px] font-black leading-tight text-gray-900 min-[380px]:text-[10px]">Premium Quality</span>
                    <span className="mt-0.5 block text-[8px] leading-tight text-gray-500 min-[380px]:text-[9px]">Trusted Brand</span>
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT SIDE: Product Name, Price, Actions, Information from DB */}
          <div className="flex min-w-0 flex-col gap-4 overflow-hidden rounded-[1.5rem] border border-[#E5E2DA] bg-white p-3.5 shadow-[0_12px_35px_rgba(20,45,38,0.08)] sm:gap-5 sm:rounded-[1.75rem] sm:p-6 xl:p-7">
            
            {/* Header / Category & Actions */}
            <div className="hidden sm:block">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-1.5 border-b-2 border-[#C9972B] pb-1 text-xs font-black uppercase tracking-wider text-[#0B5B47]">
                  <Tag size={15} /> {product.category}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#DCE9E3] bg-[#F4FBF7] px-3 text-xs font-bold text-[#0B5B47] transition hover:border-[#0B5B47]/30 hover:bg-[#EAF7F0]"
                    aria-label="Share this product"
                  >
                    <Share2 size={15} />
                    <span className="hidden sm:inline">{copiedShare ? 'Link Copied!' : 'Share'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => product && toggleWishlist({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      numericPrice: product.numericPrice,
                      image: product.image,
                      category: product.category,
                    })}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all ${
                      product && isInWishlist(product.id)
                        ? 'border-rose-600 bg-rose-600 text-white'
                        : 'border-[#DCE9E3] bg-white text-[#0B5B47] hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600'
                    }`}
                    title={product && isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
                    aria-label="Toggle Wishlist"
                  >
                    <Heart
                      size={20}
                      className={product && isInWishlist(product.id) ? 'fill-white' : ''}
                    />
                  </button>
                </div>
              </div>

              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#DCE9E3] bg-[#F4FBF7] px-2.5 py-1 font-mono text-xs font-bold text-[#0B5B47]">
                <Tag size={11} /> Product ID: {product.id}
              </div>
              <h1 className="text-[1.35rem] font-black leading-tight tracking-tight text-gray-950 min-[380px]:text-2xl sm:text-3xl">
                {product.name}
              </h1>
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-black text-emerald-800">
                  <Star size={13} className="fill-current" />
                  {reviewsSummary.total > 0 ? reviewsSummary.average.toFixed(1) : 'New'}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('reviews')}
                  className="font-semibold text-gray-500 transition hover:text-[#083028]"
                >
                  {reviewsSummary.total > 0
                    ? `(${reviewsSummary.total} Review${reviewsSummary.total === 1 ? '' : 's'})`
                    : 'No reviews yet'}
                </button>
              </div>
            </div>

            {/* Price Showcase from DB with Dynamic Coupon Discount */}
            <div className="hidden min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2.5 sm:grid sm:gap-3">
              <div className="min-w-0 rounded-2xl border border-emerald-100 bg-gradient-to-br from-[#F0FBF5] to-[#E5F7ED] p-3 sm:p-4">
                {appliedCoupon ? (
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-2xl font-black tracking-tight text-[#083028] sm:text-3xl">
                        ₹{discountedTotal.toLocaleString('en-IN')}
                      </p>
                      <span className="text-sm font-semibold text-gray-400 line-through">
                        ₹{quantityTotal.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        <Sparkles size={11} /> Saved ₹{appliedCoupon.discountAmount} ({appliedCoupon.code})
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="break-words text-2xl font-black tracking-tight text-[#083028] sm:text-3xl">
                        ₹{quantityTotal.toLocaleString('en-IN')}
                      </p>
                      {hasZoneMarkup && (
                        <span className="text-sm font-semibold text-gray-400 line-through">
                          {quantity > 1 ? `₹${(rawUnitPrice * quantity).toLocaleString('en-IN')}` : product.price}
                        </span>
                      )}
                    </div>
                    {/* Zone markup badge */}
                    {hasZoneMarkup ? (
                      <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        zonePrice.discountPercent > 0
                          ? 'bg-blue-100 text-blue-700'
                          : zonePrice.markupDirection === 'increase'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {zonePrice.discountPercent > 0 ? (
                          <>{zonePrice.discountPercent}% OFF</>
                        ) : zonePrice.markupDirection === 'increase' ? (
                          <><TrendingUp size={11} />+{zonePrice.markupPercent}% Zone Markup</>
                        ) : (
                          <><TrendingDown size={11} />-{zonePrice.markupPercent}% Zone Discount</>
                        )}
                      </span>
                    ) : (
                      <p className="mt-0.5 text-[10px] font-medium text-gray-500">Inclusive of all taxes</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex min-w-[104px] flex-col justify-center rounded-2xl border border-emerald-100 bg-[#ECF9F1] px-2.5 py-3 text-emerald-800 sm:min-w-[116px] sm:px-3">
                <span className="flex items-center gap-1.5 text-sm font-black">
                  <CheckCircle2 size={18} className="fill-emerald-600 text-white" /> In Stock
                </span>
                <span className="mt-0.5 pl-6 text-[10px] font-semibold text-emerald-700">
                  {product.stock && product.stock > 0
                    ? `${product.stock} available`
                    : 'Available'}
                </span>
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="hidden items-center justify-between rounded-2xl border border-[#DCE9E3] bg-[#F4FBF7] px-3 py-2 sm:flex">
              <label className="text-xs font-black uppercase tracking-wide text-[#0B5B47]">
                Quantity
              </label>
              <div className="inline-flex items-center rounded-full border border-emerald-100 bg-white p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      const nextQ = Math.max(1, quantity - 1);
                      setQuantity(nextQ);
                      if (appliedCoupon) handleApplyCoupon(appliedCoupon.code);
                    }}
                    disabled={quantity <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B5B47] text-white transition hover:bg-[#083F33] disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-12 text-center text-sm font-black text-gray-900">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextQ = Math.min(product.stock || 10, quantity + 1);
                      setQuantity(nextQ);
                      if (appliedCoupon) handleApplyCoupon(appliedCoupon.code);
                    }}
                    disabled={quantity >= (product.stock || 10)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B5B47] text-white transition hover:bg-[#083F33] disabled:cursor-not-allowed disabled:opacity-30"
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="hidden flex-col gap-2.5 sm:flex">
              <button
                type="button"
                onClick={handleAddToCart}
                className={`premium-button flex w-full items-center justify-center gap-3 rounded-full px-6 py-3.5 text-sm font-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 ${
                  addedToCart
                    ? 'bg-emerald-700 text-white'
                    : 'bg-gradient-to-r from-[#07523F] to-[#0B7A55] text-white hover:shadow-md'
                }`}
              >
                <ShoppingCart size={18} />
                {addedToCart ? 'Added to Cart ✓' : 'Add to Cart'}
                <ChevronRight size={17} className="button-arrow" />
              </button>
              <button
                type="button"
                onClick={() => {
                  handleAddToCart();
                  router.push('/cart');
                }}
                className="premium-button flex w-full items-center justify-center gap-3 rounded-full border border-[#E7D6B7] bg-gradient-to-r from-[#F5EAD5] to-[#FFF9EE] px-6 py-3.5 text-sm font-black text-[#07523F] transition-all hover:-translate-y-0.5 hover:border-[#C9972B]/50 hover:bg-[#F1E2C7] hover:shadow-md"
              >
                <CreditCard size={18} />
                Buy Now
                <ChevronRight size={17} className="button-arrow" />
              </button>
            </div>

            {/* Delivery info box - Hidden completely when Zone is OFF (Kill Switch) */}
            {currentZoneResult.zone.isActive && (
              <div className="hidden items-center gap-3 rounded-2xl border border-emerald-100 bg-gradient-to-r from-[#EAF9F1] to-[#F4FBF7] px-4 py-3 text-[#07523F] sm:flex">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                  <Truck size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black">
                    {currentZoneResult.isFreeDelivery
                      ? 'FREE Delivery'
                      : 'Delivery Charges: ₹' + currentZoneResult.deliveryFee}
                  </p>
                  <p className="text-[10px] font-medium text-gray-500">
                    {currentZoneResult.zone.zoneName}
                    {currentZoneResult.isFreeDelivery
                      ? ' • Free delivery applied'
                      : currentZoneResult.zone.freeDeliveryThreshold > 0
                      ? ' • Free delivery on orders above ₹' + currentZoneResult.zone.freeDeliveryThreshold.toLocaleString('en-IN')
                      : ' • Standard delivery fee applies'}
                  </p>
                </div>
                <ChevronRight size={18} />
              </div>
            )}

            {/* Trust Points */}
            <div className="hidden grid-cols-3 divide-x divide-gray-200 rounded-2xl border border-gray-100 bg-white px-0.5 py-3 text-center sm:grid sm:px-1">
              <div className="flex min-w-0 flex-col items-center gap-1 px-1 sm:px-2">
                <CreditCard size={20} className="text-[#083028]" />
                <span className="text-xs font-black text-gray-800">Secure Payments</span>
                <span className="text-[10px] text-gray-500">100% Safe</span>
              </div>
              <div className="flex min-w-0 flex-col items-center gap-1 px-1 sm:px-2">
                <RotateCcw size={20} className="text-[#083028]" />
                <span className="text-[10px] font-black text-gray-800">7 Days Return</span>
                <span className="text-[9px] text-gray-500">Hassle-free pickups</span>
              </div>
              <div className="flex min-w-0 flex-col items-center gap-1 px-1 sm:px-2">
                <ShieldCheck size={20} className="text-[#083028]" />
                <span className="text-[10px] font-black text-gray-800">100% Authentic</span>
                <span className="text-[9px] text-gray-500">Quality assured</span>
              </div>
            </div>

            {/* AVAILABLE DISCOUNT TICKETS SECTION — REALISTIC VOUCHER STUBS */}
            <div className="space-y-4 pt-1">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#083028] text-amber-300 flex items-center justify-center shadow-xs">
                    <Ticket size={17} />
                  </div>
                  <div>
                    <h3 className="flex flex-wrap items-center gap-1.5 text-sm font-bold leading-tight text-gray-900">
                      <span>Discount Tickets &amp; Vouchers</span>
                      <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                        {product.category}
                      </span>
                    </h3>
                    <p className="text-xs leading-relaxed text-gray-500 sm:text-sm">Apply active voucher tickets to save instantly</p>
                  </div>
                </div>

                <button
                  onClick={handleRefreshCoupons}
                  title="Check for new coupons"
                  className="p-1.5 text-gray-400 hover:text-[#083028] rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors shadow-2xs"
                >
                  <RefreshCw size={13} />
                </button>
              </div>

              {/* Status & Error Alerts */}
              {couponError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-2xl border border-red-200 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-red-600" />
                  <span className="leading-tight">{couponError}</span>
                </div>
              )}

              {couponSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-200 flex items-center justify-between animate-in fade-in shadow-xs">
                  <div className="flex items-center gap-2">
                    <Check size={16} className="text-emerald-700" />
                    <span>{couponSuccess}</span>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs text-red-600 hover:text-red-800 underline font-semibold ml-2"
                  >
                    Remove
                  </button>
                </div>
              )}

              {/* LIST OF TICKET VOUCHERS */}
              {availableOffers.length === 0 ? (
                <div className="p-5 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Ticket size={24} className="mx-auto text-gray-300 mb-1" />
                  <p className="text-xs font-semibold text-gray-600">No active tickets for this collection</p>
                  <p className="text-[11px] text-gray-400">You can still enter a custom coupon code below.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {availableOffers.map((offer) => {
                    const isCatMatch = offer.applicableCategory && offer.applicableCategory !== 'All';
                    const isStorewide = offer.applicableCategory === 'All';
                    const isCurrentlyApplied = appliedCoupon?.code === offer.code;

                    return (
                      <div
                        key={offer.id || offer.code}
                        className={`relative rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                          isCurrentlyApplied
                            ? 'bg-gradient-to-r from-emerald-50 via-white to-emerald-50/80 border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                            : isCatMatch
                            ? 'bg-gradient-to-r from-purple-50/70 via-white to-amber-50/40 border-dashed border-purple-300 hover:border-purple-400 shadow-xs hover:shadow-md'
                            : 'bg-gradient-to-r from-amber-50/60 via-white to-emerald-50/40 border-dashed border-[#B8860B]/40 hover:border-[#B8860B]/70 shadow-xs hover:shadow-md'
                        }`}
                      >
                        {/* Perforated Ticket Notches (Left & Right) */}
                        <div className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-dashed border-gray-300 z-10" />
                        <div className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white border-2 border-dashed border-gray-300 z-10" />

                        <div className="px-4 py-3.5 sm:px-6 sm:py-4">
                          {/* Ticket Top Ribbon */}
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            {isCatMatch ? (
                              <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 bg-purple-100 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles size={11} className="text-purple-600" />
                                Exclusive for {offer.applicableCategory}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                                🌐 Storewide Voucher
                              </span>
                            )}

                            {offer.minOrderValue > 0 && (
                              <span className="text-[10px] font-semibold text-gray-500">
                                Min. ₹{offer.minOrderValue}
                              </span>
                            )}
                          </div>

                          {/* Ticket Body: Discount & Code Button */}
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center sm:gap-3">
                            {/* Left: Discount amount & info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-xl sm:text-2xl font-black text-[#083028] tracking-tight">
                                  {offer.discountType === 'percentage'
                                    ? `${offer.discountValue}% OFF`
                                    : offer.discountType === 'flat'
                                    ? `₹${offer.discountValue} FLAT OFF`
                                    : 'FREE SHIPPING'}
                                </span>
                                {offer.maxDiscountAmount && (
                                  <span className="text-[11px] font-medium text-gray-500">
                                    (up to ₹{offer.maxDiscountAmount})
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 break-words text-xs font-semibold leading-relaxed text-gray-800">
                                {offer.title}
                              </p>
                              {offer.description && (
                                <p className="break-words text-[11px] leading-relaxed text-gray-500">
                                  {offer.description}
                                </p>
                              )}
                            </div>

                            {/* Ticket Perforated Divider (Desktop) */}
                            <div className="hidden sm:block border-l-2 border-dashed border-gray-200 h-10 mx-1" />

                            {/* Right: Code Chip & Action Button */}
                            <div className="flex min-w-0 flex-shrink-0 items-center justify-between gap-1.5 border-t border-gray-100 pt-2 sm:flex-col sm:items-end sm:gap-2 sm:border-t-0 sm:pt-0">
                              {/* Monospace Code Pill */}
                              <div className="inline-flex min-w-0 items-center gap-1 rounded-lg border border-[#083028]/20 bg-[#083028]/10 px-2 py-1">
                                <Tag size={11} className="text-[#083028]" />
                                <span className="truncate font-mono text-[11px] font-black tracking-wide text-[#083028] sm:text-xs sm:tracking-wider">
                                  {offer.code}
                                </span>
                              </div>

                              {/* Apply / Applied Button */}
                              {isCurrentlyApplied ? (
                                <button
                                  onClick={handleRemoveCoupon}
                                  className="group/btn inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-emerald-700 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition-all hover:bg-red-600 sm:px-3.5 sm:text-xs"
                                >
                                  <Check size={13} className="group-hover/btn:hidden" />
                                  <span className="group-hover/btn:hidden">Applied ✓</span>
                                  <span className="hidden group-hover/btn:inline">Remove ×</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setCouponInput(offer.code);
                                    handleApplyCoupon(offer.code);
                                  }}
                                  disabled={couponLoading}
                                  className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl bg-[#083028] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition-all hover:scale-102 hover:bg-[#051e19] disabled:opacity-50 sm:px-4 sm:text-xs"
                                >
                                  <Ticket size={12} />
                                  Apply Coupon
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>


            {/* Information Tabs — Completely rendered from DB */}
            <div className="min-w-0 border-t border-gray-100 pt-4">
              <div className="mb-4 flex items-center gap-4 overflow-x-auto border-b border-gray-200 pb-2 text-xs font-bold uppercase tracking-wider [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  onClick={() => setActiveTab('description')}
                  className={`-mb-2 shrink-0 whitespace-nowrap border-b-2 pb-2 transition-colors ${
                    activeTab === 'description'
                      ? 'border-[#083028] text-[#083028]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab('specifications')}
                  className={`-mb-2 shrink-0 whitespace-nowrap border-b-2 pb-2 transition-colors ${
                    activeTab === 'specifications'
                      ? 'border-[#083028] text-[#083028]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Specifications
                </button>
                <button
                  onClick={() => setActiveTab('shipping')}
                  className={`-mb-2 shrink-0 whitespace-nowrap border-b-2 pb-2 transition-colors ${
                    activeTab === 'shipping'
                      ? 'border-[#083028] text-[#083028]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Shipping &amp; Care
                </button>
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`-mb-2 flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-2 transition-colors ${
                    activeTab === 'reviews'
                      ? 'border-[#083028] text-[#083028]'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span>Customer Reviews</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeTab === 'reviews' ? 'bg-[#083028] text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {reviews.length}
                  </span>
                </button>
              </div>

              {/* Tab 1: Description from DB */}
              {activeTab === 'description' && (
                <div className="text-sm text-gray-700 space-y-3 leading-relaxed">
                  {product.description ? (
                    <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-gray-200/80 whitespace-pre-line leading-relaxed">
                      {product.description}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No description has been added for this product in the admin panel yet.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 2: Specifications from DB */}
              {activeTab === 'specifications' && (
                <div className="text-xs text-gray-700 space-y-3">
                  {product.specification ? (
                    <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-gray-200/80 leading-relaxed whitespace-pre-line text-sm text-gray-800">
                      {product.specification}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No specifications have been added for this product in the admin panel yet.
                    </p>
                  )}
                  <div className="divide-y divide-gray-100 bg-white border border-gray-100 rounded-xl p-3">
                    <div className="flex gap-3 py-1.5">
                      <span className="font-semibold text-gray-500">Category</span>
                      <span className="ml-auto break-words text-right font-medium text-gray-900">{product.category}</span>
                    </div>
                    <div className="flex gap-3 py-1.5">
                      <span className="font-semibold text-gray-500">Product Code</span>
                      <span className="ml-auto break-all text-right font-mono text-gray-700">{product.id}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Shipping & Care from DB */}
              {activeTab === 'shipping' && (
                <div className="text-xs text-gray-700 space-y-3 leading-relaxed">
                  {product.shippingCare ? (
                    <div className="bg-[#FAF8F3] p-4 rounded-2xl border border-gray-200/80 whitespace-pre-line text-sm text-gray-800 leading-relaxed">
                      {product.shippingCare}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">
                      No specific care instructions have been added for this product yet.
                    </p>
                  )}
                </div>
              )}

              {/* Tab 4: Customer Reviews (Real-time DB-backed) */}
              {activeTab === 'reviews' && (
                <div className="space-y-6">
                  {/* Reviews Summary Header */}
                  {reviews.length > 0 ? (
                    <div className="bg-[#FAF8F3] p-5 rounded-2xl border border-gray-200/80 flex flex-col sm:flex-row items-center gap-6">
                      <div className="text-center sm:text-left shrink-0">
                        <div className="flex items-center justify-center sm:justify-start gap-2">
                          <span className="text-4xl font-extrabold text-gray-900">
                            {reviewsSummary.average}
                          </span>
                          <div className="flex text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={18}
                                className={
                                  i < Math.round(reviewsSummary.average)
                                    ? 'fill-amber-400 text-amber-500'
                                    : 'text-gray-300'
                                }
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                          Based on {reviewsSummary.total} customer review{reviewsSummary.total === 1 ? '' : 's'}
                        </p>
                      </div>

                      {/* Breakdown Bars */}
                      <div className="flex-1 w-full space-y-1.5 border-t sm:border-t-0 sm:border-l border-gray-200 pt-4 sm:pt-0 sm:pl-6">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = reviewsSummary.breakdown[star] || 0;
                          const pct = reviewsSummary.total > 0 ? (count / reviewsSummary.total) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="w-4 font-bold">{star}</span>
                              <Star size={11} className="text-amber-500 fill-amber-400 shrink-0" />
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-7 text-right text-gray-400 text-[11px] font-mono">
                                {count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#FAF8F3] p-5 rounded-2xl border border-gray-200/80 text-center">
                      <Star size={24} className="text-amber-400 fill-amber-400/30 mx-auto mb-1.5" />
                      <p className="text-sm font-bold text-gray-900">No reviews yet</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Be the first to share your thoughts on this outfit!
                      </p>
                    </div>
                  )}

                  {/* Write a Review Section */}
                  <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-2xs sm:p-5">
                    {user ? (
                      <form onSubmit={handleSubmitReview} className="space-y-4">
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                            <span>Write a Customer Review</span>
                          </h4>
                          <span className="text-[11px] text-gray-500">
                            Posting as <strong className="text-[#083028]">{user.name || user.email}</strong>
                          </span>
                        </div>

                        {/* Star Rating Selector */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase">
                            Rating *
                          </label>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRatingInput(star)}
                                className="p-1 hover:scale-115 transition-transform"
                                title={`${star} Star${star > 1 ? 's' : ''}`}
                              >
                                <Star
                                  size={24}
                                  className={
                                    star <= ratingInput
                                      ? 'text-amber-400 fill-amber-400'
                                      : 'text-gray-300 hover:text-amber-200'
                                  }
                                />
                              </button>
                            ))}
                            <span className="w-full text-xs font-bold text-gray-700 sm:ml-2 sm:w-auto">
                              {ratingInput === 5 && 'Outstanding! (5/5)'}
                              {ratingInput === 4 && 'Very Good (4/5)'}
                              {ratingInput === 3 && 'Average (3/5)'}
                              {ratingInput === 2 && 'Below Expectations (2/5)'}
                              {ratingInput === 1 && 'Poor (1/5)'}
                            </span>
                          </div>
                        </div>

                        {/* Review Title */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                            Headline / Title
                          </label>
                          <input
                            type="text"
                            value={reviewTitleInput}
                            onChange={(e) => setReviewTitleInput(e.target.value)}
                            placeholder="e.g. Beautiful fabric and vibrant color!"
                            className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#083028]/20 focus:border-[#083028]"
                          />
                        </div>

                        {/* Review Comment */}
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">
                            Your Review *
                          </label>
                          <textarea
                            required
                            rows={3}
                            value={reviewCommentInput}
                            onChange={(e) => setReviewCommentInput(e.target.value)}
                            placeholder="Write your honest review about quality, fit, embroidery, or delivery..."
                            className="w-full px-3.5 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#083028]/20 focus:border-[#083028] resize-none"
                          />
                        </div>

                        {/* Alerts */}
                        {reviewError && (
                          <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200 flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{reviewError}</span>
                          </div>
                        )}
                        {reviewSuccess && (
                          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-2">
                            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                            <span>{reviewSuccess}</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="bg-[#083028] hover:bg-[#051e19] text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-60 inline-flex items-center gap-2"
                        >
                          {submittingReview && <Loader2 size={13} className="animate-spin" />}
                          Submit Review
                        </button>
                      </form>
                    ) : (
                      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                        <div>
                          <p className="text-xs font-bold text-amber-900 flex items-center justify-center sm:justify-start gap-1.5">
                            <User size={14} className="text-amber-700" />
                            Only logged-in customers can submit reviews
                          </p>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Sign in to your AR Garment account to rate this item and share your feedback.
                          </p>
                        </div>
                        <Link
                          href={`/login?redirect=/product/${encodeURIComponent(productId)}`}
                          className="bg-[#083028] hover:bg-[#051e19] text-white text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap transition shadow-xs shrink-0"
                        >
                          Sign In to Review →
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Reviews List */}
                  {reviews.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Customer Feedback ({reviews.length})
                      </h4>
                      <div className="space-y-3">
                        {reviews.map((rev) => (
                          <div
                            key={rev.id}
                            className="p-4 bg-white border border-gray-100 rounded-2xl shadow-2xs hover:border-gray-200 transition"
                          >
                            <div className="mb-2 flex flex-col items-start justify-between gap-2 min-[380px]:flex-row">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#083028]/10 text-[#083028] font-bold text-xs flex items-center justify-center">
                                  {rev.userName ? rev.userName[0].toUpperCase() : 'C'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="break-words text-xs font-bold text-gray-900">
                                      {rev.userName}
                                    </span>
                                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                      Verified Buyer
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-gray-400">
                                    {new Date(rev.createdAt).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </p>
                                </div>
                              </div>

                              {/* Star display */}
                              <div className="flex text-amber-500">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={13}
                                    className={
                                      i < rev.rating
                                        ? 'fill-amber-400 text-amber-500'
                                        : 'text-gray-200'
                                    }
                                  />
                                ))}
                              </div>
                            </div>

                            {rev.title && (
                              <p className="text-xs font-bold text-gray-900 mb-1">
                                {rev.title}
                              </p>
                            )}
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {rev.comment}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* RELATED PRODUCTS FROM DB */}
        {relatedProducts.length > 0 && (
          <section className="mt-10 border-t border-gray-200 pt-8 sm:mt-20 sm:pt-12">
            <div className="mb-5 flex items-end justify-between gap-3 sm:mb-8">
              <div className="min-w-0">
                <h2 className="text-xl font-bold leading-tight text-gray-900 sm:text-2xl">More From {product.category}</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-500 sm:text-base">Live recommendations from database</p>
              </div>
              <Link
                href={`/category?category=${encodeURIComponent(product.category)}`}
                className="shrink-0 text-xs font-bold text-[#083028] hover:underline"
              >
                View All →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-4">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
}
