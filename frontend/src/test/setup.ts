/**
 * Vitest global setup.
 *
 * The vite.config.ts references this file via `test.setupFiles`. It was
 * missing from the original repo (presumably an oversight — the test
 * runner would fail to start for any test file). Created as part of the
 * remediation rollout so the finance-service-split unit tests can run.
 *
 * Add jest-dom matchers for DOM assertions and any other global test
 * setup here. Keep this file minimal — heavy mocks belong in per-test
 * setup or in the MSW handlers.
 */

import "@testing-library/jest-dom/vitest";
