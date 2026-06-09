import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: "#050a0e",
          surface: "#0d1821",
          border: "#1a2d3d",
          muted: "#1e3448",
          text: "#8fb3cc",
          bright: "#c8e6f5",
        },
        signal: {
          strong: "#00ff88",
          mild: "#66ffbb",
          neutral: "#ffd700",
          weak: "#ff6644",
          none: "#ff2244",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"],
      },
      animation: {
        pulse_slow: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        glow: "glow 2s ease-in-out infinite alternate",
        ticker: "ticker 30s linear infinite",
      },
      keyframes: {
        glow: {
          "0%": { opacity: "0.7" },
          "100%": { opacity: "1", textShadow: "0 0 8px currentColor" },
        },
        ticker: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
