/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0a0e17",
        surface: "#111827",
        "surface-elevated": "#1a2235",
        border: "rgba(255,255,255,0.08)",
        "border-accent": "#00b4d8",
        cyan: {
          DEFAULT: "#00b4d8",
          dim: "rgba(0,180,216,0.15)",
          glow: "rgba(0,180,216,0.25)",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        error: "#ef4444",
        "text-primary": "#e5e2e2",
        "text-secondary": "#9ca3af",
        "text-accent": "#00b4d8",
      },
      fontFamily: {
        inter: ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
        mono: ["JetBrainsMono_400Regular"],
        "mono-medium": ["JetBrainsMono_500Medium"],
        "mono-bold": ["JetBrainsMono_700Bold"],
      },
      borderRadius: {
        glass: "16px",
      },
    },
  },
  plugins: [],
};
