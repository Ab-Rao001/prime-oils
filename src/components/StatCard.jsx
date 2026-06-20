import React from 'react';
import { Typography } from './ui';

export default function StatCard({ label, value, sub, colorClass = 'text-gold bg-gold/10', icon }) {
  // If legacy components still pass raw hex colors, map them to tailwind classes roughly
  const colorMap = {
    '#34d399': 'text-success bg-success/15', // success
    '#f87171': 'text-danger bg-danger/15', // danger
    '#fbbf24': 'text-warn bg-warn/15', // warn
    '#F5C842': 'text-gold bg-gold/15', // gold
    '#3b82f6': 'text-info bg-info/15', // info
  };
  
  // Use passed colorClass if it's a tailwind class (doesn't start with #), else map it
  const finalColorClass = typeof colorClass === 'string' && colorClass.startsWith('#') 
    ? (colorMap[colorClass] || 'text-gold bg-gold/15') 
    : colorClass;

  return (
    <div className="bg-card border border-border dark:border-border-dark rounded-xl p-4 flex gap-3.5 items-center">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-2xl ${finalColorClass}`}>
        {icon}
      </div>
      <div>
        <Typography variant="caption" className="text-muted-foreground mb-0.5 block">{label}</Typography>
        <Typography variant="h3" size="xl" className="font-bold text-foreground">{value}</Typography>
        {sub && <Typography variant="caption" className="text-muted-foreground mt-0.5 block">{sub}</Typography>}
      </div>
    </div>
  );
}
