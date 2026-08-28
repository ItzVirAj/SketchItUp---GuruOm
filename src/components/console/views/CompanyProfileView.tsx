import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  Save, 
  CheckCircle2, 
  Building,
  ShieldCheck
} from 'lucide-react';
import { CompanyProfile } from '../../../types/console';

interface CompanyProfileViewProps {
  profile: CompanyProfile;
  isDarkMode?: boolean;
  onSaveProfile?: (updated: CompanyProfile) => void;
}

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({
  profile,
  isDarkMode = true,
  onSaveProfile,
}) => {
  const [legalName, setLegalName] = useState(profile.legalName);
  const [address, setAddress] = useState(profile.address);
  const [phone, setPhone] = useState(profile.phone);
  const [email, setEmail] = useState(profile.email);
  const [gstin, setGstin] = useState(profile.gstin);
  const [pan, setPan] = useState(profile.pan);
  const [state, setState] = useState(profile.state);
  const [stateCode, setStateCode] = useState(profile.stateCode);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CompanyProfile = {
      legalName,
      address,
      phone,
      email,
      gstin,
      pan,
      state,
      stateCode,
    };

    if (onSaveProfile) {
      onSaveProfile(updated);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl font-sans">
      
      {/* Top Banner Header */}
      <div className={`p-4 sm:p-6 rounded-3xl border transition-all ${
        isDarkMode 
          ? 'bg-slate-900/80 border-slate-800/80 text-white backdrop-blur-xl shadow-2xl' 
          : 'bg-white border-slate-200 shadow-sm text-slate-900'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${
                isDarkMode ? 'bg-[#5B75F8]/20 text-[#7B92FF] border border-[#5B75F8]/30' : 'bg-[#5B75F8]/10 text-[#5B75F8] border border-[#5B75F8]/20'
              }`}>
                Enterprise Registration
              </span>
              <span className={`text-[11px] sm:text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                • Master Legal Entity
              </span>
            </div>
            <h1 className={`text-xl sm:text-2xl font-bold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Company Profile & Tax Settings
            </h1>
            <p className={`text-xs mt-0.5 sm:mt-1 max-w-xl ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Master organizational data rendered on Tax Invoices, Delivery Challans, E-Way Bills, and GST Tax Returns.
            </p>
          </div>

          {savedSuccess && (
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-mono font-bold flex items-center justify-center gap-1.5 animate-bounce w-full sm:w-auto">
              <CheckCircle2 className="w-4 h-4" />
              <span>Profile Saved Successfully</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Profile Form Card */}
      <div className={`p-4 sm:p-8 rounded-3xl border transition-all shadow-xl ${
        isDarkMode ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        <form onSubmit={handleSave} className="space-y-4 sm:space-y-6 font-mono text-xs">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] sm:text-[11px] mb-1.5 sm:mb-2">
                Legal Organization Entity Name *
              </label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className={`w-full rounded-2xl border px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-sans font-bold outline-none transition-all ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#5B75F8]'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] sm:text-[11px] mb-1.5 sm:mb-2">
                Official Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full rounded-2xl border px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-mono outline-none transition-all ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#5B75F8]'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-bold uppercase text-[10px] sm:text-[11px] mb-1.5 sm:mb-2">
              Registered Works & Factory Address *
            </label>
            <textarea
              rows={3}
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={`w-full rounded-2xl border px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-sans outline-none transition-all ${
                isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#5B75F8]'
              }`}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] sm:text-[11px] mb-1 sm:mb-1.5">
                Official Corporate Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#5B75F8]'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] sm:text-[11px] mb-1 sm:mb-1.5">
                GSTIN Registration # *
              </label>
              <input
                type="text"
                required
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono font-bold text-[#5B75F8] dark:text-[#7B92FF] outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 focus:border-[#5B75F8]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#5B75F8]'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] sm:text-[11px] mb-1 sm:mb-1.5">
                PAN Identification #
              </label>
              <input
                type="text"
                value={pan}
                onChange={(e) => setPan(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-mono outline-none ${
                  isDarkMode ? 'bg-slate-950 border-slate-800 text-white focus:border-[#5B75F8]' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-[#5B75F8]'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 font-bold uppercase text-[10px] sm:text-[11px] mb-1 sm:mb-1.5">
                State & State Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={`w-2/3 rounded-xl border px-3 py-2.5 text-xs font-mono outline-none ${
                    isDarkMode ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <input
                  type="text"
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className={`w-1/3 rounded-xl border px-2 py-2.5 text-xs font-mono text-center font-bold text-purple-400 outline-none ${
                    isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 sm:pt-4 flex justify-end">
            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-[#5B75F8] to-indigo-600 hover:from-indigo-600 hover:to-[#5B75F8] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#5B75F8]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              <span>Save Enterprise Profile</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  );
};

export default CompanyProfileView;

