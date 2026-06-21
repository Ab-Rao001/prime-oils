/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0d2a14',
          light: '#1e4627',
          dark: '#0a170d'
        },
        gold: {
          DEFAULT: 'var(--color-gold)',
          light: 'var(--color-goldL)',
          dark: 'var(--accent-gold)',
          bg: 'var(--color-goldBg)',
          border: 'var(--color-goldBorder)'
        },
        surface: {
          DEFAULT: 'var(--color-card)',
          dark: 'var(--color-card)'
        },
        background: {
          DEFAULT: 'var(--color-bg)',
          dark: 'var(--color-bg)'
        },
        border: {
          DEFAULT: 'var(--color-border)',
          dark: 'var(--color-border)'
        },
        sidebar: {
          DEFAULT: 'var(--color-sb)',
          border: 'var(--color-sbBorder)'
        },
        card: {
          DEFAULT: 'var(--color-card)',
          hover: 'var(--color-card)'
        },
        bg: {
          DEFAULT: 'var(--color-bg)',
          dark: 'var(--color-bg)'
        },
        success: {
          DEFAULT: 'var(--color-success)',
          bg: 'var(--color-sBg)',
        },
        danger: {
          DEFAULT: 'var(--color-danger)',
          bg: 'var(--color-dBg)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          bg: 'var(--color-wBg)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          bg: 'var(--color-iBg)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          dark: 'var(--color-muted)',
          foreground: 'var(--color-muted)'
        },
        text: {
          DEFAULT: 'var(--color-text)',
          dark: 'var(--color-text)'
        },
        foreground: {
          DEFAULT: 'var(--color-text)'
        }
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 12px -2px rgba(13, 42, 20, 0.05), 0 2px 4px -1px rgba(13, 42, 20, 0.03)',
        'lg': '0 10px 25px -5px rgba(13, 42, 20, 0.08), 0 8px 10px -6px rgba(13, 42, 20, 0.04)',
      }
    },
  },
  plugins: [],
}
