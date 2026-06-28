/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        paper: 'oklch(98.5% 0.003 280)',    // body bg — neutral near-white
        paper2: 'oklch(95% 0.003 280)',     // input surfaces
        paper3: 'oklch(89% 0.003 280)',     // muted elements on cards (tracks, badges)
        ink: 'oklch(14% 0.005 280)',        // #18181B primary text
        ink2: 'oklch(52% 0.009 265)',       // #6B7280 secondary text
        ink3: 'oklch(68% 0.006 265)',       // #9CA3AF metadata text
        hairline: 'oklch(86.5% 0.005 280)', // #D4D4D8 border
        night: 'oklch(14% 0.006 270)',
        night2: 'oklch(18% 0.008 270)',
        night3: 'oklch(23% 0.01 270)',
        night4: 'oklch(28% 0.012 270)',
        mist: 'oklch(73% 0.007 270)',       // dark mode secondary text
        mist2: 'oklch(57% 0.005 270)',      // dark mode metadata text
        accent: 'oklch(60% 0.2 290)',
        accent2: 'oklch(72% 0.13 290)',
        accent3: 'oklch(96% 0.03 290)',
        stuck: 'oklch(72% 0.16 55)',
        stuckBg: 'oklch(96% 0.04 65)',
        stuckDk: 'oklch(28% 0.06 55)',
        shaky: 'oklch(63% 0.14 235)',
        shakyBg: 'oklch(96% 0.03 235)',
        shakyDk: 'oklch(28% 0.07 235)',
        fluent: 'oklch(60% 0.15 150)',
        fluentBg: 'oklch(96% 0.04 150)',
        fluentDk: 'oklch(26% 0.06 150)',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.08)',
        pop: '0 16px 48px -8px rgba(20,18,30,0.22), 0 2px 8px rgba(20,18,30,0.08)',
        ring: '0 0 0 4px oklch(60% 0.2 290 / 0.18)',
        glow: '0 0 24px oklch(60% 0.2 290 / 0.35)',
        'glow-sm': '0 0 12px oklch(60% 0.2 290 / 0.25)',
        'card-dark': '0 1px 3px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.2)',
      },
      borderRadius: { xl2: '18px', xl3: '22px' },
    },
  },
  plugins: [],
};
