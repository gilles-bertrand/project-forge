import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import TimeSummaryCards from '#src/components/time-summary-cards.gts';
import type { SummaryResult } from '#src/services/time-entries.ts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

describe('Integration | TimeSummaryCards', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders week and month summary values', async function ({ context }) {
    initializeTestApp(context.owner);
    const weekSummary: SummaryResult = { totalHours: 12.5, taskCount: 4 };
    const monthSummary: SummaryResult = { totalHours: 47, taskCount: 12 };
    await render(
      <template>
        <TimeSummaryCards
          @weekSummary={{weekSummary}}
          @monthSummary={{monthSummary}}
        />
      </template>
    );
    const text = document.body.textContent ?? '';
    expect(text).toContain('12.5');
    expect(text).toContain('47');
    expect(text).toContain('4');
    expect(text).toContain('Heures cette semaine');
    expect(text).toContain('Heures ce mois');
    expect(text).toContain('Tâches loggées');
  });
});
