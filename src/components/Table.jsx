import React from 'react';
import C from '../theme';

export function THead({ cols }) {
  return (
    <thead>
      <tr style={{ borderBottom: `1px solid ${C.border}` }}>
        {cols.map(c => (
          <th key={c} style={{
            padding: '9px 12px', textAlign: 'left', fontSize: 11,
            fontWeight: 600, color: C.muted, textTransform: 'uppercase',
            letterSpacing: '0.5px', whiteSpace: 'nowrap', background: C.card,
          }}>
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function TRow({ children }) {
  return (
    <tr className="table-row" style={{ borderBottom: `1px solid ${C.border}` }}>
      {children}
    </tr>
  );
}

export function TCell({ children, bold, color }) {
  return (
    <td style={{
      padding: '10px 12px', fontSize: 13,
      color: color || (bold ? C.text : C.muted),
      fontWeight: bold ? 600 : 400,
    }}>
      {children}
    </td>
  );
}
