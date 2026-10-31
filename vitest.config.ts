import { defineConfig } from 'vitest/config';
import { readFileSync, existsSync } from 'fs';
import { dirname, join, resolve } from 'path';

/**
 * Vite plugin to resolve .js imports to .ts files for local source modules.
 * This is needed because the project uses ESM with explicit .js extensions
 * (for NodeNext module resolution), but during testing only .ts files exist.
 *
 * This plugin ONLY applies during test runs and ONLY rewrites imports
 * from source files, not from node_modules.
 */
function resolveJsToTs() {
  return {
    name: 'resolve-js-to-ts',
    enforce: 'pre',

    resolveId(source, importer) {
      // Only handle relative imports with .js extension
      if (!source.startsWith('.') && !source.startsWith('/')) {
        return null;
      }

      if (!source.endsWith('.js')) {
        return null;
      }

      // Only apply to local source files (not node_modules)
      if (!importer.includes('node_modules')) {
        // Try to find the .ts version
        const importerDir = dirname(importer);
        const tsPath = join(importerDir, source.replace(/\.js$/, '.ts'));
        const absPath = resolve(tsPath);

        if (existsSync(absPath)) {
          return tsPath;
        }
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [resolveJsToTs()],
  test: {
    globals: true,
    root: './',
    include: ['test/unit/**/*.spec.ts'],
    environment: 'node',
  },
});