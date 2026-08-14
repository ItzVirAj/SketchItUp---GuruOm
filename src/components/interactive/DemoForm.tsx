import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Calendar, Clock, ShieldCheck, Send, Sparkles, Building, Phone, Mail, User } from 'lucide-react';
import { DemoFormData } from '../../types';
import { analytics } from '../../lib/analytics';
import { modulesData } from '../../data/modulesData';

export const DemoForm: React.FC = () => {
  const [formData, setFormData] = useState<DemoFormData>({
    name: '',
    company: '',
    designation: '',
    industry: 'Manufacturing',
    companySize: '21-50',
    phone: '',
    email: '',
    currentSoftware: 'Tally + Excel',
    primaryChallenge: '',
    modulesInterested: ['command-center', 'production-management', 'inventory-management'],
    preferredDemoTime: 'Tomorrow Morning (10:00 AM)',
    additionalInfo: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleModuleToggle = (slug: string) => {
    setFormData((prev) => {
      const exists = prev.modulesInterested.includes(slug);
      if (exists) {
        return { ...prev, modulesInterested: prev.modulesInterested.filter((s) => s !== slug) };
      }
      return { ...prev, modulesInterested: [...prev.modulesInterested, slug] };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name || !formData.company || !formData.phone || !formData.email) {
      setErrorMsg('Please fill in all required fields (*)');
      return;
    }

    setIsSubmitting(true);
    analytics.trackFormSubmit('book_demo', formData);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }, 1200);
  };

  if (isSubmitted) {
    return (
      <div className="bg-slate-900 border border-teal-500/40 rounded-2xl p-8 sm:p-12 text-center space-y-6 max-w-2xl mx-auto shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono text-teal-400 uppercase tracking-wider font-bold">DEMO REQUEST CONFIRMED</span>
          <h3 className="text-2xl font-extrabold text-white">We’ve Reserved Your Demo Session!</h3>
          <p className="text-sm text-slate-300 leading-relaxed max-w-lg mx-auto">
            Thank you, <strong className="text-teal-300">{formData.name}</strong>. An Operational Architect from SketchItUp Solutions will reach out to you within 2 business hours to confirm your calendar slot.
          </p>
        </div>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left text-xs space-y-2 max-w-md mx-auto">
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">Company:</span>
            <span className="font-semibold text-slate-200">{formData.company} ({formData.industry})</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">Contact:</span>
            <span className="font-semibold text-slate-200">{formData.email} | {formData.phone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Requested Slot:</span>
            <span className="font-bold text-teal-400">{formData.preferredDemoTime}</span>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setIsSubmitted(false)}
            className="text-xs text-slate-400 hover:text-teal-400 underline cursor-pointer"
          >
            Submit Another Request
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl font-sans grid grid-cols-1 lg:grid-cols-12">
      
      {/* Column 1: Value Proposition (5 cols) */}
      <div className="lg:col-span-5 bg-slate-950 p-8 sm:p-10 space-y-8 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between">
        
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 text-teal-400 border border-teal-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            30-MINUTE TAILORED DEMO
          </div>

          <h3 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
            See Your Business Through One Real-Time Command Center
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Experience how SketchItUp Owner OS eliminates operational leaks, replaces fragmented spreadsheets, and gives you complete control over orders, inventory, factory floor, and cash flow.
          </p>

          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">What happens on your call:</h4>

            <div className="flex items-start gap-3 text-xs text-slate-300">
              <div className="p-1.5 rounded bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-slate-100 block">Workflow Bottleneck Analysis</strong>
                We review your current pain points across orders, inventory, or shop floor.
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-slate-300">
              <div className="p-1.5 rounded bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-slate-100 block">Live Module Demonstration</strong>
                See relevant Owner OS modules demonstrated with scenarios matching your industry.
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-slate-300">
              <div className="p-1.5 rounded bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-slate-100 block">14-Day Deployment Roadmap</strong>
                Clear step-by-step roadmap for data migration and staff onboarding.
              </div>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-900 text-xs text-slate-400 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Strict Confidentiality Guaranteed. NDA available upon request.</span>
        </div>

      </div>

      {/* Column 2: Interactive Request Form (7 cols) */}
      <form onSubmit={handleSubmit} className="lg:col-span-7 p-6 sm:p-10 space-y-6 bg-slate-900">
        
        <div className="border-b border-slate-800 pb-4">
          <h4 className="text-lg font-bold text-white">Book Your Demo Session</h4>
          <p className="text-xs text-slate-400">Fill in your details and an Operational Architect will prepare your session.</p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/50 text-xs text-rose-300 font-semibold">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name *</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="e.g. Robert Vance"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name *</label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                placeholder="e.g. Vance Manufacturing Ltd"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Designation / Role *</label>
            <input
              type="text"
              required
              placeholder="e.g. Managing Director / Owner"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Industry Sector</label>
            <select
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="Discrete Manufacturing">Discrete Manufacturing</option>
              <option value="Process Manufacturing">Process Manufacturing</option>
              <option value="Industrial SME / Precision Eng">Industrial SME / Precision Eng</option>
              <option value="Family Business">Family Business</option>
              <option value="Wholesale & Distribution">Wholesale & Distribution</option>
              <option value="Other Industry">Other Industry</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                placeholder="robert@vancemfg.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number *</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                placeholder="+1 (555) 019-2834"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

        </div>

        {/* Modules Interest Checkboxes */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-2">Primary Modules of Interest:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { slug: 'command-center', label: 'Executive Command Center' },
              { slug: 'production-management', label: 'Production & Shop Floor' },
              { slug: 'inventory-management', label: 'Inventory & Bin Control' },
              { slug: 'order-management', label: 'Order & Credit Gate' },
              { slug: 'accounting-finance', label: 'Accounting & Cash Flow' },
              { slug: 'ai-copilot', label: 'AI Business Copilot' }
            ].map((mod) => {
              const isChecked = formData.modulesInterested.includes(mod.slug);
              return (
                <button
                  type="button"
                  key={mod.slug}
                  onClick={() => handleModuleToggle(mod.slug)}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-semibold text-left border transition-all cursor-pointer flex items-center justify-between ${
                    isChecked
                      ? 'bg-teal-500/10 border-teal-500 text-teal-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span>{mod.label}</span>
                  {isChecked && <CheckCircle2 className="w-3 h-3 text-teal-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Operational Bottleneck / Goal</label>
          <textarea
            rows={2}
            placeholder="e.g. We have inventory leaks, delayed production schedules, and manual Excel accounting..."
            value={formData.primaryChallenge}
            onChange={(e) => setFormData({ ...formData, primaryChallenge: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-lg bg-gradient-to-r from-sky-500 to-teal-500 text-slate-950 font-extrabold text-sm hover:from-sky-400 hover:to-teal-400 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              <span>Reserving Your Slot...</span>
            </>
          ) : (
            <>
              <span>Schedule Personal Demo Session</span>
              <Send className="w-4 h-4" />
            </>
          )}
        </button>

      </form>
    </div>
  );
};
