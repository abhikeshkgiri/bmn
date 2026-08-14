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
        /* BookMyNai Brand Colors */
        'brand-black': '#111111',
        'brand-pink': '#FF2D7A',
        'brand-pink-hover': '#E91E63',
        'brand-white': '#FFFFFF',

        /* Pink Scale */
        pink: {
          50: '#FFF1F6',
          100: '#FFE4EE',
          200: '#FFC9DC',
          300: '#FFA3C2',
          400: '#FF6F9F',
          500: '#FF2D7A',
          600: '#E91E63',
          700: '#C2185B',
          800: '#AD1457',
          900: '#880E4F',
          950: '#56002F',
        },

        /* Neutral Scale */
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0A0A0A',
        },

        /* Semantic Colors */
        success: {
          50: '#F0FDF4',
          500: '#16A34A',
          600: '#15803D',
          700: '#15803D',
        },
        warning: {
          50: '#FFFBEB',
          500: '#F59E0B',
          600: '#B45309',
          700: '#B45309',
        },
        error: {
          50: '#FEF2F2',
          500: '#DC2626',
          600: '#B91C1C',
          700: '#B91C1C',
        },
        info: {
          50: '#EFF6FF',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1D4ED8',
        },
      },
      backgroundColor: {
        'bookmynai-bg': '#FFFFFF',
        'bookmynai-bg-secondary': '#FAFAFA',
        'bookmynai-bg-soft': '#F8F8FA',
        'bookmynai-bg-pink': '#FFF1F6',
      },
      textColor: {
        'bookmynai-primary': '#111111',
        'bookmynai-secondary': '#525252',
        'bookmynai-muted': '#737373',
        'bookmynai-disabled': '#A3A3A3',
      },
      borderColor: {
        'bookmynai': '#E5E5E5',
        'bookmynai-light': '#F0F0F0',
        'bookmynai-strong': '#D4D4D4',
      },
      boxShadow: {
        'bookmynai-sm': '0 1px 2px rgba(0,0,0,0.05)',
        'bookmynai-md': '0 4px 12px rgba(0,0,0,0.08)',
        'bookmynai-lg': '0 10px 30px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'bookmynai-sm': '0.375rem', /* rounded-md */
        'bookmynai-md': '0.5rem', /* rounded-lg */
        'bookmynai-lg': '0.75rem', /* rounded-xl */
        'bookmynai-xl': '1rem', /* rounded-2xl */
        'bookmynai-2xl': '1.5rem', /* rounded-3xl */
      },
    },
  },
  plugins: [],
};

export default config;
