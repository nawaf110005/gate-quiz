/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gate: {
          bg: '#0a0012',
          purple: '#6b21a8',
          violet: '#7c3aed',
          cyan: '#06b6d4',
          blue: '#1d4ed8',
          gold: '#f59e0b',
          danger: '#ef4444',
          success: '#22d3ee',
        },
      },
      fontFamily: {
        arabic: ['Cairo', 'Tajawal', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'portal-spin': 'portalSpin 8s linear infinite',
        'orb-float': 'orbFloat 3s ease-in-out infinite',
        'reveal': 'reveal 0.6s ease-out forwards',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(6,182,212,0.5)' },
          '50%': { boxShadow: '0 0 60px rgba(6,182,212,1), 0 0 120px rgba(6,182,212,0.3)' },
        },
        portalSpin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        orbFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        reveal: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'gate-gradient': 'radial-gradient(ellipse at center, #1a0030 0%, #0a0012 70%)',
        'portal-a': 'radial-gradient(circle, #0ff 0%, #0080ff 60%, transparent 100%)',
        'portal-b': 'radial-gradient(circle, #a855f7 0%, #6b21a8 60%, transparent 100%)',
      },
    },
  },
  plugins: [],
};
