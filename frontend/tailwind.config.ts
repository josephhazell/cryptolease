import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./pages/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#0F4C81",
        accent: "#FF7A59"
      }
    }
  },
  plugins: []
};

export default config;


