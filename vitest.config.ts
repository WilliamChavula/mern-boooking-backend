import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        environmentOptions: {
            node: {
                nodeVersion: '22',
            },
        },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.d.ts',
                '**/*.config.*',
                '**/types/**',
                '**/*.test.ts',
                '**/*.spec.ts',
                '**/tests/**',
                '**/fixtures/**',
            ],
            thresholds: {
                lines: 70,
                functions: 70,
                branches: 70,
                statements: 70,
            },
        },
        setupFiles: ['./tests/setup.ts'],
        testTimeout: 30000,
        hookTimeout: 30000,
        pool: 'forks',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        conditions: ['node'],
    },
});
