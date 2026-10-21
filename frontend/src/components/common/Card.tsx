import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'flat' | 'interactive' | 'accent' | 'navy';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3.5 sm:p-4',
    md: 'p-5 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const variantStyles = {
    default: 'bg-white border border-slate-200/80 shadow-sm rounded-2xl',
    flat: 'bg-slate-50/80 border border-slate-200/60 rounded-2xl',
    interactive: 'bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-200 cursor-pointer rounded-2xl active:scale-[0.99]',
    accent: 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 shadow-sm rounded-2xl',
    navy: 'bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-800 shadow-elevated rounded-2xl',
  };

  return (
    <div
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
