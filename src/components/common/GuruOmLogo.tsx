import React from 'react';

interface GuruOmLogoProps {
  className?: string;
  variant?: 'full' | 'icon';
  color?: string;
}

export const GuruOmLogo: React.FC<GuruOmLogoProps> = ({
  className = "",
  color = "#FF5000"
}) => {
  return (
    <span 
      className={`font-black tracking-tight select-none inline-block ${className}`}
      style={{ color: color || '#FF5000' }}
    >
      GuruOm Industries LLP
    </span>
  );
};
