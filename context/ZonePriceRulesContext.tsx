'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ZonePriceRule,
  ZonePriceResult,
  CategoryIdentifier,
  LocationIdentifier,
  resolveMarkupZone,
  findMatchingRule,
  computeZonePrice,
} from '@/lib/zonePriceMarkup';

interface ZonePriceRulesContextType {
  rules: ZonePriceRule[];
  loading: boolean;
  error: string | null;
  refreshRules: () => Promise<void>;
  /** Computes effective zone price for a product given user's saved/live location */
  getZonePrice: (
    basePrice: number,
    categoryInfo: string | CategoryIdentifier | null | undefined,
    subcategoryId?: string | null,
    pincodeOrLocation?: string | LocationIdentifier | null
  ) => ZonePriceResult;
}

const ZonePriceRulesContext = createContext<ZonePriceRulesContextType | undefined>(undefined);

export function ZonePriceRulesProvider({ children }: { children: React.ReactNode }) {
  const [rules, setRules] = useState<ZonePriceRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/zone-price-rules', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store' },
      });
      if (!res.ok) throw new Error('Failed to load zone price rules');
      const data = await res.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading zone price rules';
      setError(msg);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Listen for location changes across the browser
  useEffect(() => {
    const handleLocationChange = () => {
      // Force re-evaluation by keeping rules state fresh
      setRules((prev) => [...prev]);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('ar_location_changed', handleLocationChange);
      return () => window.removeEventListener('ar_location_changed', handleLocationChange);
    }
  }, []);

  /** Returns user location from override or localStorage */
  function getUserLocation(
    override?: string | LocationIdentifier | null
  ): LocationIdentifier {
    if (typeof override === 'object' && override !== null) {
      return {
        pincode: override.pincode || '',
        city: override.city || '',
      };
    }
    if (typeof override === 'string' && override.trim()) {
      const isDigits = /^\d+$/.test(override.trim());
      return isDigits
        ? { pincode: override.trim(), city: '' }
        : { pincode: '', city: override.trim() };
    }
    if (typeof window === 'undefined') return { pincode: '', city: '' };

    try {
      const info = localStorage.getItem('ar_user_pincode_info');
      if (info) {
        const parsed = JSON.parse(info);
        return { pincode: parsed.pincode || '', city: parsed.city || '' };
      }
      const addr = localStorage.getItem('ar_user_address');
      if (addr) {
        const parsed = JSON.parse(addr);
        return { pincode: parsed.pincode || '', city: parsed.city || '' };
      }
    } catch { /* ignore */ }

    return { pincode: '', city: '' };
  }

  const getZonePrice = useCallback(
    (
      basePrice: number,
      categoryInfo: string | CategoryIdentifier | null | undefined,
      subcategoryId?: string | null,
      pincodeOrLocation?: string | LocationIdentifier | null
    ): ZonePriceResult => {
      const location = getUserLocation(pincodeOrLocation);
      const zone = resolveMarkupZone(location);
      const rule = findMatchingRule(rules, categoryInfo, subcategoryId);
      return computeZonePrice(basePrice, rule, zone);
    },
    [rules]
  );

  return (
    <ZonePriceRulesContext.Provider
      value={{ rules, loading, error, refreshRules: fetchRules, getZonePrice }}
    >
      {children}
    </ZonePriceRulesContext.Provider>
  );
}

export function useZonePriceRules() {
  const ctx = useContext(ZonePriceRulesContext);
  if (!ctx) throw new Error('useZonePriceRules must be used inside ZonePriceRulesProvider');
  return ctx;
}
