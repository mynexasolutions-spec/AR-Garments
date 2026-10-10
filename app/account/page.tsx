'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  Package,
  MapPin,
  Phone,
  Info,
  ShieldCheck,
  RotateCcw,
  LogOut,
  ChevronRight,
  X,
  Edit3,
  ArrowRight,
  User,
  ShoppingBag,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CustomerOrderCard } from '@/components/account/CustomerOrderCard';
import type { Order } from '@/lib/orders';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Address {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh',
];

type SectionTab =
  | 'orders'
  | 'address'
  | 'editProfile'
  | 'privacy'
  | 'return';

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Active view on desktop
  const [activeTab, setActiveTab] = useState<SectionTab>('orders');

  // Active modal on mobile
  type ModalType = SectionTab | 'logoutConfirm' | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Sync tab from URL ?tab=
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'orders' || tabParam === 'address') {
      setActiveTab(tabParam as SectionTab);
      setActiveModal(tabParam as SectionTab);
    }
  }, [searchParams]);

  // Redirect if not logged in after auth finishes loading
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/account');
    }
  }, [authLoading, user, router]);

  // Profile data from real logged in user
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileEmail(user.email || '');
    }
  }, [user]);

  // Saved Address from Database & localStorage (NO mock data)
  const [savedAddress, setSavedAddress] = useState<Address | null>(null);
  const [addressEditForm, setAddressEditForm] = useState<Address>({
    fullName: user?.name || '',
    phone: user?.phone || '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Uttar Pradesh',
    pincode: '',
  });

  useEffect(() => {
    if (!user?.id) return;

    // Load from DB first
    fetch(`/api/user/address?userId=${encodeURIComponent(user.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.address) {
          const addr = data.address as Address;
          setSavedAddress(addr);
          setAddressEditForm(addr);
          localStorage.setItem('ar_user_address', JSON.stringify(addr));
        } else {
          // Check localStorage fallback
          const stored = localStorage.getItem('ar_user_address');
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as Address;
              setSavedAddress(parsed);
              setAddressEditForm(parsed);
            } catch {}
          }
        }
      })
      .catch(() => {
        const stored = localStorage.getItem('ar_user_address');
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as Address;
            setSavedAddress(parsed);
            setAddressEditForm(parsed);
          } catch {}
        }
      });
  }, [user]);


  // Real Orders from Database (NO mock data)
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      setOrdersLoading(false);
      return;
    }

    setOrdersLoading(true);
    setOrdersError(null);
    fetch(`/api/orders?userId=${encodeURIComponent(user.id)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Unable to load your orders.');
        }
        return data;
      })
      .then((data) => {
        const list: Order[] = Array.isArray(data)
          ? data
          : Array.isArray(data?.orders)
            ? data.orders
            : [];
        setOrders(list);
      })
      .catch((error: unknown) => {
        setOrders([]);
        setOrdersError(
          error instanceof Error ? error.message : 'Unable to load your orders.'
        );
      })
      .finally(() => {
        setOrdersLoading(false);
      });
  }, [user?.id]);

  // Save profile handler
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem(
        'ar_user_profile',
        JSON.stringify({
          name: profileName,
          phone: profilePhone,
          email: profileEmail,
        })
      );
    } catch {}
    toast.success('Profile details updated successfully! ✓', { title: 'Profile Updated' });
    setActiveModal(null);
  };

  // Save address handler (syncs to DB and localStorage)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedAddress(addressEditForm);
    try {
      localStorage.setItem('ar_user_address', JSON.stringify(addressEditForm));
    } catch {}

    if (user?.id) {
      try {
        await fetch('/api/user/address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            address: addressEditForm,
          }),
        });
      } catch {}
    }

    toast.success('Delivery address saved successfully! ✓', { title: 'Address Saved' });
    setActiveModal(null);
  };

  const handleLogoutAction = () => {
    logout();
    toast.info('You have been logged out successfully.', { title: 'Signed Out' });
    setActiveModal(null);
    router.push('/login');
  };

  const handleMenuClick = (tab: SectionTab) => {
    setActiveTab(tab);
    setActiveModal(tab);
  };

  // Show loading spinner while determining auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-between">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={36} className="animate-spin text-[#083028]" />
          <p className="text-xs text-gray-500 font-medium">Loading your account...</p>
        </div>
        <Footer />
      </div>
    );
  }

  const displayName = profileName || user?.name || user?.email?.split('@')[0] || 'My Account';
  const displayPhone = profilePhone || user?.phone || user?.email || '';

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col justify-between">
      <Header />

      <main className="flex-1 py-4 sm:py-8 lg:py-10 px-3 sm:px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb (Desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-gray-500 mb-6">
            <Link href="/" className="hover:text-[#083028] transition-colors">
              Home
            </Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">My Account</span>
          </div>

          {/* Responsive Layout: Single column on Mobile, 2-Column on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* ────────────────────────────────────────────────────────── */}
            {/* LEFT COLUMN: Profile Header + Menu Navigation             */}
            {/* ────────────────────────────────────────────────────────── */}
            <div className="lg:col-span-4 xl:col-span-4 space-y-3.5">
              {/* TOP PROFILE HEADER BANNER (Vibrant Red) */}
              <div className="bg-[#D81A24] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden flex items-center justify-between">
                <div className="space-y-1 z-10 min-w-0 pr-3">
                  <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight truncate">
                    {displayName}
                  </h1>
                  <p className="text-xs sm:text-sm font-medium text-white/95 tracking-wide truncate">
                    {displayPhone}
                  </p>
                  <button
                    onClick={() => handleMenuClick('editProfile')}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-white/90 hover:text-white pt-1 transition-colors"
                  >
                    <span>Edit Profile</span>
                    <ChevronRight size={14} />
                  </button>
                </div>

                <div className="relative z-10 flex-shrink-0">
                  <button
                    onClick={() => handleMenuClick('editProfile')}
                    className="w-16 h-16 sm:w-18 sm:h-18 rounded-full border-[3px] border-white overflow-hidden shadow-md bg-white/20 text-white flex items-center justify-center font-bold text-2xl uppercase hover:scale-105 transition-transform"
                    title="Edit Profile"
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </button>
                </div>

                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
                <div className="absolute -top-10 left-1/3 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
              </div>

              {/* QUICK ACTION CARD: Wishlist */}
              <div>
                {/* Wishlist Card */}
                <Link
                  href="/wishlist"
                  className="bg-[#FFF0F2] border border-[#FFE0E4] hover:border-[#FFCCD3] rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs transition-all duration-200 group"
                >
                  <div className="flex items-center gap-2.5">
                    <Heart
                      size={22}
                      className="text-[#E11D48] stroke-[2.2] group-hover:scale-110 transition-transform"
                    />
                    <span className="font-bold text-gray-900 text-sm">
                      My Wishlist
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              {/* MAIN MENU CARD LIST (Bank and Language removed as requested) */}
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs divide-y divide-gray-100 overflow-hidden">
                {/* 1. My Orders */}
                <button
                  onClick={() => handleMenuClick('orders')}
                  className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left transition-colors group ${
                    activeTab === 'orders' ? 'bg-gray-100/80 font-bold' : 'hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <Package size={20} className={activeTab === 'orders' ? 'text-[#083028]' : 'text-gray-600'} />
                    <span className={`text-sm ${activeTab === 'orders' ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                      My Orders
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 2. Saved Addresses */}
                <button
                  onClick={() => handleMenuClick('address')}
                  className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left transition-colors group ${
                    activeTab === 'address' ? 'bg-gray-100/80 font-bold' : 'hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <MapPin size={20} className={activeTab === 'address' ? 'text-[#083028]' : 'text-gray-600'} />
                    <span className={`text-sm ${activeTab === 'address' ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                      Saved Addresses
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 3. Contact Us */}
                <Link
                  href="/contact"
                  className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors group"
                >
                  <div className="flex items-center gap-3.5">
                    <Phone size={20} className="text-gray-600 group-hover:text-[#083028]" />
                    <span className="font-semibold text-gray-800 text-sm">
                      Contact Us
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* 4. About us */}
                <Link
                  href="/about"
                  className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-gray-50/80 transition-colors group"
                >
                  <div className="flex items-center gap-3.5">
                    <Info size={20} className="text-gray-600 group-hover:text-[#083028]" />
                    <span className="font-semibold text-gray-800 text-sm">
                      About us
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* 5. Privacy Policy */}
                <button
                  onClick={() => handleMenuClick('privacy')}
                  className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left transition-colors group ${
                    activeTab === 'privacy' ? 'bg-gray-100/80 font-bold' : 'hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <ShieldCheck size={20} className={activeTab === 'privacy' ? 'text-[#083028]' : 'text-gray-600'} />
                    <span className={`text-sm ${activeTab === 'privacy' ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                      Privacy Policy
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 6. Return Policy */}
                <button
                  onClick={() => handleMenuClick('return')}
                  className={`w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left transition-colors group ${
                    activeTab === 'return' ? 'bg-gray-100/80 font-bold' : 'hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <RotateCcw size={20} className={activeTab === 'return' ? 'text-[#083028]' : 'text-gray-600'} />
                    <span className={`text-sm ${activeTab === 'return' ? 'font-bold text-gray-900' : 'font-semibold text-gray-800'}`}>
                      Return Policy
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* 7. Logout */}
                <button
                  onClick={() => setActiveModal('logoutConfirm')}
                  className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between text-left hover:bg-red-50/50 transition-colors group"
                >
                  <div className="flex items-center gap-3.5">
                    <LogOut size={20} className="text-[#DC2626] stroke-[2.2]" />
                    <span className="font-bold text-[#DC2626] text-sm">
                      Logout
                    </span>
                  </div>
                  <ChevronRight size={16} className="text-red-300 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* BOTTOM SOCIAL & BRANDING */}
              <div className="pt-3 pb-4 flex flex-col items-center justify-center gap-2.5">
                <div className="flex items-center gap-3">
                  <a
                    href="https://www.instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] flex items-center justify-center shadow-xs hover:scale-110 transition-transform"
                    title="Instagram"
                  >
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    </svg>
                  </a>
                  <a
                    href="https://www.facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#1877F2] flex items-center justify-center shadow-xs hover:scale-110 transition-transform"
                    title="Facebook"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M13.5 12.5H15.5L16 9.5H13.5V8C13.5 7.2 13.8 6.5 15 6.5H16.2V4.1C15.6 4 14.8 4 14 4C11.5 4 10 5.5 10 8.3V9.5H7.5V12.5H10V20H13.5V12.5Z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.youtube.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-9 h-9 rounded-full bg-[#FF0000] flex items-center justify-center shadow-xs hover:scale-110 transition-transform"
                    title="YouTube"
                  >
                    <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                      <path d="M10 8.5L15.5 12L10 15.5V8.5Z" />
                    </svg>
                  </a>
                </div>
                <p className="text-[11px] font-black tracking-widest text-gray-900 uppercase">
                  <span className="text-red-500">❤️</span> AR GARMENT <span className="text-red-500">❤️</span>
                </p>
              </div>
            </div>

            {/* ────────────────────────────────────────────────────────── */}
            {/* RIGHT COLUMN (DESKTOP ONLY): Full Dashboard Detail View   */}
            {/* ────────────────────────────────────────────────────────── */}
            <div className="hidden lg:block lg:col-span-8 xl:col-span-8">
              {/* 1. ORDERS PANE (Real DB Orders Only) */}
              {activeTab === 'orders' && (
                <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                        <Package size={22} className="text-[#083028]" />
                        <span>My Orders</span>
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Track your shipments and order history
                      </p>
                    </div>
                    <Link
                      href="/category"
                      className="text-xs font-bold text-[#083028] bg-[#083028]/10 hover:bg-[#083028]/20 px-3.5 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1.5"
                    >
                      <span>Explore Catalog</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>

                  {ordersLoading ? (
                    <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                      <Loader2 size={28} className="animate-spin text-[#083028]" />
                      <p className="text-xs">Fetching your orders from database...</p>
                    </div>
                  ) : ordersError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center">
                      <p className="text-sm font-bold text-red-700">Unable to load your orders</p>
                      <p className="mt-1 text-xs text-red-600">{ordersError}</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <Package size={44} className="mx-auto text-gray-300" />
                      <h3 className="text-base font-bold text-gray-800">No orders placed yet</h3>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        Explore our wholesale collections of Sarees, Suits, and Dupattas and place your order.
                      </p>
                      <Link
                        href="/category"
                        className="inline-flex items-center gap-2 bg-[#083028] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#051e19] transition-colors shadow-xs"
                      >
                        Start Shopping →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <CustomerOrderCard key={order.id} order={order} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. SAVED ADDRESSES PANE (Real User Address Only) */}
              {activeTab === 'address' && (
                <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="pb-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                      <MapPin size={22} className="text-[#083028]" />
                      <span>Saved Delivery Address</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Manage your delivery address for fast checkout
                    </p>
                  </div>

                  {/* Address Display or Empty State */}
                  {savedAddress && savedAddress.addressLine1 ? (
                    <div className="p-5 rounded-2xl border border-emerald-200 bg-emerald-50/40 relative">
                      <span className="absolute top-4 right-4 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                        Current Delivery Address
                      </span>
                      <h3 className="font-bold text-gray-900 text-sm">{savedAddress.fullName}</h3>
                      <p className="text-xs text-gray-600 mt-1">{savedAddress.phone}</p>
                      <p className="text-xs text-gray-700 mt-2 leading-relaxed">
                        {savedAddress.addressLine1}
                        {savedAddress.addressLine2 && `, ${savedAddress.addressLine2}`}
                        <br />
                        {savedAddress.city}, {savedAddress.state} - {savedAddress.pincode}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-800">
                      No saved delivery address found. Please enter your address details below.
                    </div>
                  )}

                  {/* Edit / Update Form */}
                  <form onSubmit={handleSaveAddress} className="space-y-4 pt-2">
                    <h4 className="text-sm font-bold text-gray-900">
                      {savedAddress?.addressLine1 ? 'Update Address Details' : 'Add New Address'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={addressEditForm.fullName}
                          onChange={(e) => setAddressEditForm({ ...addressEditForm, fullName: e.target.value })}
                          required
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-[#083028]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                        <input
                          type="text"
                          value={addressEditForm.phone}
                          onChange={(e) => setAddressEditForm({ ...addressEditForm, phone: e.target.value })}
                          required
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-[#083028]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block font-bold text-gray-700 mb-1">Address Line 1</label>
                        <input
                          type="text"
                          value={addressEditForm.addressLine1}
                          onChange={(e) => setAddressEditForm({ ...addressEditForm, addressLine1: e.target.value })}
                          required
                          placeholder="Flat, House no., Building, Street"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-[#083028]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block font-bold text-gray-700 mb-1">Address Line 2 (Optional)</label>
                        <input
                          type="text"
                          value={addressEditForm.addressLine2 || ''}
                          onChange={(e) => setAddressEditForm({ ...addressEditForm, addressLine2: e.target.value })}
                          placeholder="Landmark, Area"
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-[#083028]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          value={addressEditForm.city}
                          onChange={(e) => setAddressEditForm({ ...addressEditForm, city: e.target.value })}
                          required
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-[#083028]"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-1">Pincode</label>
                        <input
                          type="text"
                          value={addressEditForm.pincode}
                          onChange={(e) => setAddressEditForm({ ...addressEditForm, pincode: e.target.value })}
                          required
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-[#083028]"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block font-bold text-gray-700 mb-1">State</label>
                        <select
                          value={addressEditForm.state}
                          onChange={(e) => setAddressEditForm({ ...addressEditForm, state: e.target.value })}
                          className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-[#083028]"
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#083028] hover:bg-[#051e19] text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                    >
                      Save Delivery Address
                    </button>
                  </form>
                </div>
              )}


              {/* 4. EDIT PROFILE PANE */}
              {activeTab === 'editProfile' && (
                <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-6">
                  <div className="pb-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                      <Edit3 size={22} className="text-[#D81A24]" />
                      <span>Edit Personal Profile</span>
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Keep your contact and login details updated
                    </p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4 max-w-md text-xs">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-[#D81A24]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="text"
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        placeholder="e.g. +91 9876543210"
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-[#D81A24]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        value={profileEmail}
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-[#D81A24]"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-[#D81A24] hover:bg-[#b8141d] text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
                    >
                      Save Profile Changes
                    </button>
                  </form>
                </div>
              )}

              {/* 5. PRIVACY POLICY PANE */}
              {activeTab === 'privacy' && (
                <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-5 text-xs text-gray-600 leading-relaxed">
                  <div className="pb-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                      <ShieldCheck size={22} className="text-[#083028]" />
                      <span>Privacy &amp; Security Policy</span>
                    </h2>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">AR Garment Customer Privacy Policy</p>
                  <p>
                    At AR Garment, we value the trust you place in us. We are committed to protecting your personal information and wholesale trade credentials.
                  </p>
                  <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">1. Information We Collect</h4>
                  <p>
                    We collect your name, phone number, delivery address, and order history strictly to fulfill your orders and provide express wholesale customer support.
                  </p>
                  <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">2. Data Security &amp; Encryption</h4>
                  <p>
                    All your payment and contact information is encrypted through SSL/TLS protocols and never shared with unauthorized parties.
                  </p>
                </div>
              )}

              {/* 6. RETURN POLICY PANE */}
              {activeTab === 'return' && (
                <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-xs space-y-5 text-xs text-gray-600 leading-relaxed">
                  <div className="pb-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2.5">
                      <RotateCcw size={22} className="text-[#083028]" />
                      <span>7-Day Return &amp; Exchange Policy</span>
                    </h2>
                  </div>
                  <p className="font-bold text-gray-900 text-sm">Hassle-Free Returns at AR Garment</p>
                  <p>
                    We stand behind the quality of every garment we supply. If you are not satisfied with your purchase, you can initiate a return or exchange within 7 days of delivery.
                  </p>
                  <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">1. Eligibility</h4>
                  <p>
                    Items must be unused, unwashed, with all original brand tags and packaging intact.
                  </p>
                  <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">2. Free Doorstep Pickup</h4>
                  <p>
                    Our courier partner will arrange doorstep pickup from your registered address within 24-48 business hours.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ────────────────────────────────────────────────────────── */}
      {/* MOBILE POPUP MODALS (Active only on small screens)         */}
      {/* ────────────────────────────────────────────────────────── */}

      {/* 1. EDIT PROFILE MODAL (Mobile) */}
      {activeModal === 'editProfile' && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Edit3 size={18} className="text-[#D81A24]" />
                <span>Edit Profile</span>
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#D81A24] text-white font-bold text-sm rounded-xl transition-colors shadow-md"
              >
                Save Profile
              </button>
            </form>
          </div>
        </div>
      )}


      {/* 3. ORDERS MODAL (Mobile) */}
      {activeModal === 'orders' && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Package size={20} className="text-[#083028]" />
                <span>My Orders</span>
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-3 flex-1 text-xs">
              {ordersLoading ? (
                <div className="py-12 text-center text-gray-400">Loading orders...</div>
              ) : ordersError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-8 text-center">
                  <p className="text-sm font-bold text-red-700">Unable to load your orders</p>
                  <p className="mt-1 text-xs text-red-600">{ordersError}</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <Package size={36} className="mx-auto text-gray-300" />
                  <p className="text-sm font-bold text-gray-700">No orders placed yet</p>
                  <Link
                    href="/category"
                    onClick={() => setActiveModal(null)}
                    className="inline-block text-xs font-bold text-[#083028] underline"
                  >
                    Start shopping now →
                  </Link>
                </div>
              ) : (
                orders.map((order) => (
                  <CustomerOrderCard key={order.id} order={order} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. ADDRESS MODAL (Mobile) */}
      {activeModal === 'address' && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <MapPin size={18} className="text-[#083028]" />
                <span>Saved Address</span>
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveAddress} className="p-4 overflow-y-auto space-y-3">
              <div>
                <label className="block font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={addressEditForm.fullName}
                  onChange={(e) => setAddressEditForm({ ...addressEditForm, fullName: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Phone</label>
                <input
                  type="text"
                  value={addressEditForm.phone}
                  onChange={(e) => setAddressEditForm({ ...addressEditForm, phone: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={addressEditForm.addressLine1}
                  onChange={(e) => setAddressEditForm({ ...addressEditForm, addressLine1: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold mb-1">City</label>
                  <input
                    type="text"
                    value={addressEditForm.city}
                    onChange={(e) => setAddressEditForm({ ...addressEditForm, city: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Pincode</label>
                  <input
                    type="text"
                    value={addressEditForm.pincode}
                    onChange={(e) => setAddressEditForm({ ...addressEditForm, pincode: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-gray-50 border rounded-xl"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-[#083028] text-white font-bold rounded-xl"
              >
                Save Delivery Address
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. PRIVACY MODAL (Mobile) */}
      {activeModal === 'privacy' && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl p-5 text-xs text-gray-600 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-base font-bold text-gray-900">Privacy Policy</h2>
              <button onClick={() => setActiveModal(null)}><X size={16} /></button>
            </div>
            <p>At AR Garment, your data is securely stored and protected with SSL encryption.</p>
          </div>
        </div>
      )}

      {/* 6. RETURN MODAL (Mobile) */}
      {activeModal === 'return' && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[80vh] flex flex-col shadow-2xl p-5 text-xs text-gray-600 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b">
              <h2 className="text-base font-bold text-gray-900">7-Day Return Policy</h2>
              <button onClick={() => setActiveModal(null)}><X size={16} /></button>
            </div>
            <p>Enjoy hassle-free returns within 7 days of delivery with complimentary doorstep pickup.</p>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL (Both Mobile & Desktop) */}
      {activeModal === 'logoutConfirm' && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl text-center space-y-3">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
              <LogOut size={26} strokeWidth={2.2} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Sign Out?</h3>
            <p className="text-xs text-gray-500">
              Are you sure you want to sign out of your AR Garment account?
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogoutAction}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#b91c1c] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#083028] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <AccountContent />
    </Suspense>
  );
}
