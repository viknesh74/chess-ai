/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chess: {
          bg: '#121212',
          surface: '#1e1e1e',
          card: '#252525',
          border: '#333333',
          accent: '#81b64c', // classic chess green
          accentHover: '#95c65d',
          gold: '#eab308',
          danger: '#ef4444',
          darkSquare: '#739552',
          lightSquare: '#ebecd0',
          darkWood: '#b58863',
          lightWood: '#f0d9b5',
          darkClassic: '#8ca2ad',
          lightClassic: '#dee3e6',
          darkOcean: '#4b7399',
          lightOcean: '#eae9d2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
