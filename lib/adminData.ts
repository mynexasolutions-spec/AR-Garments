// Centralized admin data store with Supabase sync and localStorage fallback
import { supabase } from '@/lib/supabase';

export interface HeroSlide {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  image: string;
  label: string;
  active: boolean;
  order: number;
}

export interface Product {
  id: string;
  name: string;
  price: string;
  numericPrice?: number;
  category?: string;
  categoryId?: string;
  subcategoryId?: string | null;
  brand?: string;
  image: string;
  images?: string[];
  description?: string;
  specification?: string;
  shippingCare?: string;
  stock?: number;
  active: boolean;
  isNewArrival?: boolean; // Direct flag for New Arrivals
  isBestSeller?: boolean; // Direct flag for Best Sellers
  isPremium?: boolean;
  isGold?: boolean;
  order: number;
  // Specifications
  fabric?: string;
  colour?: string;
  work?: string;
  length?: string;
  occasion?: string;
  fitShape?: string;
  sleeveLength?: string;
  customSpecifications?: Array<{ label: string; value: string }>;
  // Main Product Info
  size?: string;
  piecesPerSet?: number;
  pricePerPiece?: number;
  totalSetPrice?: number;
  purchasePrice?: number;
  totalStockPieces?: number;
  weight?: string;
  weightUnit?: string;
  gstRate?: string;
  hsnCode?: string;
  variants?: Array<{
    id: string;
    size?: string;
    color?: string;
    price?: number;
    stock?: number;
  }>;
  // Social Links
  youtubeUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  // Delivery Type (per-product override)
  deliveryType?: 'standard' | 'low_margin'; // 'standard' = green Free Delivery tag; 'low_margin' = orange + Delivery tag
  deliveryChargeAmount?: number;             // Fixed delivery charge in ₹ for low_margin products
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  active: boolean;
}

export type DiscountType = 'percentage' | 'flat' | 'free_shipping';

export interface Coupon {
  id: string;
  code: string;
  title: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  applicableCategory: string; // 'All' or specific category
  minOrderValue: number;
  maxDiscountAmount?: number | null;
  usageLimit?: number | null;
  usedCount: number;
  validFrom?: string;
  validUntil?: string | null;
  active: boolean;
  createdAt?: string;
}

export const defaultCoupons: Coupon[] = [
  {
    id: 'coupon-1',
    code: 'WELCOME10',
    title: 'Welcome Offer',
    description: 'Get 10% off on your first order across all collections',
    discountType: 'percentage',
    discountValue: 10,
    applicableCategory: 'All',
    minOrderValue: 499,
    maxDiscountAmount: 300,
    usageLimit: 500,
    usedCount: 18,
    active: true,
  },
  {
    id: 'coupon-2',
    code: 'SAREE20',
    title: 'Saree Festive Special',
    description: 'Exclusive 20% discount on all designer and embroidered Sarees',
    discountType: 'percentage',
    discountValue: 20,
    applicableCategory: 'Sarees',
    minOrderValue: 999,
    maxDiscountAmount: 500,
    usageLimit: 200,
    usedCount: 34,
    active: true,
  },
  {
    id: 'coupon-3',
    code: 'SUIT15',
    title: 'Suits & Dress Material Discount',
    description: 'Save 15% on any Suits & Dress Material outfit',
    discountType: 'percentage',
    discountValue: 15,
    applicableCategory: 'Suits & Dress Material',
    minOrderValue: 799,
    maxDiscountAmount: 400,
    usageLimit: 150,
    usedCount: 12,
    active: true,
  },
  {
    id: 'coupon-4',
    code: 'DUPATTA100',
    title: 'Dupatta Flat ₹100 Off',
    description: 'Flat ₹100 instant discount on Dupatta Sets',
    discountType: 'flat',
    discountValue: 100,
    applicableCategory: 'Dupatta Sets',
    minOrderValue: 699,
    maxDiscountAmount: null,
    usageLimit: 100,
    usedCount: 7,
    active: true,
  },
  {
    id: 'coupon-5',
    code: 'FLAT300',
    title: 'Grand Shopping Discount',
    description: 'Flat ₹300 off on any order above ₹1,999 across all categories',
    discountType: 'flat',
    discountValue: 300,
    applicableCategory: 'All',
    minOrderValue: 1999,
    maxDiscountAmount: null,
    usageLimit: 100,
    usedCount: 23,
    active: true,
  },
  {
    id: 'coupon-6',
    code: 'FREESHIP',
    title: 'Free Express Shipping',
    description: 'Complimentary shipping on all orders above ₹500',
    discountType: 'free_shipping',
    discountValue: 0,
    applicableCategory: 'All',
    minOrderValue: 500,
    maxDiscountAmount: null,
    usageLimit: null,
    usedCount: 52,
    active: true,
  },
];

export const defaultHeroSlides: HeroSlide[] = [
  { id: '1', title: 'Tradition In\nEvery Thread', subtitle: 'Elegant Styles • Premium Fabrics • For Every You', buttonText: 'Shop Now Collection', buttonLink: '/category', image: '/home-images/hero-image1.jpg', label: 'Timeless Ethnic Wear', active: true, order: 1 },
  { id: '2', title: 'Discover Your\nPerfect Style', subtitle: 'Handcrafted with Love • Worn with Pride', buttonText: 'Explore Collection', buttonLink: '/category', image: '/home-images/hero-image2.jpg', label: 'Timeless Ethnic Wear', active: true, order: 2 },
  { id: '3', title: 'Celebrate\nEvery Moment', subtitle: 'Festive Collection • Wedding Special • Everyday Elegance', buttonText: 'View Collection', buttonLink: '/category', image: '/home-images/hero-image3.jpg', label: 'Timeless Ethnic Wear', active: true, order: 3 },
  { id: '4', title: 'Timeless\nElegance', subtitle: 'Classic Designs • Modern Touch • Unmatched Quality', buttonText: 'Shop Collection', buttonLink: '/category', image: '/home-images/hero-image4.jpg', label: 'Timeless Ethnic Wear', active: true, order: 4 },
  { id: '5', title: 'Festive\nSplendor', subtitle: 'Celebrate in Style • Traditional Craftsmanship • Premium Quality', buttonText: 'Explore Now', buttonLink: '/category', image: '/home-images/hero-image5.jpg', label: 'Timeless Ethnic Wear', active: true, order: 5 },
  { id: '6', title: 'Wedding\nSpecial', subtitle: 'Bridal Collection • Exquisite Designs • Perfect Fit', buttonText: 'View Collection', buttonLink: '/category', image: '/home-images/hero-image6.jpg', label: 'Timeless Ethnic Wear', active: true, order: 6 },
  { id: '7', title: 'Everyday\nGrace', subtitle: 'Comfort Meets Style • Daily Wear • Affordable Luxury', buttonText: 'Shop Now', buttonLink: '/category', image: '/home-images/hero-image7.jpg', label: 'Timeless Ethnic Wear', active: true, order: 7 },
];

export const defaultUnifiedProducts: Product[] = [
  { id: 'prod-1', name: 'Embroidered Saree', price: '₹1,299', numericPrice: 1299, category: 'Sarees', image: '/home-images/Embroidered Saree.jpg', stock: 25, active: true, isNewArrival: true, isBestSeller: false, order: 1 },
  { id: 'prod-2', name: 'Cotton Suit Set', price: '₹899', numericPrice: 899, category: 'Suits & Dress Material', image: '/home-images/Cotton Suit Set.jpg', stock: 40, active: true, isNewArrival: true, isBestSeller: false, order: 2 },
  { id: 'prod-3', name: 'Designer Dupatta Set', price: '₹1,499', numericPrice: 1499, category: 'Dupatta Sets', image: '/home-images/Designer Dupatta Set.jpg', stock: 18, active: true, isNewArrival: true, isBestSeller: true, order: 3 },
  { id: 'prod-4', name: 'Anarkali Suit', price: '₹999', numericPrice: 999, category: 'Suits & Dress Material', image: '/home-images/Anarkali Suit.jpg', stock: 32, active: true, isNewArrival: true, isBestSeller: false, order: 4 },
  { id: 'prod-5', name: 'Party Wear Saree', price: '₹1,799', numericPrice: 1799, category: 'Sarees', image: '/home-images/Party Wear Saree.jpg', stock: 15, active: true, isNewArrival: true, isBestSeller: false, order: 5 },
  { id: 'prod-6', name: 'Silk Blend Saree', price: '₹1,499', numericPrice: 1499, category: 'Sarees', image: '/home-images/Silk Blend Saree.jpg', stock: 28, active: true, isNewArrival: false, isBestSeller: true, order: 6 },
  { id: 'prod-7', name: 'Rayon Kurti Set', price: '₹799', numericPrice: 799, category: 'Suits & Dress Material', image: '/home-images/Rayon Kurti Set.jpg', stock: 35, active: true, isNewArrival: false, isBestSeller: true, order: 7 },
  { id: 'prod-8', name: 'Designer Dupatta Set (Royal)', price: '₹1,299', numericPrice: 1299, category: 'Dupatta Sets', image: '/home-images/Designer Dupatta Set2.jpg', stock: 20, active: true, isNewArrival: false, isBestSeller: true, order: 8 },
  { id: 'prod-9', name: "Men's Kurta Set", price: '₹1,009', numericPrice: 1009, category: 'Men Fashion', image: '/home-images/Men Fashion.jpg', stock: 22, active: true, isNewArrival: false, isBestSeller: true, order: 9 },
  { id: 'prod-10', name: 'Kids Ethnic Wear', price: '₹993', numericPrice: 993, category: 'Kids Fashion', image: '/home-images/Kids Fashion.jpg', stock: 30, active: true, isNewArrival: false, isBestSeller: true, order: 10 },
];

export const defaultNewArrivals: Product[] = defaultUnifiedProducts.filter(p => p.isNewArrival);
export const defaultBestSellers: Product[] = defaultUnifiedProducts.filter(p => p.isBestSeller);

export const defaultTestimonials: Testimonial[] = [
  { id: '1', name: 'Ayesha Khan', location: 'Prayagraj', rating: 5, text: 'Amazing collection of sarees and suits. Good quality and fast delivery. Highly recommended!', active: true },
  { id: '2', name: 'Mohd. Sameer', location: 'Prayagraj', rating: 5, text: 'Loved the variety of dress materials. The affordable fabric quality is excellent.', active: true },
  { id: '3', name: 'Nisha Singh', location: 'Prayagraj', rating: 5, text: 'Best place for ethnic wear. Beautiful designs and great customer service.', active: true },
];

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export const adminData = {
  getHeroSlides: (): HeroSlide[] => getItem('admin_hero_slides', defaultHeroSlides),
  setHeroSlides: (slides: HeroSlide[]) => setItem('admin_hero_slides', slides),
  getProducts: (): Product[] => getItem('admin_products', defaultUnifiedProducts),
  setProducts: (products: Product[]) => setItem('admin_products', products),
  getNewArrivals: (): Product[] => {
    return adminData
      .getProducts()
      .filter((p) => p.isNewArrival)
      .sort((a, b) => a.order - b.order);
  },
  setNewArrivals: (newArrivals: Product[]) => {
    const all = adminData.getProducts();
    const updated = all.map((p) => {
      const match = newArrivals.find((na) => na.id === p.id);
      return match ? { ...p, ...match, isNewArrival: true } : p;
    });
    adminData.setProducts(updated);
  },
  getBestSellers: (): Product[] => {
    return adminData
      .getProducts()
      .filter((p) => p.isBestSeller)
      .sort((a, b) => a.order - b.order);
  },
  setBestSellers: (bestSellers: Product[]) => {
    const all = adminData.getProducts();
    const updated = all.map((p) => {
      const match = bestSellers.find((bs) => bs.id === p.id);
      return match ? { ...p, ...match, isBestSeller: true } : p;
    });
    adminData.setProducts(updated);
  },
  getTestimonials: (): Testimonial[] => getItem('admin_testimonials', defaultTestimonials),
  setTestimonials: (testimonials: Testimonial[]) => setItem('admin_testimonials', testimonials),
};

export const supabaseData = {
  async fetchProducts(): Promise<Product[] | null> {
    try {
      const { data, error } = await supabase.from('products').select('*').order('sort_order');
      if (error || !data) return null;
      return data.map((d) => ({
        id: d.id,
        name: d.name,
        price: d.price,
        numericPrice: d.numeric_price,
        category: d.category,
        image: d.image,
        stock: d.stock,
        active: d.active,
        isNewArrival: d.is_new_arrival,
        isBestSeller: d.is_best_seller,
        order: d.sort_order,
        deliveryType: d.delivery_type ?? 'standard',
        deliveryChargeAmount: d.delivery_charge_amount ?? 0,
      }));
    } catch {
      return null;
    }
  },

  async fetchHeroSlides(): Promise<HeroSlide[] | null> {
    try {
      const { data, error } = await supabase.from('hero_slides').select('*').order('sort_order');
      if (error || !data) return null;
      return data.map((d) => ({
        id: d.id,
        title: d.title,
        subtitle: d.subtitle,
        buttonText: d.button_text,
        buttonLink: d.button_link,
        image: d.image,
        label: d.label,
        active: d.active,
        order: d.sort_order,
      }));
    } catch {
      return null;
    }
  },
};

export const adminAuth = {
  login: async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await fetch('/api/admin/login', { method: 'DELETE' });
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/login';
    }
  },

  isLoggedIn: (): boolean => {
    if (typeof window === 'undefined') return false;
    return true;
  },
};
