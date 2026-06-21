import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Users, Settings } from 'lucide-react';
// Use the LayoutDashboard icon instead if needed, but standard imports apply
import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function BottomNav() {
  const { user } = useAuth();

  // Similar logic to Sidebar for visible links
  const links = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { to: '/dashboard/orders', icon: ShoppingCart, label: 'Orders' },
    ...(user?.role === 'supplier' ? [{ to: '/dashboard/inventory', icon: Package, label: 'Stock' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/dashboard/users', icon: Users, label: 'Users' }] : []),
    { to: '/dashboard/profile', icon: Settings, label: 'Profile' },
  ];

  return (
    <nav role="navigation" aria-label="Bottom mobile navigation" className="fixed bottom-0 left-0 w-full bg-[var(--color-card)] border-t border-[var(--color-border)] pb-safe z-50 md:hidden">
      <div className="flex items-center justify-around h-16">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/dashboard'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)] focus-visible:z-10 ${
                  isActive ? 'text-[var(--accent-gold)]' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`
              }
              aria-label={link.label}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
