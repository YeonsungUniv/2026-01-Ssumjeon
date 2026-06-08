/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 메인: 소프트 코랄핑크
        primary: {
          50:  '#fff2f3',
          100: '#ffe3e6',
          200: '#ffccd2',
          300: '#ffa8b2',
          400: '#ff8c99',
          500: '#ff7a8a',
          600: '#f25868',
          700: '#d63f50',
          800: '#b23142',
          900: '#932a38',
        },
        // 포인트: 피치/살구
        secondary: {
          50:  '#fff7f0',
          100: '#ffecd9',
          200: '#ffd6b0',
          300: '#ffc187',
          400: '#ffb27a',
          500: '#ffa05c',
          600: '#f5872f',
          700: '#cc6e26',
          800: '#a35820',
          900: '#87481d',
        },
        // 배경: 웜 아이보리
        cream: {
          DEFAULT: '#fdf6f1',
          100: '#f8efe7',
          200: '#f0e2d5',
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
