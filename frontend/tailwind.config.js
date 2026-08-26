/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0a0a0b',
        panel: '#111214',
        line: 'rgba(255,255,255,0.09)',
        muted: '#8b929e',
        emerald: {
          DEFAULT: '#10b981',
          soft: '#0d2d24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.85rem',
      },
      boxShadow: {
        glow: '0 0 36px rgba(16,185,129,0.08)',
      },
    },
  },
  plugins: [],
}
