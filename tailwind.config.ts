import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-playfair)', 'Georgia', 'serif'],
      },
      fontSize: {
        // Design system typography scale
        'hero': ['72px', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'hero-mobile': ['42px', { lineHeight: '1.1', letterSpacing: '-0.01em' }],
        'section': ['42px', { lineHeight: '1.15', letterSpacing: '-0.015em' }],
        'section-mobile': ['28px', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'product-title': ['18px', { lineHeight: '1.35' }],
        'body': ['16px', { lineHeight: '1.6' }],
        'label': ['13px', { lineHeight: '1.4' }],
        'label-sm': ['11px', { lineHeight: '1.3' }],
      },
      colors: {
        // ── Brand Primary ──
        brand: {
          DEFAULT: '#E4C765',
          dark: '#C9A844',
          light: '#F1DE9D',
          muted: '#F8EDCD',
          50: '#FDF9EF',
          100: '#FBF3DF',
        },
        // ── Background Surfaces ──
        warm: {
          bg: '#FFF9F6',
          card: '#F8F1EC',
          cream: '#FFF7ED',
        },
        // ── Text Ink ──
        ink: {
          DEFAULT: '#1E1E1E',
          muted: '#5C5C5C',
          light: '#8A8A8A',
          faint: '#B5B5B5',
        },
        // ── Functional ──
        success: '#5FA36A',
        // ── Backward Compatibility ──
        blush: {
          DEFAULT: '#E4C765',
          light: '#FBF3DF',
          dark: '#C9A844',
        },
        cream: {
          DEFAULT: '#FFF9F6',
          dark: '#F8F1EC',
        },
        charcoal: {
          DEFAULT: '#1E1E1E',
          light: '#5C5C5C',
        },
        gold: {
          DEFAULT: '#D4AF37',
          light: '#F0C559',
        },
        // ── shadcn/ui Compatibility ──
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      borderColor: {
        brand: 'rgba(228, 199, 101, 0.12)',
      },
      boxShadow: {
        'soft': '0 10px 30px rgba(0,0,0,0.04)',
        'soft-lg': '0 20px 50px rgba(0,0,0,0.06)',
        'soft-hover': '0 20px 50px rgba(228, 199, 101, 0.15)',
        // Legacy aliases
        'premium': '0 10px 30px rgba(0,0,0,0.04)',
        'premium-lg': '0 20px 50px rgba(0,0,0,0.06)',
        'premium-hover': '0 20px 50px rgba(228, 199, 101, 0.15)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(-5%)' },
          '50%': { transform: 'translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22,1,0.36,1)',
        'fade-in': 'fade-in 0.4s ease-out',
        'bounce-slow': 'bounce-slow 4s ease-in-out infinite',
        'float': 'float 5s ease-in-out infinite',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
