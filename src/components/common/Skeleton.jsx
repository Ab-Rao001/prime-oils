import React from 'react';
import C from '../../theme';

export function Skeleton({ className = '', style = {} }) {
  return (
    <div
      className={`shimmer-bg rounded ${className}`}
      style={ {
        minHeight: '1em',
        ...style
      }}
    />
  );
}

export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card-premium">
      <Skeleton className="w-1/3 h-6 mb-4" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="w-full h-4 mb-2" style={ { opacity: 1 - (i * 0.2) }} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }) {
  return (
    <div className="table-responsive-container w-full overflow-hidden">
      <div className="flex border-b" style={ { borderColor: C.border, padding: '12px 14px' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1 mr-4 last:mr-0 opacity-50" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex border-b" style={ { borderColor: C.border, padding: '16px 14px' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1 mr-4 last:mr-0" />
          ))}
        </div>
      ))}
    </div>
  );
}
