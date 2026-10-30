import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        background: "#FAF9F5",
        foreground: "#111111",
        brutal: {
          black: "#18181B",
          dark: "#0F172A",
          green: "#86EFAC",
          "green-pastel": "#DCFCE7",
          yellow: "#FDE047",
          "yellow-pastel": "#FEF9C3",
          pink: "#F472B6",
          "pink-pastel": "#FCE7F3",
          coral: "#FDA4AF",
          cyan: "#7DD3FC",
          "cyan-pastel": "#E0F2FE",
        },
      },
      boxShadow: {
        brutal: "4px 4px 0px 0px #18181B",
        "brutal-lg": "6px 6px 0px 0px #18181B",
        "brutal-xl": "8px 8px 0px 0px #18181B",
        "brutal-sm": "2px 2px 0px 0px #18181B",
      },
    },
  },
  plugins: [],
};
export default config;
