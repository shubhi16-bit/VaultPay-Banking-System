import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps {
  children: React.ReactNode;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  icon?: boolean;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  variant = 'info',
  title,
  icon = true,
  className = '',
}) => {
  const variantStyles = {
    info: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-rose-50 border-rose-200 text-rose-900',
  };

  const icons = {
    info: <Info className="w-5 h-5 text-indigo-600 shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
    danger: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
  };

  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-3 p-4 rounded-2xl border ${variantStyles[variant]} ${className}`}
    >
      {icon && icons[variant]}
      <div className="text-xs sm:text-sm leading-relaxed space-y-0.5">
        {title && <h5 className="font-semibold">{title}</h5>}
        <div>{children}</div>
      </div>
    </div>
  );
};
