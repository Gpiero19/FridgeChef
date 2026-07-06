import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#faf9f6",
        surface: "#ffffff",
        "surface-sunken": "#f3f4f0",
        fg: "#171915",
        "fg-muted": "#5b6158",
        "fg-faint": "#8b9186",
        border: {
          DEFAULT: "#dee1d8",
          soft: "#e9ebe5",
        },
        forest: {
          50: "#f2f8f5",
          100: "#e0efe7",
          200: "#bfddcb",
          300: "#94c4a8",
          600: "#2d6a4f",
          700: "#235642",
          900: "#15332a",
        },
        amber: {
          50: "#fdf6e9",
          700: "#92610b",
        },
        red: {
          50: "#fcefee",
          600: "#c23b36",
        },
      },
      borderRadius: {
        DEFAULT: "7px",
        lg: "10px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
