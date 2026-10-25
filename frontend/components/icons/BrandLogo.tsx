import React from 'react';

export default function BrandLogo({ size = 36, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="svBrandGrad1" x1="4" y1="4" x2="38" y2="40" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2BB8FF" />
            <stop offset="0.5" stopColor="#1683F8" />
            <stop offset="1" stopColor="#0866D9" />
          </linearGradient>
          <linearGradient id="svBrandGrad2" x1="12" y1="8" x2="32" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38C6FF" />
            <stop offset="1" stopColor="#1683F8" />
          </linearGradient>
          <filter id="svGlow" x="0" y="0" width="44" height="44" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#1683F8" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Diagonal stroke 1 (longer left pill) */}
        <rect
          x="7.5"
          y="18.5"
          width="8"
          height="22"
          rx="4"
          transform="rotate(-45 7.5 18.5)"
          fill="url(#svBrandGrad1)"
          filter="url(#svGlow)"
        />

        {/* Diagonal stroke 2 (shorter upper-right pill) */}
        <rect
          x="19"
          y="9"
          width="7.5"
          height="16"
          rx="3.75"
          transform="rotate(-45 19 9)"
          fill="url(#svBrandGrad2)"
        />

        {/* Vault security dot 1 */}
        <circle cx="12" cy="12" r="3.2" fill="#1683F8" />

        {/* Vault security dot 2 */}
        <circle cx="33" cy="31" r="3.5" fill="#0866D9" />
      </svg>
    </div>
  );
}
