import { describe, expect, vi } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, click } from '@ember/test-helpers';
import AddItemModal from '#src/components/shell/add-item-modal.gts';
import { initializeTestApp, TestApp } from '../app.ts';

describe('Component | AddItemModal | Integration', () => {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'calls onSelect with the right type on click',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const onSelect = vi.fn();
      const onClose = vi.fn();

      await render(
        <template>
          <AddItemModal @onSelect={{onSelect}} @onClose={{onClose}} />
        </template>
      );

      await click('[data-test-add-item-modal] [data-test-add-item-type="task"]');
      expect(onSelect).toHaveBeenCalledWith('task');
      expect(onClose).not.toHaveBeenCalled();
    }
  );

  renderingTest(
    'calls onClose when Annuler is clicked',
    async function ({ context }) {
      initializeTestApp(context.owner);
      const onSelect = vi.fn();
      const onClose = vi.fn();

      await render(
        <template>
          <AddItemModal @onSelect={{onSelect}} @onClose={{onClose}} />
        </template>
      );

      await click('[data-test-add-item-modal] .modal-action button');
      expect(onClose).toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    }
  );
});
