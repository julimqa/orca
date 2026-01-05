import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
  title?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false, title, action, footer }) => {
  return (
    <div className={`bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col ${className}`}>
      {(title || action) && (
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          {title && <div className="text-lg font-semibold text-slate-800">{title}</div>}
          {action && <div>{action}</div>}
        </div>
      )}

      <div className={`${noPadding ? '' : 'p-6'} flex-1`}>{children}</div>

      {footer && <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-lg">{footer}</div>}
    </div>
  );
};
