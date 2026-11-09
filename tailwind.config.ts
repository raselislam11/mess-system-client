import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#16a34a",
          dark: "#15803d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
