import React from 'react';
import { Check } from 'lucide-react';
import { useAccentTheme, ACCENT_COLORS, AccentColor } from '../../context/AccentThemeContext';

interface AccentColorSelectorProps {
  isDarkMode?: boolean;
  className?: string;
  onSelect?: (color: AccentColor) => void;
}

export const AccentColorSelector: React.FC<AccentColorSelectorProps> = ({
  isDarkMode = false,
  className = '',
  onSelect
}) => {
  const { accent, setAccent, availableAccents } = useAccentTheme();

  const handlePick = (color: AccentColor) => {
    setAccent(color);
    if (onSelect) onSelect(color);
  };

  return (
    <div className={`space-y-2 font-sans ${className}`}>
      <div className="flex items-center justify-between">
        <label className={`text-xs font-bold uppercase tracking-wider font-mono ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
        }`}>
          Accent Color
        </label>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 capitalize">
          {accent} Active
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ACCENT_COLORS.map((colorKey) => {
          const preset = availableAccents[colorKey];
          const isSelected = accent === colorKey;

          return (
            <button
              key={colorKey}
              type="button"
              onClick={() => handlePick(colorKey)}
              aria-label={`Select ${preset.label} theme`}
              aria-pressed={isSelected}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-ui cursor-pointer select-none ${
                isSelected
                  ? isDarkMode
                    ? 'bg-slate-800 border-white/40 text-white shadow-sm ring-1 ring-white/20'
                    : 'bg-white border-slate-900/40 text-slate-900 shadow-sm ring-1 ring-slate-900/10'
                  : isDarkMode
                    ? 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <span 
                  className="w-3.5 h-3.5 rounded-full shadow-xs shrink-0 transition-transform"
                  style={{ backgroundColor: preset.dotColor }}
                />
                <span>{preset.label}</span>
              </div>

              {isSelected && (
                <span 
                  className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-xs shrink-0"
                  style={{ backgroundColor: preset.primary }}
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AccentColorSelector;
