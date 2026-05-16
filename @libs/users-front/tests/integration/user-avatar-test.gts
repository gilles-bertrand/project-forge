import { describe, expect as hardExpect } from 'vitest';
import { renderingTest } from 'ember-vitest';
import { render } from '@ember/test-helpers';
import UserAvatar from '#src/components/user-avatar.gts';
import { initializeTestApp, TestApp } from '../app.ts';

const expect = hardExpect.soft;

describe('Integration | UserAvatar', function () {
  // eslint-disable-next-line no-empty-pattern
  renderingTest.scoped({ app: ({}, use) => use(TestApp) });

  renderingTest(
    'renders initials from firstName and lastName',
    async function ({ context }) {
      await initializeTestApp(context.owner);
      await render(
        <template>
          <UserAvatar @firstName="Alice" @lastName="Martin" />
        </template>
      );
      const text = document.body.textContent ?? '';
      expect(text).toContain('AM');
    }
  );

  renderingTest(
    'uses different color for different users',
    async function ({ context }) {
      await initializeTestApp(context.owner);
      await render(
        <template>
          <UserAvatar @firstName="Alice" @lastName="Martin" />
          <UserAvatar @firstName="Bob" @lastName="Durant" />
        </template>
      );
      const text = document.body.textContent ?? '';
      expect(text).toContain('AM');
      expect(text).toContain('BD');
    }
  );
});
