'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Home,
  ShoppingBag,
  LogOut,
  ChevronRight,
  Store,
  Menu,
  X,
  Layers,
  Ticket,
  Package,
  Users,
  FolderTree,
  Star,
  Mail,
  MessageSquare,
  Truck,
  Bike,
} from 'lucide-react';
import { useState } from 'react';
import { adminAuth } from '@/lib/adminData';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Orders', href: '/admin/orders', icon: Package },
  { label: 'Customer Queries', href: '/admin/contacts', icon: MessageSquare },
  { label: 'Registered Users', href: '/admin/users', icon: Users },
  { label: 'Business Registrations', href: '/admin/business-registrations', icon: Store },
  { label: 'Products & Catalog', href: '/admin/products', icon: ShoppingBag },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree },
  { label: 'Product Reviews', href: '/admin/reviews', icon: Star },
  { label: 'Coupons & Discounts', href: '/admin/coupons', icon: Ticket },
  { label: 'Zone Active / Shipping', href: '/admin/shipping-settings', icon: Truck },
  { label: 'Delivery Partners', href: '/admin/delivery-partners', icon: Bike },
  { label: 'Newsletter', href: '/admin/newsletter', icon: Mail },
  { label: 'Home Page', href: '/admin/homepage', icon: Home },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await adminAuth.logout();
    // adminAuth.logout() already redirects via window.location.href
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <Store size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">AR Garment</p>
            <p className="text-white/50 text-xs">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-white/30 text-[10px] uppercase tracking-widest px-3 mb-2 font-semibold">Main Menu</p>
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
              isActive(href)
                ? 'translate-x-1 bg-white text-[#083028] shadow-sm'
                : 'text-white/70 hover:translate-x-1 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon size={17} className="transition-transform duration-200 group-hover:scale-110" />
            <span className="flex-1">{label}</span>
            {isActive(href) && <ChevronRight size={14} className="opacity-60" />}
          </Link>
        ))}

        <div className="pt-4 mt-4 border-t border-white/10">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors"
          >
            <Layers size={15} />
            <span>View Live Website â†—</span>
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">Admin</p>
            <p className="text-white/40 text-[10px] truncate">admin@argarment.com</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-red-300 transition-all duration-150"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-10 h-10 bg-[#083028] rounded-lg flex items-center justify-center shadow-lg"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} className="text-white" /> : <Menu size={20} className="text-white" />}
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-40 w-64 bg-[#083028] transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-60 bg-[#083028] flex-col flex-shrink-0 h-screen sticky top-0">
        <SidebarContent />
      </div>
    </>
  );
}

