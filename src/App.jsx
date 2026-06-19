import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { useAuth } from './hooks/useAuth';
import ErrorBoundary from './components/common/ErrorBoundary';
import PageLoader from './components/PageLoader';

const Landing = React.lazy(() => import('./pages/Landing'));
const AuthPage = React.lazy(() => import('./pages/Auth'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader label="Checking session..." />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading, logout } = useAuth();

  if (loading) return <PageLoader label="Starting Prime Oil..." />;

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage defaultTab="login" />} />
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Dashboard user={user} onLogout={logout} />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <AuthProvider>
          <SocketProvider>
            <Router>
              <AppRoutes />
              <Toaster position="top-right" 
                toastOptions={{
                  style: {
                    background: 'var(--color-card)',
                    color: 'var(--color-text)',
                    border: '1px solid var(--color-border)',
                  }
                }}
              />
            </Router>
          </SocketProvider>
        </AuthProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
