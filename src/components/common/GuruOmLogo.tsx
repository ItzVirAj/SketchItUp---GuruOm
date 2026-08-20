import React from 'react';
import { useAccentTheme } from '../../context/AccentThemeContext';

interface GuruOmLogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  color?: string;
}

export const GuruOmLogo: React.FC<GuruOmLogoProps> = ({
  className = "",
  color
}) => {
  const { currentTheme } = useAccentTheme();
  const brandColor = color || currentTheme.primary;

  return (
    <span 
      className={`font-black tracking-tight select-none inline-block ${className}`}
      style={{ color: brandColor }}
    >
      GuruOm Industries LLP
    </span>
  );
};
