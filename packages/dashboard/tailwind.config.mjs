/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        axon: {
          900: "#0a0f1e",
          800: "#111827",
          700: "#1f2937",
          accent: "#6366f1",
          green: "#10b981",
          red: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
