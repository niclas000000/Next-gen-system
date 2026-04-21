import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Inter Tight', 'Inter', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        // Northwind tokens
        paper:   '#FAFAF7',
        'paper-2': '#F2F1EC',
        'paper-3': '#E8E6DF',
        surface:  '#FFFFFF',
        ink:      '#111111',
        'ink-2':  '#2D2D2D',
        'ink-3':  '#54524D',
        'ink-4':  '#8A877F',
        'surface-ink': '#121212',
        // Status
        ok:      'oklch(0.55 0.12 145)',
        warn:    'oklch(0.68 0.14 70)',
        risk:    'oklch(0.56 0.17 25)',
        // Shadcn/ui compatibility (kept for library components)
        border:  'hsl(var(--border))',
        input:   'hsl(var(--input))',
        ring:    'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        DEFAULT: '2px',
        sm:  '2px',
        md:  '2px',
        lg:  '2px',
        xl:  '4px',
        '2xl': '4px',
        '3xl': '6px',
        full: '9999px',
      },
    },
  },
  plugins: [],
}

export default config
