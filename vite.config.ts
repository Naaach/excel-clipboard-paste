import { defineConfig } from "vite";

// The interactive playground lives in ./playground and imports the library
// straight from ./src (no build step needed during development).
export default defineConfig({
  root: "playground",
  base: "./",
  build: {
    outDir: "../dist-demo",
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
});
