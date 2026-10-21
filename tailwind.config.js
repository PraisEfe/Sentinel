export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],

  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f8f4",
          100: "#e5f1ea",
          200: "#cbe3d5",
          300: "#a3ccb6",
          400: "#6ea88c",
          500: "#2e9e6d",
          600: "#237a55",
          700: "#1d6045",
          800: "#194d38",
          900: "#123728",
          950: "#0b2017",
        },
        dark: {
          bg: "#101815", // Primary Dark Background (from Figma hero panel)
          surface: "#17211d", // Cards & Panels (Figma ink-dark slate)
          elevated: "#22332b", // Elevated elements, inputs, hover states
          border: "#2a3b32", // Subtle dark border
          borderMuted: "#1f2e26",
          text: "#f0f3f1", // High-contrast clean off-white
          muted: "#9caaa2", // Secondary text
          subtle: "#65716b", // Meta text
        },
        surface: {
          DEFAULT: "#ffffff",
          subtle: "#fafbfa",
          muted: "#f5f7f5",
          card: "#f9fbf9",
          hover: "#eef3ef",
          border: "#e2e9e4",
          borderDark: "#bdc8c1",
        },
        ink: {
          DEFAULT: "#17211d",
          heading: "#101815",
          muted: "#77817c",
          subtle: "#9caaa2",
          light: "#65716b",
          darker: "#43504a",
        },
        signal: {
          critical: "#c65348",
          high: "#d97736",
          normal: "#237a55",
          info: "#2d68c4",
        },
      },
      fontFamily: {
        sans: ['"DM Sans Variable"', "sans-serif"],
        display: ['"Manrope Variable"', '"DM Sans Variable"', "sans-serif"],
      },
    },
  },
};
