import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.5rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // Palette R.A.G.E
        void: '#000000',
        abyss: '#0D0D0D',
        carbon: '#141414',
        steel: '#1E1E1E',
        rage: {
          red: '#FF2A2A',
          orange: '#FF6B00',
          yellow: '#FFC700',
        },
        // Tokens shadcn/ui (HSL via variables CSS)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
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
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Impact', 'sans-serif'],
      },
      backgroundImage: {
        'rage-gradient':
          'linear-gradient(120deg, #FF2A2A 0%, #FF6B00 50%, #FFC700 100%)',
        'rage-gradient-soft':
          'linear-gradient(120deg, rgba(255,42,42,.18) 0%, rgba(255,107,0,.18) 50%, rgba(255,199,0,.18) 100%)',
        'grid-dark':
          'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
      },
      boxShadow: {
        neon: '0 0 12px rgba(255,42,42,.45), 0 0 40px rgba(255,107,0,.22)',
        'neon-lg':
          '0 0 24px rgba(255,42,42,.55), 0 0 80px rgba(255,107,0,.30), 0 0 120px rgba(255,199,0,.12)',
        inset: 'inset 0 1px 0 rgba(255,255,255,.06)',
      },
      keyframes: {
        'neon-pulse': {
          '0%, 100%': {
            textShadow:
              '0 0 8px rgba(255,42,42,.8), 0 0 24px rgba(255,107,0,.55), 0 0 48px rgba(255,199,0,.25)',
          },
          '50%': {
            textShadow:
              '0 0 14px rgba(255,42,42,1), 0 0 44px rgba(255,107,0,.8), 0 0 90px rgba(255,199,0,.45)',
          },
        },
        'glitch-x': {
          '0%, 92%, 100%': { transform: 'translate(0)' },
          '93%': { transform: 'translate(-3px, 1px)' },
          '95%': { transform: 'translate(3px, -1px)' },
          '97%': { transform: 'translate(-2px, -2px)' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(400%)' },
        },
        // scaleX plutôt que width : composé sur le GPU, sans recalcul de
        // mise en page à chaque frame.
        'loader-bar': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        'loader-halo': {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.65' },
        },
        'loader-in': {
          '0%': { opacity: '0', transform: 'scale(.92) translateY(10px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'loader-shine': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(400%)' },
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
        'neon-pulse': 'neon-pulse 2.8s ease-in-out infinite',
        'glitch-x': 'glitch-x 5s steps(1) infinite',
        'gradient-pan': 'gradient-pan 6s ease infinite',
        'scan-line': 'scan-line 5s linear infinite',
        'loader-bar': 'loader-bar 1.1s cubic-bezier(.25,.1,.25,1) forwards',
        'loader-halo': 'loader-halo 1.6s ease-in-out infinite',
        'loader-in': 'loader-in .55s cubic-bezier(.16,1,.3,1) both',
        'loader-shine': 'loader-shine 1.3s ease-in-out infinite',
        'accordion-down': 'accordion-down .2s ease-out',
        'accordion-up': 'accordion-up .2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
