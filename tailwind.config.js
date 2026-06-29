/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        c3: {
          bg: '#0a0e17',
          surface: '#111827',
          border: '#1f2937',
          accent: '#3b82f6',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          text: '#e5e7eb',
          muted: '#6b7280',
        },
      },
    },
  },
  plugins: [],
};
