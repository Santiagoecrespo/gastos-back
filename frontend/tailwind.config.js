/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: "#0B4F80",
          50: "#FFFFFF",
          100: "#F4FAFF",
          200: "#D9F0FF",
          300: "#9DD8FA",
        },
        accent: {
          green: "#008ED6",
          red: "#D84F5F",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
