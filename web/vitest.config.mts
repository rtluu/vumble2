import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    // Each PGlite instance boots a WASM Postgres; give setup room on cold runs.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
