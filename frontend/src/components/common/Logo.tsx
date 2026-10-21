import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  variant = 'dark',
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const iconSizes = {
    sm: 20,
    md: 26,
    lg: 34,
  };

  return (
    <div className={`inline-flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`}>
      <div className="relative flex items-center justify-center p-2 rounded-xl bg-gradient-to-tr from-indigo-700 via-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20">
        <ShieldCheck size={iconSizes[size]} className="stroke-[2.2]" />
        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full ring-2 ring-white" />
      </div>
      <div className={`flex items-baseline ${sizeClasses[size]}`}>
        <span className={variant === 'dark' ? 'text-slate-900 font-extrabold' : 'text-white font-extrabold'}>
          Vault
        </span>
        <span className="text-indigo-600 font-extrabold">Pay</span>
      </div>
    </div>
  );
};
