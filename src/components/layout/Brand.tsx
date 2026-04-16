import React from 'react';

export const BRAND = {
  navy: '#2a4d8f',
  teal: '#3aa0a0',
  coral: '#e8594f',
  ink: '#0f1a2b',
} as const;

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-2xl',
};

export const Wordmark: React.FC<WordmarkProps> = ({ size = 'md', className = '' }) => (
  <span
    className={`font-sans font-semibold tracking-tight leading-none ${sizeMap[size]} ${className}`}
  >
    <span style={{ color: BRAND.ink }}>Indent</span>
    <span
      style={{
        backgroundImage: `linear-gradient(90deg, ${BRAND.navy} 0%, ${BRAND.teal} 50%, ${BRAND.coral} 100%)`,
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        color: 'transparent',
      }}
    >
      view
    </span>
  </span>
);

interface BrandMarkProps {
  className?: string;
}

export const BrandMark: React.FC<BrandMarkProps> = ({ className = 'w-5 h-5' }) => (
  <div className={`grid grid-cols-2 gap-[2px] ${className}`}>
    <div style={{ backgroundColor: BRAND.navy }} />
    <div style={{ backgroundColor: BRAND.teal }} />
    <div style={{ backgroundColor: BRAND.ink }} />
    <div style={{ backgroundColor: BRAND.coral }} />
  </div>
);
