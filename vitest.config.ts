import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["packages/core/src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      "@cubpay/core": new URL("./packages/core/src/index.ts", import.meta.url)
        .pathname,
    },
  },
});
