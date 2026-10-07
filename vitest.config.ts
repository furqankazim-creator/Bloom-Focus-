import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { 'react-native': path.resolve(__dirname, 'tests/stubs/react-native.ts') } },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
