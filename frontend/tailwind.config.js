/** @type {import('tailwindcss').Config} */

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '24px',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Base / Background
        canvas: 'var(--bg-canvas)',
        subtle: 'var(--bg-subtle)',
        'surface-1': 'var(--bg-surface-1)',
        'surface-2': 'var(--bg-surface-2)',
        'surface-3': 'var(--bg-surface-3)',
        elevated: 'var(--bg-elevated)',
        overlay: 'var(--bg-overlay)',

        // Borders
        'border-subtle': 'var(--border-subtle)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',

        // Text
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        quaternary: 'var(--text-quaternary)',
        disabled: 'var(--text-disabled)',

        // Accent
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          active: 'var(--accent-primary-active)',
          'soft-bg': 'var(--accent-soft-bg)',
          'soft-border': 'var(--accent-soft-border)',
          'soft-text': 'var(--accent-soft-text)',
          // Shadcn mappings
          foreground: '#FFFFFF',
        },

        // Semantic
        success: {
          DEFAULT: 'var(--success)',
          'soft-bg': 'var(--success-soft-bg)',
          'soft-text': 'var(--success-soft-text)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          'soft-bg': 'var(--warning-soft-bg)',
          'soft-text': 'var(--warning-soft-text)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          'soft-bg': 'var(--danger-soft-bg)',
          'soft-text': 'var(--danger-soft-text)',
        },
        info: {
          DEFAULT: 'var(--info)',
          'soft-bg': 'var(--info-soft-bg)',
          'soft-text': 'var(--info-soft-text)',
        },

        // Agent specific
        agent: {
          'user-bubble': 'var(--agent-user-bubble)',
          'assistant-bubble': 'var(--agent-assistant-bubble)',
          'tool-bg': 'var(--agent-tool-bg)',
          'tool-border': 'var(--agent-tool-border)',
        },
        run: {
          pending: 'var(--run-pending)',
          running: 'var(--run-running)',
          success: 'var(--run-success)',
          failed: 'var(--run-failed)',
          paused: 'var(--run-paused)',
        },

        // Glass
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
          highlight: 'var(--glass-highlight)',
        },

        // Legacy Shadcn fallback mapping
        background: 'var(--bg-canvas)',
        foreground: 'var(--text-primary)',
        card: {
          DEFAULT: 'var(--bg-surface-2)',
          foreground: 'var(--text-primary)',
        },
        popover: {
          DEFAULT: 'var(--bg-elevated)',
          foreground: 'var(--text-primary)',
        },
        muted: {
          DEFAULT: 'var(--bg-surface-1)',
          foreground: 'var(--text-tertiary)',
        },
        destructive: {
          DEFAULT: 'var(--danger)',
          foreground: '#FFFFFF',
        },
        border: 'var(--border-default)',
        input: 'var(--border-default)',
        ring: 'var(--accent-primary)',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        '32': '128px',
        // Layout specific spacings
        'sidebar-w': '280px',
        'sidebar-collapsed-w': '72px',
        'topbar-h': '64px',
        'touch-target': '44px',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        '1': 'var(--shadow-1)',
        '2': 'var(--shadow-2)',
        '3': 'var(--shadow-3)',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Inter"',
          '"PingFang SC"',
          '"Helvetica Neue"',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          '"SFMono-Regular"',
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      fontSize: {
        'display-l': ['36px', { lineHeight: '44px', fontWeight: '600' }],
        'display-m': ['30px', { lineHeight: '38px', fontWeight: '600' }],
        'title-1': ['24px', { lineHeight: '32px', fontWeight: '600' }],
        'title-2': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'title-3': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        'body-l': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-m': ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'body-s': ['13px', { lineHeight: '20px', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '18px', fontWeight: '400' }],
        micro: ['11px', { lineHeight: '16px', fontWeight: '500' }],
        code: ['12px', { lineHeight: '18px', fontWeight: '500' }],
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '180ms',
        slow: '240ms',
      },
      backdropBlur: {
        glass: 'var(--glass-blur)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/typography'),
  ],
};
