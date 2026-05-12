/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "space-900": "#050816",
        "space-800": "#0B1026",
        "space-700": "#111936",
        "neon-cyan": "#38F5FF",
        "electric-violet": "#8B5CF6",
        "blue-glow": "#60A5FA",
        "signal-green": "#34D399",
        "alert-red": "#F87171",
        
        "background": "#050816",
        "on-background": "#e2e8f0",
        
        "primary": "#38F5FF",
        "primary-container": "rgba(56, 245, 255, 0.1)",
        "on-primary": "#00363e",
        
        "secondary": "#8B5CF6",
        "secondary-container": "rgba(139, 92, 246, 0.1)",
        "on-secondary": "#ffffff",
        
        "tertiary": "#60A5FA",
        "tertiary-container": "rgba(96, 165, 250, 0.1)",
        
        "surface": "rgba(11, 16, 38, 0.6)",
        "surface-container": "rgba(17, 25, 54, 0.6)",
        "surface-container-highest": "rgba(17, 25, 54, 0.8)",
        "on-surface": "#f8fafc",
        "on-surface-variant": "#94a3b8",
        
        "outline": "rgba(56, 245, 255, 0.2)",
        "outline-variant": "rgba(255, 255, 255, 0.1)",
        
        "error": "#F87171",
        "error-container": "rgba(248, 113, 113, 0.1)",
      },
      boxShadow: {
        'glow-cyan': '0 0 15px rgba(56, 245, 255, 0.3), inset 0 0 10px rgba(56, 245, 255, 0.1)',
        'glow-cyan-lg': '0 0 30px rgba(56, 245, 255, 0.5), inset 0 0 15px rgba(56, 245, 255, 0.2)',
        'glow-violet': '0 0 15px rgba(139, 92, 246, 0.3), inset 0 0 10px rgba(139, 92, 246, 0.1)',
        'glow-red': '0 0 20px rgba(248, 113, 113, 0.4), inset 0 0 10px rgba(248, 113, 113, 0.1)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem",
        "full": "9999px"
      },
      spacing: {
        "gutter": "24px",
        "container-max": "1440px",
        "xxl": "64px",
        "sm": "8px",
        "md": "16px",
        "xs": "4px",
        "xl": "40px",
        "lg": "24px",
        "unit": "4px"
      },
      fontFamily: {
        "label-caps": ["Inter"],
        "body-sm": ["Inter"],
        "h2": ["Space Grotesk"],
        "body-md": ["Inter"],
        "display-lg": ["Space Grotesk"],
        "body-lg": ["Inter"],
        "h1": ["Space Grotesk"],
        "h3": ["Space Grotesk"],
        "data-mono": ["Space Grotesk"]
      },
      fontSize: {
        "label-caps": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
        "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "h2": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "h1": ["32px", { lineHeight: "1.2", fontWeight: "600" }],
        "h3": ["20px", { lineHeight: "1.4", fontWeight: "500" }],
        "data-mono": ["16px", { lineHeight: "1", letterSpacing: "0.02em", fontWeight: "500" }]
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
