import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Pretendard Variable"',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          '"Helvetica Neue"',
          '"Segoe UI"',
          '"Apple SD Gothic Neo"',
          '"Noto Sans KR"',
          '"Malgun Gothic"',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          'sans-serif',
        ],
      },
      colors: {
        primary: {
          DEFAULT: '#3B82F6',
          dark: '#2563EB',
          light: '#DBEAFE',
        },
        safe: {
          DEFAULT: '#10B981',
          bg: '#D1FAE5',
          text: '#065F46',
        },
        caution: {
          DEFAULT: '#F59E0B',
          bg: '#FEF3C7',
          text: '#92400E',
        },
        danger: {
          DEFAULT: '#EF4444',
          bg: '#FEE2E2',
          text: '#991B1B',
        },
        neutral: {
          900: '#111827',
          600: '#4B5563',
          400: '#9CA3AF',
          200: '#E5E7EB',
          50: '#F9FAFB',
          white: '#FFFFFF',
        },
        accent: {
          'warm-beige': '#FDF6EC',
          'soft-teal': '#5EEAD4',
          'soft-purple': '#A78BFA',
          'soft-blue': '#93C5FD',
        },
        'med-tag': {
          'prescription-bg': '#DBEAFE',
          'prescription-text': '#2563EB',
          'otc-bg': '#EDE9FE',
          'otc-text': '#7C3AED',
          'supplement-bg': '#CCFBF1',
          'supplement-text': '#0D9488',
        },
      },
      fontSize: {
        h1: ['28px', { lineHeight: '1.3', fontWeight: '700' }],
        h2: ['22px', { lineHeight: '1.35', fontWeight: '600' }],
        h3: ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['16px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-bold': ['16px', { lineHeight: '1.6', fontWeight: '500' }],
        caption: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        small: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      borderRadius: {
        card: '16px',
        button: '12px',
        tag: '20px',
        input: '8px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
