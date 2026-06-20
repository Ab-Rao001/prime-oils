const C = {
  sb:        'var(--color-sb)',
  sbBorder:  'var(--color-sbBorder)',

  gold:       'var(--color-gold)',
  goldL:      'var(--color-goldL)',
  goldBg:     'var(--color-goldBg)',
  goldBorder: 'var(--color-goldBorder)',

  bg:     'var(--color-bg)',
  card:   'var(--color-card)',
  text:   'var(--color-text)',
  muted:  'var(--color-muted)',
  border: 'var(--color-border)',

  // Semantic
  success: 'var(--color-success)', sBg: 'var(--color-sBg)',
  danger:  'var(--color-danger)', dBg: 'var(--color-dBg)',
  warn:    'var(--color-warn)', wBg: 'var(--color-wBg)',
  info:    'var(--color-info)', iBg: 'var(--color-iBg)',
};

export default C;

export const BADGE_COLORS = {
  active:       { bg: C.sBg,       c: C.success  },
  online:       { bg: C.sBg,       c: C.success  },
  offline:      { bg: '#F3F4F6',   c: '#6B7280'  },
  suspended:    { bg: C.dBg,       c: C.danger   },
  delivered:    { bg: C.sBg,       c: C.success  },
  resolved:     { bg: C.sBg,       c: C.success  },
  completed:    { bg: C.sBg,       c: C.success  },
  paid:         { bg: C.sBg,       c: C.success  },
  full:         { bg: C.sBg,       c: C.success  },
  inactive:     { bg: '#F3F4F6',   c: '#6B7280'  },
  cancelled:    { bg: '#F3F4F6',   c: '#6B7280'  },
  pending:      { bg: C.wBg,       c: C.warn     },
  planned:      { bg: C.iBg,       c: C.info     },
  processing:   { bg: C.iBg,       c: C.info     },
  installment:  { bg: C.goldBg,    c: C.gold     },
  damaged:      { bg: C.dBg,       c: C.danger   },
  exchange:     { bg: C.iBg,       c: C.info     },
  order:        { bg: C.wBg,       c: C.warn     },
  overdue:      { bg: C.dBg,       c: C.danger   },
  partial:      { bg: C.wBg,       c: C.warn     },
  stock:        { bg: C.dBg,       c: C.danger   },
  payment:      { bg: C.wBg,       c: C.warn     },
  delivery:     { bg: C.sBg,       c: C.success  },
  admin:        { bg: C.goldBg,    c: C.gold     },
  shopkeeper:   { bg: C.iBg,       c: C.info     },
  salesman:     { bg: '#F5F3FF',   c: '#7C3AED'  },
  supplier:     { bg: '#FDF4FF',   c: '#9333EA'  },
};
