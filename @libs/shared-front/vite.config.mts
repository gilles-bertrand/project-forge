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
      // Rendering-test deps: render()/triggerEvent() from @ember/test-helpers
      // pull these in at runtime, missed by the static scan → cold-cache
      // reload. Pre-bundling keeps integration render tests stable in CI.
      '@ember/test-helpers',
      'ember-vitest',
      'ember-source/@ember/service/index.js',
      'ember-source/@ember/component/template-only.js',
      'ember-source/@ember/routing/router.js',
      'ember-source/@glimmer/tracking/index.js',
      'ember-strict-application-resolver',
      'ember-strict-application-resolver/build-registry',
      '@warp-drive/json-api',
      '@warp-drive/legacy',
      '@warp-drive/ember/install',
      'ember-cli-flash/services/flash-messages',
      'ember-page-title/services/page-title',
      'decorator-transforms/runtime-esm',
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
