'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Coupon } from '@/lib/adminData';
import { useToast } from '@/context/ToastContext';
import { useShippingSettings } from '@/context/ShippingSettingsContext';
import { calculateShippingCharge, ShippingSettings } from '@/lib/shipping';
import { ZoneShippingSetting } from '@/lib/zoneShipping';

export interface CartItem {
  id: string;
  name: string;
  price: string;
  numericPrice: number;
  image: string;
  category?: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: {
    id: string | number;
    name: string;
    price: string;
    numericPrice?: number;
    image: string;
    category?: string;
  }, quantity?: number) => void;
  removeFromCart: (productId: string | number) => void;
  updateQuantity: (productId: string | number, quantity: number) => void;
  clearCart: () => void;
  totalCount: number;
  subtotal: number;
  shipping: number;
  appliedCoupon: Coupon | null;
  applyCoupon: (coupon: Coupon) => void;
  removeCoupon: () => void;
  discountAmount: number;
  finalTotal: number;
  toastMessage: string | null;
  shippingSettings: ShippingSettings | null;
  shippingSettingsLoading: boolean;
  shippingSettingsError: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Helper to parse numeric price
export function parsePrice(priceStr: string | number | undefined, fallback = 0): number {
  if (typeof priceStr === 'number') return priceStr;
  if (!priceStr) return fallback;
  const cleaned = String(priceStr).replace(/[^0-9]/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? fallback : parsed;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const {
    settings: shippingSettings,
    loading: shippingSettingsLoading,
    error: shippingSettingsError,
  } = useShippingSettings();
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ar_cart');
      if (stored) {
        setItems(JSON.parse(stored));
      }
      const storedCoupon = localStorage.getItem('ar_applied_coupon');
      if (storedCoupon) {
        setAppliedCoupon(JSON.parse(storedCoupon));
      }
    } catch (e) {
      console.error('Failed to load cart from storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('ar_cart', JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to storage:', e);
    }
  }, [items, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (appliedCoupon) {
        localStorage.setItem('ar_applied_coupon', JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem('ar_applied_coupon');
      }
    } catch (e) {
      console.error('Failed to save coupon to storage:', e);
    }
  }, [appliedCoupon, isLoaded]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const addToCart = (
    product: {
      id: string | number;
      name: string;
      price: string;
      numericPrice?: number;
      image: string;
      category?: string;
    },
    quantity = 1
  ) => {
    const pId = String(product.id);
    const numPrice = product.numericPrice || parsePrice(product.price);

    setItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === pId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      } else {
        return [
          ...prev,
          {
            id: pId,
            name: product.name,
            price: product.price,
            numericPrice: numPrice,
            image: product.image,
            category: product.category || 'Ethnic Wear',
            quantity,
          },
        ];
      }
    });

    showToast(`Added "${product.name}" to bag ✓`);
    toast.success(`"${product.name}" added to bag`, { title: 'Shopping Bag' });
  };

  const removeFromCart = (productId: string | number) => {
    const pId = String(productId);
    const item = items.find((i) => i.id === pId);
    setItems((prev) => prev.filter((item) => item.id !== pId));
    showToast('Item removed from bag');
    toast.info(item ? `"${item.name}" removed from bag` : 'Item removed from bag', { title: 'Shopping Bag' });
  };

  const updateQuantity = (productId: string | number, quantity: number) => {
    const pId = String(productId);
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === pId ? { ...item, quantity } : item))
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    localStorage.removeItem('ar_cart');
    localStorage.removeItem('ar_applied_coupon');
    toast.info('Cart has been cleared', { title: 'Shopping Bag' });
  };

  const applyCoupon = (coupon: Coupon) => {
    setAppliedCoupon(coupon);
    showToast(`Coupon "${coupon.code}" applied! ✓`);
    toast.success(`Coupon code "${coupon.code}" applied successfully!`, { title: 'Discount Applied' });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    showToast('Coupon removed');
    toast.info('Coupon has been removed', { title: 'Discount' });
  };

  // Calculations
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.numericPrice * item.quantity, 0);

  // Coupon-based free shipping overrides the storewide shipping rule.
  const hasFreeShippingCoupon = appliedCoupon?.discountType === 'free_shipping';
  const shipping = shippingSettings
    ? calculateShippingCharge(subtotal, shippingSettings, hasFreeShippingCoupon)
    : 0;

  // Calculate discount amount
  let discountAmount = 0;
  if (appliedCoupon && subtotal >= (appliedCoupon.minOrderValue || 0)) {
    if (appliedCoupon.discountType === 'percentage') {
      discountAmount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
      if (appliedCoupon.maxDiscountAmount && discountAmount > appliedCoupon.maxDiscountAmount) {
        discountAmount = appliedCoupon.maxDiscountAmount;
      }
    } else if (appliedCoupon.discountType === 'flat') {
      discountAmount = appliedCoupon.discountValue;
    }
  }

  const finalTotal = Math.max(0, subtotal - discountAmount + shipping);

  return (
    <CartContext.Provider
      value={{
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
        toastMessage,
        shippingSettings,
        shippingSettingsLoading,
        shippingSettingsError,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
