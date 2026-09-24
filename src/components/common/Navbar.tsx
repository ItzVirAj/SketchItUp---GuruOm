import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Cpu, 
  ChevronDown, 
  Menu, 
  X, 
  ArrowRight, 
  Grid, 
  Factory, 
  Layers, 
  BookOpen, 
  ShieldCheck, 
  Sparkles, 
  Building2, 
  Users,
  Settings2
} from 'lucide-react';
import { CTAButton } from './CTAButton';
import { modulesData } from '../../data/modulesData';
import { StatusBadge } from './StatusBadge';

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'modules' | 'solutions' | null>(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-[color,background-color,border-color,outline-color,box-shadow,opacity,transform,translate,scale,rotate,filter,backdrop-filter] duration-300 ${
      isScrolled ? 'bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-xl' : 'bg-slate-950/40 backdrop-blur-sm border-b border-slate-900/50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B75F8] to-indigo-600 p-0.5 shadow-lg shadow-[#5B75F8]/20 group-hover:shadow-[#5B75F8]/35 transition-ui">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#5B75F8] group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
                SketchItUp <span className="text-[#5B75F8] text-xs font-mono px-1.5 py-0.5 rounded bg-[#5B75F8]/10 border border-[#5B75F8]/30">OS</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Business Operating System</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1">
            
            <Link 
              to="/" 
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                location.pathname === '/' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-300 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              Home
            </Link>

            <Link 
              to="/owner-os" 
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                location.pathname === '/owner-os' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-300 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              Owner OS
            </Link>

            {/* Modules Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown('modules')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button 
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  location.pathname.startsWith('/modules') || activeDropdown === 'modules'
                    ? 'text-teal-400 bg-slate-900/60' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <span>Modules</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'modules' ? 'rotate-180 text-teal-400' : 'text-slate-500'}`} />
              </button>

              {activeDropdown === 'modules' && (
                <div className="absolute top-full left-0 w-[640px] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 mt-1 grid grid-cols-2 gap-3 z-50 backdrop-blur-xl">
                  <div className="col-span-2 pb-2 mb-1 border-b border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Grid className="w-3.5 h-3.5 text-teal-400" />
                      14 Enterprise Modules
                    </span>
                    <Link to="/modules" className="text-xs font-semibold text-teal-400 hover:underline flex items-center gap-1">
                      View All Catalog <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {modulesData.slice(0, 8).map((mod) => (
                    <Link
                      key={mod.slug}
                      to={`/modules/${mod.slug}`}
                      className="p-2.5 rounded-lg hover:bg-slate-800/80 transition-colors flex items-start gap-3 group"
                    >
                      <div className="p-2 rounded-md bg-slate-950 border border-slate-800 group-hover:border-teal-500/50 text-teal-400 shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-teal-400 flex items-center gap-1">
                          {mod.title}
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{mod.shortDesc}</p>
                      </div>
                    </Link>
                  ))}

                  <div className="col-span-2 pt-2 border-t border-slate-800/80 flex items-center justify-between bg-slate-950/50 p-2.5 rounded-lg">
                    <span className="text-xs text-slate-400">Looking for AI Copilot or Executive Command Center?</span>
                    <Link to="/modules" className="text-xs font-bold text-teal-400 hover:text-teal-300">
                      Explore All 14 Modules &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Solutions Dropdown */}
            <div 
              className="relative"
              onMouseEnter={() => setActiveDropdown('solutions')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button 
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
                  location.pathname.startsWith('/solutions') || activeDropdown === 'solutions'
                    ? 'text-teal-400 bg-slate-900/60' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-900/40'
                }`}
              >
                <span>Solutions</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === 'solutions' ? 'rotate-180 text-teal-400' : 'text-slate-500'}`} />
              </button>

              {activeDropdown === 'solutions' && (
                <div className="absolute top-full left-0 w-[420px] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 mt-1 space-y-2 z-50 backdrop-blur-xl">
                  <div className="pb-2 mb-1 border-b border-slate-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Factory className="w-3.5 h-3.5 text-teal-400" />
                      Industry Solutions
                    </span>
                    <Link to="/solutions" className="text-xs font-semibold text-teal-400 hover:underline">
                      All Verticals
                    </Link>
                  </div>

                  <Link
                    to="/solutions/manufacturing"
                    className="p-3 rounded-lg hover:bg-slate-800/80 transition-colors flex items-start gap-3 bg-slate-950/40 border border-teal-500/20 group"
                  >
                    <div className="p-2 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/30">
                      <Factory className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 group-hover:text-teal-400 flex items-center justify-between gap-2">
                        <span>Discrete & Process Manufacturing</span>
                        <StatusBadge status="LIVE" />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">Shop floor workorders, OEE, downtime, scrap & BOM traceability.</p>
                    </div>
                  </Link>

                  <div className="pt-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                    Coming Soon Verticals
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Industrial SMEs</span>
                      <StatusBadge status="COMING_SOON" />
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Family Enterprises</span>
                      <StatusBadge status="COMING_SOON" />
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Growing Companies</span>
                      <StatusBadge status="COMING_SOON" />
                    </div>
                    <div className="p-2 rounded bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Service Firms</span>
                      <StatusBadge status="COMING_SOON" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link 
              to="/custom-solutions" 
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                location.pathname === '/custom-solutions' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-300 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              Custom OS
            </Link>

            <Link 
              to="/about" 
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                location.pathname === '/about' ? 'text-teal-400 bg-slate-900/60' : 'text-slate-300 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              About
            </Link>

            <Link 
              to="/resources" 
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                location.pathname.startsWith('/resources') ? 'text-teal-400 bg-slate-900/60' : 'text-slate-300 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              Resources
            </Link>

          </nav>

          {/* Desktop Right Action */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/console"
              className="px-3 py-2 text-xs font-mono font-bold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-lg transition-ui flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Live Console
            </Link>
            <CTAButton to="/book-a-demo" size="md" variant="primary">
              Book a Demo
            </CTAButton>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex lg:hidden items-center gap-2">
            <CTAButton to="/book-a-demo" size="sm" variant="primary" icon={false}>
              Demo
            </CTAButton>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 hover:text-white cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-teal-400" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 pt-3 pb-6 space-y-3 max-h-[85vh] overflow-y-auto">
          <Link
            to="/console"
            className="block px-3 py-2 text-base font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              Live Operations Console
            </span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/"
            className="block px-3 py-2 text-base font-semibold text-slate-200 hover:text-teal-400 border-b border-slate-900"
          >
            Home
          </Link>

          <Link
            to="/owner-os"
            className="block px-3 py-2 text-base font-semibold text-slate-200 hover:text-teal-400 border-b border-slate-900"
          >
            Owner OS Overview
          </Link>

          <Link
            to="/modules"
            className="block px-3 py-2 text-base font-semibold text-teal-400 border-b border-slate-900 flex items-center justify-between"
          >
            <span>Modules Catalog (14)</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/solutions/manufacturing"
            className="block px-3 py-2 text-base font-semibold text-slate-200 hover:text-teal-400 border-b border-slate-900 flex items-center justify-between"
          >
            <span>Manufacturing Solution</span>
            <StatusBadge status="LIVE" />
          </Link>

          <Link
            to="/custom-solutions"
            className="block px-3 py-2 text-base font-semibold text-slate-200 hover:text-teal-400 border-b border-slate-900"
          >
            Custom OS Methodology
          </Link>

          <Link
            to="/about"
            className="block px-3 py-2 text-base font-semibold text-slate-200 hover:text-teal-400 border-b border-slate-900"
          >
            About & Story
          </Link>

          <Link
            to="/resources"
            className="block px-3 py-2 text-base font-semibold text-slate-200 hover:text-teal-400 border-b border-slate-900"
          >
            Resources & FAQs
          </Link>

          <div className="pt-2">
            <CTAButton to="/book-a-demo" size="lg" variant="primary" className="w-full">
              Schedule Personal Demo
            </CTAButton>
          </div>
        </div>
      )}
    </header>
  );
};
