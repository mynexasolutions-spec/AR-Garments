'use client';

import { useState, useEffect } from 'react';
import {
  Loader2,
  Check,
  RotateCcw,
  AlertCircle,
  Truck,
  MapPin,
  Sparkles,
  Info
} from 'lucide-react';
import { useShippingSettings } from '@/context/ShippingSettingsContext';
import { useToast } from '@/context/ToastContext';
import {
  DEFAULT_ZONE_SETTINGS,
  ZoneShippingSetting,
} from '@/lib/zoneShipping';

export default function ShippingSettingsPage() {
  const { zoneSettings, loading, error, refreshSettings } = useShippingSettings();
  const { toast } = useToast();

  const [zones, setZones] = useState<ZoneShippingSetting[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (zoneSettings && zoneSettings.length > 0) {
      setZones(zoneSettings);
    }
  }, [zoneSettings]);

  const updateZoneField = (
    index: number,
    field: keyof ZoneShippingSetting,
    value: unknown
  ) => {
    setZones((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch('/api/shipping-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zones),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save zone settings');
      }

      await refreshSettings();
      toast.success('Zone delivery settings saved successfully!', {
        title: 'Settings Saved / सुरक्षित किया गया',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving zone settings';
      setSaveError(msg);
      toast.error(msg, { title: 'Save Failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset all 3 zones to default values?')) {
      setZones(DEFAULT_ZONE_SETTINGS);
      toast.info('Default values loaded. Click "Save Settings" to persist.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[#083028] mb-1">
            <Truck size={18} className="text-[#B8860B]" />
            <span>Zone-Wise Free Delivery Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            ज़ोन-वाइज़ फ्री डिलीवरी सेटिंग्स
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            तीनों ज़ोन का अलग-अलग क्राइटेरिया (Threshold), डिलीवरी चार्ज और चालू/बंद (ON/OFF) बटन
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-2xl text-xs font-bold transition"
          >
            <RotateCcw size={14} /> Defaults
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#083028] hover:bg-[#051e19] text-white rounded-2xl text-xs sm:text-sm font-bold transition shadow-md disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            <span>Save Settings / सुरक्षित करें</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0" />
          <span>Note: {error} (Running with default zone settings until database table is synced)</span>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SECTION: FREE DELIVERY CONFIGURATION (PIXEL-PERFECT MATCH TO SCREENSHOT)
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-3xl border-2 border-gray-200 p-5 sm:p-8 shadow-sm space-y-6">
        
        {/* Title matching Screenshot */}
        <div className="text-center pb-2">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
            Free Delivery Configuration / फ्री डिलीवरी सेटिंग
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Configure individual criteria, delivery fees, and activate/deactivate free shipping per zone.
          </p>
        </div>

        {/* 3 Zone Cards Grid */}
        {loading && zones.length === 0 ? (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
            <Loader2 size={24} className="animate-spin text-[#E67E22]" />
            <span className="text-sm font-semibold">Loading zone settings from database...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {zones.map((zone, index) => {
            return (
              <div
                key={zone.id || index}
                className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-xs hover:border-[#083028]/40 transition-all flex flex-col"
              >
                {/* Header Banner - Orange matched from screenshot */}
                <div className="bg-[#E67E22] px-4 py-3.5 text-center text-white border-b border-[#D35400]">
                  <h3 className="font-extrabold text-sm sm:text-base leading-tight">
                    {zone.zoneName}
                  </h3>
                  <p className="text-xs font-semibold opacity-95 mt-0.5">
                    ({zone.zoneNameHi})
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-5 space-y-5 flex-1 flex flex-col justify-between">
                  {/* ZONE STATUS Toggle */}
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <span className="text-xs font-black text-gray-800 tracking-wide uppercase">
                      ZONE STATUS
                    </span>

                    {/* Toggle Pill Button */}
                    <button
                      type="button"
                      onClick={() => updateZoneField(index, 'isActive', !zone.isActive)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                        zone.isActive
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span>{zone.isActive ? 'ON (चालू)' : 'OFF (बंद)'}</span>
                    </button>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-4">
                    {/* Free Delivery Threshold */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 leading-tight mb-1.5">
                        Free Delivery Threshold<br />
                        <span className="text-[10px] text-gray-500 font-normal">
                          (न्यूनतम आर्डर मूल्य):
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-sm font-bold text-gray-500">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          value={zone.freeDeliveryThreshold}
                          onChange={(e) =>
                            updateZoneField(
                              index,
                              'freeDeliveryThreshold',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#083028]"
                        />
                      </div>
                    </div>

                    {/* Standard Delivery Fee */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 leading-tight mb-1.5">
                        Standard Delivery Fee<br />
                        <span className="text-[10px] text-gray-500 font-normal">
                          (कम आर्डर पर चार्ज):
                        </span>
                      </label>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 text-sm font-bold text-gray-500">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="5"
                          value={zone.standardDeliveryFee}
                          onChange={(e) =>
                            updateZoneField(
                              index,
                              'standardDeliveryFee',
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#083028]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator Note */}
                  <div className={`p-2.5 rounded-xl text-[10px] leading-relaxed ${
                    zone.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'
                  }`}>
                    {zone.isActive ? (
                      <p>
                        ✓ <strong>Free Delivery active</strong> on orders above ₹{zone.freeDeliveryThreshold}. Below this, ₹{zone.standardDeliveryFee} standard fee applies.
                      </p>
                    ) : (
                      <p>
                        ✕ <strong>Free Delivery OFF</strong>: ₹{zone.standardDeliveryFee} will always apply regardless of cart value.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}

        {/* Hint text matching Screenshot 1 & 2 */}
        {/* <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 text-center space-y-1">
          <p className="text-xs sm:text-sm font-bold text-gray-900">
            सभी ज़ोन के लिए ON/OFF, फ्री डिलीवरी लिमिट (Threshold) और डिलीवरी चार्ज सेट करें।
          </p>
          <p className="text-xs text-red-700 font-semibold">
            If OFF, standard delivery fee will always apply regardless of order value.<br />
            (अगर बंद (OFF) करेंगे, तो आर्डर मूल्य चाहे जो हो, सामान्य चार्ज लगेगा।)
          </p>
        </div> */}

        {/* Save Button Centered (Green Button matching screenshot) */}
        {/* <div className="text-center pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 px-10 py-3.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white rounded-2xl text-sm font-black transition-all shadow-lg hover:shadow-xl active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            <span>Save Settings / सुरक्षित करें</span>
          </button>
        </div> */}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          HOW IT WORKS EXPLANATION / SAMPLE CHECKOUT PREVIEW
      ══════════════════════════════════════════════════════════════════ */}
      <div className="bg-[#FAF8F5] rounded-3xl border border-gray-200 p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-[#B8860B]" />
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
            Checkout Pincode Detection Rules
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#083028]">
              <MapPin size={14} className="text-[#E67E22]" />
              <span>Prayagraj Nagar Nigam</span>
            </div>
            <p className="text-gray-500">
              Matches pincodes <strong>211001 – 211019</strong>. If order ≥ ₹{zones[0]?.freeDeliveryThreshold || 500}, delivery is FREE.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#083028]">
              <MapPin size={14} className="text-[#E67E22]" />
              <span>Prayagraj Dehat</span>
            </div>
            <p className="text-gray-500">
              Matches rural pincodes starting with <strong>212xxx</strong> (e.g. 212111). If order ≥ ₹{zones[1]?.freeDeliveryThreshold || 1500}, delivery is FREE.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-[#083028]">
              <MapPin size={14} className="text-[#E67E22]" />
              <span>Pan India</span>
            </div>
            <p className="text-gray-500">
              All other pincodes across India. If order ≥ ₹{zones[2]?.freeDeliveryThreshold || 3000}, delivery is FREE.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
