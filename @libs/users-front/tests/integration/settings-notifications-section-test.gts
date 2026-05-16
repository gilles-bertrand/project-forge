import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, find } from '@ember/test-helpers';
import SettingsNotificationsSection from '#src/components/settings/settings-notifications-section.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

const defaultPrefs = { email: true, assignedTasks: true, weeklyDigest: false };

describe('Integration | SettingsNotificationsSection', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders 3 toggle switches', async function ({ context }) {
    await initializeTestApp(context.owner);
    await render(
      <template>
        <SettingsNotificationsSection
          @userId="1"
          @initialPrefs={{defaultPrefs}}
        />
      </template>
    );
    expect(
      document.querySelectorAll(
        '[data-test-toggle-email], [data-test-toggle-assigned-tasks], [data-test-toggle-weekly-digest]'
      ).length
    ).toBe(3);
  });

  renderingTest(
    'email toggle is initially checked',
    async function ({ context }) {
      await initializeTestApp(context.owner);
      await render(
        <template>
          <SettingsNotificationsSection
            @userId="1"
            @initialPrefs={{defaultPrefs}}
          />
        </template>
      );
      expect(
        (find('[data-test-toggle-email]') as HTMLInputElement)?.checked
      ).toBe(true);
    }
  );

  renderingTest(
    'weeklyDigest toggle is initially unchecked',
    async function ({ context }) {
      await initializeTestApp(context.owner);
      await render(
        <template>
          <SettingsNotificationsSection
            @userId="1"
            @initialPrefs={{defaultPrefs}}
          />
        </template>
      );
      expect(
        (find('[data-test-toggle-weekly-digest]') as HTMLInputElement)?.checked
      ).toBe(false);
    }
  );
});
