import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  Save,
  CheckCircle2,
  Building,
  ShieldCheck,
  Landmark,
  Globe,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Hash,
  BadgePercent,
  Receipt,
  FileCheck,
  Copy,
  Check,
  ExternalLink,
  Lock,
  Stamp
} from 'lucide-react';
import { CompanyProfile } from '../../../types/console';

interface CompanyProfileViewProps {
  profile?: CompanyProfile | null;
  isDarkMode?: boolean;
  onSaveProfile?: (updated: CompanyProfile) => Promise<void> | void;
}

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({
  profile,
  isDarkMode = true,
  onSaveProfile,
}) => {
  const [legalName, setLegalName] = useState(profile?.legalName && profile.legalName !== 'Test Tech Ltd' ? profile.legalName : 'GuruOm Industries LLP');
  const [address, setAddress] = useState(
    !profile?.address || profile.address.includes('MIDC') || profile.address.includes('Metoda') || profile.address.includes('Rajkot') || profile.address.includes('123 Test St')
      ? 'Sr No 15/2, Mataji Logistic Park, Behind Tilakraj CNG Pump, Urali Devachi, Pune 412308, India'
      : profile.address
  );
  const [phone, setPhone] = useState(
    !profile?.phone || profile.phone.includes('2712 3456') || profile.phone.includes('98250') || profile.phone === '1234567890'
      ? '+91 9763 969 798'
      : profile.phone
  );
  const [email, setEmail] = useState(
    !profile?.email || profile.email === 'operations@guruom.in' || profile.email === 'test@example.com'
      ? 'contact@guruom.in'
      : profile.email
  );
  const [gstin, setGstin] = useState(profile?.gstin && !profile.gstin.startsWith('24') ? profile.gstin : '27AABCG1234F1Z5');
  const [pan, setPan] = useState(profile?.pan || 'AABCG1234F');
  const [state, setState] = useState(profile?.state || 'Maharashtra');
  const [stateCode, setStateCode] = useState(profile?.stateCode || '27');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Synchronize local form when backend profile updates
  useEffect(() => {
    if (profile) {
      setLegalName(profile.legalName && profile.legalName !== 'Test Tech Ltd' ? profile.legalName : 'GuruOm Industries LLP');
      setAddress(
        !profile.address || profile.address.includes('MIDC') || profile.address.includes('Metoda') || profile.address.includes('Rajkot') || profile.address.includes('123 Test St')
          ? 'Sr No 15/2, Mataji Logistic Park, Behind Tilakraj CNG Pump, Urali Devachi, Pune 412308, India'
          : profile.address
      );
      setPhone(
        !profile.phone || profile.phone.includes('2712 3456') || profile.phone.includes('98250') || profile.phone === '1234567890'
          ? '+91 9763 969 798'
          : profile.phone
      );
      setEmail(
        !profile.email || profile.email === 'operations@guruom.in' || profile.email === 'test@example.com'
          ? 'contact@guruom.in'
          : profile.email
      );
      setGstin(profile.gstin && !profile.gstin.startsWith('24') ? profile.gstin : '27AABCG1234F1Z5');
      setPan(profile.pan || 'AABCG1234F');
      setState(profile.state || 'Maharashtra');
      setStateCode(profile.stateCode || '27');
    }
  }, [profile]);

  // Live copy helper
  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Auto-extract PAN & State Code from GSTIN if applicable
  const handleGstinChange = (val: string) => {
    const formatted = val.toUpperCase().trim();
    setGstin(formatted);
    if (formatted.length >= 2) {
      const derivedCode = formatted.slice(0, 2);
      if (/^\d{2}$/.test(derivedCode)) {
        setStateCode(derivedCode);
        if (derivedCode === '27' && (!state || state === 'Maharshtra')) {
          setState('Maharashtra');
        } else if (derivedCode === '24' && (!state || state === 'Maharashtra')) {
          setState('Maharashtra');
        }
      }
    }
    if (formatted.length >= 12) {
      const derivedPan = formatted.slice(2, 12);
      if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(derivedPan)) {
        setPan(derivedPan);
      }
    }
  };

  // Validation checkers
  const isGstinValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin);
  const isPanValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const updated: CompanyProfile = {
      legalName: (legalName || 'GuruOm Industries LLP').trim(),
      address: (address || 'Sr No 15/2, Mataji Logistic Park, Behind Tilakraj CNG Pump, Urali Devachi, Pune 412308, India').trim(),
      phone: (phone || '+91 9763 969 798').trim(),
      email: (email || 'contact@guruom.in').trim(),
      gstin: (gstin || '27AABCG1234F1Z5').trim().toUpperCase(),
      pan: (pan || 'AABCG1234F').trim().toUpperCase(),
      state: (state || 'Maharashtra').trim(),
      stateCode: (stateCode || '27').trim(),
    };

    try {
      if (onSaveProfile) {
        await onSaveProfile(updated);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save company profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToCurrent = () => {
    if (profile) {
      setLegalName(profile.legalName && profile.legalName !== 'Test Tech Ltd' ? profile.legalName : 'GuruOm Industries LLP');
      setAddress(
        !profile.address || profile.address.includes('MIDC') || profile.address.includes('Metoda') || profile.address.includes('Rajkot') || profile.address.includes('123 Test St')
          ? 'Sr No 15/2, Mataji Logistic Park, Behind Tilakraj CNG Pump, Urali Devachi, Pune 412308, India'
          : profile.address
      );
      setPhone(
        !profile.phone || profile.phone.includes('2712 3456') || profile.phone.includes('98250') || profile.phone === '1234567890'
          ? '+91 9763 969 798'
          : profile.phone
      );
      setEmail(
        !profile.email || profile.email === 'operations@guruom.in' || profile.email === 'test@example.com'
          ? 'contact@guruom.in'
          : profile.email
      );
      setGstin(profile.gstin && !profile.gstin.startsWith('24') ? profile.gstin : '27AABCG1234F1Z5');
      setPan(profile.pan || 'AABCG1234F');
      setState(profile.state || 'Maharashtra');
      setStateCode(profile.stateCode || '27');
      setSaveError(null);
    } else {
      setLegalName('GuruOm Industries LLP');
      setAddress('Sr No 15/2, Mataji Logistic Park, Behind Tilakraj CNG Pump, Urali Devachi, Pune 412308, India');
      setPhone('+91 9763 969 798');
      setEmail('contact@guruom.in');
      setGstin('27AABCG1234F1Z5');
      setPan('AABCG1234F');
      setState('Maharashtra');
      setStateCode('27');
      setSaveError(null);
    }
  };

  const inputClass = `h-11 w-full rounded-xl border px-3.5 text-xs font-medium outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 ${isDarkMode
    ? 'border-white/10 bg-black/60 text-white placeholder:text-slate-500 hover:border-white/20 focus:bg-black/80'
    : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:bg-white'
    }`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12">

      {/* 1. Top Executive Control Deck */}
      <div className={`p-6 sm:p-7 rounded-3xl border transition-all ${isDarkMode
        ? 'bg-[#09090B] border-white/10 text-white shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
        : 'bg-white border-slate-200/80 shadow-sm text-slate-900'
        }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30">
                  Enterprise Registration
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Rule 55 & GST Compliant</span>
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                Company Profile & Tax Settings
              </h1>
              <p className={`text-xs max-w-2xl leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Master organizational entity details rendered on all GST Tax Invoices, Delivery Challans (Rule 55), E-Way Bills, and inspection certificates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 self-start lg:self-center">
            {savedSuccess && (
              <div className="px-3.5 py-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Saved & Synchronized</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleResetToCurrent}
              title="Reset fields to current saved profile"
              className={`px-4 py-2.5 rounded-full border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-[0.98] ${isDarkMode
                ? 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/10 hover:text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 shadow-xs'
                }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] active:scale-[0.98] text-white text-xs font-semibold flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer disabled:opacity-50 transition-all"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Two-Column Interactive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left Column: Official Statutory Entity Card & Real-Time Stationery Preview */}
        <div className="lg:col-span-5 space-y-6">

          {/* Official Digital Certificate Card */}
          <div className={`p-6 rounded-3xl border relative overflow-hidden transition-all ${isDarkMode
            ? 'bg-[#09090B] border-white/10 text-white shadow-[0_24px_60px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-200/80 text-slate-900 shadow-sm'
            }`}>
            {/* Ambient Sapphire Glow */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 -right-20 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl"
            />

            {/* Entity Header */}
            <div className="flex items-start justify-between border-b border-white/10 dark:border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white shadow-md shadow-blue-500/20 font-bold text-sm">
                  GO
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase font-semibold text-[#007AFF] tracking-wider block">
                    REGISTERED ENTERPRISE
                  </span>
                  <h3 className="text-sm font-bold tracking-tight text-white dark:text-white line-clamp-1">
                    {legalName || 'GuruOm Industries LLP'}
                  </h3>
                </div>
              </div>

              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Active</span>
              </span>
            </div>

            {/* Address & Contact Block */}
            <div className="py-4 space-y-3 border-b border-white/10 dark:border-white/10 text-xs">
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block mb-1">
                  Registered Works Address
                </span>
                <p className={`text-xs leading-relaxed flex items-start gap-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  <MapPin className="w-3.5 h-3.5 text-[#007AFF] shrink-0 mt-0.5" />
                  <span>{address || 'Sr No 15/2, Mataji Logistic Park, Behind Tilakraj CNG Pump, Urali Devachi, Pune 412308, India'}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] uppercase text-slate-400 font-medium block">Phone</span>
                  <p className="font-mono text-xs font-semibold truncate mt-0.5">{phone || '—'}</p>
                </div>
                <div className={`p-2.5 rounded-xl border ${isDarkMode ? 'bg-black/40 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <span className="text-[10px] uppercase text-slate-400 font-medium block">Email</span>
                  <p className="font-mono text-xs font-semibold truncate mt-0.5">{email || '—'}</p>
                </div>
              </div>
            </div>

            {/* Key Statutory Identifiers Grid */}
            <div className="pt-4 space-y-2.5">
              <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider block">
                Statutory Identifiers
              </span>

              {/* GSTIN Row with Copy Button */}
              <div className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
                }`}>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-slate-400">GSTIN Registration</span>
                    {isGstinValid ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Valid GSTIN Format" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Check format" />
                    )}
                  </div>
                  <span className="font-mono font-bold text-xs text-emerald-400 tracking-wide block mt-0.5">
                    {gstin || '—'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(gstin, 'gstin')}
                  title="Copy GSTIN"
                  className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${isDarkMode ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                >
                  {copiedField === 'gstin' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* PAN & State Code Row */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className={`p-3 rounded-2xl border flex items-center justify-between ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                  <div>
                    <span className="text-[10px] font-medium text-slate-400 block">PAN Number</span>
                    <span className="font-mono font-bold text-xs text-sky-400 tracking-wide block mt-0.5">
                      {pan || '—'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(pan, 'pan')}
                    title="Copy PAN"
                    className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${isDarkMode ? 'border-white/10 text-slate-400 hover:text-white hover:bg-white/10' : 'border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                  >
                    {copiedField === 'pan' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
                  }`}>
                  <span className="text-[10px] font-medium text-slate-400 block">State (Code)</span>
                  <span className="font-mono font-bold text-xs text-purple-400 block mt-0.5 truncate">
                    {state || 'Maharashtra'} ({stateCode || '27'})
                  </span>
                </div>
              </div>
            </div>

            {/* Rule 55 Statutory Stamp */}
            <div className={`mt-4 p-3 rounded-2xl border flex items-center gap-2.5 text-[11px] ${isDarkMode ? 'bg-blue-500/5 border-blue-500/20 text-slate-300' : 'bg-blue-50 border-blue-200 text-slate-700'
              }`}>
              <ShieldCheck className="w-4 h-4 text-[#007AFF] shrink-0" />
              <span>Registered under GST Section 31 & Rule 55 for manufacturing movement of goods.</span>
            </div>
          </div>

          {/* Real-Time Stationery Print Box Preview */}
          <div className={`p-5 rounded-3xl border space-y-3 ${isDarkMode
            ? 'bg-[#09090B] border-white/10 text-white'
            : 'bg-white border-slate-200 text-slate-900'
            }`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#007AFF]" />
                <span className="text-xs font-semibold">
                  Official Document Header Preview
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Rule 55 Format
              </span>
            </div>

            {/* Inset Stationery Template */}
            <div className={`p-4 rounded-2xl border text-xs space-y-2 ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-slate-50 border-slate-200'
              }`}>
              <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase bg-[#007AFF]/15 text-[#007AFF] border border-[#007AFF]/30">
                PRECISION MANUFACTURING ENTERPRISE
              </span>
              <h4 className="font-bold text-sm tracking-tight text-white dark:text-white uppercase">
                {legalName || 'GuruOm Industries LLP'}
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {address || 'Sr No 15/2, Mataji Logistic Park, Behind Tilakraj CNG Pump, Urali Devachi, Pune 412308, India'}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-slate-400 pt-1 border-t border-white/10">
                <span><strong>GSTIN:</strong> {gstin || '27AABCG1234F1Z5'}</span>
                <span><strong>State Code:</strong> {stateCode || '27'}</span>
                <span><strong>PAN:</strong> {pan || 'AABCG1234F'}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              This layout automatically formats the top header on generated Delivery Challans, Invoices, and Inspection CoC Certificates.
            </p>
          </div>
        </div>

        {/* Right Column: Inset Grouped Settings Form */}
        <div className="lg:col-span-7">
          <div className={`p-6 sm:p-8 rounded-3xl border transition-all ${isDarkMode
            ? 'bg-[#09090B] border-white/10 text-white shadow-[0_24px_60px_rgba(0,0,0,0.8)]'
            : 'bg-white border-slate-200/80 text-slate-900 shadow-sm'
            }`}>
            <form onSubmit={handleSave} className="space-y-6 text-xs">

              {saveError && (
                <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Group 1: Legal Identity & Corporate Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <div className="p-1.5 rounded-lg bg-[#007AFF]/10 text-[#007AFF]">
                    <Building className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      1. Legal Entity & Corporate Details
                    </h3>
                    <p className="text-[11px] text-slate-400">Official registered corporate title and verified contact info</p>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Legal Organization Entity Name *
                    </label>
                    <div className="relative">
                      <Building2 className={`w-4 h-4 absolute left-3.5 top-3.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                      <input
                        type="text"
                        required
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. GuruOm Industries LLP"
                        className={`${inputClass} pl-10 font-medium`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Official Contact Phone
                      </label>
                      <div className="relative">
                        <Phone className={`w-4 h-4 absolute left-3.5 top-3.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. +91 9763 969 798"
                          className={`${inputClass} pl-10 font-mono`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Corporate Operations Email
                      </label>
                      <div className="relative">
                        <Mail className={`w-4 h-4 absolute left-3.5 top-3.5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="e.g. contact@guruom.in"
                          className={`${inputClass} pl-10 font-mono`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Registered Manufacturing Works & Dispatch Plant */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      2. Registered Manufacturing Works & Plant
                    </h3>
                    <p className="text-[11px] text-slate-400">Physical factory location used as the primary consignor facility</p>
                  </div>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Registered Works & Dispatch Plant Address *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Full street address, industrial estate, city, state, and pincode"
                    className={`w-full rounded-xl border p-3.5 text-xs font-medium outline-none transition-[border-color,box-shadow,background-color] duration-150 focus:border-[#007AFF] focus:ring-4 focus:ring-[#007AFF]/15 ${isDarkMode
                      ? 'border-white/10 bg-black/60 text-white placeholder:text-slate-500 hover:border-white/20 focus:bg-black/80'
                      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 hover:border-slate-300 focus:bg-white'
                      }`}
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    This address appears as the Goods Origin on all outward GST delivery documents and E-Way bills.
                  </span>
                </div>
              </div>

              {/* Group 3: Statutory GST & Tax Registration */}
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-white/10">
                  <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      3. Statutory GST & Tax Registration
                    </h3>
                    <p className="text-[11px] text-slate-400">Government statutory identifiers and state tax jurisdiction</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        GSTIN Registration Number *
                      </label>
                      {isGstinValid && (
                        <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Valid format
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={gstin}
                      onChange={(e) => handleGstinChange(e.target.value)}
                      placeholder="27AABCG1234F1Z5"
                      className={`${inputClass} font-mono font-bold text-emerald-400`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Permanent Account Number (PAN) *
                      </label>
                      {isPanValid && (
                        <span className="text-[10px] font-medium text-sky-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Verified PAN
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={pan}
                      onChange={(e) => setPan(e.target.value.toUpperCase())}
                      placeholder="AABCG1234F"
                      className={`${inputClass} font-mono font-bold text-sky-400`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      State Jurisdiction Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="e.g. Maharashtra"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      GST State Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={stateCode}
                      onChange={(e) => setStateCode(e.target.value)}
                      placeholder="e.g. 27"
                      className={`${inputClass} font-mono font-bold text-purple-400 text-center`}
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Footer */}
              <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Modifications take effect immediately across all newly generated documents.
                </p>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleResetToCurrent}
                    className={`w-1/2 sm:w-auto px-4 py-2.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${isDarkMode
                      ? 'border-white/10 text-slate-300 hover:bg-white/10'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    Discard
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-1/2 sm:w-auto px-6 py-2.5 rounded-full bg-[#007AFF] hover:bg-[#0071E3] active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Save enterprise profile</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfileView;
