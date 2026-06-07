/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fff0f3',
          100: '#ffe0e8',
          200: '#ffc6d5',
          300: '#ff9ab4',
          400: '#ff6090',
          500: '#ff2d6f',
          600: '#f00055',
          700: '#cc0047',
          800: '#a80040',
          900: '#8f003b',
        },
        secondary: {
          50:  '#f5f0ff',
          100: '#ede0ff',
          200: '#dcc5ff',
          300: '#c49bff',
          400: '#a866ff',
          500: '#8f38ff',
          600: '#7c18f7',
          700: '#6a0fd3',
          800: '#5810ac',
          900: '#47108c',
        },
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateX(-50%) translateY(100%)' },
          '100%': { transform: 'translateX(-50%) translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
