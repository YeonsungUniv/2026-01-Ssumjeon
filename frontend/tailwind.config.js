/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 메인: 딥네이비 (프리미엄·신뢰 톤)
        primary: {
          50:  '#eef1f7',
          100: '#d5dcea',
          200: '#aebed6',
          300: '#7e95ba',
          400: '#4f6c99',
          500: '#2c4a78',
          600: '#1f3a63',
          700: '#1a2b4a',
          800: '#14203a',
          900: '#0e1729',
        },
        // 포인트: 골드
        secondary: {
          50:  '#fbf7ee',
          100: '#f4ead0',
          200: '#e9d5a3',
          300: '#dcbd74',
          400: '#cfa850',
          500: '#c9a86a',
          600: '#a8853f',
          700: '#876a32',
          800: '#6e5629',
          900: '#5c4824',
        },
        // 배경: 크림/아이보리
        cream: {
          DEFAULT: '#faf7f2',
          100: '#f5f0e8',
          200: '#ece3d5',
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
