// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1B2A56',
          dark: '#142048',
          light: '#2C3F76',
          ink: '#0F1A3A',
        },
        kraft: {
          DEFAULT: '#C09569',
          dark: '#A87C4F',
          light: '#D6AC85',
          tape: '#E0C29B',
          shadow: '#7B5A36',
        },
        wood: {
          DEFAULT: '#B98E4F',
          dark: '#8E6936',
          light: '#D2A86C',
        },
        canvas: {
          DEFAULT: '#F4F1EA',
          card: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 26, 58, 0.06), 0 4px 12px rgba(15, 26, 58, 0.06)',
      },
    },
  },
  plugins: [],
};
