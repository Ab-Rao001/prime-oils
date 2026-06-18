import React from 'react';
import C from '../theme';

export default function PageLoader({ label = 'Loading...' }) {
  return <div style={{ padding: 24, color: C.muted, fontSize: 14 }}>{label}</div>;
}
