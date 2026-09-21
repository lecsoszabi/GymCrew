import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // React 19 automatikus JSX-futtatókörnyezet a komponens-tesztekhez.
  esbuild: { jsx: "automatic" },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
