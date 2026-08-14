import React from 'react';
import { Link } from 'react-router-dom';
import { Cpu, ShieldCheck, Mail, ArrowRight, Lock, Server } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-sm relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-96 bg-teal-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-800/80">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-teal-600 p-0.5 shadow-lg shadow-sky-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-teal-400" />
                </div>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
                SketchItUp <span className="text-teal-400 text-xs font-mono px-1.5 py-0.5 rounded bg-teal-500/10 border border-teal-500/30">OS</span>
              </span>
            </Link>

            <p className="text-slate-400 text-xs sm:text-sm leading-relaxed max-w-sm">
              SketchItUp Owner OS is an AI-Enabled Business Operating System connecting orders, inventory, production, finance and people into one real-time executive command center.
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
              <span className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800">
                <Lock className="w-3.5 h-3.5 text-teal-400" /> AES-256 Encrypted
              </span>
              <span className="flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-md border border-slate-800">
                <Server className="w-3.5 h-3.5 text-sky-400" /> Isolated Tenant DB
              </span>
            </div>
          </div>

          {/* Column 1: Product Modules */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Owner OS Modules</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/modules/command-center" className="hover:text-teal-400 transition-colors">Executive Command Center</Link></li>
              <li><Link to="/modules/production-management" className="hover:text-teal-400 transition-colors">Production Management</Link></li>
              <li><Link to="/modules/inventory-management" className="hover:text-teal-400 transition-colors">Inventory & Bin Control</Link></li>
              <li><Link to="/modules/order-management" className="hover:text-teal-400 transition-colors">Order Management</Link></li>
              <li><Link to="/modules/accounting-finance" className="hover:text-teal-400 transition-colors">Accounting & Finance</Link></li>
              <li><Link to="/modules/quality-management" className="hover:text-teal-400 transition-colors">Quality Management (QC)</Link></li>
              <li><Link to="/modules/ai-copilot" className="hover:text-teal-400 transition-colors text-amber-400 flex items-center gap-1">AI Business Copilot</Link></li>
              <li><Link to="/modules" className="text-teal-400 font-semibold hover:underline">View All 14 Modules &rarr;</Link></li>
            </ul>
          </div>

          {/* Column 2: Solutions & Industries */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Solutions</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/solutions/manufacturing" className="hover:text-teal-400 transition-colors flex items-center justify-between">
                  <span>Manufacturing</span>
                  <StatusBadge status="LIVE" />
                </Link>
              </li>
              <li><Link to="/solutions" className="hover:text-teal-400 transition-colors">Industrial SMEs</Link></li>
              <li><Link to="/solutions" className="hover:text-teal-400 transition-colors">Family Enterprises</Link></li>
              <li><Link to="/solutions" className="hover:text-teal-400 transition-colors">Fast-Growing Companies</Link></li>
              <li><Link to="/custom-solutions" className="hover:text-teal-400 transition-colors font-medium text-slate-300">Custom OS Development</Link></li>
            </ul>
          </div>

          {/* Column 3: Resources & Company */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Company & Resources</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/owner-os" className="hover:text-teal-400 transition-colors">Owner OS Architecture</Link></li>
              <li><Link to="/about" className="hover:text-teal-400 transition-colors">About & Vision</Link></li>
              <li><Link to="/resources/blog" className="hover:text-teal-400 transition-colors">Owner Insights Blog</Link></li>
              <li><Link to="/resources/faqs" className="hover:text-teal-400 transition-colors">Frequently Asked Questions</Link></li>
              <li><Link to="/book-a-demo" className="text-teal-400 font-bold hover:underline">Book a Demo Session</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright and disclosures */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            &copy; {new Date().getFullYear()} SketchItUp Solutions. All rights reserved. SketchItUp Owner OS is a registered enterprise business operating system.
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-300 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-300 cursor-pointer">Security Assurance</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
