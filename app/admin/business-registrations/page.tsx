'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Store,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  X,
  Phone,
  Mail,
  MapPin,
  FileImage,
  ShoppingBag,
  Loader2,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface BusinessReg {
  id: string;
  full_name: string;
  mobile: string;
  applicant_email: string;
  shop_address: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  business_type: 'retail_store' | 'hawker';
  has_gstin: boolean;
  gstin: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string;
  created_at: string;
  reviewed_at: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: BusinessReg['status'] }) {
  const map = {
    pending:  { cls: 'bg-amber-50 text-amber-700 border-amber-200',  icon: <Clock size={12} />,        label: 'Pending' },
    approved: { cls: 'bg-green-50 text-green-700 border-green-200', icon: <CheckCircle2 size={12} />, label: 'Approved' },
    rejected: { cls: 'bg-red-50  text-red-700   border-red-200',    icon: <XCircle size={12} />,      label: 'Rejected' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-semibold ${map.cls}`}>
      {map.icon} {map.label}
    </span>
  );
}

// ── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({
  reg,
  onClose,
  onUpdate,
}: {
  reg: BusinessReg;
  onClose: () => void;
  onUpdate: (id: string, status: 'approved' | 'rejected', note: string) => Promise<void>;
}) {
  const [note, setNote]       = useState(reg.admin_note || '');
  const [busy, setBusy]       = useState(false);
  const [action, setAction]   = useState<'approved' | 'rejected' | null>(null);

  async function handleAction(status: 'approved' | 'rejected') {
    setBusy(true);
    setAction(status);
    await onUpdate(reg.id, status, note);
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Store size={18} className="text-[#083028]" />
            Business Application
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
            <X size={16} className="text-gray-600" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Status */}
          <div className="flex items-center justify-between">
            <StatusBadge status={reg.status} />
            <span className="text-xs text-gray-400">{formatDate(reg.created_at)}</span>
          </div>

          {/* Personal */}
          <section>
            <p className="text-[10px] font-bold text-[#083028] uppercase tracking-widest mb-2">Personal Info</p>
            <div className="space-y-1.5 text-sm text-gray-700">
              <div className="flex items-center gap-2"><span className="font-semibold w-24 flex-shrink-0 text-xs text-gray-500">Name</span>{reg.full_name}</div>
              <div className="flex items-center gap-2"><Phone size={13} className="text-gray-400 flex-shrink-0" /><span>{reg.mobile}</span></div>
              <div className="flex items-center gap-2"><Mail size={13} className="text-gray-400 flex-shrink-0" /><span className="break-all">{reg.applicant_email}</span></div>
            </div>
          </section>

          {/* Address */}
          <section>
            <p className="text-[10px] font-bold text-[#083028] uppercase tracking-widest mb-2">Address</p>
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <MapPin size={13} className="text-gray-400 flex-shrink-0 mt-0.5" />
              <span>
                {reg.shop_address}
                {reg.landmark ? `, Near ${reg.landmark}` : ''}
                {`, ${reg.city}, ${reg.state} - ${reg.pincode}`}
              </span>
            </div>
          </section>

          {/* Business */}
          <section>
            <p className="text-[10px] font-bold text-[#083028] uppercase tracking-widest mb-2">Business Details</p>
            <div className="space-y-1.5 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <ShoppingBag size={13} className="text-gray-400" />
                <span className="capitalize">{reg.business_type === 'retail_store' ? 'Retail Store Owner' : 'Hawker / Pheri'}</span>
              </div>
              {reg.has_gstin && reg.gstin && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-semibold w-12">GSTIN</span>
                  <span className="font-mono text-xs bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">{reg.gstin}</span>
                </div>
              )}
            </div>
          </section>

          {/* Document */}
          <section>
            <p className="text-[10px] font-bold text-[#083028] uppercase tracking-widest mb-2">Verification Document</p>
            {reg.document_url ? (
              <a href={reg.document_url} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={reg.document_url}
                  alt="Verification document"
                  className="w-full max-h-64 object-contain rounded-xl border border-gray-200 bg-gray-50 hover:opacity-90 transition cursor-zoom-in"
                />
                <p className="text-xs text-[#083028] text-center mt-1 hover:underline">
                  Click to open full image ↗
                </p>
              </a>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <FileImage size={16} />
                <span>No document uploaded</span>
              </div>
            )}
          </section>

          {/* Admin Note */}
          {reg.status === 'pending' && (
            <section>
              <p className="text-[10px] font-bold text-[#083028] uppercase tracking-widest mb-2">
                Admin Note (Optional)
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add a note for rejection reason or approval remarks..."
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#083028] resize-none transition"
              />
            </section>
          )}

          {reg.admin_note && reg.status !== 'pending' && (
            <section>
              <p className="text-[10px] font-bold text-[#083028] uppercase tracking-widest mb-1">Admin Note</p>
              <p className="text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">{reg.admin_note}</p>
            </section>
          )}
        </div>

        {/* Action Buttons */}
        {reg.status === 'pending' && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => handleAction('rejected')}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {busy && action === 'rejected' ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
              Reject
            </button>
            <button
              onClick={() => handleAction('approved')}
              disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-[#083028] hover:bg-[#051e19] text-white font-semibold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
            >
              {busy && action === 'approved' ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AdminBusinessRegistrationsPage() {
  const [registrations, setRegistrations] = useState<BusinessReg[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [filter, setFilter]               = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selected, setSelected]           = useState<BusinessReg | null>(null);

  async function fetchRegistrations(statusFilter: typeof filter) {
    setLoading(true);
    setError(null);
    try {
      const url = statusFilter === 'all'
        ? '/api/admin/business-registrations'
        : `/api/admin/business-registrations?status=${statusFilter}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      setRegistrations(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load business registrations.');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchRegistrations(filter); }, [filter]);

  async function handleUpdate(id: string, status: 'approved' | 'rejected', admin_note: string) {
    const res = await fetch('/api/admin/business-registrations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, admin_note }),
    });
    if (res.ok) {
      setSelected(null);
      fetchRegistrations(filter);
    }
  }

  const counts = {
    all:      registrations.length,
    pending:  registrations.filter((r) => r.status === 'pending').length,
    approved: registrations.filter((r) => r.status === 'approved').length,
    rejected: registrations.filter((r) => r.status === 'rejected').length,
  };

  const tabs: { key: typeof filter; label: string; color: string }[] = [
    { key: 'all',      label: 'All',      color: 'bg-gray-100 text-gray-700' },
    { key: 'pending',  label: 'Pending',  color: 'bg-amber-50 text-amber-700 border border-amber-200' },
    { key: 'approved', label: 'Approved', color: 'bg-green-50 text-green-700 border border-green-200' },
    { key: 'rejected', label: 'Rejected', color: 'bg-red-50  text-red-700   border border-red-200' },
  ];

  return (
    <div className="space-y-6">
      {selected && (
        <DetailModal
          reg={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Store className="text-[#083028]" size={26} />
            Business Registrations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : `${registrations.length} application${registrations.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Link
          href="/admin"
          className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-3.5 py-2 rounded-xl transition shadow-xs"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === key
                ? color + ' shadow-sm ring-2 ring-offset-1 ring-[#083028]/30'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
            }`}
          >
            {label}
            {filter !== 'all' || key === 'all' ? '' : ''}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl">
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="w-8 h-8 border-4 border-[#083028] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : registrations.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <Store size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-bold text-gray-800">No Registrations Found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {filter === 'pending'
              ? 'No pending applications right now.'
              : 'Business registration applications will appear here.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Type</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Location</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Applied On</th>
                  <th className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {registrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900 text-sm">{reg.full_name}</p>
                      <p className="text-xs text-gray-500">{reg.applicant_email}</p>
                    </td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <span className="text-xs text-gray-600 capitalize">
                        {reg.business_type === 'retail_store' ? 'Retail Store' : 'Hawker'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className="text-xs text-gray-600">{reg.city}, {reg.state}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={reg.status} />
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      <span className="text-xs text-gray-500">{formatDate(reg.created_at)}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setSelected(reg)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#083028] hover:bg-[#051e19] text-white text-xs font-semibold transition shadow-sm"
                      >
                        <Eye size={13} />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
