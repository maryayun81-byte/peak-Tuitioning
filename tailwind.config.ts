import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
        nunito: ['Nunito', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        rubik: ['Rubik', 'sans-serif'],
        'work-sans': ['Work Sans', 'sans-serif'],
        playfair: ['Playfair Display', 'serif'],
        quicksand: ['Quicksand', 'sans-serif'],
        cabin: ['Cabin', 'sans-serif'],
        'space-grotesk': ['Space Grotesk', 'sans-serif'],
        'ibm-plex': ['IBM Plex Sans', 'sans-serif'],
        'nunito-sans': ['Nunito Sans', 'sans-serif'],
        'dm-sans': ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Midnight Scholar (default dark)
        'ms-bg': '#0B0F1A',
        'ms-card': '#121826',
        'ms-primary': '#4F8CFF',
        'ms-accent': '#22D3EE',
        'ms-text': '#E5E7EB',
        
        // Theme mapped colors from CSS variables
        'theme-bg': 'var(--bg)',
        'theme-card': 'var(--card)',
        'theme-card-border': 'var(--card-border)',
        'theme-primary': 'var(--primary)',
        'theme-primary-hover': 'var(--primary-hover)',
        'theme-accent': 'var(--accent)',
        'theme-text': 'var(--text)',
        'theme-text-muted': 'var(--text-muted)',
        'theme-sidebar': 'var(--sidebar)',
        'theme-input': 'var(--input)',

        // Peak Academic System colors
        peak: {
          void: '#FFFFFF',
          deep: '#F8FAFC',
          surface: '#FFFFFF',
          elevated: '#F1F5F9',
          border: '#E2E8F0',
          'border-light': '#CBD5E1',
          // Primary accent — Peak Green (diagnosis, progress, success)
          green: '#16A34A',
          'green-light': '#22C55E',
          'green-dim': '#15803D',
          'green-glow': 'rgba(22, 163, 74, 0.1)',
          // Secondary accent — Signal Blue (data, precision, intelligence)
          blue: '#2563EB',
          'blue-light': '#3B82F6',
          'blue-dim': '#1D4ED8',
          'blue-glow': 'rgba(37, 99, 235, 0.1)',
          // Tertiary — Diagnostic Cyan (scanning, analysis)
          cyan: '#0891B2',
          'cyan-light': '#06B6D4',
          'cyan-dim': '#0E7490',
          'cyan-glow': 'rgba(8, 145, 178, 0.1)',
          // Warning / attention
          amber: '#D97706',
          'amber-light': '#F59E0B',
          'amber-dim': '#B45309',
          // Error / leak detected
          red: '#DC2626',
          'red-light': '#EF4444',
          'red-dim': '#B91C1C',
          'red-glow': 'rgba(220, 38, 38, 0.1)',
          // Neutral text
          text: '#0F172A',
          'text-muted': '#475569',
          'text-dim': '#64748B',
          'text-faint': '#94A3B8',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
        'float': 'float 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
        'vertical-rail': 'verticalRail 1s ease-in-out infinite',
        'vertical-rail-delayed': 'verticalRail 1s ease-in-out 0.2s infinite',
        'vertical-rail-slow': 'verticalRail 1.2s ease-in-out 0.4s infinite',
        // Peak-specific animations
        'diagnostic-scan': 'diagnosticScan 2s ease-in-out infinite',
        'trajectory-draw': 'trajectoryDraw 1.5s ease-out forwards',
        'node-pulse': 'nodePulse 2s ease-in-out infinite',
        'signal-blink': 'signalBlink 1.5s ease-in-out infinite',
        'evidence-reveal': 'evidenceReveal 0.6s ease-out forwards',
        'milestone-reach': 'milestoneReach 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'paper-float': 'paperFloat 6s ease-in-out infinite',
        'ink-spread': 'inkSpread 0.4s ease-out forwards',
        'counter-roll': 'counterRoll 1.2s ease-out forwards',
        'gradient-shift': 'gradientShift 8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(79,140,255,0.3)' },
          '50%': { boxShadow: '0 0 30px rgba(79,140,255,0.7)' },
        },
        verticalRail: {
          '0%, 100%': { transform: 'scaleY(0.4)', opacity: '0.4' },
          '50%': { transform: 'scaleY(1)', opacity: '1' },
        },
        // Peak Academic System keyframes
        diagnosticScan: {
          '0%, 100%': { opacity: '0.4', transform: 'scaleX(0.98)' },
          '50%': { opacity: '1', transform: 'scaleX(1)' },
        },
        trajectoryDraw: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        nodePulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(126, 217, 87, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(126, 217, 87, 0)' },
        },
        signalBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        evidenceReveal: {
          '0%': { opacity: '0', transform: 'translateY(10px) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        milestoneReach: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        paperFloat: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '33%': { transform: 'translateY(-8px) rotate(0.5deg)' },
          '66%': { transform: 'translateY(-4px) rotate(-0.3deg)' },
        },
        inkSpread: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
        counterRoll: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundImage: {
        'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
        'hero-gradient': 'radial-gradient(ellipse at top, #1a2744 0%, #0B0F1A 60%)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
        // Peak gradients
        'peak-diagnostic': 'linear-gradient(135deg, #0A0F1C 0%, #111827 50%, #0A0F1C 100%)',
        'peak-trajectory': 'linear-gradient(180deg, rgba(126, 217, 87, 0.08) 0%, rgba(79, 140, 255, 0.08) 50%, rgba(34, 211, 238, 0.08) 100%)',
        'peak-surface': 'linear-gradient(180deg, #0A0F1C 0%, #111827 100%)',
        'peak-glow-green': 'radial-gradient(circle, rgba(126, 217, 87, 0.12) 0%, transparent 70%)',
        'peak-glow-blue': 'radial-gradient(circle, rgba(79, 140, 255, 0.12) 0%, transparent 70%)',
        'peak-glow-cyan': 'radial-gradient(circle, rgba(34, 211, 238, 0.12) 0%, transparent 70%)',
        'peak-mesh': 'radial-gradient(at 40% 20%, rgba(126, 217, 87, 0.06) 0px, transparent 50%), radial-gradient(at 80% 0%, rgba(79, 140, 255, 0.06) 0px, transparent 50%), radial-gradient(at 0% 50%, rgba(34, 211, 238, 0.04) 0px, transparent 50%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'peak-sm': '0 1px 3px rgba(0, 0, 0, 0.3)',
        'peak-md': '0 4px 12px rgba(0, 0, 0, 0.4)',
        'peak-lg': '0 12px 40px rgba(0, 0, 0, 0.5)',
        'peak-glow-green': '0 0 30px rgba(126, 217, 87, 0.2)',
        'peak-glow-blue': '0 0 30px rgba(79, 140, 255, 0.2)',
        'peak-glow-cyan': '0 0 30px rgba(34, 211, 238, 0.2)',
      },
    },
  },
  plugins: [],
}

export default config
