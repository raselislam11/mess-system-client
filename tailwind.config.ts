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
        // Navbar ও Footer-এর স্ট্যান্ডার্ড রঙ (গাঢ় রঙ — টেক্সট সাদা হবে)
        brand: {
          DEFAULT: "#1E293B",
          dark: "#15202F",
        },
      },
    },
  },
  plugins: [],
};

export default config;
