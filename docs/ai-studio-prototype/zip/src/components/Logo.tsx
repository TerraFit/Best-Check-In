import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizes = {
    sm: 'h-6 text-lg',
    md: 'h-10 text-2xl',
    lg: 'h-16 text-4xl'
  };

  return (
    <div className={`flex items-center gap-2 select-none font-bold tracking-tight ${className}`}>
      <div 
        className="flex items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20"
        style={{
          width: size === 'sm' ? '30px' : size === 'md' ? '44px' : '64px',
          height: size === 'sm' ? '30px' : size === 'md' ? '44px' : '64px',
          fontSize: size === 'sm' ? '14px' : size === 'md' ? '22px' : '32px',
        }}
      >
        ⚡
      </div>
      <div className={`flex flex-col leading-none font-serif ${sizes[size]}`}>
        <span className="text-stone-900 dark:text-white">
          FAST<span className="text-amber-500">CHECKIN</span>
        </span>
        <span className="text-[10px] tracking-widest uppercase font-sans text-stone-400 mt-1">
          Smart Hospitality Suite
        </span>
      </div>
    </div>
  );
}
