import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, fillIn, click, find } from '@ember/test-helpers';
import LogTimeModal from '#src/components/log-time-modal.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

describe('Integration | LogTimeModal', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders the modal with title and fields', async function ({ context }) {
    initializeTestApp(context.owner);
    const noop = () => {};
    await render(
      <template>
        <LogTimeModal @onClose={{noop}} @onSaved={{noop}} />
      </template>
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain('Enregistrer du temps');
    expect(text).toContain('Durée (heures)');
    expect(text).toContain('Date');
    expect(find('#log-time-task')).toBeTruthy();
    expect(find('#log-time-hours')).toBeTruthy();
    expect(find('#log-time-date')).toBeTruthy();
  });

  renderingTest('locks task input when @taskId provided', async function ({ context }) {
    initializeTestApp(context.owner);
    const taskId = 'task-42';
    const noop = () => {};
    await render(
      <template>
        <LogTimeModal @taskId={{taskId}} @onClose={{noop}} @onSaved={{noop}} />
      </template>
    );
    const taskInput = find('#log-time-task') as HTMLInputElement | null;
    expect(taskInput?.disabled).toBe(true);
    expect(taskInput?.value).toBe('task-42');
  });

  renderingTest('submit button is disabled when hours is 0', async function ({ context }) {
    initializeTestApp(context.owner);
    const noop = () => {};
    await render(
      <template>
        <LogTimeModal @taskId="task-1" @onClose={{noop}} @onSaved={{noop}} />
      </template>
    );
    await fillIn('#log-time-hours', '0');
    const submitBtn = find('button[type="submit"]') as HTMLButtonElement | null;
    expect(submitBtn?.disabled).toBe(true);
  });

  renderingTest('cancel button calls @onClose', async function ({ context }) {
    initializeTestApp(context.owner);
    let closed = false;
    const onClose = () => { closed = true; };
    const noop = () => {};
    await render(
      <template>
        <LogTimeModal @onClose={{onClose}} @onSaved={{noop}} />
      </template>
    );
    const buttons = document.querySelectorAll('button[type="button"]');
    const cancelBtn = Array.from(buttons).find((b) => b.textContent?.includes('Annuler'));
    if (cancelBtn) {
      await click(cancelBtn);
    }
    expect(closed).toBe(true);
  });
});
