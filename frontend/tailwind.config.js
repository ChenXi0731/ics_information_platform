/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'morandi-bg': '#f2f1ef',
        'morandi-surface': '#ffffff',
        'morandi-primary': '#6f8396',
        'morandi-secondary': '#a79c93',
        'morandi-accent': '#8a9a86',
        'morandi-text': '#4b4e53',
      }
    },
  },
  plugins: [],
}