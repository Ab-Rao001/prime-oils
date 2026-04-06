import React from 'react';
import { useAuth } from '../hooks/useAuth';

export const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, userRole, loading } = useAuth();

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

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2D4A2D 0%, #4A6B4A 50%, #6B8E6B 100%)',
        color: '#FDF6E3',
        fontFamily: "'DM Sans', sans-serif",
        textAlign: 'center',
      }}>
        <div>
          <h1 style={{ color: '#F5C842', marginBottom: 10 }}>Access Denied</h1>
          <p>Please log in to continue</p>
        </div>
      </div>
    );
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2D4A2D 0%, #4A6B4A 50%, #6B8E6B 100%)',
        color: '#FDF6E3',
        fontFamily: "'DM Sans', sans-serif",
        textAlign: 'center',
      }}>
        <div>
          <h1 style={{ color: '#F5C842', marginBottom: 10 }}>Unauthorized</h1>
          <p>You don't have permission to access this page</p>
        </div>
      </div>
    );
  }

  return children;
};
