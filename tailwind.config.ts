import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        flame: {
          500: '#FF5C1A',
          600: '#E04A0F',
          700: '#C03D0A',
        },
        heat: {
          400: '#FF9B3D',
          500: '#FF8419',
          600: '#E86F08',
        },
        ember: {
          400: '#FFD166',
          500: '#FFC233',
          600: '#F5AD00',
        },
        char: {
          900: '#0D0D0D',
          800: '#1A1A1A',
          700: '#2A2A2A',
          600: '#3D3D3D',
          500: '#555555',
        },
        ash: {
          100: '#FAF7F5',
          200: '#F0EBE7',
          300: '#E0D9D3',
          400: '#BFB5AC',
        },
        success: { DEFAULT: '#2ECC71', dark: '#1FA855' },
        danger: { DEFAULT: '#E74C3C', dark: '#C0392B' },
        info: { DEFAULT: '#3498DB', dark: '#2980B9' },
      },
      fontFamily: {
        display: ['Archivo Black', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.8rem', { lineHeight: '1.25rem' }],
        'base': ['0.9rem', { lineHeight: '1.5rem' }],
        'lg': ['1rem', { lineHeight: '1.75rem' }],
        'xl': ['1.15rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['2rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.5rem', { lineHeight: '2.5rem' }],
        '5xl': ['3.5rem', { lineHeight: '1' }],
      },
      borderRadius: {
        'card': '10px',
        'btn': '8px',
        'pill': '9999px',
      },
      boxShadow: {
        'glow-flame': '0 0 80px rgba(255, 92, 26, 0.15)',
        'glow-sm': '0 4px 20px rgba(255, 92, 26, 0.1)',
        'glow-md': '0 4px 30px rgba(255, 92, 26, 0.2)',
        'card': '0 2px 8px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 8px 30px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'flame-gradient': 'linear-gradient(135deg, #FF5C1A, #E04A0F)',
        'heat-gradient': 'linear-gradient(135deg, #FF9B3D, #FF5C1A)',
        'ember-gradient': 'linear-gradient(135deg, #FFD166, #FF8419)',
        'hero-glow': 'radial-gradient(circle, rgba(255,92,26,0.25) 0%, rgba(255,92,26,0.05) 40%, transparent 70%)',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-flame': 'pulse-flame 1.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.3s ease',
        'slide-in-right': 'slideInRight 0.3s ease',
      },
      keyframes: {
        'pulse-flame': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
