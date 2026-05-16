import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { fillIn, render } from '@ember/test-helpers';
import Service from '@ember/service';
import AddSprintModal from '#src/components/add-sprint-modal.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

class FakeCurrentProject extends Service {
  currentProjectId = 'proj-1';
}

class FakeSprintsService extends Service {
  created: Record<string, unknown> | null = null;
  create(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.created = payload;
    return Promise.resolve({ id: 'sprint-new', ...payload });
  }
}

describe('Integration | AddSprintModal', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders all required fields', async function ({ context }) {
    initializeTestApp(context.owner);
    context.owner.register('service:current-project', FakeCurrentProject);
    context.owner.register('service:sprints', FakeSprintsService);
    const noop = () => {};
    await render(<template><AddSprintModal @onClose={{noop}} /></template>);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Planifier un sprint');
    expect(text).toContain('Nom du sprint');
    expect(text).toContain('Objectif');
    expect(text).toContain('Date de début');
    expect(text).toContain('Date de fin');
    expect(text).toContain('Vélocité');
  });

  renderingTest(
    'shows error and disables submit when endDate <= startDate',
    async function ({ context }) {
      initializeTestApp(context.owner);
      context.owner.register('service:current-project', FakeCurrentProject);
      context.owner.register('service:sprints', FakeSprintsService);
      const noop = () => {};
      await render(<template><AddSprintModal @onClose={{noop}} /></template>);
      const nameInput = document.querySelector(
        'input[type="text"]'
      ) as HTMLInputElement;
      const startInputs = document.querySelectorAll('input[type="date"]');
      const startInput = startInputs[0] as HTMLInputElement;
      const endInput = startInputs[1] as HTMLInputElement;
      await fillIn(nameInput, 'My sprint');
      await fillIn(startInput, '2025-02-01');
      await fillIn(endInput, '2025-01-15'); // before start
      const errorEl = document.querySelector('[data-test-dates-error]');
      expect(errorEl).toBeTruthy();
      const submitBtn = document.querySelector(
        'button[type="submit"]'
      ) as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
    }
  );
});
