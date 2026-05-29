import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import { extensions, ember } from '@embroider/vite';
import { babel } from '@rollup/plugin-babel';

export default defineConfig({
  plugins: [
    ember(),
    babel({
      babelHelpers: 'inline',
      extensions,
    }),
  ],
  // Deps reachable in the test graph only at runtime (via the addon's app
  // re-exports / compatModules + .gts template compilation). Vite's static scan
  // misses them, so on a cold cache (CI) they are discovered mid-run →
  // "Vite unexpectedly reloaded a test" → failed dynamic imports. Pre-bundling
  // them upfront keeps the run stable (list reported by Vite itself).
  optimizeDeps: {
    include: [
      '@glimmer/component',
      'ember-intl',
      'ember-source/@ember/object/index.js',
      'ember-source/@ember/modifier/index.js',
      'ember-source/@ember/helper/index.js',
      'ember-source/@ember/component/index.js',
      'ember-source/@ember/template-factory/index.js',
      '@warp-drive/legacy/model/migration-support',
    ],
  },
  test: {
    setupFiles: ['./tests/test-helper.ts'],
    include: ['tests/**/*-test.{gjs,gts}'],
    maxConcurrency: 1,
    testTimeout: 10000,
    browser: {
      provider: playwright(),
      enabled: true,
      headless: process.env.CI === 'true',
      instances: [{ browser: 'chromium' }],
    },
  },
});
