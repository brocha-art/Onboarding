import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './styles/**/*.css',
  ],
  theme: {
    extend: {
      colors: {
        deep: '#100538',
        deep2: '#1a0a4a',
        deep3: '#0d0430',
        purple: '#7344E0',
        yellow: '#FDFF84',
      },
    },
  },
  plugins: [],
}

export default config
