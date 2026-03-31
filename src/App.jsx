import React, { useState } from 'react';
import { USERS } from './data/mockData';
import Landing   from './pages/Landing';
import Auth      from './pages/Auth';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [page,    setPage]    = useState('landing'); // 'landing' | 'auth' | 'dashboard'
  const [authTab, setAuthTab] = useState('login');
  const [user,    setUser]    = useState(null);
  const [users,   setUsers]   = useState(USERS);

  const goAuth = tab => {
    setAuthTab(tab);
    setPage('auth');
  };

  const handleLogin = userData => {
    setUser(userData);
    setPage('dashboard');
  };

  const handleCreateUser = newUser => {
    setUsers(prev => {
      const exists = prev.some(u => u.email.toLowerCase() === newUser.email.toLowerCase());
      if (exists) return prev;
      return [...prev, newUser];
    });
  };

  const handleLogout = () => {
    setUser(null);
    setPage('landing');
  };

  if (page === 'landing')             return <Landing   onStart={goAuth} />;
  if (page === 'auth')                return <Auth defaultTab={authTab} users={users} onCreateUser={handleCreateUser} onLogin={handleLogin} />;
  if (page === 'dashboard' && user)   return <Dashboard user={user} onLogout={handleLogout} users={users} setUsers={setUsers} />;

  return <Landing onStart={goAuth} />;
}
