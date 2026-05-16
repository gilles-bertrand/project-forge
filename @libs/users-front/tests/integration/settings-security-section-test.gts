import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, find, fillIn } from '@ember/test-helpers';
import SettingsSecuritySection from '#src/components/settings/settings-security-section.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

describe('Integration | SettingsSecuritySection', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest('renders 3 password inputs', async function ({ context }) {
    await initializeTestApp(context.owner);
    await render(<template><SettingsSecuritySection @userId="1" /></template>);
    expect(document.querySelectorAll('input[type="password"]').length).toBe(3);
  });

  renderingTest(
    'submit button disabled when fields empty',
    async function ({ context }) {
      await initializeTestApp(context.owner);
      await render(
        <template><SettingsSecuritySection @userId="1" /></template>
      );
      expect(
        (find('button[type="submit"]') as HTMLButtonElement)?.disabled
      ).toBe(true);
    }
  );

  renderingTest('shows password mismatch error', async function ({ context }) {
    await initializeTestApp(context.owner);
    await render(<template><SettingsSecuritySection @userId="1" /></template>);
    await fillIn('[data-test-new-password]', 'password123');
    await fillIn('[data-test-confirm-password]', 'different');
    expect(find('[data-test-error-mismatch]')).toBeTruthy();
  });

  renderingTest('shows too short error', async function ({ context }) {
    await initializeTestApp(context.owner);
    await render(<template><SettingsSecuritySection @userId="1" /></template>);
    await fillIn('[data-test-new-password]', 'short');
    expect(find('[data-test-error-short]')).toBeTruthy();
  });
});
