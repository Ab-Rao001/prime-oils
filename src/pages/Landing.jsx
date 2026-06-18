import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* SECTION 1: Image hero (first screen) */}
      <section style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        // Background image (put file in public/)
        backgroundImage: 'url(/landing-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        // Fallback if image not present
        backgroundColor: '#1F3A1F',
      }}>
        {/* subtle overlay so text is readable without hiding the image */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.05) 55%, rgba(0,0,0,0.25) 100%)',
          zIndex: 0,
        }} />

        {/* Heading - Top Left (one line) */}
        <div style={{
          position: 'absolute',
          top: 'clamp(16px, 2.5vh, 26px)',
          left: 'clamp(14px, 2.2vw, 24px)',
          zIndex: 2,
          textAlign: 'left',
        }}>
          <div style={{
            fontSize: 'clamp(1.1rem, 2.4vw, 1.65rem)',
            fontWeight: 700,
            fontFamily: "'Playfair Display', serif",
            lineHeight: 1.2,
            color: '#FDF6E3',
            letterSpacing: -0.2,
            textShadow: '0 2px 14px rgba(0,0,0,0.55)',
            whiteSpace: 'nowrap',
          }}>
            Prime <span style={{ color: '#F5C842', fontStyle: 'italic' }}>Oil</span> Suppliers
          </div>
        </div>

        {/* Buttons - Top Right */}
        <div style={{
          position: 'absolute',
          top: 'clamp(16px, 2.5vh, 26px)',
          right: 'clamp(14px, 2.2vw, 24px)',
          zIndex: 2,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={() => navigate('/auth')}
            style={{
              padding: '10px 26px',
              borderRadius: 999,
              background: '#F5C842',
              color: '#0D0A05',
              border: 'none',
              fontFamily: "'DM Sans'",
              fontSize: 14,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 10px 26px rgba(0,0,0,0.28)',
            }}
          >
            Login
          </button>
          <button
            onClick={() => navigate('/auth')}
            style={{
              padding: '10px 26px',
              borderRadius: 999,
              background: 'rgba(0,0,0,0.22)',
              color: '#FDF6E3',
              border: '1px solid rgba(253,246,227,0.55)',
              fontFamily: "'DM Sans'",
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 10px 26px rgba(0,0,0,0.22)',
            }}
          >
            Sign Up
          </button>

        </div>

        {/* Bottom text + features (on top of image) */}
        <div style={{
          position: 'absolute',
          left: '50%',
          bottom: 'clamp(18px, 4vh, 34px)',
          transform: 'translateX(-50%)',
          zIndex: 2,
          width: 'min(1100px, 92vw)',
          textAlign: 'center',
        }}>
          <p style={{
            color: 'rgba(253,246,227,0.92)',
            fontSize: 'clamp(0.72rem, 1.35vw, 0.92rem)',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            marginBottom: 16,
            textShadow: '0 2px 12px rgba(0,0,0,0.55)',
          }}>
            Warehouse &amp; Distribution Management System
          </p>

          <div style={{
            display: 'flex',
            gap: 'clamp(14px, 2.8vw, 26px)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {['Real-time Updates', 'Installment Tracking', 'Role-based Access'].map(f => (
              <div
                key={f}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'rgba(253,246,227,0.88)',
                  fontSize: 'clamp(0.72rem, 1.15vw, 0.88rem)',
                  letterSpacing: '0.8px',
                  textShadow: '0 2px 10px rgba(0,0,0,0.55)',
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: 'rgba(0,0,0,0.18)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F5C842' }} />
                {f}
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          color: 'rgba(253,246,227,0.70)',
          fontSize: 12,
          letterSpacing: 2,
          textTransform: 'uppercase',
          textShadow: '0 2px 12px rgba(0,0,0,0.55)',
        }}>
          Scroll ↓
        </div>
      </section>

      {/* SECTION 2: Video (appears after scroll) */}
      <section style={{
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: '#000',
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '100vw',
          height: '56.25vw',
          minWidth: '177.77777778vh',
          minHeight: '100vh',
          transform: 'translate(-50%, -50%)',
        }}>
          <iframe
            width="100%"
            height="100%"
            src="https://www.youtube-nocookie.com/embed/dy70sTWgEMA?autoplay=1&loop=1&playlist=dy70sTWgEMA&mute=1&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1&playsinline=1&disablekb=1&fs=0&cc_load_policy=0&enablejsapi=0"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
              pointerEvents: 'none',
            }}
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen={false}
            title=""
            loading="lazy"
          />
        </div>
      </section>
    </div>
  );
}
