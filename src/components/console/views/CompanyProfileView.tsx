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
  FileCheck
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
  const [legalName, setLegalName] = useState(profile?.legalName || 'GuruOm Industries LLP');
  const [address, setAddress] = useState(profile?.address || 'Plot 42, GIDC Industrial Estate, Metoda, Rajkot, Gujarat - 360021');
  const [phone, setPhone] = useState(profile?.phone || '+91 98250 12345');
  const [email, setEmail] = useState(profile?.email || 'contact@guruom.in');
  const [gstin, setGstin] = useState(profile?.gstin || '24AAAFG1234C1Z9');
  const [pan, setPan] = useState(profile?.pan || 'AAAFG1234C');
  const [state, setState] = useState(profile?.state || 'Gujarat');
  const [stateCode, setStateCode] = useState(profile?.stateCode || '24');

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Synchronize local form when backend profile updates
  useEffect(() => {
    if (profile) {
      setLegalName(profile.legalName || '');
      setAddress(profile.address || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setGstin(profile.gstin || '');
      setPan(profile.pan || '');
      setState(profile.state || '');
      setStateCode(profile.stateCode || '');
    }
  }, [profile]);

  // Auto-extract PAN & State Code from GSTIN if applicable
  const handleGstinChange = (val: string) => {
    const formatted = val.toUpperCase().trim();
    setGstin(formatted);
    if (formatted.length >= 2 && !stateCode) {
      const derivedCode = formatted.slice(0, 2);
      if (/^\d{2}$/.test(derivedCode)) {
        setStateCode(derivedCode);
      }
    }
    if (formatted.length >= 12 && !pan) {
      const derivedPan = formatted.slice(2, 12);
      if (/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(derivedPan)) {
        setPan(derivedPan);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const updated: CompanyProfile = {
      legalName: legalName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      email: email.trim(),
      gstin: gstin.trim().toUpperCase(),
      pan: pan.trim().toUpperCase(),
      state: state.trim(),
      stateCode: stateCode.trim(),
    };

    try {
      if (onSaveProfile) {
        await onSaveProfile(updated);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to persist company profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToCurrent = () => {
    if (profile) {
      setLegalName(profile.legalName || '');
      setAddress(profile.address || '');
      setPhone(profile.phone || '');
      setEmail(profile.email || '');
      setGstin(profile.gstin || '');
      setPan(profile.pan || '');
      setState(profile.state || '');
      setStateCode(profile.stateCode || '');
      setSaveError(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl font-sans">
      
      {/* Top Banner Header */}
      <div className={`p-5 sm:p-6 rounded-3xl border transition-ui ${
        isDarkMode 
          ? 'bg-[#09090B] border-slate-800 text-white shadow-xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-[var(--accent-primary)]/15 text-[var(--accent-primary)] border border-[var(--accent-primary)]/30' : 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20'
              }`}>
                Enterprise Registration
              </span>
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-500 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Real-Time Cloud Synced
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Company Profile & Tax Settings
            </h1>
            <p className={`text-xs max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Master organizational entity rendered on all GST Tax Invoices, Delivery Challans, E-Way Bills, and ERP Statutory Records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {savedSuccess && (
              <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Saved Real-Time</span>
              </div>
            )}
            <button
              type="button"
              onClick={handleResetToCurrent}
              title="Reset fields to current saved profile"
              className={`p-2.5 rounded-2xl border text-xs font-mono transition-ui cursor-pointer flex items-center gap-1.5 ${
                isDarkMode 
                  ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800' 
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Document Header Preview Card */}
      <div className={`p-5 rounded-3xl border space-y-3 ${
        isDarkMode 
          ? 'bg-gradient-to-br from-[#09090B] via-slate-900/80 to-[#09090B] border-slate-800 text-white' 
          : 'bg-gradient-to-br from-slate-50 via-white to-slate-50 border-slate-200 text-slate-900'
      }`}>
        <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[var(--accent-primary)]" />
            <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-400">
              Live Statutory Header Preview (Invoices & Challans)
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            GST Regime Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
          <div className="sm:col-span-2 space-y-1">
            <h2 className="text-base font-bold text-[var(--accent-primary)]">
              {legalName || 'Legal Entity Name'}
            </h2>
            <p className={`text-[11px] leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              <MapPin className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
              {address || 'Registered Works Address'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-mono text-slate-400">
              {phone && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-500" />
                  {phone}
                </span>
              )}
              {email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-500" />
                  {email}
                </span>
              )}
            </div>
          </div>

          <div className={`p-3 rounded-2xl border space-y-1.5 font-mono text-[11px] ${
            isDarkMode ? 'bg-[#09090B]/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">GSTIN:</span>
              <span className="font-bold text-emerald-500">{gstin || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">PAN:</span>
              <span className="font-bold text-sky-400">{pan || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">State:</span>
              <span className="font-bold">{state || '—'} ({stateCode || '—'})</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Profile Form Card */}
      <div className={`p-5 sm:p-8 rounded-3xl border transition-ui shadow-xl ${
        isDarkMode ? 'bg-[#09090B] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <form onSubmit={handleSave} className="space-y-6 text-xs font-sans">
          
          {saveError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs font-mono flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Section 1: Legal Registration */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
              <Building2 className="w-4 h-4 text-[var(--accent-primary)]" />
              <span className={`font-bold uppercase tracking-wider text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                1. Legal Entity & Communication
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block font-bold uppercase text-[10px] sm:text-[11px] mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Legal Organization Entity Name *
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={legalName}
                    onChange={(e) => setLegalName(e.target.value)}
                    placeholder="e.g. GuruOm Industries LLP"
                    className={`h-11 w-full pl-10 pr-3.5 rounded-xl border text-xs font-bold outline-none transition-ui ${
                      isDarkMode 
                        ? 'bg-slate-900/80 border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block font-bold uppercase text-[10px] sm:text-[11px] mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Official Contact Phone
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98250 12345"
                    className={`h-11 w-full pl-10 pr-3.5 rounded-xl border text-xs font-mono outline-none transition-ui ${
                      isDarkMode 
                        ? 'bg-slate-900/80 border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={`block font-bold uppercase text-[10px] sm:text-[11px] mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Official Corporate Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. contact@guruom.in"
                  className={`h-11 w-full pl-10 pr-3.5 rounded-xl border text-xs font-mono outline-none transition-ui ${
                    isDarkMode 
                      ? 'bg-slate-900/80 border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Registered Factory Address */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
              <MapPin className="w-4 h-4 text-emerald-500" />
              <span className={`font-bold uppercase tracking-wider text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                2. Registered Factory & Works Address
              </span>
            </div>

            <div>
              <label className={`block font-bold uppercase text-[10px] sm:text-[11px] mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Registered Works & Dispatch Plant Location *
              </label>
              <textarea
                rows={3}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full street address, industrial estate, city, state and pincode"
                className={`w-full rounded-2xl border p-3.5 text-xs outline-none transition-ui ${
                  isDarkMode 
                    ? 'bg-slate-900/80 border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                    : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                }`}
              />
            </div>
          </div>

          {/* Section 3: Statutory & Tax Identification */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span className={`font-bold uppercase tracking-wider text-[11px] ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                3. Statutory GST & Tax Registration
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className={`block font-bold uppercase text-[10px] sm:text-[11px] mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  GSTIN Registration # *
                </label>
                <input
                  type="text"
                  required
                  value={gstin}
                  onChange={(e) => handleGstinChange(e.target.value)}
                  placeholder="24AAAFG1234C1Z9"
                  className={`h-11 w-full px-3.5 rounded-xl border text-xs font-mono font-bold text-emerald-500 outline-none transition-ui ${
                    isDarkMode 
                      ? 'bg-slate-900/80 border-slate-700/80 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                      : 'bg-slate-50 border-slate-300 focus:border-emerald-500 shadow-xs'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold uppercase text-[10px] sm:text-[11px] mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  Income Tax PAN #
                </label>
                <input
                  type="text"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="AAAFG1234C"
                  className={`h-11 w-full px-3.5 rounded-xl border text-xs font-mono font-bold text-sky-400 outline-none transition-ui ${
                    isDarkMode 
                      ? 'bg-slate-900/80 border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20' 
                      : 'bg-slate-50 border-slate-300 focus:border-sky-500 shadow-xs'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold uppercase text-[10px] sm:text-[11px] mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  State Name
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Gujarat"
                  className={`h-11 w-full px-3.5 rounded-xl border text-xs outline-none transition-ui ${
                    isDarkMode 
                      ? 'bg-slate-900/80 border-slate-700/80 text-white focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-ring)]' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[var(--accent-primary)] shadow-xs'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold uppercase text-[10px] sm:text-[11px] mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  GST State Code
                </label>
                <input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  placeholder="e.g. 24"
                  className={`h-11 w-full px-3.5 rounded-xl border text-xs font-mono font-bold text-center text-purple-400 outline-none transition-ui ${
                    isDarkMode 
                      ? 'bg-slate-900/80 border-slate-700/80 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20' 
                      : 'bg-slate-50 border-slate-300 focus:border-purple-500 shadow-xs'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] font-mono text-slate-500">
              Changes apply instantly across all Tax Invoices, Delivery Challans, and E-Way Bills.
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[var(--accent-primary)] to-indigo-600 hover:from-indigo-600 hover:to-[var(--accent-primary)] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[var(--accent-primary)]/20 transition-ui hover:scale-[1.02] active:scale-[0.96] disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving & Syncing...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Enterprise Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default CompanyProfileView;

