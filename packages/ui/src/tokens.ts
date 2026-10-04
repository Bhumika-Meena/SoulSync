export const BASE_PALETTE = {
  bg: "#fbf7e8",
  bgBottom: "#f6f0cf",
  card: "#ffffff",
  surface: "#ffffff",
  ai: "#0f172a",
  highlight: "#fff3b0",
  primary: "#f4d34c",
  accent: "#fbbf24",
  primaryText: "#0f172a",
  btnText: "#111827",
} as const;

export const EMOTION_THEMES = {
  neutral: {},
  calm: {
    bg: "#f2f8ed",
    bgBottom: "#e8f2dd",
    highlight: "#d1fae5",
    accent: "#34d399",
  },
  sad: {
    bg: "#f6f3ff",
    bgBottom: "#efeaff",
    highlight: "#e9d5ff",
    accent: "#a78bfa",
  },
  happy: {
    bg: "#fff7df",
    bgBottom: "#fff0c2",
    highlight: "#fde68a",
    accent: "#f59e0b",
  },
  anxious: {
    bg: "#f3f7fb",
    bgBottom: "#eaf2ff",
    highlight: "#bfdbfe",
    accent: "#60a5fa",
  },
  angry: {
    bg: "#fff1f2",
    bgBottom: "#ffe4e6",
    highlight: "#fecdd3",
    accent: "#fb7185",
  },
} as const;
