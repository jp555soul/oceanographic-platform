/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'pulse-delay-100': 'pulse 1s infinite 0.1s',
        'pulse-delay-200': 'pulse 1s infinite 0.2s',
      }
    }
  },
  plugins: [],
}