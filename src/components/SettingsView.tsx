import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Key, 
  Bell, 
  ShieldCheck, 
  Save, 
  Check, 
  Database,
  Cpu,
  Lock
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [apiKey, setApiKey] = useState('************************************');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  // Settings State
  const [workspaceName, setWorkspaceName] = useState('Stratum AI Enterprise');
  const [notifySlack, setNotifySlack] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [anomalyThreshold, setAnomalyThreshold] = useState('150ms');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6 bg-slate-50">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex justify-between items-center">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-indigo-600" /> Workspace Settings & Config
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure enterprise settings, API keys, notification thresholds, and cluster integrations.
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
          {saved ? 'Settings Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace Identity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
            <Cpu className="w-4 h-4 text-indigo-600" /> General Workspace Info
          </h4>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Workspace Name</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Deployment Region</label>
              <input
                type="text"
                disabled
                value="Cloud Run (asia-east1) - High Availability Cluster"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">AI Model Engine</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 outline-none">
                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Default High Speed)</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep Analytics)</option>
              </select>
            </div>
          </div>
        </div>

        {/* API Credentials */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
            <Key className="w-4 h-4 text-indigo-600" /> API Keys & AI Studio Integration
          </h4>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Gemini API Key</label>
              <p className="text-[11px] text-slate-500 mb-2">
                Managed automatically via Google AI Studio Environment Secrets panel.
              </p>
              <div className="flex gap-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  readOnly
                  className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  {showKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-[11px] text-indigo-800 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" /> Server-Side API Security Enabled
              </span>
              <p>
                All Gemini API calls are securely proxied through backend endpoints to prevent exposing credentials to client browsers.
              </p>
            </div>
          </div>
        </div>

        {/* Notification & Thresholds */}
        <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs space-y-4 lg:col-span-2">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
            <Bell className="w-4 h-4 text-indigo-600" /> Alert Thresholds & Channels
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <div>
                <p className="font-bold text-slate-800">Email Alerts</p>
                <p className="text-[10px] text-slate-500">Send high priority anomaly emails</p>
              </div>
              <input
                type="checkbox"
                checked={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <div>
                <p className="font-bold text-slate-800">Slack Webhook</p>
                <p className="text-[10px] text-slate-500">Post system metrics to #alerts</p>
              </div>
              <input
                type="checkbox"
                checked={notifySlack}
                onChange={(e) => setNotifySlack(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
              <p className="font-bold text-slate-800 mb-1">Latency Alert Limit</p>
              <select
                value={anomalyThreshold}
                onChange={(e) => setAnomalyThreshold(e.target.value)}
                className="w-full p-1.5 bg-white border border-slate-200 rounded text-slate-800 outline-none"
              >
                <option value="100ms">100ms (Strict)</option>
                <option value="150ms">150ms (Recommended)</option>
                <option value="250ms">250ms (Relaxed)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
