import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { click, render } from '@ember/test-helpers';
import KanbanFilters, {
  type KanbanFilterValue,
} from '#src/components/kanban-filters.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

describe('Integration | KanbanFilters', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'click on Mes tâches invokes onChange with "mine"',
    async function ({ context }) {
      initializeTestApp(context.owner);
      let captured: KanbanFilterValue | null = null;
      const onChange = (v: KanbanFilterValue) => {
        captured = v;
      };
      const value: KanbanFilterValue = 'all';
      await render(
        <template>
          <KanbanFilters @value={{value}} @onChange={{onChange}} />
        </template>
      );
      const text = document.body.textContent ?? '';
      expect(text).toContain('Toutes les tâches');
      expect(text).toContain('Mes tâches');
      const mineButton = document.querySelector(
        '[data-test-filter="mine"]'
      ) as HTMLButtonElement;
      expect(mineButton).toBeTruthy();
      await click(mineButton);
      expect(captured).toBe('mine');
    }
  );
});
