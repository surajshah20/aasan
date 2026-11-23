/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0a0b10',
        surface: '#12141c',
        'surface-elevated': '#181b26',
        'surface-border': '#252a3b',
        crimson: '#dc143c',
        'crimson-dark': '#9b0b28',
        'crimson-glow': 'rgba(220, 20, 60, 0.4)',
        nepalblue: '#003893',
        'nepalblue-glow': 'rgba(0, 56, 147, 0.4)',
        text: '#f4f1ea',
        muted: '#9aa0ad',
      },
      fontFamily: {
        sans: ['"Noto Sans Devanagari"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-crimson': '0 0 24px rgba(220, 20, 60, 0.35)',
        'glow-blue': '0 0 24px rgba(0, 56, 147, 0.35)',
        'glow-subtle': '0 0 30px rgba(255, 255, 255, 0.05)',
      },
      borderRadius: {
        'card': '16px',
        'pill': '9999px',
      }
    },
  },
  plugins: [],
}
