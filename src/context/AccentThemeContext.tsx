import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react';

export type AccentColor = 'green' | 'blue' | 'crystal' | 'white' | 'electric' | 'teal' | 'red' | 'brand';

export interface AccentThemeConfig {
  id: 'green' | 'blue' | 'crystal';
  label: string;
  description: string;
  primary: string;
  hover: string;
  active: string;
  textLight: string;
  textDark: string;
  softLight: string;
  softDark: string;
  borderLight: string;
  borderDark: string;
  ring: string;
  shadow: string;
  gradientFrom: string;
  gradientTo: string;
  dotColor: string;
  headerGradientLight: string;
  headerGradientDark: string;
  headerBorderLight: string;
  headerBorderDark: string;
  headerButtonText: string;
  headerButtonHover: string;
}

/**
 * Curated, intentional theme presets following frontend-design principles:
 * - 'green': Original Darker Green (Deep forest & emerald gradient with spruce accents)
 * - 'blue': Original Darker Blue (Royal cobalt & sapphire gradient with blue accents)
 * - 'crystal': Crystal White gradient (Pristine frost & crystal gradient with crisp black text)
 */
export const ACCENT_PRESETS: Record<'green' | 'blue' | 'crystal', AccentThemeConfig> = {
  green: {
    id: 'green',
    label: 'Darker Green',
    description: 'Deep Forest & Emerald gradient',
    primary: '#0A7E58',
    hover: '#086B4A',
    active: '#044F36',
    textLight: '#065F46',
    textDark: '#34D399',
    softLight: 'rgba(10, 126, 88, 0.09)',
    softDark: 'rgba(10, 126, 88, 0.16)',
    borderLight: 'rgba(10, 126, 88, 0.28)',
    borderDark: 'rgba(52, 211, 153, 0.24)',
    ring: 'rgba(10, 126, 88, 0.45)',
    shadow: 'rgba(10, 126, 88, 0.25)',
    gradientFrom: '#0A7E58',
    gradientTo: '#044F36',
    dotColor: '#0A7E58',
    headerGradientLight: 'from-[#0A7E58] via-[#086B4A] to-[#044F36]',
    headerGradientDark: 'from-[#0D241B] via-[#081711] to-[#030B07]',
    headerBorderLight: 'border-emerald-600/30 shadow-[0_16px_40px_rgba(10,126,88,0.22)]',
    headerBorderDark: 'border-emerald-500/20 shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(16,185,129,0.12)]',
    headerButtonText: 'text-[#065F46]',
    headerButtonHover: 'hover:bg-emerald-50/90',
  },
  blue: {
    id: 'blue',
    label: 'Darker Blue',
    description: 'Royal Cobalt & Sapphire gradient',
    primary: '#155dfc',
    hover: '#1049c7',
    active: '#0d3ca8',
    textLight: '#155dfc',
    textDark: '#60A5FA',
    softLight: 'rgba(21, 93, 252, 0.09)',
    softDark: 'rgba(21, 93, 252, 0.16)',
    borderLight: 'rgba(21, 93, 252, 0.28)',
    borderDark: 'rgba(96, 165, 250, 0.24)',
    ring: 'rgba(21, 93, 252, 0.45)',
    shadow: 'rgba(21, 93, 252, 0.25)',
    gradientFrom: '#1b64ff',
    gradientTo: '#0f52dc',
    dotColor: '#155dfc',
    headerGradientLight: 'from-[#1b64ff] via-[#155dfc] to-[#0f52dc]',
    headerGradientDark: 'from-[#0a1836] via-[#071126] to-[#030712]',
    headerBorderLight: 'border-[#155dfc]/30 shadow-[0_16px_40px_rgba(21,93,252,0.25)]',
    headerBorderDark: 'border-blue-500/20 shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(21,93,252,0.15)]',
    headerButtonText: 'text-[#155dfc]',
    headerButtonHover: 'hover:bg-blue-50/90',
  },
  crystal: {
    id: 'crystal',
    label: 'Crystal White',
    description: 'Pristine Frost & Crystal gradient (Black text)',
    primary: '#0f172a',
    hover: '#1e293b',
    active: '#334155',
    textLight: '#0f172a',
    textDark: '#f8fafc',
    softLight: 'rgba(15, 23, 42, 0.06)',
    softDark: 'rgba(248, 250, 252, 0.12)',
    borderLight: 'rgba(15, 23, 42, 0.14)',
    borderDark: 'rgba(248, 250, 252, 0.18)',
    ring: 'rgba(15, 23, 42, 0.35)',
    shadow: 'rgba(0, 0, 0, 0.12)',
    gradientFrom: '#F8FAFC',
    gradientTo: '#E2E8F0',
    dotColor: '#0f172a',
    headerGradientLight: 'from-white via-[#F8FAFC] to-[#EEF2F6]',
    headerGradientDark: 'from-[#181C24] via-[#10131A] to-[#0A0C10]',
    headerBorderLight: 'border-slate-300/80 shadow-[0_16px_40px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.95)]',
    headerBorderDark: 'border-white/10 shadow-[0_16px_44px_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.06)]',
    headerButtonText: 'text-white',
    headerButtonHover: 'hover:bg-slate-800',
  },
};

export const ACCENT_COLORS: AccentColor[] = ['green', 'blue', 'crystal'];

const STORAGE_KEY = 'ownerOS_accent_theme';

interface AccentThemeContextType {
  accent: 'green' | 'blue' | 'crystal';
  setAccent: (accent: AccentColor) => void;
  toggleTheme: () => void;
  isGreen: boolean;
  isBlue: boolean;
  isCrystal: boolean;
  currentTheme: AccentThemeConfig;
  availableAccents: typeof ACCENT_PRESETS;
}

const AccentThemeContext = createContext<AccentThemeContextType | undefined>(undefined);

function normalizeAccent(value: string | null | undefined): 'green' | 'blue' | 'crystal' {
  if (value === 'crystal' || value === 'white') return 'crystal';
  if (value === 'blue' || value === 'electric') return 'blue';
  return 'green';
}

function applyAccentCssVariables(config: AccentThemeConfig) {
  const root = document.documentElement;
  root.setAttribute('data-accent', config.id);
  root.style.setProperty('--accent-primary', config.primary);
  root.style.setProperty('--accent-hover', config.hover);
  root.style.setProperty('--accent-active', config.active);
  root.style.setProperty('--accent-text-light', config.textLight);
  root.style.setProperty('--accent-text-dark', config.textDark);
  root.style.setProperty('--accent-soft-light', config.softLight);
  root.style.setProperty('--accent-soft-dark', config.softDark);
  root.style.setProperty('--accent-border-light', config.borderLight);
  root.style.setProperty('--accent-border-dark', config.borderDark);
  root.style.setProperty('--accent-ring', config.ring);
  root.style.setProperty('--accent-shadow', config.shadow);
  root.style.setProperty('--accent-gradient-from', config.gradientFrom);
  root.style.setProperty('--accent-gradient-to', config.gradientTo);
}

export const AccentThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [accent, setAccentState] = useState<'green' | 'blue' | 'crystal'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return normalizeAccent(saved);
    } catch {
      return 'green';
    }
  });

  const setAccent = useCallback((newAccent: AccentColor) => {
    const resolved = normalizeAccent(newAccent);
    setAccentState(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, resolved);
    } catch {}
    applyAccentCssVariables(ACCENT_PRESETS[resolved]);
  }, []);

  const toggleTheme = useCallback(() => {
    setAccent(prev => {
      if (prev === 'green') return 'blue';
      if (prev === 'blue') return 'crystal';
      return 'green';
    });
  }, [setAccent]);

  // Sync initial state to DOM
  useEffect(() => {
    applyAccentCssVariables(ACCENT_PRESETS[accent]);
  }, [accent]);

  // Listen to cross-tab storage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const resolved = normalizeAccent(e.newValue);
        setAccentState(resolved);
        applyAccentCssVariables(ACCENT_PRESETS[resolved]);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const currentTheme = useMemo(() => ACCENT_PRESETS[accent], [accent]);

  const contextValue = useMemo(
    () => ({
      accent,
      setAccent,
      toggleTheme,
      isGreen: accent === 'green',
      isBlue: accent === 'blue',
      isCrystal: accent === 'crystal',
      currentTheme,
      availableAccents: ACCENT_PRESETS,
    }),
    [accent, setAccent, toggleTheme, currentTheme]
  );

  return (
    <AccentThemeContext.Provider value={contextValue}>
      {children}
    </AccentThemeContext.Provider>
  );
};

export const useAccentTheme = (): AccentThemeContextType => {
  const context = useContext(AccentThemeContext);
  if (!context) {
    throw new Error('useAccentTheme must be used within an AccentThemeProvider');
  }
  return context;
};

export default AccentThemeContext;
