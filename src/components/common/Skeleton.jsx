import React from 'react';

/**
 * Basic shimmer skeleton line simulating text/headers.
 */
export function SkeletonLine({ width = '100%', height = '16px', borderRadius = '4px', marginBottom = '12px' }) {
  return (
    <div
      className="shimmer-bg"
      style={{
        width,
        height,
        borderRadius,
        marginBottom,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Premium glassmorphism card skeleton simulation.
 */
export function SkeletonCard() {
  return (
    <div
      className="card-premium"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        minHeight: '140px',
      }}
      aria-hidden="true"
    >
      <SkeletonLine width="40%" height="18px" />
      <SkeletonLine width="75%" height="32px" />
      <SkeletonLine width="60%" height="14px" marginBottom="0" />
    </div>
  );
}

/**
 * Reusable table skeleton showing column headers and empty shimmer rows.
 */
export function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div
      className="table-responsive-container"
      style={{ padding: '16px' }}
      aria-hidden="true"
    >
      <div style={{ display: 'flex', gap: '20px', marginBottom: '16px', borderBottom: '2px solid #e8f5e9', paddingBottom: '10px' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} style={{ flex: 1 }}>
            <SkeletonLine width="60%" height="14px" />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: '20px', padding: '12px 0', borderBottom: '1px solid #f4f7f5' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} style={{ flex: 1 }}>
              <SkeletonLine width={c === 0 ? '80%' : '50%'} height="12px" marginBottom="0" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default {
  Line: SkeletonLine,
  Card: SkeletonCard,
  Table: SkeletonTable,
};
