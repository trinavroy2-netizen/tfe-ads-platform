/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        panel: "#12151c",
        panelLight: "#1a1f29",
        accent: "#2f6fed",
      },
    },
  },
  plugins: [],
};
