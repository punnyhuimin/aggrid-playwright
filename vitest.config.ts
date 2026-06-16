import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-transition-group/TransitionGroupContext": "react-transition-group/cjs/TransitionGroupContext.js",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    exclude: ["**/node_modules/**", "**/*.spec.tsx"],
    server: {
      deps: {
        inline: ["@mui/material", "react-transition-group"],
      },
    },
  },
});
