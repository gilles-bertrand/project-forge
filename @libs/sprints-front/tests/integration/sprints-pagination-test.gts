import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { click, render } from '@ember/test-helpers';
import SprintsPagination from '#src/components/sprints-pagination.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

describe('Integration | SprintsPagination', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'renders range label and invokes onPrev/onNext',
    async function ({ context }) {
      initializeTestApp(context.owner);
      let prevCalled = false;
      const onPrev = () => {
        prevCalled = true;
      };
      const onNext = () => {
        // No-op (next is disabled when offset+pageSize >= total)
      };
      await render(
        <template>
          <SprintsPagination
            @offset={{3}}
            @total={{6}}
            @pageSize={{3}}
            @onPrev={{onPrev}}
            @onNext={{onNext}}
          />
        </template>
      );
      const rangeEl = document.querySelector('[data-test-pagination-range]');
      const text = rangeEl?.textContent ?? '';
      expect(text).toContain('4 à 6 sur 6');
      const prevBtn = document.querySelector(
        '[data-test-pagination-prev]'
      ) as HTMLButtonElement;
      const nextBtn = document.querySelector(
        '[data-test-pagination-next]'
      ) as HTMLButtonElement;
      expect(prevBtn.disabled).toBe(false);
      expect(nextBtn.disabled).toBe(true); // at end
      await click(prevBtn);
      expect(prevCalled).toBe(true);
    }
  );
});
