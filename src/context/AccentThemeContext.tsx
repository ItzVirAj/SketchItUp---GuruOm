import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type AccentColor = 'blue' | 'teal' | 'orange' | 'red' | 'monochrome';

export interface AccentThemeConfig {
  id: AccentColor;
  label: string;
  primary: string;       // Main brand accent
  hover: string;         // Hover state
  active: string;        // Active/pressed state
  textLight: string;     // Text color in light mode
  textDark: string;      // Text color in dark mode
  softLight: string;     // Background tint in light mode
  softDark: string;      // Background tint in dark mode
  borderLight: string;   // Border tint in light mode
  borderDark: string;    // Border tint in dark mode
  ring: string;          // Focus ring
  shadow: string;        // Glow/shadow color
  gradientFrom: string;  // Gradient start
  gradientTo: string;    // Gradient end
  dotColor: string;      // Color picker dot
}

export const ACCENT_PRESETS: Record<AccentColor, AccentThemeConfig> = {
  blue: {
    id: 'blue',
    label: 'Cobalt',
    primary: '#435BE8',
    hover: '#344BC7',
    active: '#273AA6',
    textLight: '#344BC7',
    textDark: '#8CA0FF',
    softLight: 'rgba(67, 91, 232, 0.08)',
    softDark: 'rgba(67, 91, 232, 0.12)',     // Subdued glow on pure black
    borderLight: 'rgba(67, 91, 232, 0.30)',
    borderDark: 'rgba(140, 160, 255, 0.25)', // Crisp, thin border
    ring: 'rgba(67, 91, 232, 0.50)',
    shadow: 'rgba(67, 91, 232, 0.20)',
    gradientFrom: '#435BE8',
    gradientTo: '#4f46e5',
    dotColor: '#435BE8'
  },
  teal: {
    id: 'teal',
    label: 'Cyber Teal',
    primary: '#0F766E',
    hover: '#0D655E',
    active: '#115E59',
    textLight: '#0F766E',
    textDark: '#2DD4BF',
    softLight: 'rgba(15, 118, 110, 0.08)',
    softDark: 'rgba(45, 212, 191, 0.12)',
    borderLight: 'rgba(15, 118, 110, 0.30)',
    borderDark: 'rgba(45, 212, 191, 0.25)',
    ring: 'rgba(15, 118, 110, 0.50)',
    shadow: 'rgba(15, 118, 110, 0.20)',
    gradientFrom: '#0F766E',
    gradientTo: '#059669',
    dotColor: '#0F766E'
  },
  orange: {
    id: 'orange',
    label: 'Orange',
    primary: '#EA580C',
    hover: '#C2410C',
    active: '#9A3412',
    textLight: '#C2410C',
    textDark: '#FB923C',
    softLight: 'rgba(234, 88, 12, 0.08)',
    softDark: 'rgba(251, 146, 60, 0.12)',
    borderLight: 'rgba(234, 88, 12, 0.30)',
    borderDark: 'rgba(251, 146, 60, 0.25)',
    ring: 'rgba(234, 88, 12, 0.50)',
    shadow: 'rgba(234, 88, 12, 0.20)',
    gradientFrom: '#EA580C',
    gradientTo: '#d97706',
    dotColor: '#EA580C'
  },
  red: {
    id: 'red',
    label: 'Red',
    primary: '#DC2626',
    hover: '#B91C1C',
    active: '#991B1B',
    textLight: '#B91C1C',
    textDark: '#F87171',
    softLight: 'rgba(220, 38, 38, 0.08)',
    softDark: 'rgba(248, 113, 113, 0.12)',
    borderLight: 'rgba(220, 38, 38, 0.30)',
    borderDark: 'rgba(248, 113, 113, 0.25)',
    ring: 'rgba(220, 38, 38, 0.50)',
    shadow: 'rgba(220, 38, 38, 0.20)',
    gradientFrom: '#DC2626',
    gradientTo: '#e11d48',
    dotColor: '#DC2626'
  },
  monochrome: {
    id: 'monochrome',
    label: 'Obsidian Pure',
    primary: '#F4F4F5',
    hover: '#E4E4E7',
    active: '#D4D4D8',
    textLight: '#18181B',
    textDark: '#FFFFFF',
    softLight: 'rgba(0, 0, 0, 0.06)',
    softDark: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(0, 0, 0, 0.20)',
    borderDark: 'rgba(255, 255, 255, 0.15)',
    ring: 'rgba(255, 255, 255, 0.40)',
    shadow: 'rgba(0, 0, 0, 0.50)',
    gradientFrom: '#F4F4F5',
    gradientTo: '#A1A1AA',
    dotColor: '#F4F4F5'
  }
};

export const ACCENT_COLORS: AccentColor[] = ['blue', 'teal', 'orange', 'red', 'monochrome'];

const STORAGE_KEY = 'sketchitup-accent-color';

interface AccentThemeContextType {
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
  currentTheme: AccentThemeConfig;
  availableAccents: typeof ACCENT_PRESETS;
}

const AccentThemeContext = createContext<AccentThemeContextType | undefined>(undefined);

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

export const AccentThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accent, setAccentState] = useState<AccentColor>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && (saved === 'blue' || saved === 'teal' || saved === 'orange' || saved === 'red' || saved === 'monochrome')) {
        return saved as AccentColor;
      }
    } catch (_) {}
    return 'blue';
  });

  const setAccent = (newAccent: AccentColor) => {
    if (!ACCENT_COLORS.includes(newAccent)) {
      newAccent = 'blue';
    }
    setAccentState(newAccent);
    try {
      localStorage.setItem(STORAGE_KEY, newAccent);
    } catch (_) {}
    applyAccentCssVariables(ACCENT_PRESETS[newAccent]);
  };

  // Sync initial state to DOM
  useEffect(() => {
    applyAccentCssVariables(ACCENT_PRESETS[accent]);
  }, [accent]);

  // Listen to cross-tab storage changes
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        if (ACCENT_COLORS.includes(e.newValue as AccentColor)) {
          setAccentState(e.newValue as AccentColor);
          applyAccentCssVariables(ACCENT_PRESETS[e.newValue as AccentColor]);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const currentTheme = useMemo(() => ACCENT_PRESETS[accent] || ACCENT_PRESETS.blue, [accent]);

  return (
    <AccentThemeContext.Provider
      value={{
        accent,
        setAccent,
        currentTheme,
        availableAccents: ACCENT_PRESETS
      }}
    >
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
