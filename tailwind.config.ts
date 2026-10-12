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
        // Northwind tokens — CSS variables in app/globals.css (themeable)
        paper:   'var(--paper)',
        'paper-2': 'var(--paper-2)',
        'paper-3': 'var(--paper-3)',
        surface:  'var(--surface)',
        ink:      'var(--ink)',
        'ink-2':  'var(--ink-2)',
        'ink-3':  'var(--ink-3)',
        'ink-4':  'var(--ink-4)',
        'surface-ink': 'var(--surface-ink)',
        rule:     'var(--rule)',
        'rule-soft': 'var(--rule-soft)',
        'nw-accent': 'var(--nw-accent)',
        'accent-tint': 'var(--accent-tint)',
        'on-fill': 'var(--on-fill)',
        rail:     'var(--rail)',
        'chart-1': 'var(--chart-1)',
        // Status
        ok:      'var(--ok)',
        warn:    'var(--warn)',
        risk:    'var(--risk)',
        'ok-tint': 'var(--ok-tint)',
        'warn-tint': 'var(--warn-tint)',
        'risk-tint': 'var(--risk-tint)',
        'ok-line': 'var(--ok-line)',
        'warn-line': 'var(--warn-line)',
        'risk-line': 'var(--risk-line)',
        'ok-ink': 'var(--ok-ink)',
        'warn-ink': 'var(--warn-ink)',
        'risk-ink': 'var(--risk-ink)',
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
