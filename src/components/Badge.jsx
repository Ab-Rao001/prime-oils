import React from 'react';
import { BADGE_COLORS } from '../theme';

export default function Badge({ s }) {
  const st = BADGE_COLORS[s] || BADGE_COLORS.pending;
  return (
    <span style={{
      background: st.bg,
      color: st.c,
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'capitalize',
      display: 'inline-block',
      whiteSpace: 'nowrap',
    }}>
      {s}
    </span>
  );
}
