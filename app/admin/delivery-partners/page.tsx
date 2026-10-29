'use client';

import { useState, useEffect } from 'react';
import {
  Bike,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Shield,
  ExternalLink,
  MapPin,
  RefreshCw,
  Search,
  Key,
  Truck,
  ArrowRight,
  Info,
  Check,
  X,
  Sliders,
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import {
  DeliveryPartner,
  DeliveryZone,
  RoutingDecision,
  IntegrationType,
  DispatchType,
} from '@/lib/deliveryPartners';

type ActiveTab = 'partners' | 'zones' | 'test';

export default function DeliveryPartnersPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>('partners');

  // Partners state
  const [partners, setPartners] = useState<DeliveryPartner[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<DeliveryPartner | null>(null);
  const [savingPartner, setSavingPartner] = useState(false);

  // Partner form state
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    code: '',
    integrationType: 'manual' as IntegrationType,
    apiKey: '',
    apiSecret: '',
    trackingUrlTemplate: '',
    isActive: true,
    description: '',
  });

  // Zones state
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [savingZone, setSavingZone] = useState(false);
  const [zoneForm, setZoneForm] = useState({
    defaultPartnerId: '',
    fallbackPartnerId: '',
    isActive: true,
    pincodesText: '',
  });

  // Test Simulator state
  const [testPincode, setTestPincode] = useState('');
  const [testingRouting, setTestingRouting] = useState(false);
  const [testResult, setTestResult] = useState<RoutingDecision | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // ─── Fetch Partners ───────────────────────────────────────────────────────
  const fetchPartners = async () => {
    setLoadingPartners(true);
    try {
      const res = await fetch('/api/admin/delivery-partners', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.partners)) {
        setPartners(data.partners);
      } else {
        toast.error(data.error || 'Failed to fetch delivery partners');
      }
    } catch {
      toast.error('Network error fetching delivery partners');
    } finally {
      setLoadingPartners(false);
    }
  };

  // ─── Fetch Zones ──────────────────────────────────────────────────────────
  const fetchZones = async () => {
    setLoadingZones(true);
    try {
      const res = await fetch('/api/admin/delivery-zones', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.zones)) {
        setZones(data.zones);
      } else {
        toast.error(data.error || 'Failed to fetch delivery zones');
      }
    } catch {
      toast.error('Network error fetching delivery zones');
    } finally {
      setLoadingZones(false);
    }
  };

  useEffect(() => {
    fetchPartners();
    fetchZones();
  }, []);

  // ─── Partner Modal Handlers ───────────────────────────────────────────────
  const handleOpenAddPartner = () => {
    setEditingPartner(null);
    setPartnerForm({
      name: '',
      code: '',
      integrationType: 'manual',
      apiKey: '',
      apiSecret: '',
      trackingUrlTemplate: '',
      isActive: true,
      description: '',
    });
    setPartnerModalOpen(true);
  };

  const handleOpenEditPartner = (p: DeliveryPartner) => {
    setEditingPartner(p);
    setPartnerForm({
      name: p.name,
      code: p.code,
      integrationType: p.integrationType,
      apiKey: '',
      apiSecret: '',
      trackingUrlTemplate: p.trackingUrlTemplate || '',
      isActive: p.isActive,
      description: p.description || '',
    });
    setPartnerModalOpen(true);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.name.trim()) {
      toast.error('Please enter a partner name');
      return;
    }

    setSavingPartner(true);
    try {
      const payload: Record<string, unknown> = {
        name: partnerForm.name.trim(),
        integrationType: partnerForm.integrationType,
        trackingUrlTemplate: partnerForm.trackingUrlTemplate.trim() || null,
        isActive: partnerForm.isActive,
        description: partnerForm.description.trim() || null,
      };

      if (partnerForm.integrationType === 'api' && (partnerForm.apiKey || partnerForm.apiSecret)) {
        payload.credentials = {
          apiKey: partnerForm.apiKey.trim(),
          apiSecret: partnerForm.apiSecret.trim(),
        };
      }

      if (editingPartner) {
        payload.id = editingPartner.id;
        const res = await fetch('/api/admin/delivery-partners', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Delivery partner updated successfully');
          setPartnerModalOpen(false);
          fetchPartners();
        } else {
          toast.error(data.error || 'Failed to update partner');
        }
      } else {
        payload.code = partnerForm.code || partnerForm.name;
        const res = await fetch('/api/admin/delivery-partners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          toast.success('Delivery partner added successfully');
          setPartnerModalOpen(false);
          fetchPartners();
        } else {
          toast.error(data.error || 'Failed to create partner');
        }
      }
    } catch {
      toast.error('Network error saving delivery partner');
    } finally {
      setSavingPartner(false);
    }
  };

  const handleTogglePartnerStatus = async (p: DeliveryPartner) => {
    try {
      const res = await fetch('/api/admin/delivery-partners', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${p.name} is now ${!p.isActive ? 'Active' : 'Inactive'}`);
        fetchPartners();
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch {
      toast.error('Network error updating partner status');
    }
  };

  // ─── Zone Edit Handlers ───────────────────────────────────────────────────
  const handleStartEditZone = (zone: DeliveryZone) => {
    setEditingZoneId(zone.id);
    const pins = [...(zone.pincodes || []), ...(zone.pincodePrefixes || [])];
    setZoneForm({
      defaultPartnerId: zone.defaultPartnerId || '',
      fallbackPartnerId: zone.fallbackPartnerId || '',
      isActive: zone.isActive,
      pincodesText: pins.join(', '),
    });
  };

  const handleSaveZone = async (zoneId: string) => {
    setSavingZone(true);
    try {
      const pins = zoneForm.pincodesText
        .split(/[,\s]+/)
        .map((p) => p.trim())
        .filter(Boolean);

      const payload = {
        id: zoneId,
        defaultPartnerId: zoneForm.defaultPartnerId || null,
        fallbackPartnerId: zoneForm.fallbackPartnerId || null,
        isActive: zoneForm.isActive,
        pincodes: pins,
      };

      const res = await fetch('/api/admin/delivery-zones', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Zone dispatch rules updated successfully');
        setEditingZoneId(null);
        fetchZones();
      } else {
        toast.error(data.error || 'Failed to update zone');
      }
    } catch {
      toast.error('Network error updating zone');
    } finally {
      setSavingZone(false);
    }
  };

  // ─── Routing Simulator Handlers ───────────────────────────────────────────
  const handleTestRouting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPincode.trim()) {
      setTestError('Please enter a 6-digit pincode');
      return;
    }
    setTestingRouting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await fetch('/api/admin/dispatch-routing/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: testPincode.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult(data.decision);
      } else {
        setTestError(data.error || 'Failed to simulate routing');
      }
    } catch {
      setTestError('Network error running simulator');
    } finally {
      setTestingRouting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#083028] text-white flex items-center justify-center shadow-xs">
              <Bike size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Delivery Partners & Dispatch Routing</h1>
              <p className="text-xs text-gray-500 font-medium">
                Manage local riders, external courier APIs, and automatic pincode routing rules.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'partners' && (
            <button
              onClick={handleOpenAddPartner}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#083028] hover:bg-[#0b3d33] text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Plus size={16} />
              <span>Add Delivery Partner</span>
            </button>
          )}
          <button
            onClick={() => {
              fetchPartners();
              fetchZones();
            }}
            className="p-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex border-b border-gray-200 bg-white px-6 rounded-2xl border">
        {[
          { id: 'partners' as ActiveTab, label: 'Delivery Partners', count: partners.length },
          { id: 'zones' as ActiveTab, label: 'Delivery Zones & Dispatch Rules', count: zones.length },
          { id: 'test' as ActiveTab, label: '⚡ Dispatch Simulator' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-4 px-4 font-bold text-xs sm:text-sm border-b-2 -mb-px flex items-center gap-2 transition ${
              activeTab === tab.id
                ? 'border-[#083028] text-[#083028]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-[#083028] text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: DELIVERY PARTNERS
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'partners' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-black text-gray-900">Configured Delivery Partners</h2>
                <p className="text-xs text-gray-500">
                  Customers never see these partners at checkout. The backend engine automatically assigns them based on the delivery zone rules.
                </p>
              </div>
            </div>

            {loadingPartners ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                <Loader2 size={24} className="animate-spin text-[#083028]" />
                <span className="text-sm font-semibold">Loading partners...</span>
              </div>
            ) : partners.length === 0 ? (
              <div className="text-center py-16 text-gray-400 space-y-2">
                <Bike size={44} className="mx-auto opacity-30" />
                <p className="text-sm font-bold text-gray-700">No delivery partners found</p>
                <p className="text-xs">Add your first delivery partner using the button above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100 text-gray-600">
                      <th className="text-left px-4 py-3.5 font-bold">Partner Name</th>
                      <th className="text-left px-4 py-3.5 font-bold">Integration Type</th>
                      <th className="text-center px-4 py-3.5 font-bold">Credentials</th>
                      <th className="text-left px-4 py-3.5 font-bold">Tracking URL</th>
                      <th className="text-center px-4 py-3.5 font-bold">Status</th>
                      <th className="text-right px-4 py-3.5 font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {partners.map((partner) => (
                      <tr key={partner.id} className="hover:bg-gray-50/60 transition">
                        {/* Name */}
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-gray-900 text-sm">{partner.name}</div>
                          <div className="text-[11px] text-gray-400 font-mono">code: {partner.code}</div>
                          {partner.description && (
                            <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{partner.description}</p>
                          )}
                        </td>

                        {/* Integration Type */}
                        <td className="px-4 py-3.5">
                          {partner.integrationType === 'api' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                              <Sparkles size={11} /> API INTEGRATION
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Bike size={11} /> SELF / LOCAL RIDER
                            </span>
                          )}
                        </td>

                        {/* Credentials Status */}
                        <td className="px-4 py-3.5 text-center">
                          {partner.integrationType === 'api' ? (
                            partner.hasCredentials ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                <CheckCircle2 size={12} /> Configured
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                <AlertCircle size={12} /> Needs Setup
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-gray-400 font-medium">Not Required</span>
                          )}
                        </td>

                        {/* Tracking URL Template */}
                        <td className="px-4 py-3.5">
                          {partner.trackingUrlTemplate ? (
                            <code className="text-[10px] bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 block max-w-xs truncate">
                              {partner.trackingUrlTemplate}
                            </code>
                          ) : (
                            <span className="text-gray-400 italic text-[11px]">Direct Rider Contact</span>
                          )}
                        </td>

                        {/* Status Toggle */}
                        <td className="px-4 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePartnerStatus(partner)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black transition ${
                              partner.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${partner.isActive ? 'bg-emerald-600' : 'bg-gray-400'}`} />
                            {partner.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5 text-right">
                          <button
                            onClick={() => handleOpenEditPartner(partner)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-bold transition"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: DELIVERY ZONES & DISPATCH RULES
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'zones' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-black text-gray-900">3 Configurable Delivery Zones</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Orders are routed automatically based on the destination pincode. Local orders stay in-house; Pan India orders go to external couriers.
                </p>
              </div>
            </div>

            {loadingZones ? (
              <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
                <Loader2 size={24} className="animate-spin text-[#083028]" />
                <span className="text-sm font-semibold">Loading zones...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {zones.map((zone) => {
                  const isEditing = editingZoneId === zone.id;
                  const activePartnerList = partners.filter((p) => p.isActive);

                  return (
                    <div
                      key={zone.id}
                      className={`rounded-3xl border-2 p-6 space-y-4 transition-all flex flex-col justify-between ${
                        zone.isActive ? 'border-gray-200 bg-[#FAF8F5]' : 'border-gray-200 bg-gray-50 opacity-75'
                      }`}
                    >
                      <div className="space-y-3">
                        {/* Zone Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#B8860B] block mb-0.5">
                              Priority: #{zone.priority}
                            </span>
                            <h3 className="font-extrabold text-base text-gray-900">{zone.name}</h3>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                            zone.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {zone.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </div>

                        <p className="text-xs text-gray-600 leading-relaxed min-h-[36px]">
                          {zone.description}
                        </p>

                        <hr className="border-gray-200" />

                        {/* Partner Routing Display / Form */}
                        {isEditing ? (
                          <div className="space-y-3 pt-1">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                Default Delivery Partner:
                              </label>
                              <select
                                value={zoneForm.defaultPartnerId}
                                onChange={(e) => setZoneForm({ ...zoneForm, defaultPartnerId: e.target.value })}
                                className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#083028]"
                              >
                                <option value="">-- Select Default Partner --</option>
                                {partners.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.integrationType.toUpperCase()}) {p.isActive ? '' : '(Inactive)'}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                Fallback Delivery Partner:
                              </label>
                              <select
                                value={zoneForm.fallbackPartnerId}
                                onChange={(e) => setZoneForm({ ...zoneForm, fallbackPartnerId: e.target.value })}
                                className="w-full text-xs font-semibold border border-gray-300 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#083028]"
                              >
                                <option value="">-- No Fallback (Manual Review) --</option>
                                {partners.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.integrationType.toUpperCase()})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {zone.zoneKey !== 'zone_pan_india' && (
                              <div>
                                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                                  Mapped Pincodes / Prefixes:
                                </label>
                                <textarea
                                  rows={3}
                                  value={zoneForm.pincodesText}
                                  onChange={(e) => setZoneForm({ ...zoneForm, pincodesText: e.target.value })}
                                  placeholder="e.g. 211001, 211002 or 212"
                                  className="w-full text-xs font-mono border border-gray-300 rounded-xl p-2.5 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#083028]"
                                />
                                <span className="text-[10px] text-gray-400">Comma-separated pincodes or 3-digit prefixes.</span>
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={zoneForm.isActive}
                                  onChange={(e) => setZoneForm({ ...zoneForm, isActive: e.target.checked })}
                                  className="w-4 h-4 rounded text-[#083028]"
                                />
                                Active Zone
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2.5 text-xs">
                            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                              <span className="text-gray-500 font-medium">Default Partner:</span>
                              <span className="font-extrabold text-[#083028] flex items-center gap-1.5">
                                <Bike size={14} />
                                {zone.defaultPartnerName || (
                                  partners.find((p) => p.id === zone.defaultPartnerId)?.name || 'Not assigned'
                                )}
                              </span>
                            </div>

                            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-gray-200">
                              <span className="text-gray-500 font-medium">Fallback Partner:</span>
                              <span className="font-bold text-gray-700">
                                {zone.fallbackPartnerName || (
                                  partners.find((p) => p.id === zone.fallbackPartnerId)?.name || 'None (Manual Review)'
                                )}
                              </span>
                            </div>

                            <div className="bg-white p-3 rounded-xl border border-gray-200 space-y-1">
                              <span className="text-gray-500 font-medium block">Covered Pincodes:</span>
                              {zone.zoneKey === 'zone_pan_india' ? (
                                <span className="text-gray-700 font-semibold italic text-[11px]">
                                  All other domestic pincodes outside Allahabad.
                                </span>
                              ) : (
                                <div className="text-[11px] font-mono text-gray-600 line-clamp-2">
                                  {[...(zone.pincodes || []), ...(zone.pincodePrefixes?.map((p) => `${p}xxx`) || [])].join(', ') || 'No pincodes mapped'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Zone Card Actions */}
                      <div className="pt-2">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingZoneId(null)}
                              className="w-1/2 py-2 border border-gray-200 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100 transition"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={savingZone}
                              onClick={() => handleSaveZone(zone.id)}
                              className="w-1/2 py-2 bg-[#083028] text-white rounded-xl text-xs font-bold hover:bg-[#0b3d33] transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              {savingZone ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                              Save Rule
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleStartEditZone(zone)}
                            className="w-full py-2.5 border border-gray-300 hover:border-[#083028] hover:bg-white text-gray-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <Sliders size={14} /> Configure Dispatch Rules
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 3: REAL-TIME DISPATCH SIMULATOR
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2 text-[#083028] font-black text-sm uppercase tracking-wide">
                <Sparkles size={16} className="text-[#B8860B]" />
                <h3>Live Dispatch Routing Simulator</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter any customer delivery pincode to simulate how the backend routing engine resolves the delivery zone, partner, and dispatch type in real-time.
              </p>
            </div>

            <form onSubmit={handleTestRouting} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MapPin size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  maxLength={6}
                  value={testPincode}
                  onChange={(e) => setTestPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit delivery pincode (e.g. 211003, 212201, 411001)"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:outline-hidden focus:ring-2 focus:ring-[#083028]"
                />
              </div>
              <button
                type="submit"
                disabled={testingRouting}
                className="px-6 py-3 bg-[#083028] hover:bg-[#0b3d33] text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
              >
                {testingRouting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                <span>Test Dispatch Routing</span>
              </button>
            </form>

            {/* Quick Test Chips */}
            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
              <span className="font-bold text-gray-600">Quick Test:</span>
              <button
                type="button"
                onClick={() => setTestPincode('211001')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full font-mono text-[11px] text-gray-700 transition"
              >
                211001 (Allahabad City)
              </button>
              <button
                type="button"
                onClick={() => setTestPincode('212201')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full font-mono text-[11px] text-gray-700 transition"
              >
                212201 (Dehat / Rural)
              </button>
              <button
                type="button"
                onClick={() => setTestPincode('411001')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full font-mono text-[11px] text-gray-700 transition"
              >
                411001 (Pune / Pan India)
              </button>
              <button
                type="button"
                onClick={() => setTestPincode('110001')}
                className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full font-mono text-[11px] text-gray-700 transition"
              >
                110001 (Delhi / Pan India)
              </button>
            </div>

            {testError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{testError}</span>
              </div>
            )}

            {/* Simulation Result Card */}
            {testResult && (
              <div className="p-6 bg-[#FAF8F5] border-2 border-[#083028]/30 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={20} className="text-emerald-600" />
                    <h4 className="font-black text-gray-900 text-sm">Simulation Decision Output</h4>
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${
                    testResult.dispatchStatus === 'assigned'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    Status: {testResult.dispatchStatus}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-1">
                    <span className="text-gray-400 font-medium block">Detected Zone:</span>
                    <span className="font-black text-gray-900 text-sm">{testResult.zoneName}</span>
                    <span className="text-[10px] text-gray-400 font-mono block">key: {testResult.zoneKey}</span>
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-1">
                    <span className="text-gray-400 font-medium block">Assigned Delivery Partner:</span>
                    <span className="font-black text-[#083028] text-sm flex items-center gap-1.5">
                      <Bike size={16} />
                      {testResult.partnerName}
                    </span>
                    {testResult.isFallback && (
                      <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                        Fallback Partner Triggered
                      </span>
                    )}
                  </div>

                  <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-1">
                    <span className="text-gray-400 font-medium block">Dispatch Workflow:</span>
                    <span className="font-black text-sm uppercase">
                      {testResult.dispatchType === 'internal' ? (
                        <span className="text-emerald-700">Internal Local Dispatch</span>
                      ) : (
                        <span className="text-blue-700">External Courier API</span>
                      )}
                    </span>
                    <p className="text-[10px] text-gray-500">
                      {testResult.dispatchType === 'internal'
                        ? 'Handled by in-house rider. No courier fee booked.'
                        : 'Eligible for automated courier booking.'}
                    </p>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 text-xs text-gray-600 flex items-start gap-2">
                  <Info size={16} className="text-[#083028] shrink-0 mt-0.5" />
                  <span><strong>Routing Decision Log:</strong> {testResult.notes}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ADD / EDIT PARTNER MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      {partnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#083028] text-white flex items-center justify-center">
                  <Bike size={16} />
                </div>
                <h3 className="font-black text-gray-900 text-base">
                  {editingPartner ? 'Edit Delivery Partner' : 'Add New Delivery Partner'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPartnerModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSavePartner} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Partner Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={partnerForm.name}
                  onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })}
                  placeholder="e.g. Self Delivery, Shiprocket, Delhivery, Local Courier"
                  className="w-full text-xs font-semibold border border-gray-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-[#083028]"
                />
              </div>

              {!editingPartner && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Partner Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={partnerForm.code}
                    onChange={(e) => setPartnerForm({ ...partnerForm, code: e.target.value })}
                    placeholder="e.g. self_delivery, shiprocket"
                    className="w-full text-xs font-mono border border-gray-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-[#083028]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Integration Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      partnerForm.integrationType === 'manual'
                        ? 'border-[#083028] bg-emerald-50/50 text-[#083028]'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="integrationType"
                      value="manual"
                      checked={partnerForm.integrationType === 'manual'}
                      onChange={() => setPartnerForm({ ...partnerForm, integrationType: 'manual' })}
                      className="accent-[#083028]"
                    />
                    <div>
                      <span className="block text-xs font-bold">Manual / Self Rider</span>
                      <span className="text-[10px] text-gray-500">Internal local dispatch</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
                      partnerForm.integrationType === 'api'
                        ? 'border-[#083028] bg-blue-50/50 text-[#083028]'
                        : 'border-gray-200 text-gray-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="integrationType"
                      value="api"
                      checked={partnerForm.integrationType === 'api'}
                      onChange={() => setPartnerForm({ ...partnerForm, integrationType: 'api' })}
                      className="accent-[#083028]"
                    />
                    <div>
                      <span className="block text-xs font-bold">API Integration</span>
                      <span className="text-[10px] text-gray-500">External courier API</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Conditional API Credentials */}
              {partnerForm.integrationType === 'api' && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                    <Shield size={14} className="text-[#083028]" />
                    <span>API Credentials (Securely Stored)</span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      API Key / Email / Client ID:
                    </label>
                    <input
                      type="text"
                      value={partnerForm.apiKey}
                      onChange={(e) => setPartnerForm({ ...partnerForm, apiKey: e.target.value })}
                      placeholder={editingPartner?.hasCredentials ? '•••••••• (leave blank to keep current)' : 'Enter API key or login email'}
                      className="w-full text-xs font-mono border border-gray-200 rounded-xl p-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#083028]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">
                      API Secret / Password / Token:
                    </label>
                    <input
                      type="password"
                      value={partnerForm.apiSecret}
                      onChange={(e) => setPartnerForm({ ...partnerForm, apiSecret: e.target.value })}
                      placeholder={editingPartner?.hasCredentials ? '•••••••• (leave blank to keep current)' : 'Enter secret or API password'}
                      className="w-full text-xs font-mono border border-gray-200 rounded-xl p-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-[#083028]"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Credentials are saved securely on server-side and never exposed in browser responses.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tracking URL Template
                </label>
                <input
                  type="text"
                  value={partnerForm.trackingUrlTemplate}
                  onChange={(e) => setPartnerForm({ ...partnerForm, trackingUrlTemplate: e.target.value })}
                  placeholder="e.g. https://shiprocket.co/tracking/{awb}"
                  className="w-full text-xs font-mono border border-gray-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-[#083028]"
                />
                <span className="text-[10px] text-gray-400">Use <code className="text-gray-700">&#123;awb&#125;</code> where tracking number should be placed.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Description / Internal Notes
                </label>
                <textarea
                  rows={2}
                  value={partnerForm.description}
                  onChange={(e) => setPartnerForm({ ...partnerForm, description: e.target.value })}
                  placeholder="Notes on delivery coverage, rates, or handling rules"
                  className="w-full text-xs border border-gray-200 rounded-xl p-2.5 focus:outline-hidden focus:ring-2 focus:ring-[#083028]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={partnerForm.isActive}
                    onChange={(e) => setPartnerForm({ ...partnerForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-[#083028]"
                  />
                  Active (Eligible for automatic dispatch assignment)
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPartnerModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPartner}
                  className="px-5 py-2.5 bg-[#083028] hover:bg-[#0b3d33] text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs disabled:opacity-50"
                >
                  {savingPartner && <Loader2 size={14} className="animate-spin" />}
                  <span>{editingPartner ? 'Save Changes' : 'Create Partner'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
