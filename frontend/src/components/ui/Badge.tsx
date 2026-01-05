import React from 'react';

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary' | 'secondary';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', size = 'md', className = '' }) => {
  const styles = {
    success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-500 text-white border-amber-600',
    error: 'bg-rose-600 text-white border-rose-700',
    info: 'bg-blue-500 text-white border-blue-600',
    neutral: 'bg-slate-100 text-slate-800 border-slate-200',
    primary: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    secondary: 'bg-slate-200 text-slate-700 border-slate-300',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${styles[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </span>
  );
};
