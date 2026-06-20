import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import BottomNav from '../components/BottomNav';
import CommandPalette from '../components/CommandPalette';
import { useUIStore } from '../store';
import { EnterpriseModal, Typography, Button } from '../components/ui';

export default function Dashboard({ user, onLogout }) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const { openSidebar, closeSidebar } = useUIStore();
  
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        openSidebar();
      } else {
        closeSidebar();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [openSidebar, closeSidebar]);

  return (
    <div className="flex h-screen bg-bg dark:bg-bg-dark overflow-hidden relative">
      {!isMobile && (
        <Sidebar
          user={user}
          onLogout={() => setShowLogoutConfirm(true)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar user={user} />

        <main
          id="main-content"
          role="main"
          className={`flex-1 overflow-y-auto outline-none ${isMobile ? 'pt-4 px-3.5 pb-20' : 'pt-5.5 px-6 pb-5.5'}`}
          tabIndex="-1"
        >
          <Outlet />
        </main>
      </div>
      
      {isMobile && <BottomNav />}

      <EnterpriseModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title=""
        size="sm"
      >
        <div className="text-center p-4">
          <div className="text-5xl mb-4">👋</div>
          <Typography variant="h3" className="mb-2 text-foreground font-bold">Ready to leave?</Typography>
          <Typography variant="body" className="mb-6 text-muted-foreground">You are about to securely log out of your Prime Oil account.</Typography>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={onLogout}
              className="flex-1"
            >
              Log Out
            </Button>
          </div>
        </div>
      </EnterpriseModal>
      
      <CommandPalette />
    </div>
  );
}
