'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  MapPin,
  Building2,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Upload,
  X,
  Clock,
} from 'lucide-react';

// ── Indian States ────────────────────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli and Daman & Diu',
  'Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
];

// ── Field component helpers ──────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

function inputCls(extra = '') {
  return `w-full pl-10 pr-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition-all ${extra}`;
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function BusinessRegisterPage() {
  // Personal info
  const [fullName, setFullName]   = useState('');
  const [mobile, setMobile]       = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Address
  const [shopAddress, setShopAddress] = useState('');
  const [landmark, setLandmark]       = useState('');
  const [city, setCity]               = useState('');
  const [state, setState]             = useState('');
  const [pincode, setPincode]         = useState('');

  // Business
  const [businessType, setBusinessType] = useState<'retail_store' | 'hawker' | ''>('');
  const [hasGstin, setHasGstin]         = useState(false);
  const [gstin, setGstin]               = useState('');

  // Document upload
  const [docFile, setDocFile]       = useState<File | null>(null);
  const [docPreview, setDocPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  function handleDocChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Document photo must be under 5MB.');
      return;
    }
    setDocFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = () => setDocPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removeDoc() {
    setDocFile(null);
    setDocPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic client-side checks
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (!businessType) {
      setError('Please select your business type.');
      return;
    }
    if (!docFile) {
      setError('Please upload a verification document photo.');
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('full_name', fullName);
      fd.append('mobile', mobile);
      fd.append('email', email);
      fd.append('password', password);
      fd.append('shop_address', shopAddress);
      fd.append('landmark', landmark);
      fd.append('city', city);
      fd.append('state', state);
      fd.append('pincode', pincode);
      fd.append('business_type', businessType);
      fd.append('has_gstin', String(hasGstin));
      fd.append('gstin', hasGstin ? gstin : '');
      fd.append('document', docFile);

      const res = await fetch('/api/business/register', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Registration failed. Please try again.');
        return;
      }

      setSubmitted(true);
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Success / Pending Screen ──────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
            {/* Clock icon */}
            <div className="w-20 h-20 rounded-full bg-amber-50 border-4 border-amber-200 flex items-center justify-center mx-auto mb-5">
              <Clock size={38} className="text-amber-500" />
            </div>

            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
              Registration Submitted!
            </h2>
            <p className="text-sm font-semibold text-amber-600 mb-4">
              STATUS: PENDING — Verification Under Review
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-left text-xs sm:text-sm text-gray-700 mb-6 space-y-1.5">
              <p>✅ Your application has been received.</p>
              <p>🔍 Our team will manually verify your document.</p>
              <p>⏳ Approval takes <strong>24 to 48 hours</strong>.</p>
              <p>📦 Once approved, you can access wholesale pricing and place bulk orders.</p>
            </div>

            <p className="text-xs text-gray-500 mb-6">
              Need help?{' '}
              <Link href="/contact" className="font-bold text-[#083028] hover:underline">
                Contact Support
              </Link>
            </p>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full bg-[#083028] hover:bg-[#051e19] text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md text-sm"
            >
              Explore Catalog
              <ArrowRight size={15} />
            </Link>

            <div className="mt-4">
              <Link href="/login" className="text-xs font-bold text-[#083028] hover:underline">
                Already registered? Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Registration Form ─────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#FAF8F3] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-10">

          {/* Header */}
          <div className="text-center mb-7">
            <Link href="/" className="inline-block mb-3">
              <div className="relative h-12 w-24 mx-auto">
                <Image
                  src="/home-images/logo.png"
                  alt="AR Garment"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Business Registration
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Register your shop or business to buy wholesale from AR Garment
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs sm:text-sm flex items-start gap-2.5">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Personal Info ── */}
            <p className="text-[10px] font-bold text-[#083028] uppercase tracking-widest border-b border-gray-100 pb-1">
              Personal Details
            </p>

            {/* Full Name */}
            <div>
              <Label>Full Name</Label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className={inputCls()}
                />
              </div>
            </div>

            {/* Mobile */}
            <div>
              <Label>Mobile Number</Label>
              <div className="relative">
                <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  pattern="\d{10}"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="+91 | 10-digit mobile number"
                  className={inputCls()}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <Label>Email ID</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls()}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label>Password</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* ── Address ── */}
            <p className="text-[10px] font-bold text-[#083028] uppercase tracking-widest border-b border-gray-100 pb-1 pt-1">
              Complete Address (पूरा पता)
            </p>

            {/* Shop Address */}
            <div>
              <Label>Shop Name / House No. / Gali / Mohalla</Label>
              <div className="relative">
                <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="Shop name, house no., street"
                  className={inputCls()}
                />
              </div>
            </div>

            {/* Landmark */}
            <div>
              <Label>
                Landmark <span className="text-gray-400 font-normal">(Optional — लैंडमार्क)</span>
              </Label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  maxLength={100}
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near landmark, market, etc."
                  className={inputCls()}
                />
              </div>
            </div>

            {/* City & State row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>City / Town</Label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    maxLength={80}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City / शहर"
                    className={inputCls()}
                  />
                </div>
              </div>
              <div>
                <Label>State / राज्य</Label>
                <select
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition-all"
                >
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* PIN Code */}
            <div>
              <Label>6-digit PIN Code / पिन कोड</Label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  pattern="\d{6}"
                  inputMode="numeric"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit PIN code"
                  className={inputCls()}
                />
              </div>
            </div>

            {/* ── Business Type ── */}
            <p className="text-[10px] font-bold text-[#083028] uppercase tracking-widest border-b border-gray-100 pb-1 pt-1">
              Select Business Type (बिजनेस का प्रकार चुनें)
            </p>

            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: 'retail_store', label: 'Retail Store Owner' },
                  { value: 'hawker',       label: 'Hawker / Pheri' },
                ] as const
              ).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setBusinessType(value)}
                  className={`py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    businessType === value
                      ? 'bg-[#083028] text-white border-[#083028] shadow-md'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#083028] hover:text-[#083028]'
                  }`}
                >
                  {label}
                  {businessType === value && ' ✓'}
                </button>
              ))}
            </div>

            {/* ── GSTIN — only for retail store ── */}
            {businessType === 'retail_store' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>GSTIN (Optional)</Label>
                  <div className="flex gap-2">
                    {(['Yes', 'No'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => { setHasGstin(opt === 'Yes'); if (opt === 'No') setGstin(''); }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          (opt === 'Yes') === hasGstin
                            ? 'bg-[#083028] text-white border-[#083028]'
                            : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-[#083028]'
                        }`}
                      >
                        {opt}{(opt === 'Yes') === hasGstin ? ' ✓' : ''}
                      </button>
                    ))}
                  </div>
                </div>
                {hasGstin && (
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="Enter 15-digit GSTIN (if available)"
                    className="w-full px-4 py-2.5 sm:py-3 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#083028] focus:bg-white transition-all font-mono tracking-widest"
                  />
                )}
              </div>
            )}

            {/* ── Document Upload ── */}
            <div>
              <p className="text-[10px] font-bold text-[#083028] uppercase tracking-widest border-b border-gray-100 pb-1 mb-3">
                {businessType === 'hawker'
                  ? 'Upload Verification Document'
                  : 'Upload Visiting Card or Shop Front Photo'}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {businessType === 'hawker'
                  ? 'Upload a photo with your cart, vehicle, or goods (फेरी पर जाते समय गाड़ी, ठेले या माल के साथ फोटो)'
                  : 'Upload your visiting card or shop front photo (अपनी दुकान का Visiting Card या दुकान के सामने की फोटो)'}
              </p>

              {docPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={docPreview} alt="Document preview" className="w-full max-h-52 object-contain bg-gray-50" />
                  <button
                    type="button"
                    onClick={removeDoc}
                    className="absolute top-2 right-2 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow"
                  >
                    <X size={14} />
                  </button>
                  <div className="px-3 py-2 bg-green-50 border-t border-green-100 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700 font-medium truncate">{docFile?.name}</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-300 hover:border-[#083028] rounded-xl py-8 px-4 flex flex-col items-center gap-2.5 transition-all group"
                >
                  <div className="flex gap-3 text-gray-400 group-hover:text-[#083028] transition-colors">
                    <Upload size={28} />
                  </div>
                  <p className="text-xs text-gray-500 group-hover:text-[#083028] font-medium transition-colors">
                    Tap to upload photo — Max 5MB
                  </p>
                  <p className="text-[11px] text-gray-400">
                    कैमरा से फोटो लें या अपलोड करें
                  </p>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleDocChange}
              />
            </div>

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 bg-[#083028] hover:bg-[#051e19] text-white font-semibold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Submit for Verification — सबमिट करें</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs sm:text-sm text-gray-500">
            Already registered?{' '}
            <Link href="/login" className="font-bold text-[#083028] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
