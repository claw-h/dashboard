/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        tui: {
          bg: '#0F0F11',
          panel: '#18181B',
          border: '#27272A',
          text: '#F4F4F5',
          muted: '#A1A1AA',
          dim: '#71717A',
          clay: '#E05C36',
          orange: '#EA580C',
        },
      },
      fontFamily: {
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"SF Mono"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
};
