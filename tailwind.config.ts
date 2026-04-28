import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // SoulSync pastel palette — use CSS variables for emotion-adaptive overrides
        soul: {
          bg: "var(--soul-bg)",
          card: "var(--soul-card)",
          surface: "var(--soul-surface)",
          ai: "var(--soul-ai)",
          highlight: "var(--soul-highlight)",
          primary: "var(--soul-primary)",
          accent: "var(--soul-accent)",
          "primary-text": "var(--soul-primary-text)",
        },
      },
      borderRadius: {
        "2xl": "1rem",
      },
      transitionDuration: {
        gentle: "300ms",
      },
    },
  },
  plugins: [],
};

export default config;
