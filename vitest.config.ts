import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: [
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/integration/**/*.test.{ts,tsx}",
    ],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      include: [
        "src/features/**/domain/**/*.ts",
        "src/features/mentor/server/**/*.ts",
        "src/features/mentor/utils/**/*.ts",
        "src/features/routine/utils/**/*.ts",
        "src/features/study-session/utils/**/*.ts",
        "src/infrastructure/**/*.ts",
        "src/lib/storage.ts",
        "src/lib/storage/**/*.ts",
        "src/server/**/*.ts",
        "src/utils/**/*.ts",
      ],
      exclude: ["**/*.d.ts"],
      thresholds: {
        statements: 40,
        branches: 30,
        functions: 40,
        lines: 40,
        "src/server/http/read-json-body.ts": {
          statements: 90,
          branches: 85,
          functions: 100,
          lines: 95,
        },
        "src/server/security/rate-limit.ts": {
          statements: 85,
          branches: 75,
          functions: 90,
          lines: 85,
        },
        "src/features/mentor/server/mentor-request-validation.ts": {
          statements: 70,
          branches: 65,
          functions: 80,
          lines: 80,
        },
        "src/features/routine/domain/**/*.ts": {
          statements: 85,
          branches: 60,
          functions: 90,
          lines: 90,
        },
        "src/features/routine/utils/**/*.ts": {
          statements: 85,
          branches: 65,
          functions: 75,
          lines: 85,
        },
        "src/features/study-session/utils/**/*.ts": {
          statements: 60,
          branches: 45,
          functions: 75,
          lines: 60,
        },
        "src/lib/storage.ts": {
          statements: 40,
          branches: 25,
          functions: 40,
          lines: 45,
        },
        "src/lib/storage/storage-validators.ts": {
          statements: 45,
          branches: 30,
          functions: 45,
          lines: 50,
        },
        "src/features/mentor/utils/mentor-routine-proposal-validation.ts": {
          statements: 55,
          branches: 45,
          functions: 60,
          lines: 60,
        },
      },
    },
  },
})
