/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dark: {
          DEFAULT: "#17324D",
          50: "#FFFFFF",
          100: "#F4FAFF",
          200: "#E6F3FC",
          300: "#C5E0F2",
        },
        accent: {
          green: "#3C8DDB",
          red: "#C95B5B",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
