import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'app.ts',
        'index.ts',
        'worker.ts',
        'config/**/*.ts',
        'controllers/**/*.ts',
        'database/**/*.ts',
        'errors/**/*.ts',
        'middleware/**/*.{ts,js}',
        'models/**/*.ts',
        'queues/**/*.ts',
        'rate-limiter/**/*.ts',
        'routes/**/*.{ts,js}',
        'utils/**/*.ts',
        'workers/**/*.ts',
        'workflows/**/*.ts',
      ],
      exclude: [
        'tests/**',
        'types/**',
        'docs/**',
        'node_modules/**',
        'eslint.config.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
