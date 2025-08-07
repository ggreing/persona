// tailwind.config.js
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0c4da2",         // 이미 있던 primary
        secondary: "#f5f7fa",       // ➕ 추가! ← bg-secondary
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
  plugins: [require("@tailwindcss/typography")],
};
