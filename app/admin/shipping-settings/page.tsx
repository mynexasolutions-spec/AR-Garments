'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Check, RotateCcw, AlertCircle, Truck, MapPin, Sparkles,
  TrendingUp, Plus, Pencil, Trash2, X, ChevronDown,
} from 'lucide-react';
import { useShippingSettings } from '@/context/ShippingSettingsContext';
import { useZonePriceRules } from '@/context/ZonePriceRulesContext';
import { useToast } from '@/context/ToastContext';
import { DEFAULT_ZONE_SETTINGS, ZoneShippingSetting } from '@/lib/zoneShipping';
import { ZonePriceRule } from '@/lib/zonePriceMarkup';

// ─── Types ────────────────────────────────────────────────────────────────────

type RuleFormData = {
  id?: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  zone1Active: boolean;
  zone1Type: 'increase' | 'decrease' | 'discount' | 'none';
  zone1Value: number;
  zone2Active: boolean;
  zone2Type: 'increase' | 'decrease' | 'discount' | 'none';
  zone2Value: number;
  zone2DiscountActive: boolean;
  zone2DiscountValue: number;
};

const EMPTY_RULE: RuleFormData = {
  categoryId: '',
  categoryName: '',
  subcategoryId: '',
  subcategoryName: '',
  zone1Active: true,
  zone1Type: 'none',
  zone1Value: 0,
  zone2Active: true,
  zone2Type: 'increase',
  zone2Value: 0,
  zone2DiscountActive: false,
  zone2DiscountValue: 0,
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = 'delivery' | 'markup';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ShippingSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('delivery');
  const { zoneSettings, loading, error, refreshSettings } = useShippingSettings();
  const { rules, loading: rulesLoading, error: rulesError, refreshRules } = useZonePriceRules();
  const { toast } = useToast();

  // ── Delivery tab state ─────────────────────────────────────────────────────
  const [zones, setZones] = useState<ZoneShippingSetting[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (zoneSettings && zoneSettings.length > 0) setZones(zoneSettings);
  }, [zoneSettings]);

  const updateZoneField = (index: number, field: keyof ZoneShippingSetting, value: unknown) => {
    setZones((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveDelivery = async () => {
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch('/api/shipping-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(zones),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      await refreshSettings();
      toast.success('Zone delivery settings saved!', { title: 'Settings Saved' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error saving';
      setSaveError(msg);
      toast.error(msg, { title: 'Save Failed' });
    } finally { setSaving(false); }
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset all zones to default values?')) {
      setZones(DEFAULT_ZONE_SETTINGS);
      toast.info('Defaults loaded. Click Save to persist.');
    }
  };

  // ── Markup tab state ───────────────────────────────────────────────────────
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: string; name: string }[]>([]);
  const [ruleForm, setRuleForm] = useState<RuleFormData>(EMPTY_RULE);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories?active=true', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        const parents = list.filter((c: { parentId?: string | null }) => !c.parentId);
        setCategories(parents.length > 0 ? parents : list);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // Fetch subcategories when category changes
  useEffect(() => {
    if (!ruleForm.categoryId) { setSubcategories([]); return; }
    fetch(`/api/categories?parentId=${ruleForm.categoryId}&active=true`, { cache: 'no-store' })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setSubcategories(Array.isArray(data) ? data : []))
      .catch(() => setSubcategories([]));
  }, [ruleForm.categoryId]);

  const updateRuleField = <K extends keyof RuleFormData>(field: K, value: RuleFormData[K]) => {
    setRuleForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (catId: string) => {
    const cat = categories.find((c) => c.id === catId);
    setRuleForm((prev) => ({
      ...prev,
      categoryId: catId,
      categoryName: cat?.name || '',
      subcategoryId: '',
      subcategoryName: '',
    }));
  };

  const handleSubcategoryChange = (subId: string) => {
    const sub = subcategories.find((s) => s.id === subId);
    setRuleForm((prev) => ({
      ...prev,
      subcategoryId: subId,
      subcategoryName: sub?.name || '',
    }));
  };

  const resetForm = () => {
    setRuleForm(EMPTY_RULE);
    setEditingRuleId(null);
    setRuleError(null);
    setShowForm(false);
  };

  const handleEditRule = (rule: ZonePriceRule) => {
    setRuleForm({
      id: rule.id,
      categoryId: rule.categoryId,
      categoryName: rule.categoryName,
      subcategoryId: rule.subcategoryId || '',
      subcategoryName: rule.subcategoryName || '',
      zone1Active: rule.zone1Active,
      zone1Type: rule.zone1Type,
      zone1Value: rule.zone1Value,
      zone2Active: rule.zone2Active,
      zone2Type: rule.zone2Type,
      zone2Value: rule.zone2Value,
      zone2DiscountActive: rule.zone2DiscountActive,
      zone2DiscountValue: rule.zone2DiscountValue,
    });
    setEditingRuleId(rule.id);
    setShowForm(true);
    setRuleError(null);
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Delete this price rule?')) return;
    try {
      const res = await fetch(`/api/zone-price-rules?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      await refreshRules();
      toast.success('Price rule deleted.', { title: 'Deleted' });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed', { title: 'Error' });
    }
  };

  const handleSaveRule = async () => {
    if (!ruleForm.categoryId) {
      setRuleError('Please select a Category.'); return;
    }
    setRuleSaving(true); setRuleError(null);
    try {
      const payload = {
        categoryId: ruleForm.categoryId,
        categoryName: ruleForm.categoryName,
        subcategoryId: ruleForm.subcategoryId || null,
        subcategoryName: ruleForm.subcategoryName || null,
        zone1Active: ruleForm.zone1Active,
        zone1Type: ruleForm.zone1Type,
        zone1Value: Number(ruleForm.zone1Value),
        zone2Active: ruleForm.zone2Active,
        zone2Type: ruleForm.zone2Type,
        zone2Value: Number(ruleForm.zone2Value),
        zone2DiscountActive: ruleForm.zone2DiscountActive,
        zone2DiscountValue: Number(ruleForm.zone2DiscountValue),
      };

      const isEdit = Boolean(editingRuleId);
      const url = isEdit ? `/api/zone-price-rules?id=${editingRuleId}` : '/api/zone-price-rules';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save rule');

      await refreshRules();
      toast.success(isEdit ? 'Price rule updated!' : 'Price rule added!', { title: 'Saved' });
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setRuleError(msg);
      toast.error(msg, { title: 'Error' });
    } finally { setRuleSaving(false); }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">

      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-bold uppercase tracking-wider text-[#083028] mb-1">
            <Truck size={18} className="text-[#B8860B]" />
            <span>Zone-Wise Shipping & Pricing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            ज़ोन सेटिंग्स
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            डिलीवरी चार्ज, प्राइस मार्कअप और डिस्काउंट सेट करें
          </p>
        </div>
        {activeTab === 'delivery' ? (
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={handleResetToDefaults}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-2xl text-xs font-bold transition">
              <RotateCcw size={14} /> Defaults
            </button>
            <button type="button" disabled={saving} onClick={handleSaveDelivery}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#083028] hover:bg-[#051e19] text-white rounded-2xl text-xs sm:text-sm font-bold transition shadow-md disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              <span>Save Settings</span>
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => { setShowForm(true); setEditingRuleId(null); setRuleForm(EMPTY_RULE); }}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#B8860B] hover:bg-[#9a700a] text-white rounded-2xl text-xs sm:text-sm font-bold transition shadow-md">
            <Plus size={16} />
            <span>Add Price Rule / प्राइस रूल जोड़ें</span>
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-xs">
        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'delivery'
              ? 'bg-[#083028] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Truck size={16} /> Zone Delivery Settings
        </button>
        <button
          onClick={() => setActiveTab('markup')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'markup'
              ? 'bg-[#B8860B] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <TrendingUp size={16} /> Zone Wise Price Markup
        </button>
      </div>

      {/* ══ TAB 1: DELIVERY ══════════════════════════════════════════════════ */}
      {activeTab === 'delivery' && (
        <>
          {saveError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-medium flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" /> <span>{saveError}</span>
            </div>
          )}
          {error && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 font-medium flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>Note: {error} (Running with default zone settings)</span>
            </div>
          )}

          <div className="bg-white rounded-3xl border-2 border-gray-200 p-5 sm:p-8 shadow-sm space-y-6">
            <div className="text-center pb-2">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Free Delivery Configuration / फ्री डिलीवरी सेटिंग
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Configure individual criteria, delivery fees, and activate/deactivate free shipping per zone.
              </p>
            </div>

            {loading && zones.length === 0 ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                <Loader2 size={24} className="animate-spin text-[#E67E22]" />
                <span className="text-sm font-semibold">Loading zone settings...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {zones.map((zone, index) => (
                  <div key={zone.id || index}
                    className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-xs hover:border-[#083028]/40 transition-all flex flex-col">
                    <div className="bg-[#E67E22] px-4 py-3.5 text-center text-white border-b border-[#D35400]">
                      <h3 className="font-extrabold text-sm sm:text-base leading-tight">{zone.zoneName}</h3>
                      <p className="text-xs font-semibold opacity-95 mt-0.5">({zone.zoneNameHi})</p>
                    </div>
                    <div className="p-5 space-y-5 flex-1 flex flex-col justify-between">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                        <span className="text-xs font-black text-gray-800 tracking-wide uppercase">ZONE STATUS</span>
                        <button type="button"
                          onClick={() => updateZoneField(index, 'isActive', !zone.isActive)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
                            zone.isActive ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-red-600 text-white hover:bg-red-700'
                          }`}>
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                          <span>{zone.isActive ? 'ON (चालू)' : 'OFF (बंद)'}</span>
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 leading-tight mb-1.5">
                            Free Delivery Threshold<br />
                            <span className="text-[10px] text-gray-500 font-normal">(न्यूनतम आर्डर मूल्य):</span>
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-sm font-bold text-gray-500">₹</span>
                            <input type="number" min="0" step="10" value={zone.freeDeliveryThreshold}
                              onChange={(e) => updateZoneField(index, 'freeDeliveryThreshold', parseFloat(e.target.value) || 0)}
                              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#083028]" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 leading-tight mb-1.5">
                            Standard Delivery Fee<br />
                            <span className="text-[10px] text-gray-500 font-normal">(कम आर्डर पर चार्ज):</span>
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-sm font-bold text-gray-500">₹</span>
                            <input type="number" min="0" step="5" value={zone.standardDeliveryFee}
                              onChange={(e) => updateZoneField(index, 'standardDeliveryFee', parseFloat(e.target.value) || 0)}
                              className="w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#083028]" />
                          </div>
                        </div>
                      </div>
                      <div className={`p-2.5 rounded-xl text-[10px] leading-relaxed ${zone.isActive ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                        {zone.isActive ? (
                          <p>✓ <strong>Free Delivery active</strong> on orders above ₹{zone.freeDeliveryThreshold}. Below: ₹{zone.standardDeliveryFee} fee.</p>
                        ) : (
                          <p>✕ <strong>Free Delivery OFF</strong>: ₹{zone.standardDeliveryFee} always applies.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* How it works */}
          <div className="bg-[#FAF8F5] rounded-3xl border border-gray-200 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#B8860B]" />
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Checkout Pincode Detection Rules</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
              {[
                { label: 'Prayagraj Nagar Nigam', desc: `Pincodes 211001–211019. Free delivery above ₹${zones[0]?.freeDeliveryThreshold || 500}.` },
                { label: 'Prayagraj Dehat', desc: `Rural pincodes 212xxx. Free delivery above ₹${zones[1]?.freeDeliveryThreshold || 1500}.` },
                { label: 'Pan India', desc: `All other pincodes. Free delivery above ₹${zones[2]?.freeDeliveryThreshold || 3000}.` },
              ].map((item) => (
                <div key={item.label} className="bg-white p-4 rounded-2xl border border-gray-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-[#083028]">
                    <MapPin size={14} className="text-[#E67E22]" />
                    <span>{item.label}</span>
                  </div>
                  <p className="text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ══ TAB 2: ZONE WISE PRICE MARKUP ════════════════════════════════════ */}
      {activeTab === 'markup' && (
        <div className="space-y-6">

          {/* Add/Edit Rule Form */}
          {showForm && (
            <div className="bg-white rounded-3xl border-2 border-[#B8860B]/40 p-6 sm:p-8 shadow-md space-y-6">
              {/* Form Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900">
                    {editingRuleId ? 'Edit Price Rule / रूल एडिट करें' : 'Add Price Rule / प्राइस रूल जोड़ें'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Zone-wise price markup, markdown & discount / ज़ोन के हिसाब से कीमत बढ़ाएं या घटाएं
                  </p>
                </div>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-700 p-1 rounded-lg transition">
                  <X size={20} />
                </button>
              </div>

              {ruleError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle size={14} /> {ruleError}
                </div>
              )}

              {/* Category & Sub-Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Category / कैटेगरी <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select value={ruleForm.categoryId} onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#B8860B] pr-8">
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Sub-Category (optional)
                  </label>
                  <div className="relative">
                    <select value={ruleForm.subcategoryId} onChange={(e) => handleSubcategoryChange(e.target.value)}
                      className="w-full appearance-none border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#B8860B] pr-8"
                      disabled={!ruleForm.categoryId}>
                      <option value="">-- All Subcategories --</option>
                      {subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Leave blank = applies to all subcategories</p>
                </div>
              </div>

              {/* Zone Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                {/* ── Zone 1: Nearby ── */}
                <div className={`rounded-2xl border-2 p-5 space-y-4 transition-all ${ruleForm.zone1Active ? 'border-[#083028]/40 bg-[#f0fdf4]' : 'border-gray-200 bg-gray-50'}`}>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#083028]">Zone 1: Nearby</h3>
                    <p className="text-[10px] text-gray-500">(Prayagraj Nagar Nigam + Dehat — 211xxx / 212xxx)</p>
                  </div>

                  {/* ON/OFF */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wide text-gray-600">ZONE STATUS / ज़ोन की स्थिति</span>
                    <button type="button"
                      onClick={() => updateRuleField('zone1Active', !ruleForm.zone1Active)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        ruleForm.zone1Active ? 'bg-emerald-600 text-white' : 'bg-gray-400 text-white'
                      }`}>
                      <span className="w-2 h-2 rounded-full bg-white" />
                      {ruleForm.zone1Active ? 'ON' : 'OFF'} / {ruleForm.zone1Active ? 'चालू' : 'बंद'}
                    </button>
                  </div>

                  {/* Radio options */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Exclusive options</p>
                    {(['none', 'increase', 'decrease', 'discount'] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="z1type" value={t}
                          checked={ruleForm.zone1Type === t}
                          onChange={() => updateRuleField('zone1Type', t)}
                          className="accent-[#083028]" />
                        <span className="text-xs font-semibold text-gray-700">
                          {t === 'none' && 'No change (base price)'}
                          {t === 'increase' && '(+) Increase / बढ़ाएं'}
                          {t === 'decrease' && '(-) Decrease / घटाएं'}
                          {t === 'discount' && '% Discount / डिस्काउंट'}
                        </span>
                      </label>
                    ))}
                  </div>

                  {ruleForm.zone1Type !== 'none' && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">Value %:</label>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" max="100" step="0.5"
                          value={ruleForm.zone1Value}
                          onChange={(e) => updateRuleField('zone1Value', parseFloat(e.target.value) || 0)}
                          className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#083028]" />
                        <span className="text-sm font-bold text-gray-500">%</span>
                      </div>
                    </div>
                  )}

                  <p className="text-[9px] text-gray-400 bg-gray-100 rounded-lg p-2">
                    Note: Zone 1 (Nearby) usually runs on base price (original) and can be adjusted if needed.
                  </p>
                </div>

                {/* ── Zone 2: Pan India ── */}
                <div className={`rounded-2xl border-2 p-5 space-y-4 transition-all ${ruleForm.zone2Active ? 'border-[#B8860B]/50 bg-amber-50/40' : 'border-gray-200 bg-gray-50'}`}>
                  <div>
                    <h3 className="font-extrabold text-sm text-[#B8860B]">Zone 2: Pan India</h3>
                    <p className="text-[10px] text-gray-500">(Outside Prayagraj — all other pincodes)</p>
                  </div>

                  {/* ON/OFF */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wide text-gray-600">ZONE STATUS / ज़ोन की स्थिति</span>
                    <button type="button"
                      onClick={() => updateRuleField('zone2Active', !ruleForm.zone2Active)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                        ruleForm.zone2Active ? 'bg-emerald-600 text-white' : 'bg-gray-400 text-white'
                      }`}>
                      <span className="w-2 h-2 rounded-full bg-white" />
                      {ruleForm.zone2Active ? 'ON' : 'OFF'} / {ruleForm.zone2Active ? 'चालू' : 'बंद'}
                    </button>
                  </div>

                  {/* Radio options */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">Exclusive options</p>
                    {(['increase', 'decrease', 'discount'] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="z2type" value={t}
                          checked={ruleForm.zone2Type === t}
                          onChange={() => updateRuleField('zone2Type', t)}
                          className="accent-[#B8860B]" />
                        <span className="text-xs font-semibold text-gray-700">
                          {t === 'increase' && '(+) Increase / बढ़ाएं'}
                          {t === 'decrease' && '(-) Decrease / घटाएं'}
                          {t === 'discount' && '% Discount / डिस्काउंट'}
                        </span>
                      </label>
                    ))}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">Value %:</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max="100" step="0.5"
                        value={ruleForm.zone2Value}
                        onChange={(e) => updateRuleField('zone2Value', parseFloat(e.target.value) || 0)}
                        className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#B8860B]" />
                      <span className="text-sm font-bold text-gray-500">%</span>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1">यहाँ % डालने से बाहर के कस्टमर का रेट बढ़ या घटेगा</p>
                  </div>

                  {/* Extra Discount Toggle */}
                  <div className="border-t border-amber-200/60 pt-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={ruleForm.zone2DiscountActive}
                        onChange={(e) => updateRuleField('zone2DiscountActive', e.target.checked)}
                        className="accent-[#B8860B] w-4 h-4 rounded" />
                      <span className="text-xs font-bold text-gray-700">Apply Offer/Discount? / डिस्काउंट लगाएं?</span>
                    </label>
                    {ruleForm.zone2DiscountActive && (
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">% Discount / डिस्काउंट:</label>
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" max="100" step="0.5"
                            value={ruleForm.zone2DiscountValue}
                            onChange={(e) => updateRuleField('zone2DiscountValue', parseFloat(e.target.value) || 0)}
                            className="w-24 border border-amber-200 rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#B8860B]" />
                          <span className="text-sm font-bold text-gray-500">%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={resetForm}
                  className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-2xl text-sm font-bold transition">
                  Cancel
                </button>
                <button type="button" disabled={ruleSaving} onClick={handleSaveRule}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-3 bg-[#B8860B] hover:bg-[#9a700a] text-white rounded-2xl text-sm font-black transition shadow-md disabled:opacity-50">
                  {ruleSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>Apply Rules / सेव करें</span>
                </button>
              </div>
            </div>
          )}

          {/* Rules List */}
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-black text-gray-900">Existing Rules / मौजूदा रूल्स</h2>
                <p className="text-xs text-gray-500">
                  {rules.length === 0 ? 'No rules yet. Click "Add Price Rule" to create one.' : `${rules.length} rule${rules.length > 1 ? 's' : ''} configured`}
                </p>
              </div>
              {!showForm && (
                <button type="button" onClick={() => { setShowForm(true); setEditingRuleId(null); setRuleForm(EMPTY_RULE); }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#B8860B] hover:bg-[#9a700a] text-white rounded-xl text-xs font-bold transition">
                  <Plus size={14} /> Add Rule
                </button>
              )}
            </div>

            {rulesLoading ? (
              <div className="flex items-center justify-center py-10 gap-3 text-gray-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Loading rules...</span>
              </div>
            ) : rulesError ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                {rulesError} — Run the SQL migration first.
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">No zone price rules yet</p>
                <p className="text-xs mt-1">Add your first rule using the button above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3 font-bold text-gray-600">Category</th>
                      <th className="text-left px-4 py-3 font-bold text-gray-600">Sub-Cat</th>
                      <th className="text-center px-4 py-3 font-bold text-gray-600">Zone 1 (Nearby)</th>
                      <th className="text-center px-4 py-3 font-bold text-gray-600">Zone 2 (Pan India)</th>
                      <th className="text-center px-4 py-3 font-bold text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-gray-900">{rule.categoryName || rule.categoryId}</td>
                        <td className="px-4 py-3 text-gray-500">{rule.subcategoryName || (rule.subcategoryId ? rule.subcategoryId : <span className="italic text-gray-300">All</span>)}</td>
                        <td className="px-4 py-3 text-center">
                          {rule.zone1Active ? (
                            <span className={`inline-block px-2 py-1 rounded-lg font-bold text-[10px] ${
                              rule.zone1Type === 'none' ? 'bg-gray-100 text-gray-600' :
                              rule.zone1Type === 'increase' ? 'bg-green-100 text-green-700' :
                              rule.zone1Type === 'decrease' ? 'bg-red-100 text-red-700' :
                              'bg-blue-100 text-blue-700'
                            }`}>
                              {rule.zone1Type === 'none' && 'Base (no change)'}
                              {rule.zone1Type === 'increase' && `+${rule.zone1Value}%`}
                              {rule.zone1Type === 'decrease' && `-${rule.zone1Value}%`}
                              {rule.zone1Type === 'discount' && `${rule.zone1Value}% OFF`}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-1 rounded-lg bg-gray-100 text-gray-400 text-[10px] font-bold">OFF</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {rule.zone2Active ? (
                            <div className="flex flex-col items-center gap-1">
                              <span className={`inline-block px-2 py-1 rounded-lg font-bold text-[10px] ${
                                rule.zone2Type === 'increase' ? 'bg-amber-100 text-amber-700' :
                                rule.zone2Type === 'decrease' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                                {rule.zone2Type === 'increase' && `+${rule.zone2Value}%`}
                                {rule.zone2Type === 'decrease' && `-${rule.zone2Value}%`}
                                {rule.zone2Type === 'discount' && `${rule.zone2Value}% OFF`}
                              </span>
                              {rule.zone2DiscountActive && rule.zone2DiscountValue > 0 && (
                                <span className="inline-block px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 text-[9px] font-bold">
                                  +{rule.zone2DiscountValue}% OFF
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-1 rounded-lg bg-gray-100 text-gray-400 text-[10px] font-bold">OFF</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEditRule(rule)}
                              className="p-1.5 text-gray-400 hover:text-[#083028] hover:bg-gray-100 rounded-lg transition" title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDeleteRule(rule.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* How Zone Pricing Works */}
          <div className="bg-[#FAF8F5] rounded-3xl border border-gray-200 p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-[#B8860B]" />
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">How Zone Pricing Works</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
              <div className="bg-white p-4 rounded-2xl border border-gray-200">
                <p className="font-bold text-[#083028] mb-1">📍 Zone 1 — Nearby</p>
                <p>Pincodes 211xxx & 212xxx. Base price runs by default. Apply markup/discount only if needed.</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-200">
                <p className="font-bold text-[#B8860B] mb-1">🌏 Zone 2 — Pan India</p>
                <p>All other pincodes. Apply markup (+%) then optional extra discount. Marked-up price becomes selling price.</p>
              </div>
              <div className="bg-white p-4 rounded-2xl border border-gray-200">
                <p className="font-bold text-gray-700 mb-1">📋 Specificity</p>
                <p>Subcategory rule overrides category rule. Blank subcategory = applies to all subcategories in that category.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
