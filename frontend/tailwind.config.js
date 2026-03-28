/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        board: {
          paper: '#fffdf7',
          line: '#d7c9ad',
          bg: '#f5efe1'
        }
      },
      boxShadow: {
        panel: '0 18px 36px rgba(55, 33, 12, 0.14)'
      },
      keyframes: {
        floatIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        floatIn: 'floatIn 420ms ease-out both'
      }
    }
  },
  plugins: []
};
