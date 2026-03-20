import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#f7f1e8",
        stone: "#c8b39e",
        ink: "#20150f",
        primary: "#8b4f34",
        "primary-dark": "#5e2f1e",
        "primary-light": "#bb7d58",
        accent: "#d5a46a",
        pine: "#30443a"
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        display: ["var(--font-display)"]
      },
      boxShadow: {
        soft: "0 30px 80px -45px rgba(32, 21, 15, 0.35)"
      },
      backgroundImage: {
        parchment: "linear-gradient(135deg, rgba(255,255,255,0.5), rgba(213,164,106,0.08))"
      }
    }
  },
  plugins: []
};

export default config;
