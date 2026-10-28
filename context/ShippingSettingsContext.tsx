'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { ShippingSettings } from '@/lib/shipping';
import {
  DEFAULT_ZONE_SETTINGS,
  ZoneShippingSetting,
} from '@/lib/zoneShipping';

interface ShippingSettingsContextValue {
  settings: ShippingSettings | null;
  zoneSettings: ZoneShippingSetting[];
  isFreeDeliveryGloballyActive: boolean;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>;
}

const ShippingSettingsContext = createContext<ShippingSettingsContextValue | undefined>(undefined);

export function ShippingSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ShippingSettings | null>(null);
  const [zoneSettings, setZoneSettings] = useState<ZoneShippingSetting[]>(DEFAULT_ZONE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isFreeDeliveryGloballyActive = zoneSettings.some((z) => Boolean(z.isActive));

  const refreshSettings = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/shipping-settings', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Unable to load shipping settings.');
      }

      if (Array.isArray(result) && result.length > 0) {
        setZoneSettings(result);
        // Map pan-india or first zone to legacy format for backward compatibility
        const anyActive = result.some((z) => Boolean(z.isActive));
        const panIndia = result.find((z) => z.id === 'zone_pan_india') || result[0];
        setSettings({
          freeShippingEnabled: anyActive && panIndia.isActive,
          freeShippingThreshold: panIndia.freeDeliveryThreshold,
          standardShippingCharge: panIndia.standardDeliveryFee,
          updatedAt: panIndia.updatedAt || null,
        });
      } else if (result && typeof result === 'object' && 'freeShippingThreshold' in result) {
        setSettings(result as ShippingSettings);
        setZoneSettings(DEFAULT_ZONE_SETTINGS);
      } else {
        setZoneSettings(DEFAULT_ZONE_SETTINGS);
      }
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error ? loadError.message : 'Unable to load shipping settings.';
      setZoneSettings(DEFAULT_ZONE_SETTINGS);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSettings();
  }, [refreshSettings]);

  return (
    <ShippingSettingsContext.Provider value={{ settings, zoneSettings, isFreeDeliveryGloballyActive, loading, error, refreshSettings }}>
      {children}
    </ShippingSettingsContext.Provider>
  );
}

export function useShippingSettings(): ShippingSettingsContextValue {
  const context = useContext(ShippingSettingsContext);
  if (!context) {
    throw new Error('useShippingSettings must be used within ShippingSettingsProvider.');
  }
  return context;
}
