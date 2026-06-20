import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { NAV_ITEMS, NAV_BY_ROLE } from '../config/navigation';
import { useTheme } from '../context/ThemeContext';
import { useNotificationStore, useUIStore } from '../store';
import { useAuth } from '../hooks/useAuth';
import { Typography, Badge } from './ui';
import { useQuery } from '@tanstack/react-query';
import { userApi } from '../api/userApi';
import { orderApi } from '../api/orderApi';

export default function Sidebar({ onLogout }) {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  
  const notifications = useNotificationStore(state => state.notifications);
  const mobileOpen = useUIStore(state => state.mobileMenuOpen);
  const closeMobileMenu = useUIStore(state => state.closeMobileMenu);
  
  const navIds   = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.admin;
  const navItems = NAV_ITEMS.filter(n => navIds.includes(n.id));
  
  const isVisible = n => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'shopkeeper') return n.msg?.toLowerCase().includes(user.name.toLowerCase());
    if (user.role === 'salesman') return n.type === 'payment' || n.type === 'order';
    if (user.role === 'supplier') return n.type === 'order';
    return true;
  };
  
  const unread = notifications.filter(n => !(n.isRead ?? n.read) && isVisible(n)).length;

  const { data: complaintsData } = useQuery({
    queryKey: ['complaints'],
    queryFn: () => userApi.getComplaints(),
    enabled: user?.role === 'admin' || user?.role === 'shopkeeper',
    refetchInterval: 30000
  });

  const { data: dispatchOrdersData } = useQuery({
    queryKey: ['orders', { status: 'ready_for_dispatch' }],
    queryFn: () => orderApi.getOrders({ status: 'ready_for_dispatch' }),
    enabled: user?.role === 'admin' || user?.role === 'supplier'
  });

  const openComplaints = Array.isArray(complaintsData?.data || complaintsData) 
    ? (complaintsData?.data || complaintsData).filter(c => c.status === 'pending' || c.status === 'processing').length 
    : 0;
    
  const pendingDispatchOrders = Array.isArray(dispatchOrdersData?.data || dispatchOrdersData)
    ? (dispatchOrdersData?.data || dispatchOrdersData).length
    : 0;

  if (!user) return null;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 w-full h-full bg-[#0d2a14]/40 backdrop-blur-sm z-[999] lg:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      <aside
        className={`sidebar flex flex-col overflow-hidden h-full bg-sidebar min-w-[226px] w-[226px] z-[1000] border-r border-sidebar-border transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0 fixed' : 'max-md:-translate-x-full max-md:fixed relative translate-x-0'}`}
        role="navigation"
        aria-label="Main dashboard menu"
      >
        <div className="py-4 px-3.5 border-b border-sidebar-border shrink-0">
          <div className="font-serif text-[1.15rem] text-gold font-bold">
            Prime <em className="text-gold-dark not-italic">Oil</em>
          </div>
          <div className="text-[9px] text-[#fdf6e3]/30 tracking-widest uppercase mt-0.5 font-medium">
            Management System
          </div>
        </div>

        <Link 
          to="profile"
          onClick={closeMobileMenu}
          className="py-3 px-3.5 border-b border-sidebar-border flex items-center gap-3 shrink-0 cursor-pointer transition-colors duration-200 no-underline hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gold-dark/20 flex items-center justify-center text-base font-bold text-gold shrink-0 border-1.5 border-gold-border overflow-hidden" aria-hidden="true">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-success rounded-full border-2 border-sidebar" title="Active Status"></div>
          </div>
          <div className="overflow-hidden">
            <div className="text-[13px] font-semibold text-[#fdf6e3]/95 truncate">
              {user.name}
            </div>
            <div className="text-[11px] text-[#fdf6e3]/40 capitalize">
              {user.role}
            </div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto p-2 flex flex-col gap-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={closeMobileMenu}
              className={({ isActive }) => `flex items-center gap-3 py-2.5 px-3.5 rounded-lg border-none cursor-pointer text-left relative whitespace-nowrap text-sm transition-all duration-150 no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${isActive ? 'bg-gold/15 text-gold font-semibold' : 'bg-transparent text-[#fdf6e3]/85 hover:text-white font-medium'}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute left-0 top-[14%] w-[3px] h-[72%] bg-gold rounded-r-sm" />
                  )}
                  {item.label}
                  {item.id === 'notifications' && unread > 0 && (
                    <span
                      className="ml-auto bg-danger text-white text-[9px] rounded-lg py-0.5 px-1.5 font-bold"
                      aria-label={`${unread} unread notifications`}
                    >
                      {unread}
                    </span>
                  )}
                  {item.id === 'complaints' && openComplaints > 0 && (
                    <span
                      className="ml-auto bg-danger text-white text-[9px] rounded-lg py-0.5 px-1.5 font-bold"
                      aria-label={`${openComplaints} open complaints`}
                    >
                      {openComplaints}
                    </span>
                  )}
                  {item.id === 'dispatch' && pendingDispatchOrders > 0 && (
                    <span
                      className="ml-auto bg-danger text-white text-[9px] rounded-lg py-0.5 px-1.5 font-bold"
                      aria-label={`${pendingDispatchOrders} ready to dispatch`}
                    >
                      {pendingDispatchOrders}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-sidebar-border shrink-0 flex flex-col gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center justify-between py-2.5 px-3.5 rounded-lg border-none cursor-pointer bg-transparent text-[#fdf6e3]/85 hover:text-white w-full text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Toggle dark mode"
          >
            <span>Dark Mode</span>
            <div className={`w-9 h-5 rounded-full relative transition-colors duration-300 ${isDark ? 'bg-gold' : 'bg-white/20'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${isDark ? 'left-[18px]' : 'left-0.5'}`} />
            </div>
          </button>
          
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-3 py-2.5 px-3.5 rounded-lg border-none cursor-pointer bg-transparent text-[#fdf6e3]/85 hover:text-white w-full text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            aria-label="Logout from account"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
