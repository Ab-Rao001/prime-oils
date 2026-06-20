import React from 'react';
import { useLocation } from 'react-router-dom';
import { NAV_ITEMS } from '../config/navigation';
import { useUIStore } from '../store';
import { Button } from './ui';

export default function Topbar({ user }) {
  const location = useLocation();
  const currentPath = location.pathname.split('/').pop();
  const currentPage = NAV_ITEMS.find(n => n.path === currentPath)?.label || 'Overview';
  
  const mobileMenuOpen = useUIStore(state => state.mobileMenuOpen);
  const toggleMobileMenu = useUIStore(state => state.toggleMobileMenu);

  return (
    <header
      role="banner"
      className="h-[52px] bg-card border-b border-border dark:border-border-dark flex items-center px-[18px] gap-2.5 shrink-0 z-[500] relative"
    >
      <button
        type="button"
        onClick={toggleMobileMenu}
        aria-label={mobileMenuOpen ? "Collapse navigation sidebar" : "Expand navigation sidebar"}
        aria-expanded={mobileMenuOpen}
        className="bg-transparent border-none cursor-pointer p-1.5 min-w-[44px] min-h-[44px] rounded-md text-muted-foreground text-lg leading-none flex items-center justify-center transition-colors duration-150 hover:bg-black/5 dark:hover:bg-white/5 md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        ☰
      </button>

      <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-1">
        <span className="text-gold font-semibold capitalize">{user?.role}</span>
        <span className="text-border dark:text-border-dark" aria-hidden="true">›</span>
        <span className="font-medium text-foreground capitalize">{currentPage}</span>
      </div>

    </header>
  );
}
