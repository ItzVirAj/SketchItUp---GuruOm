import React, { useState } from 'react';
import { X, Sparkles, Check, Rocket } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>('pro');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleUpgrade = () => {
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70"
      />

      {/* Modal Container */}
      <div
        className="relative bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10"
      >
        {/* Modal Banner Header */}
        <div className="bg-indigo-900 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full text-indigo-300 hover:text-white hover:bg-indigo-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-800 rounded-full text-[10px] font-bold text-indigo-200 mb-2 border border-indigo-700">
            <Sparkles className="w-3 h-3 text-indigo-300" /> UNLOCK ENTERPRISE POWER
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">Upgrade Your Stratum AI Workspace</h3>
          <p className="text-indigo-200 text-xs mt-1">
            Accelerate team velocity with real-time predictive models, sub-50ms API streaming, and unlimited AI Copilot queries.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="p-6 space-y-6">
          {isSuccess ? (
            <div
              className="py-8 text-center space-y-3"
            >
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full mx-auto flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-900 text-lg">Workspace Upgraded Successfully!</h4>
              <p className="text-xs text-slate-500">Your new Gemini 2.5 Pro token quota is now active.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                {/* Pro Plan */}
                <div
                  onClick={() => setSelectedPlan('pro')}
                  className={`p-4 rounded-xl border cursor-pointer ${
                    selectedPlan === 'pro'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-900 text-sm">Pro Architect</span>
                    <span className="text-xs font-bold text-indigo-600">$299/mo</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1.5">
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> 1M AI Copilot Tokens/mo</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> Real-time Anomaly Alerts</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> 5 Dedicated Seats</li>
                  </ul>
                </div>

                {/* Enterprise Plan */}
                <div
                  onClick={() => setSelectedPlan('enterprise')}
                  className={`p-4 rounded-xl border cursor-pointer ${
                    selectedPlan === 'enterprise'
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-slate-900 text-sm">Enterprise Scale</span>
                    <span className="text-xs font-bold text-indigo-600">$899/mo</span>
                  </div>
                  <ul className="text-[11px] text-slate-600 space-y-1.5">
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> Unlimited Token Quota</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> 99.99% SLA Guarantee</li>
                    <li className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-500" /> Dedicated Solution Architect</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-500 font-medium">14-day money back guarantee</span>
                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpgrade}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    Confirm Upgrade <Rocket className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
