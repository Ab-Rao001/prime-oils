import React from 'react';
import C from '../../theme';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: C.bg,
          padding: 20,
          fontFamily: "'DM Sans', sans-serif"
        }}>
          <div style={{
            background: C.card,
            padding: 40,
            borderRadius: 16,
            border: `1px solid ${C.danger}44`,
            textAlign: 'center',
            maxWidth: 500,
            width: '100%',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={{ margin: '0 0 16px', color: C.text, fontSize: 24, fontWeight: 800 }}>Something went wrong.</h2>
            <p style={{ color: C.muted, marginBottom: 24, fontSize: 14 }}>
              The application encountered an unexpected error. Please refresh the page or try again later.
            </p>
            <div style={{
              background: C.dBg,
              color: C.danger,
              padding: 12,
              borderRadius: 8,
              fontSize: 12,
              textAlign: 'left',
              marginBottom: 24,
              overflowX: 'auto',
              fontFamily: 'monospace'
            }}>
              {this.state.error && this.state.error.toString()}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                background: C.gold,
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: 14
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
