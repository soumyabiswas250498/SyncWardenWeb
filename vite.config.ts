/// <reference types="vitest/config" />
import path from "node:path";
import locatorBabelJsx from "@locator/babel-jsx";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      babel: {
        plugins: mode === "development" ? [[locatorBabelJsx, { env: "development" }]] : [],
      },
    }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: ["e2e/**", "src/mocks/**", "src/components/ui/**"],
    },
    exclude: ["node_modules", "e2e"],
  },
}));
