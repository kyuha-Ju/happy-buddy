import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ground: "#E9E4D8",
        paper: "#F3F0E8",
        surface: "#FFFFFF",
        ink: "#26302A",
        muted: "#8A9088",
        line: "#E4E0D5",
        forest: "#2E4A37",
        "forest-2": "#3B6B4C",
        joy: "#2E7D4F",
        recover: "#C1743A",
        gold: "#B9902E",
      },
      fontFamily: {
        sans: ['"Noto Sans KR"', "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
