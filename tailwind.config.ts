import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#16201c",
        moss: "#486a55",
        river: "#27667b",
        signal: "#d96c3d",
        paper: "#f7f4ee"
      },
      boxShadow: {
        soft: "0 16px 48px rgba(22, 32, 28, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
