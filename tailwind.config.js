/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0D1117",
        graphite: "#161B22",
        line: "#D7DCE3",
        "line-soft": "#E9ECF1",
        canvas: "#FFFFFF",
        cloud: "#F6F7F9",
        muted: "#57606A",
        blue: {
          DEFAULT: "#0B5FFF",
          50: "#EDF3FF",
          600: "#0B5FFF",
          700: "#0A4FD1",
        },
        violet: {
          DEFAULT: "#6425F0",
          50: "#F2EBFF",
          600: "#6425F0",
        },
        approved: "#166F45",
        "approved-bg": "#E6F5EC",
        review: "#8A5A0A",
        "review-bg": "#FCF0DC",
        draft: "#57606A",
        "draft-bg": "#EEF0F3",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(115deg, #0B7CFF 0%, #4A3DF2 55%, #6425F0 100%)",
      },
      boxShadow: {
        card: "0 1px 2px rgba(13,17,23,0.04), 0 1px 0 rgba(13,17,23,0.03)",
        raised: "0 8px 24px rgba(13,17,23,0.10)",
      },
      maxWidth: {
        content: "1240px",
      },
    },
  },
  plugins: [],
};
