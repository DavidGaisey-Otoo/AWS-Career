/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand
        aws: {
          orange: '#FF9900',
          orangeDark: '#E68A00',
          orangeLight: '#FFB84D',
        },
        electric: '#00D4FF',
        // Semantic
        success: '#00C853',
        warning: '#FFD600',
        danger: '#FF4444',
        // Dark surfaces
        ink: {
          950: '#0A0E1A',
          900: '#111827',
          800: '#1A2235',
          700: '#222B40',
          600: '#2D3748',
        },
        // Light surfaces
        paper: {
          50: '#F8FAFC',
          100: '#FFFFFF',
        },
        slate: {
          850: '#0F172A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-orange': '0 0 24px rgba(255, 153, 0, 0.45)',
        'glow-blue': '0 0 24px rgba(0, 212, 255, 0.45)',
        'neu-dark': '6px 6px 16px rgba(0,0,0,0.45), -6px -6px 16px rgba(255,255,255,0.03)',
        'neu-light': '6px 6px 16px rgba(15,23,42,0.08), -6px -6px 16px rgba(255,255,255,0.9)',
        'soft-xl': '0 20px 60px -20px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        'gradient-aws': 'linear-gradient(135deg, #FF9900 0%, #FFB84D 50%, #00D4FF 100%)',
        'gradient-mesh': 'radial-gradient(at 0% 0%, rgba(255,153,0,0.18) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(0,212,255,0.15) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(124,58,237,0.18) 0px, transparent 50%)',
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'fade-in-up': {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255, 153, 0, 0.55)' },
          '50%': { boxShadow: '0 0 0 12px rgba(255, 153, 0, 0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-468px 0' },
          '100%': { backgroundPosition: '468px 0' },
        },
        'mesh-shift': {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%,-2%,0) scale(1.05)' },
        },
        'ripple': {
          '0%': { transform: 'scale(0)', opacity: 0.6 },
          '100%': { transform: 'scale(4)', opacity: 0 },
        },
        'float': {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 250ms ease-out both',
        'fade-in-up': 'fade-in-up 350ms ease-out both',
        'pulse-glow': 'pulse-glow 2s ease-out infinite',
        'shimmer': 'shimmer 1.4s linear infinite',
        'mesh-shift': 'mesh-shift 18s ease-in-out infinite',
        'ripple': 'ripple 600ms ease-out',
        'float': 'float 4s ease-in-out infinite',
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
};
