import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

export type AccentColor = 'electric' | 'teal' | 'red' | 'brand';

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
  electric: {
    id: 'electric',
    label: 'Obsidian',
    primary: '#181920',
    hover: '#232530',
    active: '#101116',
    textLight: '#181920',
    textDark: '#FFFFFF',
    softLight: 'rgba(24, 25, 32, 0.08)',
    softDark: 'rgba(255, 255, 255, 0.12)',
    borderLight: 'rgba(24, 25, 32, 0.25)',
    borderDark: 'rgba(255, 255, 255, 0.20)',
    ring: 'rgba(24, 25, 32, 0.40)',
    shadow: 'rgba(24, 25, 32, 0.20)',
    gradientFrom: '#181920',
    gradientTo: '#232530',
    dotColor: '#181920'
  },
  teal: {
    id: 'teal',
    label: 'Obsidian',
    primary: '#181920',
    hover: '#232530',
    active: '#101116',
    textLight: '#181920',
    textDark: '#FFFFFF',
    softLight: 'rgba(24, 25, 32, 0.08)',
    softDark: 'rgba(255, 255, 255, 0.12)',
    borderLight: 'rgba(24, 25, 32, 0.25)',
    borderDark: 'rgba(255, 255, 255, 0.20)',
    ring: 'rgba(24, 25, 32, 0.40)',
    shadow: 'rgba(24, 25, 32, 0.20)',
    gradientFrom: '#181920',
    gradientTo: '#232530',
    dotColor: '#181920'
  },
  red: {
    id: 'red',
    label: 'Obsidian',
    primary: '#181920',
    hover: '#232530',
    active: '#101116',
    textLight: '#181920',
    textDark: '#FFFFFF',
    softLight: 'rgba(24, 25, 32, 0.08)',
    softDark: 'rgba(255, 255, 255, 0.12)',
    borderLight: 'rgba(24, 25, 32, 0.25)',
    borderDark: 'rgba(255, 255, 255, 0.20)',
    ring: 'rgba(24, 25, 32, 0.40)',
    shadow: 'rgba(24, 25, 32, 0.20)',
    gradientFrom: '#181920',
    gradientTo: '#232530',
    dotColor: '#181920'
  },
  brand: {
    id: 'brand',
    label: 'Obsidian',
    primary: '#181920',
    hover: '#232530',
    active: '#101116',
    textLight: '#181920',
    textDark: '#FFFFFF',
    softLight: 'rgba(24, 25, 32, 0.08)',
    softDark: 'rgba(255, 255, 255, 0.12)',
    borderLight: 'rgba(24, 25, 32, 0.25)',
    borderDark: 'rgba(255, 255, 255, 0.20)',
    ring: 'rgba(24, 25, 32, 0.40)',
    shadow: 'rgba(24, 25, 32, 0.20)',
    gradientFrom: '#181920',
    gradientTo: '#232530',
    dotColor: '#181920'
  }
};

export const ACCENT_COLORS: AccentColor[] = ['electric'];

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
  if (config.id === 'brand') {
    // Brand Colors is scoped specifically to the Inventory page for now.
    // Keep root on the app's default (Electric Blue) so other pages remain unaffected.
    const defaultPreset = ACCENT_PRESETS.electric;
    root.setAttribute('data-accent', 'electric');
    root.setAttribute('data-brand-accent-active', 'true');
    root.style.setProperty('--accent-primary', defaultPreset.primary);
    root.style.setProperty('--accent-hover', defaultPreset.hover);
    root.style.setProperty('--accent-active', defaultPreset.active);
    root.style.setProperty('--accent-text-light', defaultPreset.textLight);
    root.style.setProperty('--accent-text-dark', defaultPreset.textDark);
    root.style.setProperty('--accent-soft-light', defaultPreset.softLight);
    root.style.setProperty('--accent-soft-dark', defaultPreset.softDark);
    root.style.setProperty('--accent-border-light', defaultPreset.borderLight);
    root.style.setProperty('--accent-border-dark', defaultPreset.borderDark);
    root.style.setProperty('--accent-ring', defaultPreset.ring);
    root.style.setProperty('--accent-shadow', defaultPreset.shadow);
    root.style.setProperty('--accent-gradient-from', defaultPreset.gradientFrom);
    root.style.setProperty('--accent-gradient-to', defaultPreset.gradientTo);
    return;
  }
  root.removeAttribute('data-brand-accent-active');
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
      if (saved && ACCENT_COLORS.includes(saved as AccentColor)) {
        return saved as AccentColor;
      }
    } catch (_) {}
    return 'electric';
  });

  const setAccent = useCallback((newAccent: AccentColor) => {
    let resolved = newAccent;
    if (!ACCENT_COLORS.includes(resolved)) {
      resolved = 'electric';
    }
    setAccentState(resolved);
    try {
      localStorage.setItem(STORAGE_KEY, resolved);
    } catch (_) {}
    applyAccentCssVariables(ACCENT_PRESETS[resolved]);
  }, []);

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

  const currentTheme = useMemo(() => ACCENT_PRESETS[accent] || ACCENT_PRESETS.electric, [accent]);

  const contextValue = useMemo(() => ({
    accent,
    setAccent,
    currentTheme,
    availableAccents: ACCENT_PRESETS
  }), [accent, setAccent, currentTheme]);

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
