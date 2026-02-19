/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // USA Wrap Co brand palette — mirrors the HTML app
        bg:       '#0d0f14',
        surface:  '#151820',
        surface2: '#1c202b',
        border:   '#2a2f3d',
        accent:   '#4f7fff',
        green:    '#22c07a',
        cyan:     '#22d3ee',
        amber:    '#f59e0b',
        purple:   '#8b5cf6',
        red:      '#f25a5a',
        text1:    '#f1f5f9',
        text2:    '#94a3b8',
        text3:    '#475569',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Barlow Condensed', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
