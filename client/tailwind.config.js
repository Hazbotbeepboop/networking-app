/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1C2B3A',
          light: '#243647',
        },
        gold: {
          DEFAULT: '#B08D57',
          light: '#F5EDD8',
          muted: '#E8D5A3',
        },
      },
    },
  },
  plugins: [],
}