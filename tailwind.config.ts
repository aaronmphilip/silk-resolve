import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#f0ebe0",
        ink: "#0a0a0a",
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        hard: "2px 2px 0px rgba(0,0,0,1)",
        "hard-sm": "1px 1px 0px rgba(0,0,0,1)",
      },
    },
  },
  plugins: [],
};

export default config;
