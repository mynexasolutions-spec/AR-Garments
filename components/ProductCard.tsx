'use client';

import { useState } from 'react';
import { ShoppingCart, Heart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useShippingSettings } from '@/context/ShippingSettingsContext';
import { calculateZoneDelivery, DEFAULT_ZONE_SETTINGS } from '@/lib/zoneShipping';
import { Truck } from 'lucide-react';
import { useWishlist } from '@/context/WishlistContext';

export interface Product {
  id: number | string;
  name: string;
  price: string;
  numericPrice?: number;
  category?: string;
  image: string;
  images?: string[];
  description?: string;
  badge?: string;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
}

export default function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { zoneSettings } = useShippingSettings();

  const isFavorited = isInWishlist(product.id);

  // Read saved location or default to determine if Free Delivery is active for this product
  let savedPin = '';
  if (typeof window !== 'undefined') {
    try {
      const savedInfo = localStorage.getItem('ar_user_pincode_info');
      if (savedInfo) {
        const parsed = JSON.parse(savedInfo);
        savedPin = parsed.pincode || '';
      }
    } catch {}
  }
  const numericPrice = product.numericPrice || Number(String(product.price).replace(/[^0-9.]/g, '')) || 0;
  const zoneResult = calculateZoneDelivery(
    numericPrice,
    savedPin,
    zoneSettings && zoneSettings.length > 0 ? zoneSettings : DEFAULT_ZONE_SETTINGS
  );
  // Conditional UI: Badge only renders if Zone is ON and product qualifies
  const showFreeDeliveryBadge = zoneResult.zone.isActive && zoneResult.isFreeDelivery;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAdded(true);
    addToCart(product, 1);
    if (onAddToCart) onAddToCart(product);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      id: product.id,
      name: product.name,
      price: product.price,
      numericPrice: product.numericPrice,
      image: product.image,
      category: product.category,
    });
  };

  return (
    <div className="premium-card group bg-white border border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden flex flex-col justify-between">
      <Link href={`/product/${product.id}`} className="block flex-1">
        {/* Image area */}
        <div className="relative bg-[#EDE8DF] w-full h-[180px] sm:h-[220px] md:h-[260px]">
          {/* Optional Badge */}
          {product.badge && (
            <span className="absolute top-2.5 left-2.5 z-10 bg-[#083028] text-white text-[10px] sm:text-[11px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md uppercase tracking-wider">
              {product.badge}
            </span>
          )}

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            className={`micro-icon absolute top-2.5 right-2.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
              isFavorited
                ? 'bg-rose-50 text-rose-600 scale-105'
                : 'bg-white/90 text-gray-500 hover:text-rose-600 hover:bg-white hover:scale-105'
            }`}
            title={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
            aria-label={isFavorited ? 'Remove from Wishlist' : 'Add to Wishlist'}
          >
            <Heart
              size={15}
              className={`transition-colors ${isFavorited ? 'fill-rose-600 text-rose-600' : ''}`}
            />
          </button>

          <Image
            src={product.image}
            alt={product.name}
            fill
            className="premium-image object-cover object-top"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        </div>

        {/* Content area */}
        <div className="p-2.5 sm:p-4">
          {product.category && (
            <p className="text-[10px] sm:text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 sm:mb-1">
              {product.category}
            </p>
          )}
          <h3 className="font-bold text-gray-900 text-xs sm:text-sm md:text-base leading-snug mb-1 sm:mb-2 line-clamp-2 group-hover:text-[#083028] transition-colors">
            {product.name}
          </h3>
          <div className="flex items-center justify-between gap-1 mb-1 sm:mb-2">
            <p className="text-xs sm:text-sm md:text-base font-bold text-[#083028]">
              {product.price}
            </p>
            {showFreeDeliveryBadge && (
              <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                <Truck size={10} className="shrink-0" />
                <span>Free Delivery</span>
              </span>
            )}
          </div>
        </div>
      </Link>

      <div className="px-2.5 pb-2.5 sm:px-4 sm:pb-4">
        {/* Outlined Add to Cart button */}
        <button
          onClick={handleAddToCart}
          className={`premium-button w-full border border-gray-300 py-1.5 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5 ${
            added
              ? 'bg-[#083028] text-white border-[#083028]'
              : 'bg-[#F5F1E8] hover:bg-[#083028] hover:text-white hover:border-[#083028] text-gray-700'
          }`}
        >
          <ShoppingCart size={13} strokeWidth={1.5} />
          {added ? 'Added to Cart ✓' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
