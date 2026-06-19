import React from 'react';
import C from '../theme';
import { SkeletonTable } from './common/Skeleton';

// Legacy components kept for backward-compatibility with old views
export function THead({ cols }) {
  return (
    <thead>
      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
        {cols.map(c => (
          <th
            key={c}
            scope="col"
            style={{
              padding: '12px 14px',
              textAlign: 'left',
              fontSize: 11,
              fontWeight: 600,
              color: C.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.75px',
              whiteSpace: 'nowrap',
              background: C.bg,
            }}
          >
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TRow({ children, onClick, style }) {
  return (
    <tr
      className="table-row"
      onClick={onClick}
      style={{
        borderBottom: `1px solid ${C.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background-color 0.15s ease',
        ...style
      }}
    >
      {children}
    </tr>
  );
}

export function TCell({ children, bold, color, style }) {
  return (
    <td
      style={{
        padding: '12px 14px',
        fontSize: 13,
        color: color || (bold ? C.text : C.muted),
        fontWeight: bold ? 600 : 400,
        verticalAlign: 'middle',
        ...style
      }}
    >
      {children}
    </td>
  );
}

/**
 * Production-grade Accessible & Reusable Table Component.
 * Supports loading states (skeletons), pagination, and semantic HTML5 structures.
 */
export default function Table({
  headers = [],
  data = [],
  loading = false,
  renderRow,
  pagination = null,
  onPageChange = null,
  emptyMessage = "No records found.",
  caption = "Data table",
  virtualPadding = null,
  onScroll = null,
  style = {}
}) {
  if (loading) {
    return <SkeletonTable rows={5} cols={headers.length || 4} />;
  }

  return (
    <div className="table-responsive-container" onScroll={onScroll} style={{ display: 'flex', flexDirection: 'column', ...style }}>
      <table
        role="table"
        aria-busy={loading}
        style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}
      >
        <caption className="sr-only">{caption}</caption>
        <THead cols={headers} />
        <tbody>
          {virtualPadding && virtualPadding.top > 0 && (
            <tr style={{ height: `${virtualPadding.top}px` }}>
              <td colSpan={headers.length || 1} style={{ padding: 0 }} />
            </tr>
          )}

          {data.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length || 1}
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  color: C.muted,
                  fontSize: 13,
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => renderRow(item, index))
          )}

          {virtualPadding && virtualPadding.bottom > 0 && (
            <tr style={{ height: `${virtualPadding.bottom}px` }}>
              <td colSpan={headers.length || 1} style={{ padding: 0 }} />
            </tr>
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      {pagination && onPageChange && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderTop: `1px solid ${C.border}`,
            background: C.bg,
            borderBottomLeftRadius: 14,
            borderBottomRightRadius: 14
          }}
          aria-label="Table pagination navigation"
        >
          <div style={{ fontSize: 12, color: C.muted }}>
            Showing page <span style={{ fontWeight: 600, color: C.text }}>{pagination.page}</span> of{' '}
            <span style={{ fontWeight: 600, color: C.text }}>{pagination.pages || 1}</span> ({pagination.total || 0} items)
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev && pagination.page <= 1}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: (!pagination.hasPrev && pagination.page <= 1) ? C.muted : C.text,
                cursor: (!pagination.hasPrev && pagination.page <= 1) ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
              aria-label="Go to previous page"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                borderRadius: 6,
                border: `1px solid ${C.border}`,
                background: C.card,
                color: !pagination.hasNext ? C.muted : C.text,
                cursor: !pagination.hasNext ? 'not-allowed' : 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s ease',
              }}
              aria-label="Go to next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
