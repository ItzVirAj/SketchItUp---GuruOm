import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type AccentColor = 'blue' | 'teal' | 'orange' | 'red';

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
    label: 'Blue',
    primary: '#5B75F8',
    hover: '#4A64E8',
    active: '#3B52D9',
    textLight: '#3B52D9',
    textDark: '#7B92FF',
    softLight: 'rgba(91, 117, 248, 0.10)',
    softDark: 'rgba(91, 117, 248, 0.18)',
    borderLight: 'rgba(91, 117, 248, 0.35)',
    borderDark: 'rgba(91, 117, 248, 0.30)',
    ring: 'rgba(91, 117, 248, 0.50)',
    shadow: 'rgba(91, 117, 248, 0.25)',
    gradientFrom: '#5B75F8',
    gradientTo: '#4f46e5',
    dotColor: '#5B75F8'
  },
  teal: {
    id: 'teal',
    label: 'Teal',
    primary: '#0F766E',
    hover: '#0D655E',
    active: '#115E59',
    textLight: '#0F766E',
    textDark: '#2DD4BF',
    softLight: 'rgba(15, 118, 110, 0.10)',
    softDark: 'rgba(45, 212, 191, 0.18)',
    borderLight: 'rgba(15, 118, 110, 0.35)',
    borderDark: 'rgba(45, 212, 191, 0.30)',
    ring: 'rgba(15, 118, 110, 0.50)',
    shadow: 'rgba(15, 118, 110, 0.25)',
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
    softLight: 'rgba(234, 88, 12, 0.10)',
    softDark: 'rgba(251, 146, 60, 0.18)',
    borderLight: 'rgba(234, 88, 12, 0.35)',
    borderDark: 'rgba(251, 146, 60, 0.30)',
    ring: 'rgba(234, 88, 12, 0.50)',
    shadow: 'rgba(234, 88, 12, 0.25)',
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
    softLight: 'rgba(220, 38, 38, 0.10)',
    softDark: 'rgba(248, 113, 113, 0.18)',
    borderLight: 'rgba(220, 38, 38, 0.35)',
    borderDark: 'rgba(248, 113, 113, 0.30)',
    ring: 'rgba(220, 38, 38, 0.50)',
    shadow: 'rgba(220, 38, 38, 0.25)',
    gradientFrom: '#DC2626',
    gradientTo: '#e11d48',
    dotColor: '#DC2626'
  }
};

export const ACCENT_COLORS: AccentColor[] = ['blue', 'teal', 'orange', 'red'];

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
      if (saved && (saved === 'blue' || saved === 'teal' || saved === 'orange' || saved === 'red')) {
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
