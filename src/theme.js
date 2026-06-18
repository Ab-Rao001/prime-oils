const C = {

  sb:        '#0D2A14',
  sbBorder:  'rgba(245,200,66,0.14)',

  gold:       '#D4880A',
  goldL:      '#F5C842',
  goldBg:     'rgba(245,200,66,0.09)',
  goldBorder: 'rgba(245,200,66,0.28)',

  bg:     '#E8F5E9',
  card:   '#FFFFFF',
  text:   '#1A2E1F',
  muted:  '#5A7A5F',
  border: '#C8E6C9',

  // Semantic
  success: '#16A34A', sBg: '#F0FDF4',
  danger:  '#DC2626', dBg: '#FEF2F2',
  warn:    '#D97706', wBg: '#FFFBEB',
  info:    '#2563EB', iBg: '#EFF6FF',
};

export default C;

export const BADGE_COLORS = {
  active:       { bg: C.sBg,       c: C.success  },
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
