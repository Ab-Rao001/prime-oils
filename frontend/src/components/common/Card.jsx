import React from 'react';

export default function Card({
  children,
  className = '',
  noPadding = false,
  onClick
}) {
  return (
    <div 
      className={`
        bg-[var(--color-card)] 
        border border-[var(--color-border)] 
        rounded-xl shadow-sm 
        transition-shadow
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
        ${noPadding ? '' : 'p-4 sm:p-6'}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
