'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withText?: boolean;
  href?: string;
}

// Inline SVG fallback logo - golden Z with clock on dark blue
const ZetimeFallbackLogo = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F5C542" />
        <stop offset="100%" stopColor="#D4941C" />
      </linearGradient>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1a2351" />
        <stop offset="100%" stopColor="#0f1535" />
      </linearGradient>
    </defs>
    <rect width="120" height="120" rx="32" fill="url(#bgGrad)" />
    {/* Z letter */}
    <path d="M30 30 L90 30 L90 42 L52 82 L90 82 L90 95 L30 95 L30 82 L68 42 L30 42 Z" 
          fill="url(#goldGrad)" opacity="0.9" stroke="url(#goldGrad)" strokeWidth="2" strokeLinejoin="round" />
    {/* Clock circle */}
    <circle cx="65" cy="62" r="22" fill="none" stroke="url(#goldGrad)" strokeWidth="3" />
    <circle cx="65" cy="62" r="1.5" fill="#F5C542" />
    {/* Hour hand */}
    <line x1="65" y1="62" x2="58" y2="50" stroke="#F5C542" strokeWidth="2.5" strokeLinecap="round" />
    {/* Minute hand */}
    <line x1="65" y1="62" x2="76" y2="57" stroke="#F5C542" strokeWidth="2" strokeLinecap="round" />
    {/* Hour markers */}
    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => {
      const rad = (angle - 90) * (Math.PI / 180);
      const x = 65 + 19 * Math.cos(rad);
      const y = 62 + 19 * Math.sin(rad);
      return <circle key={angle} cx={x} cy={y} r="1" fill="#F5C542" />;
    })}
  </svg>
);

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  size = 'md', 
  withText = true,
  href = '/'
}) => {
  const [imgError, setImgError] = useState(false);

  const dimensions = {
    sm: { px: 32, cls: 'h-8 w-8' },
    md: { px: 48, cls: 'h-12 w-12' },
    lg: { px: 64, cls: 'h-16 w-16' },
    xl: { px: 96, cls: 'h-24 w-24' }
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
    xl: 'text-5xl'
  };

  const content = (
    <div className={cn("flex items-center gap-3 group", className)}>
      <div className={cn("transition-transform group-hover:scale-105 duration-300 flex-shrink-0 relative overflow-hidden rounded-xl", dimensions[size].cls)}>
        <div className="absolute inset-0 bg-white/20 blur-xl rounded-full dark:opacity-50 opacity-0 transition-opacity" />
        {imgError ? (
          <div className="rounded-xl overflow-hidden">
            <ZetimeFallbackLogo size={dimensions[size].px} />
          </div>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src="/zetime-logo.png"
            alt="Zetime Logo"
            width={dimensions[size].px}
            height={dimensions[size].px}
            className="object-contain w-full h-full relative z-10 dark:drop-shadow-[0_0_10px_rgba(147,197,253,0.5)] rounded-xl"
            onError={() => setImgError(true)}
          />
        )}
      </div>
      {withText && (
        <span className={cn(
          "font-black tracking-tighter transition-all duration-300 group-hover:tracking-normal drop-shadow-sm text-slate-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-r dark:from-blue-400 dark:to-indigo-300 dark:text-white",
          textSizes[size]
        )}>
          ZETIME
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    );
  }

  return content;
};
