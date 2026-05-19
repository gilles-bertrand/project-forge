import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import DashboardKpiCard from '#src/components/dashboard-kpi-card.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

describe('Integration | DashboardKpiCard', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders label and value', async function ({ context }) {
    initializeTestApp(context.owner);
    await render(
      <template>
        <DashboardKpiCard @label="Heures" @value={{42}} />
      </template>
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain('Heures');
    expect(text).toContain('42');
  });

  renderingTest('renders icon when provided', async function ({ context }) {
    initializeTestApp(context.owner);
    await render(
      <template>
        <DashboardKpiCard @label="Heures" @value={{42}} @icon="⏱" />
      </template>
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain('⏱');
  });
});
