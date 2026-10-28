'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Search, User, ShoppingBag, ChevronDown, Heart, MapPin, Navigation, X, Check, Loader2 } from 'lucide-react';
import { useShippingSettings } from '@/context/ShippingSettingsContext';
import { calculateZoneDelivery, DEFAULT_ZONE_SETTINGS } from '@/lib/zoneShipping';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import SearchModal from '@/components/SearchModal';
import { fetchJson } from '@/lib/clientRequest';

interface NavCategory {
  id?: string;
  name: string;
  href: string;
  children?: NavCategory[];
}

interface CategoryApiRow {
  id: string;
  name: string;
  children?: Array<{ id: string; name: string }>;
}

const DEFAULT_CATEGORIES: NavCategory[] = [
  { name: 'Sarees', href: '/category?category=Sarees' },
  { name: 'Suits & Dress Material', href: '/category?category=Suits+%26+Dress+Material' },
  { name: 'Dupatta Sets', href: '/category?category=Dupatta+Sets' },
  { name: 'Men Fashion', href: '/category?category=Men+Fashion' },
  { name: 'Kids Fashion', href: '/category?category=Kids+Fashion' },
];

type HeaderProps = {
  categoryMobileMode?: boolean;
};

export default function Header({ categoryMobileMode }: HeaderProps) {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [categories, setCategories] = useState<NavCategory[]>(DEFAULT_CATEGORIES);

  const { user, logout } = useAuth();
  const { zoneSettings } = useShippingSettings();
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [userPincode, setUserPincode] = useState('');
  const [userCity, setUserCity] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Load saved live location on refresh with top priority over static user profile
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ar_user_pincode_info');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.city || parsed.pincode) {
          setUserPincode(parsed.pincode || '');
          setUserCity(parsed.city || '');
          return;
        }
      }
    } catch {}

    if (user?.pincode) {
      setUserPincode(user.pincode);
      setUserCity(user.city || '');
    }
  }, [user]);

  const handleLiveLocation = () => {
    if (typeof window === 'undefined') return;
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please click Change to type your Pincode.');
      setLocationModalOpen(true);
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          let detectedPin = '';
          let detectedCity = '';

          // 1. Try BigDataCloud reverse geocode client (high accuracy city & postcode in India)
          try {
            const bdcRes = await fetch(
              'https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=' + lat + '&longitude=' + lon + '&localityLanguage=en'
            );
            if (bdcRes.ok) {
              const bdcData = await bdcRes.json();
              if (bdcData.postcode) {
                detectedPin = String(bdcData.postcode).replace(/\D/g, '').slice(0, 6);
              }
              detectedCity = bdcData.city || bdcData.locality || bdcData.principalSubdivision || '';
            }
          } catch (e) {
            console.warn('BigDataCloud error:', e);
          }

          // 2. Fallback to Nominatim if needed
          if (!detectedPin || detectedPin.length !== 6 || !detectedCity) {
            try {
              const nomRes = await fetch(
                'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lon
              );
              if (nomRes.ok) {
                const nomData = await nomRes.json();
                const nomPin = nomData?.address?.postcode;
                if (!detectedPin && nomPin) {
                  detectedPin = String(nomPin).replace(/\D/g, '').slice(0, 6);
                }
                if (!detectedCity) {
                  detectedCity =
                    nomData?.address?.city ||
                    nomData?.address?.town ||
                    nomData?.address?.village ||
                    nomData?.address?.state_district ||
                    nomData?.address?.state ||
                    '';
                }
              }
            } catch (e) {
              console.warn('Nominatim error:', e);
            }
          }

          // 3. If 6-digit pincode detected, verify district from India Post API
          if (detectedPin && detectedPin.length === 6) {
            try {
              const postRes = await fetch('/api/lookup-pincode?pincode=' + detectedPin);
              if (postRes.ok) {
                const postData = await postRes.json();
                if (postData.city) {
                  detectedCity = postData.city;
                }
              }
            } catch (e) {
              console.warn('India Post lookup error:', e);
            }
          }

          if (detectedPin || detectedCity) {
            const cleanPin = detectedPin ? detectedPin.slice(0, 6) : '';
            const finalCity = detectedCity || (cleanPin ? ('Pin ' + cleanPin) : 'My Location');
            setUserPincode(cleanPin);
            setUserCity(finalCity);
            localStorage.setItem('ar_user_pincode_info', JSON.stringify({ pincode: cleanPin, city: finalCity }));
            window.dispatchEvent(
              new CustomEvent('ar_location_changed', { detail: { pincode: cleanPin, city: finalCity } })
            );
            setLocationModalOpen(false);
          } else {
            alert('Could not determine exact location. Please enter your Pincode.');
            setLocationModalOpen(true);
          }
        } catch (err) {
          console.error('Location resolution error:', err);
          alert('Could not determine exact location. Please enter your Pincode.');
          setLocationModalOpen(true);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setIsLocating(false);
        console.warn('Geolocation error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          alert('Location permission was denied in your browser. Please click Change to type your Pincode.');
        } else {
          alert('Unable to retrieve GPS location. Please click Change to type your Pincode.');
        }
        setLocationModalOpen(true);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const activeZone = calculateZoneDelivery(0, userPincode, zoneSettings && zoneSettings.length > 0 ? zoneSettings : DEFAULT_ZONE_SETTINGS);
  const { totalCount } = useCart();
  const { wishlistCount } = useWishlist();

  useEffect(() => {
    let isMounted = true;
    fetchJson<CategoryApiRow[]>('/api/categories?active=true&tree=true')
      .then((data) => {
        if (Array.isArray(data) && data.length > 0 && isMounted) {
          const mapped: NavCategory[] = data.map((c) => ({
            id: c.id,
            name: c.name,
            href: `/category?category=${encodeURIComponent(c.name)}`,
            children: (c.children || []).map((child) => ({
              id: child.id,
              name: child.name,
              href: `/category?category=${encodeURIComponent(c.name)}&subcategory=${encodeURIComponent(child.name)}`,
            })),
          }));
          setCategories(mapped);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100/80 bg-white/95 shadow-sm backdrop-blur-xl">

      {/* Main Navigation */}
      <div className={`container mx-auto px-4 py-3 ${categoryMobileMode ? 'hidden sm:block' : ''}`}>
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center group py-0.5">
            <div className="relative h-10 sm:h-12 w-20 sm:w-24 flex-shrink-0">
              <Image
                src="/home-images/logo.png"
                alt="AR Garment"
                fill
                className="object-contain group-hover:scale-105 transition-transform"
                priority
              />
            </div>
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden lg:flex items-center gap-9">
            <Link
              href="/"
              className="nav-link-premium text-gray-700 hover:text-[#083028] transition-colors text-lg font-semibold tracking-wide py-2"
            >
              Home
            </Link>

            {/* Category Dropdown */}
            <div
              className="relative group"
              onMouseEnter={() => setCategoryDropdownOpen(true)}
              onMouseLeave={() => setCategoryDropdownOpen(false)}
            >
              <div className="nav-link-premium flex items-center gap-1.5 cursor-pointer text-gray-700 hover:text-[#083028] transition-colors text-lg font-semibold tracking-wide py-2">
                <Link href="/category">Category</Link>
                <ChevronDown size={18} className="text-gray-500 group-hover:text-[#083028] transition-transform duration-200 group-hover:rotate-180" />
              </div>

              <div className="absolute top-full left-1/2 -translate-x-1/2 translate-y-2 pt-2 w-[min(760px,82vw)] z-50 opacity-0 invisible group-hover:translate-y-0 group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="bg-white rounded-xl shadow-xl border border-gray-100 py-2.5 overflow-hidden">
                  <Link
                    href="/category"
                    className="block px-5 py-2.5 text-sm font-bold text-[#083028] bg-gray-50 hover:bg-[#F5F1E8] border-b border-gray-100"
                  >
                    View All Categories →
                  </Link>
                  <div className="grid grid-cols-2 gap-x-5 gap-y-4 p-4 lg:grid-cols-3">
                    {categories.map((category) => (
                      <div key={category.id || category.name} className="min-w-0">
                        <Link
                          href={category.href}
                          className="block truncate text-sm font-extrabold text-[#083028] hover:text-amber-700"
                        >
                          {category.name}
                        </Link>
                        {(category.children || []).length > 0 && (
                          <div className="mt-1.5 space-y-1">
                            {(category.children || []).slice(0, 6).map((subcategory) => (
                              <Link
                                key={subcategory.id || subcategory.name}
                                href={subcategory.href}
                                className="block truncate py-0.5 text-xs font-medium text-gray-600 hover:text-[#083028] hover:underline"
                              >
                                {subcategory.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Link
              href="/about"
              className="nav-link-premium text-gray-700 hover:text-[#083028] transition-colors text-lg font-semibold tracking-wide py-2"
            >
              About Us
            </Link>

            <Link
              href="/contact"
              className="nav-link-premium text-gray-700 hover:text-[#083028] transition-colors text-lg font-semibold tracking-wide py-2"
            >
              Contact Us
            </Link>
          </nav>

          {/* Right items: About Us, Contact Us, Search, Wishlist, Account, Cart */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Mobile About Us & Contact Us links (on desktop they appear in main nav) */}


            {/* Delivery Location Pill Button - Direct 1-Click Live Location */}
            <button
              type="button"
              onClick={handleLiveLocation}
              disabled={isLocating}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full border border-gray-200/90 bg-white hover:border-[#083028]/30 hover:bg-emerald-50/30 text-gray-700 hover:text-[#083028] transition-all text-xs font-semibold shadow-xs"
              title="Click to fetch your live location"
            >
              {isLocating ? (
                <Loader2 size={14} className="text-emerald-700 animate-spin shrink-0" />
              ) : (
                <MapPin size={14} className="text-emerald-700 shrink-0" />
              )}
              <div className="text-left hidden sm:block leading-tight">
                <span className="block text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                  {isLocating ? 'Detecting...' : 'Deliver to'}
                </span>
                <span className="block text-[11px] font-bold text-gray-800 truncate max-w-[110px]">
                  {isLocating
                    ? 'Fetching GPS...'
                    : userCity || (userPincode ? 'Pin ' + userPincode : 'Use Live Location')}
                </span>
              </div>
              <span className="sm:hidden text-[11px] font-bold text-gray-800">
                {isLocating ? '...' : userCity || userPincode || 'Live Location'}
              </span>
            </button>

            {/* Search Button */}
            <button
              type="button"
              onClick={() => setSearchModalOpen(true)}
              className="micro-icon w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-gray-200/80 bg-white hover:-translate-y-0.5 hover:border-[#083028]/25 hover:bg-gray-50 hover:shadow-md flex items-center justify-center text-gray-700 hover:text-[#083028] transition-all shadow-xs flex-shrink-0"
              aria-label="Search Catalog"
              title="Search products (Ctrl+K)"
            >
              <Search size={16} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            {/* Wishlist Button with live counter badge */}
            <Link
              href="/wishlist"
              className="micro-icon relative w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-gray-200/80 bg-white hover:-translate-y-0.5 hover:border-rose-200 hover:bg-gray-50 hover:shadow-md flex items-center justify-center text-gray-700 hover:text-rose-600 transition-all shadow-xs flex-shrink-0"
              aria-label={`Wishlist with ${wishlistCount} items`}
              title="My Wishlist"
            >
              <Heart size={16} className={`sm:w-[18px] sm:h-[18px] ${wishlistCount > 0 ? 'text-rose-600 fill-rose-50' : ''}`} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] sm:min-w-[17px] sm:h-[17px] px-1 bg-rose-600 text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in-75 duration-200">
                  {wishlistCount > 99 ? '99+' : wishlistCount}
                </span>
              )}
            </Link>

            {/* User Account Button */}
            <Link
              href={user ? '/account' : '/login'}
              className="micro-icon w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-gray-200/80 bg-white hover:-translate-y-0.5 hover:border-[#083028]/25 hover:bg-gray-50 hover:shadow-md flex items-center justify-center text-gray-700 hover:text-[#083028] transition-all shadow-xs flex-shrink-0"
              aria-label={user ? `Account: ${user.name}` : 'Sign In'}
              title={user ? `My Account (${user.name})` : 'Sign In'}
            >
              <User size={16} className="sm:w-[18px] sm:h-[18px]" />
            </Link>

            {/* Shopping Bag Button (Desktop only, mobile has bottom widget) */}
            <Link
              href="/cart"
              className="micro-icon relative w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-200/80 bg-white hover:-translate-y-0.5 hover:border-[#083028]/25 hover:bg-gray-50 hover:shadow-md hidden lg:flex items-center justify-center text-gray-700 hover:text-[#083028] transition-all shadow-xs flex-shrink-0"
              aria-label={`Shopping Bag with ${totalCount} items`}
              title="Shopping Bag"
            >
              <ShoppingBag size={18} />
              {totalCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-[#083028] text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-in zoom-in-75 duration-200">
                  {totalCount > 99 ? '99+' : totalCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {categoryMobileMode && (
        <div className="flex h-14 items-center gap-2 border-b border-gray-200 px-2 sm:hidden">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) window.history.back();
              else window.location.assign('/');
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-800 transition hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeft size={22} />
          </button>
          <span className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900">All Categories</span>
          <button
            type="button"
            onClick={() => setSearchModalOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-900 transition hover:bg-gray-100"
            aria-label="Search catalog"
          >
            <Search size={21} />
          </button>
          <Link
            href="/cart"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-900 transition hover:bg-gray-100"
            aria-label={`Shopping bag with ${totalCount} items`}
          >
            <ShoppingBag size={21} />
            {totalCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-red-500 px-0.5 text-[9px] font-bold leading-none text-white">
                {totalCount > 99 ? '99+' : totalCount}
              </span>
            )}
          </Link>
        </div>
      )}

      {/* Interactive Live Search Modal */}
      <SearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        categories={categories}
      />

      {/* Interactive Delivery Location Modal (Live Location Only) */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
            <button
              type="button"
              onClick={() => setLocationModalOpen(false)}
              className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-[#083028]">
                <MapPin size={22} className="text-[#083028]" />
              </span>
              <div>
                <h3 className="text-base font-bold text-gray-900">Delivery Location</h3>
                <p className="text-xs text-gray-500">Live zone delivery pricing will be applied</p>
              </div>
            </div>

            {/* Current Active Location Card */}
            {(userCity || userPincode) && (
              <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Active Location</span>
                  <p className="text-sm font-bold text-gray-900">
                    {userCity} {userPincode ? '(' + userPincode + ')' : ''}
                  </p>
                  <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                    {activeZone.zone.zoneName} • {activeZone.zone.isActive ? 'Free delivery above ₹' + activeZone.zone.freeDeliveryThreshold.toLocaleString('en-IN') : 'Standard Delivery ₹' + activeZone.zone.standardDeliveryFee}
                  </p>
                </div>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white">
                  <Check size={16} />
                </span>
              </div>
            )}

            {/* Live GPS Button */}
            <button
              type="button"
              onClick={handleLiveLocation}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#083028] py-3 px-4 text-xs font-bold text-white shadow-sm hover:bg-[#06241e] transition-all disabled:opacity-60"
            >
              {isLocating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Detecting GPS Location...</span>
                </>
              ) : (
                <>
                  <Navigation size={16} />
                  <span>Use My Live Location</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
