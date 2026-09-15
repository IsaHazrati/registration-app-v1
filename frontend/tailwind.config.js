/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazir', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
