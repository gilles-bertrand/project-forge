import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import DashboardKpiRow from '#src/components/dashboard-kpi-row.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

describe('Integration | DashboardKpiRow', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'renders three KPI cards with values',
    async function ({ context }) {
      initializeTestApp(context.owner);
      await render(
        <template>
          <DashboardKpiRow
            @completedTasks={{3}}
            @totalTasks={{8}}
            @totalHours={{17}}
            @completedPoints={{26}}
          />
        </template>
      );
      const text = document.body.textContent ?? '';
      expect(text).toContain('3/8');
      expect(text).toContain('17');
      expect(text).toContain('26');
    }
  );
});
