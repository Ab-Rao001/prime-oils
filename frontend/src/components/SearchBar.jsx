import React from 'react';
import C from '../theme';

export default function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="relative w-full max-w-[260px] mb-3.5">
      <span 
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm flex items-center justify-center pointer-events-none"
        aria-hidden="true"
      >
        🔍
      </span>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'Search...'}
        aria-label={placeholder || 'Search'}
        className="w-full pl-9 pr-3 py-2 min-h-[44px] bg-card border border-border dark:border-border-dark rounded-lg text-[13px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold transition-colors"
      />
    </div>
  );
}
