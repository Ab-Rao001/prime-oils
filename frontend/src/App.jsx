import React, { Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { useAuth } from './hooks/useAuth';
import { userApi } from './api/userApi';
import { useNotificationStore } from './store';
import ErrorBoundary from './components/common/ErrorBoundary';
import PageLoader from './components/PageLoader';
import { NetworkIndicator } from './components/NetworkIndicator';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { idbPersister } from './utils/db';
import './utils/syncEngine'; // Initialize sync engine

const Landing = React.lazy(() => import('./pages/Landing'));
const AuthPage = React.lazy(() => import('./pages/Auth'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));

const Overview = React.lazy(() => import('./pages/Overview'));
const SupplierDashboard = React.lazy(() => import('./pages/SupplierDashboard'));
const Inventory = React.lazy(() => import('./pages/Inventory'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Payments = React.lazy(() => import('./pages/Payments'));
const CashFlow = React.lazy(() => import('./pages/CashFlow'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Complaints = React.lazy(() => import('./pages/Complaints'));
const Returns = React.lazy(() => import('./pages/Returns'));
const CreditNotes = React.lazy(() => import('./pages/CreditNotes'));
const Marketing = React.lazy(() => import('./pages/Marketing'));
const Shopkeepers = React.lazy(() => import('./pages/Shopkeepers'));
const Reports = React.lazy(() => import('./pages/Reports'));
const UserManagement = React.lazy(() => import('./pages/UserManagement'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Transactions = React.lazy(() => import('./pages/Transactions'));
const PurchaseOrders = React.lazy(() => import('./pages/PurchaseOrders'));
const Expenses = React.lazy(() => import('./pages/Expenses'));
const Dispatch = React.lazy(() => import('./pages/Dispatch'));

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Setup Persist Client for Offline cache
persistQueryClient({
  queryClient,
  persister: idbPersister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
});

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader label="Checking session..." />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading, logout } = useAuth();
  const setNotifications = useNotificationStore(state => state.setNotifications);

  useEffect(() => {
    if (!user) return;
    
    // Initial fetch of notifications
    userApi.getNotifications().then(setNotifications).catch(() => setNotifications([]));

  }, [user, setNotifications]);

  if (loading) return <PageLoader label="Starting Prime Oil..." />;

  const pageProps = {
    user,
    role: user?.role
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage defaultTab="login" />} />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard user={user} onLogout={logout} />
            </ProtectedRoute>
          }
        >
          {/* Nested Dashboard Routes */}
          <Route index element={<Navigate to={user?.role === 'supplier' ? 'supplier-dashboard' : 'overview'} replace />} />
          <Route path="overview" element={<Overview {...pageProps} />} />
          <Route path="supplier-dashboard" element={<SupplierDashboard {...pageProps} />} />
          <Route path="inventory" element={<Inventory {...pageProps} />} />
          <Route path="orders" element={<Orders {...pageProps} />} />
          <Route path="payments" element={<Payments {...pageProps} />} />
          <Route path="cashflow" element={<CashFlow {...pageProps} />} />
          <Route path="notifications" element={<Notifications {...pageProps} />} />
          <Route path="complaints" element={<Complaints {...pageProps} />} />
          <Route path="returns" element={<Returns {...pageProps} />} />
          <Route path="credit-notes" element={<CreditNotes {...pageProps} />} />
          <Route path="marketing" element={<Marketing {...pageProps} />} />
          <Route path="shopkeepers" element={<Shopkeepers {...pageProps} />} />
          <Route path="reports" element={<Reports {...pageProps} />} />
          <Route path="users" element={<UserManagement {...pageProps} />} />
          <Route path="profile" element={<Profile {...pageProps} />} />
          <Route path="transactions" element={<Transactions {...pageProps} />} />
          <Route path="purchase-orders" element={<PurchaseOrders {...pageProps} />} />
          <Route path="expenses" element={<Expenses {...pageProps} />} />
          <Route path="dispatch" element={<Dispatch {...pageProps} />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <AuthProvider>
            {/* SocketProvider must be inside QueryClientProvider and AuthProvider */}
            <SocketProvider>
              <Router>
                <NetworkIndicator />
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
    </QueryClientProvider>
  );
}
