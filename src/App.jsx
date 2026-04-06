import React from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Landing   from './pages/Landing';
import Auth      from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Setup     from './pages/Setup';
import { useAuth } from './hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from './Firebase/firebase';

function AppContent() {
  const { user, userRole, loading } = useAuth();
  const [page, setPage] = React.useState(user ? 'dashboard' : 'landing');
  const [showSetup, setShowSetup] = React.useState(false);
  const [users, setUsers] = React.useState([]);

  React.useEffect(() => {
    if (loading) return;
    if (user) {
      setPage('dashboard');
    } else if (page !== 'auth' && page !== 'setup') {
      setPage('landing');
    }
  }, [user, userRole, loading]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setPage('landing');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleGoToAuth = (tab) => {
    setPage('auth');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2D4A2D 0%, #4A6B4A 50%, #6B8E6B 100%)',
        color: '#FDF6E3',
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 18,
      }}>
        Loading...
      </div>
    );
  }

  if (showSetup)                      return <Setup onSetupComplete={() => setShowSetup(false)} />;
  if (page === 'landing')             return <Landing onStart={handleGoToAuth} />;
  if (page === 'auth')                return <Auth defaultTab="login" />;
  if (page === 'dashboard' && user)   return <Dashboard user={{ ...user, role: userRole }} onLogout={handleLogout} users={users} setUsers={setUsers} />;

  return <Landing onStart={handleGoToAuth} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
