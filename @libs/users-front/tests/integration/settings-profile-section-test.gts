import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render, find } from '@ember/test-helpers';
import SettingsProfileSection from '#src/components/settings/settings-profile-section.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

describe('Integration | SettingsProfileSection', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'renders profile form with user data',
    async function ({ context }) {
      await initializeTestApp(context.owner);
      await render(
        <template>
          <SettingsProfileSection
            @userId="1"
            @firstName="Claire"
            @lastName="Dubois"
            @email="claire@test.com"
            @role="Developer"
          />
        </template>
      );
      const firstName = find('#profile-firstName') as HTMLInputElement | null;
      const lastName = find('#profile-lastName') as HTMLInputElement | null;
      expect(firstName?.value).toBe('Claire');
      expect(lastName?.value).toBe('Dubois');
      const text = (document.body.textContent ?? '').replace(/\s+/g, ' ');
      expect(text).toContain('Profil utilisateur');
    }
  );

  renderingTest('email field is disabled', async function ({ context }) {
    await initializeTestApp(context.owner);
    await render(
      <template>
        <SettingsProfileSection
          @userId="1"
          @firstName="Claire"
          @lastName="Dubois"
          @email="claire@test.com"
          @role="Developer"
        />
      </template>
    );
    expect(
      (find('input[type="email"]') as HTMLInputElement | null)?.disabled
    ).toBe(true);
  });

  renderingTest('role field is disabled', async function ({ context }) {
    await initializeTestApp(context.owner);
    await render(
      <template>
        <SettingsProfileSection
          @userId="1"
          @firstName="Claire"
          @lastName="Dubois"
          @email="claire@test.com"
          @role="Developer"
        />
      </template>
    );
    const roleInput = find('#profile-role') as HTMLInputElement | null;
    expect(roleInput).toBeTruthy();
    expect(roleInput?.disabled).toBe(true);
    expect(roleInput?.value).toBe('Developer');
  });
});
