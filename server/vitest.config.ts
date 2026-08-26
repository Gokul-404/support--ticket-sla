import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    testTimeout: 15000,
    hookTimeout: 30000,
    deps: {
      // Force Vitest to inline these packages through its own transformer so
      // their CJS-style default exports resolve correctly under ESM test runs.
      inline: ["zod", "graphql-yoga", "@graphql-tools/schema"],
    },
  },
});
